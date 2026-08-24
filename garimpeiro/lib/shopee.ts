import crypto from "crypto";
import type { Produto } from "./types";
import { lerConfig } from "./configs";

function getApiUrl(): string {
  return lerConfig("SHOPEE_AFFILIATE_API") || "https://open-api.affiliate.shopee.com.br/graphql";
}

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string; extensions?: unknown }>;
};

function assinar(payload: string): { authorization: string; timestamp: number } | null {
  const appId = lerConfig("SHOPEE_APP_ID");
  const partnerKey = lerConfig("SHOPEE_PARTNER_KEY");
  if (!appId || !partnerKey) return null;

  const timestamp = Math.floor(Date.now() / 1000);
  const baseString = `${appId}${timestamp}${payload}${partnerKey}`;
  const signature = crypto.createHash("sha256").update(baseString).digest("hex");

  return {
    authorization: `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`,
    timestamp
  };
}

async function chamarGraphQL<T>(query: string, variables?: Record<string, unknown>): Promise<GraphQLResponse<T>> {
  const payload = JSON.stringify({ query, variables: variables || {} });
  const auth = assinar(payload);
  if (!auth) throw new Error("Credenciais Shopee nao configuradas. Vai em /configuracoes pra configurar.");

  const res = await fetch(getApiUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: auth.authorization
    },
    body: payload,
    signal: AbortSignal.timeout(20_000)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopee API ${res.status}: ${text.slice(0, 300)}`);
  }

  return (await res.json()) as GraphQLResponse<T>;
}

type ProductOfferNode = {
  itemId: string;
  productName: string;
  commissionRate: string; // total
  commission: string; // valor R$
  sellerCommissionRate?: string;
  shopeeCommissionRate?: string;
  appNewRate?: string;
  appExistRate?: string;
  webNewRate?: string;
  webExistRate?: string;
  sales: number;
  imageUrl: string;
  productLink: string;
  offerLink: string;
  price?: string;
  priceMin: string;
  priceMax: string;
  priceDiscountRate?: string | number;
  shopId: number;
  shopName?: string;
  shopType?: number[];
  productCatIds: number[];
  ratingStar?: string;
  periodStartTime?: number;
  periodEndTime?: number;
};

type ProductOfferV2Response = {
  productOfferV2: {
    nodes: ProductOfferNode[];
    pageInfo: { page: number; limit: number; hasNextPage: boolean };
  };
};

const QUERY_PRODUCT_OFFER = `
  query productOfferV2($keyword: String, $sortType: Int, $page: Int, $limit: Int, $listType: Int) {
    productOfferV2(keyword: $keyword, sortType: $sortType, page: $page, limit: $limit, listType: $listType) {
      nodes {
        itemId
        productName
        commissionRate
        commission
        sellerCommissionRate
        shopeeCommissionRate
        appNewRate
        appExistRate
        webNewRate
        webExistRate
        sales
        imageUrl
        productLink
        offerLink
        price
        priceMin
        priceMax
        priceDiscountRate
        shopId
        shopName
        shopType
        productCatIds
        ratingStar
        periodStartTime
        periodEndTime
      }
      pageInfo { page limit hasNextPage }
    }
  }
`;

function escapeGraphQL(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function buscarProdutosShopee(palavraChave: string, limit = 50, page = 1, sortType = 1): Promise<ProductOfferNode[]> {
  const resp = await chamarGraphQL<ProductOfferV2Response>(QUERY_PRODUCT_OFFER, {
    keyword: palavraChave,
    sortType,
    page,
    limit,
    listType: 0
  });
  if (resp.errors?.length) throw new Error(resp.errors.map((e) => e.message).join("; "));
  return resp.data?.productOfferV2?.nodes ?? [];
}

export async function gerarLinkAfiliado(linkProduto: string, subId?: string): Promise<string> {
  if (!linkProduto) return linkProduto;
  // Sub ID precisa ser alfanumerico, sem hifen/underscore, max ~10 chars
  const subIdLimpo = (subId || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
  const urlEscapada = escapeGraphQL(linkProduto);
  const inputCampos = subIdLimpo
    ? `{originUrl: "${urlEscapada}", subIds: ["${subIdLimpo}"]}`
    : `{originUrl: "${urlEscapada}"}`;
  const query = `mutation { generateShortLink(input: ${inputCampos}) { shortLink } }`;

  try {
    const resp = await chamarGraphQL<{ generateShortLink: { shortLink: string } }>(query);
    if (resp.errors?.length) {
      console.warn("[shopee] generateShortLink:", resp.errors[0]?.message);
      return linkProduto;
    }
    return resp.data?.generateShortLink?.shortLink || linkProduto;
  } catch (e) {
    console.warn("[shopee] generateShortLink falhou:", (e as Error).message);
    return linkProduto;
  }
}

/** Gera link com até 5 sub_ids posicionais. Limpeza alfanumérica em cada sub_id (regra Shopee). */
export async function gerarLinkComSubIds(
  linkProduto: string,
  subIds: string[]
): Promise<{ ok: boolean; shortLink?: string; erro?: string }> {
  if (!linkProduto) return { ok: false, erro: "URL do produto vazia" };
  const limpos = subIds.map((s) => (s || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 50)).filter((s) => s.length > 0);
  const urlEscapada = escapeGraphQL(linkProduto);
  const subIdsArray = limpos.map((s) => `"${s}"`).join(", ");
  const inputCampos = limpos.length > 0
    ? `{originUrl: "${urlEscapada}", subIds: [${subIdsArray}]}`
    : `{originUrl: "${urlEscapada}"}`;
  const query = `mutation { generateShortLink(input: ${inputCampos}) { shortLink } }`;

  try {
    const resp = await chamarGraphQL<{ generateShortLink: { shortLink: string } }>(query);
    if (resp.errors?.length) {
      return { ok: false, erro: resp.errors[0]?.message || "Erro Shopee" };
    }
    const link = resp.data?.generateShortLink?.shortLink;
    if (!link) return { ok: false, erro: "API Shopee não retornou shortLink" };
    return { ok: true, shortLink: link };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

// Shopee shopType codes (descobertos por engenharia reversa):
// 1 = preferred/loja preferida, 2 = mall, 3 = official, 4 = key seller
function classificarShop(shopType: number[] | undefined) {
  const arr = Array.isArray(shopType) ? shopType : [];
  return {
    oficial: arr.includes(3) || arr.includes(2),
    preferred: arr.includes(1) || arr.includes(4)
  };
}

export function adaptarProduto(node: ProductOfferNode, nichoId: string): Produto {
  const precoBruto = parseFloat(node.price || node.priceMin || "0");
  const preco = precoBruto;
  const descontoTaxaRaw = node.priceDiscountRate;
  // priceDiscountRate vem como Int (ex: 30 = 30%) no schema atual
  const descontoPct = typeof descontoTaxaRaw === "number"
    ? descontoTaxaRaw
    : parseFloat(String(descontoTaxaRaw || "0")) * (parseFloat(String(descontoTaxaRaw || "0")) < 1 ? 100 : 1);
  const precoOriginal = descontoPct > 0 && descontoPct < 100
    ? Math.round((preco / (1 - descontoPct / 100)) * 100) / 100
    : parseFloat(node.priceMax || node.priceMin || "0");

  // commissionRate da API JA E O TOTAL (incluindo bonus do seller).
  const comissaoPct = parseFloat(node.commissionRate || "0") * 100;
  const comissaoExtraPct = parseFloat(node.sellerCommissionRate || "0") * 100;
  const comissaoValor = parseFloat(node.commission || "0");
  // appNewRate é a comissão pra usuario novo (geralmente maior)
  const comissaoNovoUsuarioPct = parseFloat(node.appNewRate || "0") * 100;

  const rating = parseFloat(node.ratingStar || "0");
  const { oficial, preferred } = classificarShop(node.shopType);

  // A Shopee usa ocasionalmente uma data sentinela muito distante (ex.: ano 3000)
  // para ofertas sem prazo. Ela não deve aparecer como "centenas de milhares de dias".
  const fimOfertaBruto = Number(node.periodEndTime || 0);
  const fimOferta = fimOfertaBruto > 4_102_444_800 ? 0 : fimOfertaBruto; // 01/01/2100

  return {
    id: `${node.shopId}-${node.itemId}`,
    itemId: parseInt(node.itemId, 10),
    shopId: node.shopId,
    nome: node.productName,
    imagem: node.imageUrl || "",
    preco,
    precoOriginal,
    comissaoPct,
    comissaoExtraPct,
    comissaoValor,
    comissaoNovoUsuarioPct,
    vendas: node.sales || 0,
    rating,
    afiliados: 0,
    estoque: 0,
    loja: node.shopName || "",
    lojaOficial: oficial,
    lojaPreferred: preferred,
    shopType: (node.shopType || []).map(String),
    categoria: (node.productCatIds || []).join(","),
    nichoId,
    linkAfiliado: node.offerLink || node.productLink,
    linkProduto: node.productLink,
    videosAprenderCriadores: 0,
    cupomDisponivel: false,
    inicioOferta: node.periodStartTime || 0,
    fimOferta,
    scoreOportunidade: 0,
    garimpadoEm: new Date().toISOString()
  };
}

export function shopeeConfigurado(): boolean {
  return Boolean(lerConfig("SHOPEE_APP_ID") && lerConfig("SHOPEE_PARTNER_KEY"));
}

// ============ CONVERSION REPORT (analytics reais) ============
// Schema atualizado em 2026-05: campos de ordem/item agora ficam em `orders[].items[]`,
// argumentos renomeados pra purchaseTimeStart/purchaseTimeEnd, paginação por scrollId.
// Sub-IDs ficam concatenados em `utmContent` no formato "sub1-sub2-sub3-sub4-sub5".

type ConversionNode = {
  conversionId?: string;
  purchaseTime?: number;
  completeTime?: number;
  clickTime?: number;
  shopId?: number;
  shopName?: string;
  itemId?: number;
  productName?: string;
  orderId?: string;
  totalCommission?: string;
  shopeeCommission?: string;
  sellerCommission?: string;
  amount?: string;
  payoutAmount?: string;
  status?: string;
  /** Origem reportada pela Shopee no nível da conversão (ex: "Facebook", "Shopeevideo-Shopee") */
  referrer?: string;
  /** channelType do item principal (ex: "Shopee Video", "Social Medias") */
  channelType?: string;
  /** "SELLER_OPEN_CAMPAIGN" (boost de comissão pago pelo seller) ou "NON_SELLER_CAMPAIGN" */
  campaignType?: string;
  attributionType?: string;
  campaignPartnerName?: string;
  buyerType?: string;
  device?: string;
  productType?: string;
  /** URL da imagem do item principal (vem direto da API Shopee no item da conversão) */
  productImage?: string;
  /** Quantidade total de itens da ordem */
  quantity?: number;
  /** mantido pra compat retro */
  source?: string;
  subId1?: string;
  subId2?: string;
  subId3?: string;
  subId4?: string;
  subId5?: string;
};

type ConversionReportItemRaw = {
  shopId?: number;
  shopName?: string;
  itemId?: number;
  itemName?: string;
  itemPrice?: string;
  actualAmount?: string;
  refundAmount?: string;
  qty?: number;
  imageUrl?: string;
  itemCommission?: string;
  itemTotalCommission?: string;
  itemSellerCommission?: string;
  completeTime?: number;
  displayItemStatus?: string;
  channelType?: string;
  attributionType?: string;
  campaignType?: string;
  campaignPartnerName?: string;
};

type ConversionReportOrderRaw = {
  orderId?: string;
  orderStatus?: string;
  shopType?: string;
  items?: ConversionReportItemRaw[];
};

type ConversionReportRaw = {
  conversionId?: number;
  purchaseTime?: number;
  clickTime?: number;
  conversionStatus?: string;
  totalCommission?: string;
  sellerCommission?: string;
  shopeeCommissionCapped?: string;
  grossCommission?: string;
  netCommission?: string;
  utmContent?: string;
  referrer?: string;
  buyerType?: string;
  device?: string;
  productType?: string;
  orders?: ConversionReportOrderRaw[];
};

/** Parseia utmContent no formato "sub1-sub2-sub3-sub4-sub5" (segmentos vazios = "") */
function parseUtmContent(utm: string | undefined): {
  subId1: string; subId2: string; subId3: string; subId4: string; subId5: string;
} {
  const partes = (utm || "").split("-");
  return {
    subId1: partes[0] || "",
    subId2: partes[1] || "",
    subId3: partes[2] || "",
    subId4: partes[3] || "",
    subId5: partes[4] || ""
  };
}

/**
 * Uma ordem pode trazer vários itens. Alguns payloads deixam o channelType do
 * primeiro vazio, então priorizamos qualquer item marcado como Live/Vídeo antes
 * de cair no primeiro valor disponível.
 */
function escolherChannelType(items: ConversionReportItemRaw[]): string {
  const tipos = items.map((item) => (item.channelType || "").trim()).filter(Boolean);
  const normalizar = (valor: string) => valor.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return tipos.find((tipo) => normalizar(tipo).includes("shopeelive"))
    || tipos.find((tipo) => normalizar(tipo).includes("shopeevideo"))
    || tipos[0]
    || "";
}

/** Achata a resposta nova (1 conversion → N orders → N items) numa lista compatível com o esquema antigo (1 conversão = 1 venda). */
function achatarConversoes(reports: ConversionReportRaw[]): ConversionNode[] {
  const out: ConversionNode[] = [];
  for (const r of reports) {
    const subs = parseUtmContent(r.utmContent);
    const orders = r.orders || [];
    if (orders.length === 0) continue;

    for (const o of orders) {
      const items = o.items || [];
      if (items.length === 0) continue;

      // Soma valores agregados da ordem (1 ordem pode ter N itens)
      const amountTotal = items.reduce((s, it) => s + parseFloat(it.actualAmount || "0"), 0);
      const refundTotal = items.reduce((s, it) => s + parseFloat(it.refundAmount || "0"), 0);
      // Comissão: usa totalCommission da conversão (já é agregado dos items dessa conversão)
      // Se 1 conversion tem N orders, divide proporcionalmente pela razão de amount
      const totalCommissionConv = parseFloat(r.totalCommission || "0");
      const sellerCommissionConv = parseFloat(r.sellerCommission || "0");
      const shopeeCommissionConv = parseFloat(r.shopeeCommissionCapped || "0");
      const todasOrdersAmount = orders.reduce(
        (s, ord) => s + (ord.items || []).reduce((ss, it) => ss + parseFloat(it.actualAmount || "0"), 0),
        0
      );
      const fator = todasOrdersAmount > 0 ? amountTotal / todasOrdersAmount : 1 / orders.length;

      // Item principal = primeiro item (pra exibir nome/imagem); pra agregação usar somatórios
      const principal = items[0];
      const completeTime = items.reduce((m, it) => Math.max(m, it.completeTime || 0), 0);

      out.push({
        conversionId: String(r.conversionId || ""),
        purchaseTime: r.purchaseTime || 0,
        completeTime,
        clickTime: r.clickTime || 0,
        shopId: principal.shopId || 0,
        shopName: principal.shopName || "",
        itemId: principal.itemId || 0,
        productName: principal.itemName || "",
        productImage: principal.imageUrl || "",
        quantity: items.reduce((total, item) => total + Math.max(1, item.qty || 1), 0),
        orderId: o.orderId || "",
        totalCommission: (totalCommissionConv * fator).toFixed(4),
        sellerCommission: (sellerCommissionConv * fator).toFixed(4),
        shopeeCommission: (shopeeCommissionConv * fator).toFixed(4),
        amount: amountTotal.toFixed(2),
        payoutAmount: Math.max(0, amountTotal - refundTotal).toFixed(2),
        status: o.orderStatus || r.conversionStatus || "",
        referrer: r.referrer || "",
        channelType: escolherChannelType(items),
        campaignType: principal.campaignType || "",
        attributionType: principal.attributionType || "",
        campaignPartnerName: principal.campaignPartnerName || "",
        buyerType: r.buyerType || "",
        device: r.device || "",
        productType: r.productType || "",
        source: r.referrer || "", // alias retrocompat
        subId1: subs.subId1,
        subId2: subs.subId2,
        subId3: subs.subId3,
        subId4: subs.subId4,
        subId5: subs.subId5
      });
    }
  }
  return out;
}

/** Query inline com literais (Int64 não é tipo GraphQL padrão e variables falham com "wrong type"). */
function montarQueryConversion(start: number, end: number, scrollId: string, limit: number): string {
  const sc = scrollId.replace(/"/g, '\\"');
  return `{
    conversionReport(purchaseTimeStart: ${start}, purchaseTimeEnd: ${end}, limit: ${limit}, scrollId: "${sc}") {
      nodes {
        conversionId
        purchaseTime
        clickTime
        conversionStatus
        totalCommission
        sellerCommission
        shopeeCommissionCapped
        grossCommission
        netCommission
        utmContent
        referrer
        buyerType
        device
        productType
        orders {
          orderId
          orderStatus
          items {
            shopId
            shopName
            itemId
            itemName
            itemPrice
            actualAmount
            refundAmount
            qty
            imageUrl
            itemCommission
            itemTotalCommission
            itemSellerCommission
            completeTime
            displayItemStatus
            channelType
            attributionType
            campaignType
            campaignPartnerName
          }
        }
      }
      pageInfo { page limit hasNextPage scrollId }
    }
  }`;
}

export async function buscarConversoes(diasAtras = 30, inicioTs?: number, fimTs?: number): Promise<ConversionNode[]> {
  const endTime = fimTs || Math.floor(Date.now() / 1000);
  const startTime = inicioTs || (endTime - diasAtras * 24 * 3600);
  const todas: ConversionReportRaw[] = [];

  // Paginação por scrollId — até 100 páginas (10.000 conversões, pra cobrir períodos bem longos)
  let scrollId = "";
  for (let pagina = 1; pagina <= 100; pagina++) {
    try {
      const resp = await chamarGraphQL<{
        conversionReport: { nodes: ConversionReportRaw[]; pageInfo: { hasNextPage: boolean; scrollId: string } };
      }>(montarQueryConversion(startTime, endTime, scrollId, 100));
      if (resp.errors?.length) {
        console.warn("[shopee] conversionReport:", resp.errors[0]?.message);
        break;
      }
      const nodes = resp.data?.conversionReport?.nodes || [];
      todas.push(...nodes);
      const info = resp.data?.conversionReport?.pageInfo;
      if (!info?.hasNextPage || !info.scrollId) break;
      scrollId = info.scrollId;
    } catch (e) {
      console.warn("[shopee] conversionReport falhou:", (e as Error).message);
      break;
    }
  }

  return achatarConversoes(todas);
}

// ============ SHOP OFFER V2 (lojas parceiras) ============
type ShopOfferNode = {
  shopId: number;
  shopName: string;
  commissionRate: string;
  imageUrl?: string;
  offerLink: string;
  shopType?: string[];
  ratingStar?: string;
  periodStartTime?: number;
  periodEndTime?: number;
};

export async function buscarLojas(keyword?: string, limit = 20): Promise<ShopOfferNode[]> {
  const args = keyword ? `keyword: "${escapeGraphQL(keyword)}", page: 1, limit: ${limit}` : `page: 1, limit: ${limit}`;
  const query = `query {
    shopOfferV2(${args}) {
      nodes {
        shopId shopName commissionRate imageUrl offerLink ratingStar shopType
      }
      pageInfo { page limit hasNextPage }
    }
  }`;
  try {
    const resp = await chamarGraphQL<{ shopOfferV2: { nodes: ShopOfferNode[] } }>(query);
    if (resp.errors?.length) {
      console.warn("[shopee] shopOfferV2:", resp.errors[0]?.message);
      return [];
    }
    return resp.data?.shopOfferV2?.nodes || [];
  } catch (e) {
    console.warn("[shopee] shopOfferV2 falhou:", (e as Error).message);
    return [];
  }
}

// ============ Geração de link com canal/contexto (subId rastreável) ============
export type CanalDistribuicao = "shopeevd" | "reels" | "tiktok" | "kwai" | "ytshorts" | "facebook" | "wpp" | "tg" | "site" | "qrcode";

export const CANAIS: { id: CanalDistribuicao; nome: string }[] = [
  { id: "shopeevd", nome: "Shopee Vídeo" },
  { id: "reels", nome: "Instagram Reels" },
  { id: "tiktok", nome: "TikTok" },
  { id: "kwai", nome: "Kwai" },
  { id: "ytshorts", nome: "YouTube Shorts" },
  { id: "facebook", nome: "Facebook" },
  { id: "wpp", nome: "WhatsApp" },
  { id: "tg", nome: "Telegram" },
  { id: "site", nome: "Site/Blog" },
  { id: "qrcode", nome: "QR Code" }
];

export async function gerarLinkPorCanal(linkProduto: string, canal: CanalDistribuicao): Promise<string> {
  return gerarLinkAfiliado(linkProduto, canal);
}

export async function gerarLinksPorCanais(linkProduto: string, canais: CanalDistribuicao[]): Promise<Record<string, string>> {
  const resultado: Record<string, string> = {};
  for (const c of canais) {
    resultado[c] = await gerarLinkPorCanal(linkProduto, c);
  }
  return resultado;
}
