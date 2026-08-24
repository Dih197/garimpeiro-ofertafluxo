/**
 * Helpers de data com fuso horário consistente.
 *
 * IMPORTANTE: Meta API e Shopee API retornam datas no fuso da conta (BR=America/Sao_Paulo).
 * O servidor Node geralmente roda em UTC. Se usarmos `new Date().toISOString().slice(0, 10)`
 * direto, pode dar diferença de 1 dia (ex: 03h UTC = 00h BR; 23h BR = 02h UTC do dia seguinte).
 *
 * Solução: SEMPRE usar fuso America/Sao_Paulo pra queries de "hoje", "ontem" e ranges.
 */

const TZ_BR = "America/Sao_Paulo";

/** Data atual em fuso de Brasília no formato YYYY-MM-DD */
export function dataHojeBR(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ_BR }).format(new Date());
}

/** Data de ontem em fuso de Brasília no formato YYYY-MM-DD */
export function dataOntemBR(): string {
  const ontem = new Date(Date.now() - 24 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ_BR }).format(ontem);
}

/** Data de N dias atrás em fuso de Brasília */
export function dataDiasAtrasBR(diasAtras: number): string {
  const d = new Date(Date.now() - diasAtras * 24 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ_BR }).format(d);
}

/**
 * Último dia já fechado no Painel de Controle do Afiliado Shopee.
 * A Shopee publica o fechamento diário às 17:30 (horário de Brasília):
 * antes disso, D-2; depois disso, D-1.
 */
export function dataUltimoFechamentoShopeeBR(): string {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ_BR,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());
  const hora = Number(partes.find((parte) => parte.type === "hour")?.value || 0);
  const minuto = Number(partes.find((parte) => parte.type === "minute")?.value || 0);
  return dataDiasAtrasBR(hora * 60 + minuto >= 17 * 60 + 30 ? 1 : 2);
}

/** Timestamp Unix (segundos) do INÍCIO do dia em Brasília (00h00 BR) */
export function timestampInicioDiaBR(dataYYYYMMDD: string): number {
  // T00:00:00-03:00 representa meia-noite em Brasília (UTC-3 sem DST hoje)
  // Use Intl pra ser robusto a futuras mudanças de fuso
  const t = new Date(`${dataYYYYMMDD}T00:00:00-03:00`).getTime();
  return Math.floor(t / 1000);
}

/** Timestamp Unix (segundos) do FIM do dia em Brasília (23h59:59 BR) */
export function timestampFimDiaBR(dataYYYYMMDD: string): number {
  const t = new Date(`${dataYYYYMMDD}T23:59:59-03:00`).getTime();
  return Math.floor(t / 1000);
}
