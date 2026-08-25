import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const fileFor = userId => path.resolve('data/users', String(userId), 'offer-tracking.json');
const read = userId => {
  try { return JSON.parse(fs.readFileSync(fileFor(userId), 'utf8')); } catch { return []; }
};
const write = (userId, entries) => {
  const file = fileFor(userId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(entries.slice(-10_000), null, 2));
};

// A Shopee aceita somente caracteres alfanuméricos nos Sub IDs. O hash mantém
// o identificador curto, estável e seguro para aparecer no relatório externo.
function subId(prefix, value) {
  return `${prefix}${crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 12)}`.toUpperCase();
}

export function beginOfferTracking(userId, { destination, offer, category, campaign }) {
  const id = crypto.randomUUID();
  const record = {
    id,
    status: 'preparando',
    createdAt: new Date().toISOString(),
    destinationId: destination.id,
    destinationName: destination.name,
    destinationType: destination.type,
    productId: offer.id,
    productName: offer.title,
    categoryId: category.id,
    categoryName: category.label,
    campaign: campaign?.label || null,
    // Posições fixas: o painel Shopee e o relatório interno conseguem
    // identificar a origem sem inferir texto do nome do grupo ou produto.
    subIds: [
      'WPP',
      subId('GRP', destination.id),
      subId('PRD', offer.id),
      subId('ENV', id),
      subId('CAT', category.id)
    ],
    affiliateLink: null,
    sentAt: null,
    failedAt: null,
    error: null
  };
  const entries = read(userId);
  entries.push(record);
  write(userId, entries);
  return record;
}

function update(userId, id, patch) {
  const entries = read(userId);
  const record = entries.find(item => item.id === id);
  if (!record) return null;
  Object.assign(record, patch);
  write(userId, entries);
  return record;
}

export const saveTrackedLink = (userId, id, affiliateLink) => update(userId, id, { affiliateLink, status: 'pronto' });
export const confirmOfferTracking = (userId, id) => update(userId, id, { status: 'enviado', sentAt: new Date().toISOString(), error: null });
export const failOfferTracking = (userId, id, error) => update(userId, id, { status: 'falhou', failedAt: new Date().toISOString(), error: String(error?.message || error || 'Falha').slice(0, 240) });

export function trackingReport(userId, limit = 100) {
  return read(userId).slice().reverse().slice(0, limit);
}

export function trackingSummary(userId) {
  const entries = trackingReport(userId, 10_000).filter(item => item.status === 'enviado');
  return {
    sent: entries.length,
    groups: new Set(entries.map(item => item.destinationId)).size,
    products: new Set(entries.map(item => item.productId)).size,
    latest: entries.slice(0, 6)
  };
}
