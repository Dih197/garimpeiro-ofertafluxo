/**
 * Constantes compartilhadas em todo o sistema.
 * Fonte única de verdade pra valores que aparecem em múltiplos lugares.
 */

/** Imposto Meta Ads no Brasil (CIDE + ISS sobre serviços do exterior) */
export const IMPOSTO_META = 0.13;
export const FATOR_IMPOSTO_META = 1 + IMPOSTO_META; // 1.13

/** Cookie de atribuição da Shopee Affiliate */
export const COOKIE_DIAS_SHOPEE = 7;

/** Auto-refresh do Painel ROI */
export const AUTO_REFRESH_MIN = 5;
export const AUTO_REFRESH_MS = AUTO_REFRESH_MIN * 60 * 1000;

/** Período máximo de query em conversionReport Shopee (paginação interna) */
export const SHOPEE_CONVERSION_MAX_PAGES = 5;
export const SHOPEE_CONVERSION_PAGE_LIMIT = 100;

/** Limites de regras pra evitar quebrar campanhas */
export const ESCALA_MAXIMA_PCT = 50;
export const REDUCAO_MAXIMA_PCT = 25;

/** Aplica imposto Meta ao valor de gasto. Aceita taxa opcional (default 13% BR). */
export function comImpostoMeta(spendBruto: number, taxa?: number): number {
  return spendBruto * (1 + (taxa ?? IMPOSTO_META));
}
