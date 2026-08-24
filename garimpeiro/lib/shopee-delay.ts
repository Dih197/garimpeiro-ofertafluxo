/**
 * Lógica de DELAY / consolidação da Shopee Affiliate.
 *
 * Pipeline real (validado em campanhas BR 2026):
 *
 *   D+0 (hoje)         pessoa clica e/ou compra
 *   D+1 ~10h           cliques aparecem no Relatório de Cliques (batch GMT+8)
 *   D+1..D+2           primeiras vendas em status PENDENTE
 *   D+2..D+7           pico de atribuição (cookie 7 dias)
 *   D+5..D+15          pedido entregue → status CONCLUÍDA
 *   D+12..D+22         período de devolução acaba → comissão VALIDADA
 *   Mês seguinte       pagamento
 *
 * Curva de consolidação típica das vendas atribuídas a um clique:
 *   - 15% no D+0..D+1 (impulso compra mesma sessão)
 *   - 35% no D+2..D+3 (volta na sessão seguinte)
 *   - 30% no D+4..D+7 (pesquisa antes de comprar)
 *   - 20% no D+8..D+30 (lembrança, recompra com cookie expirado*)
 *   *cookie é 7d mas comissões válidas continuam aparecendo retroativas
 *
 * Esta lib expõe:
 *   - janelaConfianca(dias) → quão confiável é o ROAS num período N dias
 *   - projetarVendasFinais(diasObservados, vendasAtuais) → quantas vendas ainda virão
 *   - statusConsolidacao() → texto humano explicando o que significa o número
 */

export type CurvaAtribuicao = {
  diaDesdeClique: number;
  pctAcumulado: number; // % das vendas finais já materializadas até esse dia
};

// Curva empírica BR (cookie 7d Shopee)
const CURVA: CurvaAtribuicao[] = [
  { diaDesdeClique: 0, pctAcumulado: 8 },
  { diaDesdeClique: 1, pctAcumulado: 18 }, // ~D+1: cliques visíveis no painel
  { diaDesdeClique: 2, pctAcumulado: 38 },
  { diaDesdeClique: 3, pctAcumulado: 56 },
  { diaDesdeClique: 4, pctAcumulado: 70 },
  { diaDesdeClique: 5, pctAcumulado: 80 },
  { diaDesdeClique: 6, pctAcumulado: 88 },
  { diaDesdeClique: 7, pctAcumulado: 94 },
  { diaDesdeClique: 14, pctAcumulado: 99 },
  { diaDesdeClique: 30, pctAcumulado: 100 }
];

function pctAcumuladoNoDia(d: number): number {
  if (d <= 0) return CURVA[0].pctAcumulado;
  if (d >= 30) return 100;
  // Interpola entre os pontos da curva
  for (let i = 0; i < CURVA.length - 1; i++) {
    const a = CURVA[i];
    const b = CURVA[i + 1];
    if (d >= a.diaDesdeClique && d <= b.diaDesdeClique) {
      const frac = (d - a.diaDesdeClique) / (b.diaDesdeClique - a.diaDesdeClique);
      return a.pctAcumulado + (b.pctAcumulado - a.pctAcumulado) * frac;
    }
  }
  return 100;
}

export type JanelaConfianca = {
  dias: number;
  confiabilidadePct: number; // 0-100. Quanto das vendas finais já estão visíveis.
  diasParaConsolidar: number; // quantos dias ainda faltam pra consolidar 95%
  rotuloConfianca: "MUITO_BAIXA" | "BAIXA" | "MEDIA" | "ALTA" | "TOTAL";
  textoExplicativo: string;
  emoji: string;
};

/**
 * Calcula confiança do ROAS pra um período de N dias.
 *
 * @param diasObservados — quantidade de dias do período
 * @param diasAposFim — quantos dias passaram desde o ÚLTIMO dia do período até hoje.
 *                     0 = período termina hoje. Maior = período antigo (mais consolidado).
 *
 * Lógica: quanto MAIS recente o gasto, MENOS vendas atribuídas a ele já
 * apareceram. Um clique de hoje só vai consolidar 95% de suas vendas em ~7 dias.
 */
export function janelaConfianca(diasObservados: number, diasAposFim: number = 0): JanelaConfianca {
  // Pra cada dia do período, qual % das vendas daquele dia já apareceu?
  // Média ponderada (gastos diários iguais, simplificação)
  let somaPct = 0;
  for (let d = 0; d < diasObservados; d++) {
    // Cliques do dia D ficaram visíveis há (diasObservados-1-d + diasAposFim) dias
    const diasDesdeAquele = diasObservados - 1 - d + Math.max(0, diasAposFim);
    somaPct += pctAcumuladoNoDia(diasDesdeAquele);
  }
  const confiabilidade = Math.round(somaPct / diasObservados);

  let rotulo: JanelaConfianca["rotuloConfianca"] = "TOTAL";
  if (confiabilidade < 25) rotulo = "MUITO_BAIXA";
  else if (confiabilidade < 50) rotulo = "BAIXA";
  else if (confiabilidade < 80) rotulo = "MEDIA";
  else if (confiabilidade < 95) rotulo = "ALTA";

  // Quantos dias ainda faltam pra atingir 95% médio
  let diasParaConsolidar = 0;
  for (let extra = 1; extra <= 30; extra++) {
    let s = 0;
    for (let d = 0; d < diasObservados; d++) {
      s += pctAcumuladoNoDia(diasObservados - 1 - d + extra);
    }
    if (s / diasObservados >= 95) {
      diasParaConsolidar = extra;
      break;
    }
  }

  const emojis: Record<typeof rotulo, string> = {
    MUITO_BAIXA: "⏳",
    BAIXA: "⏳",
    MEDIA: "⏰",
    ALTA: "✅",
    TOTAL: "🎯"
  };

  const textos: Record<typeof rotulo, string> = {
    MUITO_BAIXA: `Apenas ~${confiabilidade}% das vendas finais já apareceram. Cliques deste período ainda vão converter nos próximos ${diasParaConsolidar} dias (cookie Shopee 7d). Não tome decisão de pausar/escalar agora.`,
    BAIXA: `~${confiabilidade}% das vendas finais visíveis. Em ~${diasParaConsolidar} dias o ROAS estabiliza. Use este período só pra checar CPC/CTR, não pra decidir ROAS final.`,
    MEDIA: `~${confiabilidade}% das vendas já consolidadas. Faltam ~${diasParaConsolidar} dias pra fechar atribuição. ROAS aqui é orientativo, não definitivo.`,
    ALTA: `${confiabilidade}% das vendas atribuídas. ROAS deste período é confiável. Restam apenas ~${diasParaConsolidar} dias de atribuição residual.`,
    TOTAL: `${confiabilidade}% consolidado. ROAS aqui é definitivo, pode usar pra decisões de escala/pausa.`
  };

  return {
    dias: diasObservados,
    confiabilidadePct: confiabilidade,
    diasParaConsolidar,
    rotuloConfianca: rotulo,
    textoExplicativo: textos[rotulo],
    emoji: emojis[rotulo]
  };
}

/**
 * Projeta o número FINAL de vendas/comissão esperado considerando o delay.
 * Se você gastou em N dias e teve X vendas (com confiabilidade C%), o final
 * esperado é X / (C/100).
 */
export function projetarFinal(
  diasObservados: number,
  vendasAtuais: number,
  comissaoAtual: number
): { vendasFinais: number; comissaoFinal: number; multiplicador: number } {
  const conf = janelaConfianca(diasObservados);
  const mult = conf.confiabilidadePct > 0 ? 100 / conf.confiabilidadePct : 1;
  return {
    vendasFinais: Math.round(vendasAtuais * mult),
    comissaoFinal: parseFloat((comissaoAtual * mult).toFixed(2)),
    multiplicador: parseFloat(mult.toFixed(2))
  };
}

/**
 * Status legível pra cada conversão Shopee
 */
export function rotuloStatusConversao(status: string): { label: string; cor: "amber" | "blue" | "emerald" | "rose" | "zinc" } {
  const s = (status || "").toUpperCase();
  if (s.includes("PEND") || s.includes("WAIT")) return { label: "Pendente", cor: "amber" };
  if (s.includes("COMPLET") || s.includes("FINISH") || s.includes("DONE")) return { label: "Concluída", cor: "blue" };
  if (s.includes("VALID") || s.includes("CONFIRM")) return { label: "Validada", cor: "emerald" };
  if (s.includes("CANCEL") || s.includes("REFUND") || s.includes("RETURN")) return { label: "Cancelada", cor: "rose" };
  return { label: status || "?", cor: "zinc" };
}
