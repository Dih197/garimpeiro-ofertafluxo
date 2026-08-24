/**
 * Classificação de canais de venda Shopee.
 *
 * A API conversionReport da Shopee retorna múltiplos sinais de origem:
 *   - utmContent: sub_ids do link de afiliado, ex: "MetaAds-Cri02---"
 *   - referrer: rede de origem, ex: "Facebook", "Shopeevideo-Shopee"
 *   - channelType (no item): canal Shopee, ex: "Shopee Video", "Shopee Live"
 *   - campaignType: "SELLER_OPEN_CAMPAIGN" (boost pago do seller) vs "NON_SELLER_CAMPAIGN"
 *   - sellerCommission: > 0 quando o seller aceitou aumentar comissão (campanha de produto)
 *
 * A lógica abaixo combina esses sinais pra responder duas perguntas:
 *   1. **tipo**: a venda veio de tráfego pago/campanha externa ou de origem orgânica?
 *   2. **canal**: qual é a origem específica (Meta Ads, Shopee Vídeo, TikTok, etc)?
 *
 * Importante:
 *   - "campanha" aqui = tráfego que o afiliado pagou (Meta Ads, Google, TikTok Ads).
 *     NÃO é o mesmo que `campaignType: SELLER_OPEN_CAMPAIGN` da Shopee (que é boost de comissão do seller).
 *   - Vendas orgânicas Shopee Vídeo são as que dão escala sem custo, então a separação importa.
 */

export type TipoTrafego = "campanha" | "organico" | "indefinido";

export type CategoriaCanal =
  | "meta_ads"
  | "shopee_video"
  | "shopee_live"
  | "tiktok"
  | "kwai"
  | "instagram_reels"
  | "youtube"
  | "whatsapp"
  | "telegram"
  | "site_blog"
  | "qrcode"
  | "outros_organico"
  | "direto";

export type ClassificacaoCanal = {
  tipo: TipoTrafego;
  canal: string;          // nome amigável pra UI
  categoria: CategoriaCanal; // chave estável pra agregação
};

type SinaisVenda = {
  /** sub_id_1 do utmContent (ex: "MetaAds", "tiktok", "shopeevd") */
  subId?: string;
  /** referrer no nível da conversão (ex: "Facebook", "Shopeevideo-Shopee", "Instagram") */
  referrer?: string;
  /** channelType do item principal (ex: "Shopee Video", "Social Medias") */
  channelType?: string;
};

/**
 * Normaliza os sinais porque a Shopee já retornou variações de caixa, hífen e
 * espaçamento para o mesmo canal ao longo das versões do conversionReport.
 */
function normalizarSinal(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sinalContem(valor: string, termos: string[]): boolean {
  const compacto = valor.replace(/\s+/g, "");
  return termos.some((termo) => {
    const normalizado = normalizarSinal(termo);
    return valor.includes(normalizado) || compacto.includes(normalizado.replace(/\s+/g, ""));
  });
}

/** Sub_IDs custom que o sistema gera ao criar links — mapeia pra categoria. */
const SUBID_PARA_CATEGORIA: Record<string, CategoriaCanal> = {
  metaads: "meta_ads",
  shopeevd: "shopee_video",
  reels: "instagram_reels",
  tiktok: "tiktok",
  kwai: "kwai",
  ytshorts: "youtube",
  facebook: "instagram_reels", // org Facebook → tratado como rede social orgânica
  wpp: "whatsapp",
  tg: "telegram",
  site: "site_blog",
  qrcode: "qrcode"
};

const NOMES_AMIGAVEIS: Record<CategoriaCanal, string> = {
  meta_ads: "Meta Ads",
  shopee_video: "Shopee Vídeo",
  shopee_live: "Shopee Live",
  tiktok: "TikTok",
  kwai: "Kwai",
  instagram_reels: "Instagram Reels",
  youtube: "YouTube Shorts",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  site_blog: "Site/Blog",
  qrcode: "QR Code",
  outros_organico: "Outros (orgânico)",
  direto: "Sem rastreio"
};

/** Categorias que representam tráfego pago do afiliado. */
const CATEGORIAS_CAMPANHA = new Set<CategoriaCanal>(["meta_ads"]);

export function classificarCanal(s: SinaisVenda): ClassificacaoCanal {
  const sub = (s.subId || "").trim();
  const subLower = sub.toLowerCase();
  const ref = (s.referrer || "").trim();
  const ch = (s.channelType || "").trim();
  const refNormalizado = normalizarSinal(ref);
  const canalNormalizado = normalizarSinal(ch);

  // 1. Meta Ads — sub_id explícito tem prioridade máxima (o sistema gera links assim)
  if (sub === "MetaAds" || subLower === "metaads") {
    return montar("meta_ads");
  }

  // 2. Shopee Live — aceita as variações já vistas no painel/API
  if (
    sinalContem(canalNormalizado, ["Shopee Live", "Shopee Livestream", "Live Streaming"]) ||
    sinalContem(refNormalizado, ["Shopee Live", "ShopeeLive", "Shopeelive-Shopee"]) ||
    ["live", "livestream"].includes(canalNormalizado)
  ) {
    return montar("shopee_live");
  }

  // 3. Shopee Vídeo — referrer da Shopee OU channelType do item
  //    Importante: precisa vir antes de "Facebook/Instagram" pq às vezes o usuário compartilha
  //    o link do Shopee Vídeo no Facebook e referrer pode ficar Facebook — nesse caso o
  //    channelType "Shopee Video" desempata corretamente.
  if (
    sinalContem(canalNormalizado, ["Shopee Video", "Shopee Video Feed"]) ||
    sinalContem(refNormalizado, ["Shopee Video", "ShopeeVideo", "Shopeevideo-Shopee"])
  ) {
    return montar("shopee_video");
  }

  // 4. Sub_ID customizado conhecido (links gerados pelo sistema)
  if (subLower && SUBID_PARA_CATEGORIA[subLower]) {
    return montar(SUBID_PARA_CATEGORIA[subLower]);
  }

  // 5. Referrer Meta — Facebook/Instagram sem sub_id MetaAds = orgânico de rede social
  //    (compartilhamento manual). Não é Meta Ads, mas é tráfego de rede social.
  if (["facebook", "instagram", "fb", "ig"].includes(refNormalizado)) {
    return montar("instagram_reels"); // agrupa Facebook/Instagram orgânico aqui
  }

  // 6. Outras redes externas
  if (refNormalizado === "tiktok") return montar("tiktok");
  if (refNormalizado === "kwai") return montar("kwai");
  if (["youtube", "yt"].includes(refNormalizado)) return montar("youtube");

  // 7. Tem sub_id mas não é conhecido = orgânico não categorizado
  if (sub) return montar("outros_organico");

  // 8. Sem identificação
  return montar("direto");
}

function montar(categoria: CategoriaCanal): ClassificacaoCanal {
  return {
    tipo: CATEGORIAS_CAMPANHA.has(categoria) ? "campanha" : "organico",
    canal: NOMES_AMIGAVEIS[categoria],
    categoria
  };
}

export function nomeCanal(categoria: CategoriaCanal): string {
  return NOMES_AMIGAVEIS[categoria] || categoria;
}

/** Retorna todas as categorias e seus nomes (pra UI/legendas). */
export function listarCategorias(): Array<{ categoria: CategoriaCanal; nome: string; tipo: TipoTrafego }> {
  return (Object.keys(NOMES_AMIGAVEIS) as CategoriaCanal[]).map((c) => ({
    categoria: c,
    nome: NOMES_AMIGAVEIS[c],
    tipo: CATEGORIAS_CAMPANHA.has(c) ? "campanha" : "organico"
  }));
}
