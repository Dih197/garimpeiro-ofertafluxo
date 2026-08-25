import crypto from 'node:crypto';
import fs from 'node:fs';

const offerCache = new Map();
const cacheTtlMs = 5 * 60_000;

function signature(appId, timestamp, body, secret) {
  return crypto.createHash('sha256').update(`${appId}${timestamp}${body}${secret}`).digest('hex');
}

export async function getShopeeOffers(settings, variables = {}, fetcher = fetch) {
  if (!settings.url || !settings.appId || !settings.secret) {
    throw new Error('Configure SHOPEE_API_URL, SHOPEE_APP_ID e SHOPEE_SECRET.');
  }
  const query = fs.readFileSync(settings.queryPath, 'utf8');
  // A assinatura é calculada sobre exatamente a mesma string enviada no corpo.
  const body = JSON.stringify({ query, variables: { page: 1, limit: 50, keyword: null, ...variables } });
  const timestamp = Math.floor(Date.now() / 1000);
  const requestSignature = signature(settings.appId, timestamp, body, settings.secret);
  const cacheKey = `${settings.appId}:${variables.keyword || 'all'}`;
  const freshCache = offerCache.get(cacheKey);
  // Evita que uma oscilação da Open API deixe o catálogo em branco entre
  // consultas. A cada cinco minutos uma nova consulta atualiza o conteúdo.
  if (freshCache?.expiresAt > Date.now()) return freshCache.data;
  let failure;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetcher(settings.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `SHA256 Credential=${settings.appId},Timestamp=${timestamp},Signature=${requestSignature}`,
          ...settings.extraHeaders
        },
        body,
        signal: AbortSignal.timeout(20_000)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.errors?.length) throw new Error(`Shopee recusou a consulta: ${JSON.stringify(result.errors || result)}`);
      offerCache.set(cacheKey, { data: result.data, expiresAt: Date.now() + cacheTtlMs });
      return result.data;
    } catch (error) {
      failure = error;
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  const cached = offerCache.get(cacheKey);
  if (cached?.expiresAt > Date.now()) return cached.data;
  throw new Error(`Não foi possível consultar a Shopee agora: ${failure?.message || 'falha de rede'}`);
}

/**
 * Cria um short link de afiliado na Open API usando os cinco Sub IDs
 * posicionais. A Shopee usa esses valores na atribuição de desempenho.
 */
export async function generateTrackedOfferLink(settings, originUrl, subIds, fetcher = fetch) {
  if (!originUrl) throw new Error('A oferta não possui URL de origem para gerar o link rastreável.');
  if (!settings.url || !settings.appId || !settings.secret) {
    throw new Error('Conecte a Shopee antes de enviar: o link rastreável precisa da Open API.');
  }
  const clean = (subIds || []).map(value => String(value || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 50)).filter(Boolean);
  const escapedUrl = String(originUrl).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const escapedSubs = clean.map(value => `"${value}"`).join(', ');
  const query = `mutation { generateShortLink(input: {originUrl: "${escapedUrl}", subIds: [${escapedSubs}]}) { shortLink } }`;
  const body = JSON.stringify({ query, variables: {} });
  const timestamp = Math.floor(Date.now() / 1000);
  const requestSignature = signature(settings.appId, timestamp, body, settings.secret);
  const response = await fetcher(settings.url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `SHA256 Credential=${settings.appId},Timestamp=${timestamp},Signature=${requestSignature}`,
      ...settings.extraHeaders
    },
    body,
    signal: AbortSignal.timeout(20_000)
  });
  const result = await response.json().catch(() => ({}));
  const link = result?.data?.generateShortLink?.shortLink;
  if (!response.ok || result.errors?.length || !link) {
    const reason = result.errors?.[0]?.message || `Resposta inválida da Shopee (${response.status})`;
    throw new Error(`Não foi possível gerar o link rastreável: ${reason}`);
  }
  return link;
}
