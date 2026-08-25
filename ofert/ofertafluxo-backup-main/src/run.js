import { generateTrackedOfferLink, getShopeeOffers } from './shopee.js';
import { formatOffer, normalizeOffers, selectOffers } from './offers.js';
import { readSentIds, rememberSent } from './store.js';
import { sendWhatsAppOffer } from './whatsapp.js';
import { sendEvolutionOffer } from './evolution.js';
import { sendDirectWhatsAppOffer } from './whatsapp-direct.js';
import { categoryById, matchesCategory } from './categories.js';
import { currentShopeeCampaign } from './campaigns.js';
import { automationWindowOpen, confirmDelivery, failDelivery, queueDelivery, reserveDelivery } from './safety.js';
import { beginOfferTracking, confirmOfferTracking, failOfferTracking, saveTrackedLink } from './tracking.js';

function categoryForDestination(destination) {
  const ids = Array.isArray(destination.categoryIds) && destination.categoryIds.length
    ? destination.categoryIds
    : [destination.categoryId || 'all'];
  return categoryById(ids[Math.floor(Math.random() * ids.length)]);
}

export async function run(settings, destinationIds = null) {
  const seenDestinations = new Set();
  const activeDestinations = (settings.destinations || []).filter(destination => {
    if (!destination.active || seenDestinations.has(destination.number)) return false;
    seenDestinations.add(destination.number);
    return true;
  });
  const destinations = activeDestinations.filter(destination => destination.consent === true && (!destinationIds || destinationIds.includes(destination.id)));
  if (!destinations.length) throw new Error('Adicione um destino ativo e confirme que ele autorizou receber ofertas.');
  if (settings.origin === 'automático' && !automationWindowOpen(settings.safety)) {
    return { found: 0, offers: [], errors: [], skipped: 'Envio automático pausado pelo horário de segurança.' };
  }

  // A busca geral da API traz uma seleção mais estável que o campo "keyword".
  // Ela é usada primeiro; uma busca específica só entra como reserva quando a
  // lista geral não tiver nenhum produto daquela categoria.
  const rawOffers = getShopeeOffers(settings.shopee);
  const fallbackByCategory = new Map();
  const offersForCategory = async category => {
    const general = normalizeOffers(await rawOffers).filter(offer => matchesCategory(offer, category));
    if (category.searchQueries?.length) {
      if (!fallbackByCategory.has(category.id)) {
        fallbackByCategory.set(category.id, Promise.all(category.searchQueries.map(keyword => getShopeeOffers(settings.shopee, { keyword }))));
      }
      const specific = (await fallbackByCategory.get(category.id)).flatMap(normalizeOffers).filter(offer => matchesCategory(offer, category));
      return [...specific, ...general].filter((offer, index, list) => list.findIndex(item => item.id === offer.id) === index);
    }
    if (general.length || !category.query) return general;
    if (!fallbackByCategory.has(category.id)) {
      fallbackByCategory.set(category.id, getShopeeOffers(settings.shopee, { keyword: category.query }));
    }
    return normalizeOffers(await fallbackByCategory.get(category.id)).filter(offer => matchesCategory(offer, category));
  };
  const campaign = currentShopeeCampaign();
  const jobs = destinations.map(async destination => {
    // Cada rodada escolhe uma categoria autorizada ao acaso. Assim um mesmo
    // grupo pode receber uma rotação real de nichos, sem repetir um padrão fixo.
    const category = categoryForDestination(destination);
    const selected = selectOffers(
      await offersForCategory(category),
      { ...settings.filters, maxOffers: 1 },
      readSentIds(settings.userId, destination.id)
    );
    const offer = selected[0];
    if (!offer) return null;
    const tracking = beginOfferTracking(settings.userId, { destination, offer, category, campaign });
    let reservation;
    try {
      // Não enviamos link comum como fallback: um envio sem os Sub IDs quebraria
      // a atribuição por grupo e produto que o relatório precisa exibir.
      const trackedLink = await generateTrackedOfferLink(settings.shopee, offer.url, tracking.subIds);
      saveTrackedLink(settings.userId, tracking.id, trackedLink);
      const trackedOffer = { ...offer, url: trackedLink };
      const text = formatOffer(trackedOffer, campaign);
      reservation = reserveDelivery(settings.userId, destination, settings.safety);
      await queueDelivery(async () => {
        if (settings.directWhatsApp?.enabled) return sendDirectWhatsAppOffer(settings.userId, trackedOffer, text, [destination.number]);
        if (settings.evolution?.enabled) return sendEvolutionOffer(text, { ...settings.evolution, targets: [destination.number] });
        return sendWhatsAppOffer(text, { ...settings.whatsapp, recipients: [destination.number] });
      }, settings.safety);
      confirmDelivery(settings.userId, reservation, trackedOffer);
      confirmOfferTracking(settings.userId, tracking.id);
      return { offer: trackedOffer, destinationId: destination.id, destinationName: destination.name, categoryId: category.id, category: category.label, tracking };
    } catch (error) {
      if (reservation) failDelivery(settings.userId, reservation, error);
      failOfferTracking(settings.userId, tracking.id, error);
      throw error;
    }
  });
  const settled = await Promise.allSettled(jobs);
  const sent = settled.filter(result => result.status === 'fulfilled' && result.value).map(result => result.value);
  const errors = settled.filter(result => result.status === 'rejected').map(result => result.reason?.message || 'Falha ao enviar');
  if (sent.length) rememberSent(settings.userId, sent);
  if (errors.length && !sent.length) {
    throw new Error(errors.join(' | '));
  }
  return {
    found: sent.length,
    campaign: campaign?.label || null,
    errors,
    offers: sent.map(({ offer, destinationName, category }) => ({ id: offer.id, title: offer.title, price: offer.price, discount: offer.discount, destinationName, category }))
  };
}
