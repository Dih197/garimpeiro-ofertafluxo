// Cliente Meta Marketing API com auto-discovery do Ad Account
// Lê token e configs de DB > process.env (fallback)
import { lerConfig } from "./configs";

function metaToken(): string {
  return lerConfig("META_ACCESS_TOKEN");
}
function metaAdAccountEnv(): string {
  return lerConfig("META_AD_ACCOUNT_ID");
}
function metaApiVersion(): string {
  return lerConfig("META_API_VERSION") || "v23.0";
}
function metaBase(): string {
  return `https://graph.facebook.com/${metaApiVersion()}`;
}

type GraphResp<T> = T & { error?: { message: string; code?: number } };

export type MetaError = { ok: false; erro: string; etapa?: string };

let _adAccountIdCache: { token: string; id: string } | null = null;
let _ultimoErro: string | null = null;

export function metaConfigurado(): boolean {
  return Boolean(metaToken());
}

export function ultimoErroMeta(): string | null {
  return _ultimoErro;
}

export function tokenExpirado(): boolean {
  if (!_ultimoErro) return false;
  const e = _ultimoErro.toLowerCase();
  return e.includes("expired") || e.includes("session has expired") || e.includes("oauth");
}

async function call<T>(endpoint: string, init?: RequestInit): Promise<T | null> {
  const token = metaToken();
  if (!token) {
    _ultimoErro = "META_ACCESS_TOKEN nao configurado";
    return null;
  }
  const sep = endpoint.includes("?") ? "&" : "?";
  const url = `${metaBase()}${endpoint}${sep}access_token=${token}`;
  try {
    const r = await fetch(url, { cache: "no-store", ...init, signal: init?.signal || AbortSignal.timeout(20_000) });
    const data = (await r.json()) as GraphResp<T>;
    if (data.error) {
      console.warn("[meta]", endpoint, data.error.message);
      _ultimoErro = data.error.message;
      return null;
    }
    _ultimoErro = null;
    return data;
  } catch (e) {
    const msg = (e as Error).message;
    console.warn("[meta]", endpoint, msg);
    _ultimoErro = msg;
    return null;
  }
}

/** Resolve o Ad Account ID: env > primeiro disponível com saldo > qualquer */
export async function resolverAdAccountId(): Promise<string | null> {
  const env = metaAdAccountEnv();
  if (env) return env;
  if (_adAccountIdCache?.token === metaToken()) return _adAccountIdCache.id;

  const data = await call<{ data: Array<{ id: string; account_status: number; balance?: string }> }>(
    "/me/adaccounts?fields=id,account_status,balance"
  );
  if (!data?.data?.length) return null;
  // Prioriza ativos (status=1)
  const ativos = data.data.filter((a) => a.account_status === 1);
  const escolhido = ativos[0] || data.data[0];
  _adAccountIdCache = { token: metaToken(), id: escolhido.id };
  return escolhido.id;
}

export type MetaCampanha = {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  objective: string;
  daily_budget: string;
};

export type MetaAdSet = {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  campaign_id: string;
  daily_budget?: string;
};

export type MetaAd = {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  adset_id: string;
  campaign_id: string;
  creative?: {
    id: string;
    name?: string;
    object_story_spec?: {
      page_id?: string;
      video_data?: {
        video_id?: string;
        call_to_action?: { type: string; value?: { link?: string } };
        message?: string;
      };
      link_data?: {
        link?: string;
        call_to_action?: { type: string };
        message?: string;
      };
    };
    thumbnail_url?: string;
  };
};

export type MetaInsight = {
  ad_id: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  inline_link_clicks?: string;
  outbound_clicks?: Array<{ action_type: string; value: string }>;
  cpc?: string;
  ctr?: string;
  cpm?: string;
  reach?: string;
  date_start?: string;
  date_stop?: string;
};

/** Lista campanhas da conta */
export async function listarCampanhas(adAccountId: string): Promise<MetaCampanha[]> {
  const data = await call<{ data: MetaCampanha[] }>(
    `/${adAccountId}/campaigns?fields=id,name,status,effective_status,objective,daily_budget&limit=100`
  );
  return data?.data || [];
}

/** Lista anúncios de uma conta com creative completo.
 * Meta API NAO aceita DELETED no filtro effective_status (erro subcode 1815001).
 * Anúncios deletados ainda aparecem nos insights com spend — o cruzamento
 * acontece pelo ad_id presente nos insights, nao pela lista de ads ativos.
 */
export async function listarAdsComCreative(adAccountId: string, incluirArquivados = true): Promise<MetaAd[]> {
  const fields = "id,name,status,effective_status,adset_id,campaign_id,creative%7Bid,name,object_story_spec,thumbnail_url%7D";
  // Inclui TODOS status filtráveis pela Meta API (exceto DELETED que a API rejeita).
  // Ads em IN_PROCESS/PENDING_REVIEW (recém-criados) também precisam aparecer.
  const statusFiltro = incluirArquivados
    ? "%5B%22ACTIVE%22%2C%22PAUSED%22%2C%22ARCHIVED%22%2C%22IN_PROCESS%22%2C%22WITH_ISSUES%22%2C%22DISAPPROVED%22%5D"
    : "%5B%22ACTIVE%22%2C%22PAUSED%22%2C%22IN_PROCESS%22%2C%22WITH_ISSUES%22%2C%22DISAPPROVED%22%5D";
  const data = await call<{ data: MetaAd[] }>(
    `/${adAccountId}/ads?fields=${fields}&limit=200&effective_status=${statusFiltro}`
  );
  return data?.data || [];
}

/**
 * Busca insights de TODOS anúncios da conta, agregados por dia.
 * Aceita date_preset OU dias (number) — quando dias é passado, usa time_range custom (since/until)
 * que SEMPRE inclui o dia atual (ao contrário do last_Nd que termina ontem).
 */
export async function buscarInsightsPorAd(
  adAccountId: string,
  presetOrDias: string | number | { since: string; until: string } = "last_30d"
): Promise<MetaInsight[]> {
  const fields = "ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,spend,impressions,clicks,inline_link_clicks,outbound_clicks,cpc,ctr,cpm,reach";

  let timeParam: string;
  if (typeof presetOrDias === "object") {
    timeParam = `time_range=${encodeURIComponent(JSON.stringify(presetOrDias))}`;
  } else if (typeof presetOrDias === "number") {
    // Range customizado: hoje-N até hoje (inclusivo)
    const hoje = new Date();
    const inicio = new Date(hoje.getTime() - (presetOrDias - 1) * 24 * 3600 * 1000);
    const since = inicio.toISOString().slice(0, 10);
    const until = hoje.toISOString().slice(0, 10);
    timeParam = `time_range=${encodeURIComponent(JSON.stringify({ since, until }))}`;
  } else {
    timeParam = `date_preset=${presetOrDias}`;
  }

  const todas: MetaInsight[] = [];
  const currentUrl = `/${adAccountId}/insights?level=ad&fields=${fields}&${timeParam}&time_increment=1&limit=500`;

  const primeiraChamada = await call<{ data: MetaInsight[]; paging?: { next?: string } }>(currentUrl);
  if (!primeiraChamada || !primeiraChamada.data) return todas;

  todas.push(...primeiraChamada.data);
  let nextUrl = primeiraChamada.paging?.next;

  while (nextUrl) {
    try {
      const r = await fetch(nextUrl, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
      const pageData = (await r.json()) as { data: MetaInsight[]; paging?: { next?: string }; error?: any };
      if (pageData.error || !pageData.data) break;
      todas.push(...pageData.data);
      nextUrl = pageData.paging?.next;
    } catch (e) {
      console.warn("[meta] erro paginação insights:", e);
      break;
    }
  }

  return todas;
}

/**
 * Extrai o link de destino + sub_ids de um creative
 * Sub_id da Shopee vem na URL como /sub_id_1-sub_id_2-..../ no shortlink Shopee.
 * Mas o link Meta é o shortlink curto — precisa rastrear pelo nome do anúncio ou pela URL longa.
 *
 * Estratégia: extrai o ID do shortlink (ex: 2g7isJYHFy) e cruza com cliques outbound.
 * Sub_id real é descoberto pelo redirect — mas o Meta não vê isso.
 *
 * Aqui retornamos o shortlink pra cruzamento.
 */
export function extrairLinkDoCreative(ad: MetaAd): string {
  const spec = ad.creative?.object_story_spec;
  return (
    spec?.video_data?.call_to_action?.value?.link ||
    spec?.link_data?.link ||
    ""
  );
}

/** Saúde geral da conta Meta — saldo, status, anúncios em revisão/rejeitados */
export type SaudeContaMeta = {
  ok: boolean;
  contaNome: string;
  contaStatus: number; // 1=ativo, 2=desativado, 3=inadimplente, 7=pausado, 9=em_revisao
  saldo: number; // R$
  saldoMoeda: string;
  spendCap: number;
  anunciosEmRevisao: number;
  anunciosRejeitados: number;
  anunciosAtivos: number;
  token: { vitalicio: boolean; expiraEmHoras: number | null };
  alertas: string[];
};

export async function buscarSaudeConta(adAccountId: string): Promise<SaudeContaMeta | null> {
  const acc = await call<{ id: string; name: string; account_status: number; balance?: string; spend_cap?: string; currency: string; disable_reason?: number }>(
    `/${adAccountId}?fields=id,name,account_status,currency,balance,spend_cap,disable_reason`
  );
  if (!acc) return null;

  // Status dos anúncios
  const adsAtivos = await call<{ data: Array<{ id: string }> }>(
    `/${adAccountId}/ads?fields=id&effective_status=%5B%22ACTIVE%22%5D&limit=200`
  );
  const adsRevisao = await call<{ data: Array<{ id: string; effective_status: string }> }>(
    `/${adAccountId}/ads?fields=id,effective_status&effective_status=%5B%22IN_PROCESS%22%2C%22PENDING_REVIEW%22%5D&limit=50`
  );
  const adsRejeitados = await call<{ data: Array<{ id: string; effective_status: string }> }>(
    `/${adAccountId}/ads?fields=id,effective_status&effective_status=%5B%22DISAPPROVED%22%5D&limit=50`
  );

  // Token info
  const debug = await call<{ data: { is_valid?: boolean; expires_at?: number } }>(
    `/debug_token?input_token=${metaToken()}`
  );
  const expiresAt = debug?.data?.expires_at;
  const vitalicio = expiresAt === 0;
  const expiraEm = expiresAt && expiresAt > 0 ? Math.max(0, expiresAt - Math.floor(Date.now() / 1000)) : null;
  const expiraEmHoras = expiraEm !== null ? Math.floor(expiraEm / 3600) : null;

  const saldoCentavos = parseFloat(acc.balance || "0");
  const saldo = saldoCentavos / 100;
  const spendCap = parseFloat(acc.spend_cap || "0") / 100;

  const alertas: string[] = [];
  if (acc.account_status !== 1) alertas.push(`Conta com status ${acc.account_status} (1=ativo)`);
  if (saldo < 30 && saldo > 0) alertas.push(`Saldo baixo: R$ ${saldo.toFixed(2)} — recarregue antes de pausar`);
  if (saldo === 0) alertas.push("Saldo ZERADO — Meta vai pausar campanhas em breve");
  if (!vitalicio && expiraEmHoras !== null && expiraEmHoras < 24) alertas.push(`Token expira em ${expiraEmHoras}h`);
  if ((adsRejeitados?.data?.length ?? 0) > 0) alertas.push(`${adsRejeitados!.data.length} anúncio(s) REJEITADO(s) precisam de ação`);

  return {
    ok: true,
    contaNome: acc.name,
    contaStatus: acc.account_status,
    saldo,
    saldoMoeda: acc.currency,
    spendCap,
    anunciosEmRevisao: adsRevisao?.data?.length || 0,
    anunciosRejeitados: adsRejeitados?.data?.length || 0,
    anunciosAtivos: adsAtivos?.data?.length || 0,
    token: { vitalicio, expiraEmHoras },
    alertas
  };
}

// ============ AÇÕES EXECUTÁVEIS (Tool Use Nível 2) ============
type AcaoResultado = { ok: boolean; mensagem: string; detalhes?: unknown };

async function patch<T>(endpoint: string, body: Record<string, string>): Promise<T | null> {
  const token = metaToken();
  if (!token) {
    _ultimoErro = "META_ACCESS_TOKEN nao configurado";
    return null;
  }
  const params = new URLSearchParams({ ...body, access_token: token });
  const url = `${metaBase()}${endpoint}`;
  try {
    const r = await fetch(url, { method: "POST", body: params, cache: "no-store", signal: AbortSignal.timeout(20_000) });
    const data = (await r.json()) as GraphResp<T>;
    if (data.error) {
      _ultimoErro = data.error.message;
      return null;
    }
    _ultimoErro = null;
    return data;
  } catch (e) {
    _ultimoErro = (e as Error).message;
    return null;
  }
}

/** Pausa um anúncio do Meta (status: ACTIVE -> PAUSED) */
export async function pausarAnuncio(adId: string): Promise<AcaoResultado> {
  if (!metaConfigurado()) return { ok: false, mensagem: "Meta nao configurado" };
  const r = await patch<{ success?: boolean; id?: string }>(`/${adId}`, { status: "PAUSED" });
  if (!r) return { ok: false, mensagem: ultimoErroMeta() || "Falha ao pausar" };
  return { ok: true, mensagem: `Anúncio ${adId} pausado.`, detalhes: r };
}

/** Ativa um anúncio do Meta (status: PAUSED -> ACTIVE) */
export async function ativarAnuncio(adId: string): Promise<AcaoResultado> {
  if (!metaConfigurado()) return { ok: false, mensagem: "Meta nao configurado" };
  const r = await patch<{ success?: boolean; id?: string }>(`/${adId}`, { status: "ACTIVE" });
  if (!r) return { ok: false, mensagem: ultimoErroMeta() || "Falha ao ativar" };
  return { ok: true, mensagem: `Anúncio ${adId} ativado.`, detalhes: r };
}

/** Escala orçamento de adset OU campanha em X% (positivo sobe, negativo desce). Aplica na campanha se for CBO, ou no adset se for ABO. */
export async function escalarOrcamento(
  alvoId: string,
  alvoTipo: "campaign" | "adset",
  percentual: number
): Promise<AcaoResultado> {
  if (!metaConfigurado()) return { ok: false, mensagem: "Meta nao configurado" };
  if (Math.abs(percentual) > 100) {
    return { ok: false, mensagem: "Percentual fora de [-100%, +100%] — escalonar gradualmente é regra" };
  }

  // Busca orçamento atual
  const atual = await call<{ id: string; daily_budget?: string; lifetime_budget?: string; name?: string }>(
    `/${alvoId}?fields=id,name,daily_budget,lifetime_budget`
  );
  if (!atual) return { ok: false, mensagem: ultimoErroMeta() || "Não consegui ler orçamento atual" };

  const atualValor = parseFloat(atual.daily_budget || atual.lifetime_budget || "0");
  if (atualValor === 0) {
    return { ok: false, mensagem: "Orçamento atual é 0 ou não está nesse nível (talvez seja CBO no adset)" };
  }

  const novoValor = Math.round(atualValor * (1 + percentual / 100));
  const campo = atual.daily_budget ? "daily_budget" : "lifetime_budget";

  const r = await patch<{ success?: boolean }>(`/${alvoId}`, { [campo]: String(novoValor) });
  if (!r) return { ok: false, mensagem: ultimoErroMeta() || "Falha ao atualizar orçamento" };

  const valorR$Antes = (atualValor / 100).toFixed(2);
  const valorR$Depois = (novoValor / 100).toFixed(2);
  return {
    ok: true,
    mensagem: `${alvoTipo === "campaign" ? "Campanha" : "Conjunto"} ${alvoId} ajustado de R$ ${valorR$Antes}/dia → R$ ${valorR$Depois}/dia (${percentual >= 0 ? "+" : ""}${percentual}%)`,
    detalhes: { antes: atualValor, depois: novoValor, campo }
  };
}

/** Extrai sub_id_1 e sub_id_2 da hierarquia campanha > conjunto > anúncio.
 * Prioridade: campaignName > adsetName > adName.
 * Assim campanhas com nomes flag (Cri03, Cri02) diferenciam anúncios
 * mesmo quando todos têm o mesmo ad_name.
 */
export function inferirSubIdsDoAdName(
  adName: string,
  campaignName?: string,
  adsetName?: string
): { subId1: string; subId2: string } {
  const nomes = [campaignName, adsetName, adName].filter((n): n is string => Boolean(n?.trim()));

  for (const raw of nomes) {
    const nome = raw.trim();
    const upper = nome.toUpperCase();

    // Padrão 1: "MetaAds_Cri01" ou "MetaAds-Cri02"
    const explicito = upper.match(/META\s?ADS[_\-\s]+(CRI\s?\d+|[A-Z0-9]{3,15})/i);
    if (explicito && explicito[1]) {
      return {
        subId1: "MetaAds",
        subId2: explicito[1].replace(/\s+/g, "").replace(/^CRI/i, "Cri")
      };
    }

    // Padrão 2: "Cri 03", "Cri02", "Criativo 02" — standalone no nome
    const criMatch = upper.match(/\b(?:CRI|CRIATIVO)\s*0?([0-9]{1,2})\b/i);
    if (criMatch) {
      const n = criMatch[1].padStart(2, "0");
      return { subId1: "MetaAds", subId2: `Cri${n}` };
    }

    // Padrão 3: "Anuncio 01", "Anuncio 02", "Ad 1"
    const numMatch = nome.match(/(?:an[uú]ncio|anuncio|ad)\s*0?([0-9]{1,2})\b/i);
    if (numMatch) {
      const n = numMatch[1].padStart(2, "0");
      return { subId1: "MetaAds", subId2: `Cri${n}` };
    }
  }

  // Fallback: nenhum nome tem informação de criativo
  return { subId1: "MetaAds", subId2: "" };
}
