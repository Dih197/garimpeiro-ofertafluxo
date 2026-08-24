import { listarConversoes, listarMetaInsights, listarCliquesShopee } from "./db";
import { IMPOSTO_META } from "./constantes";
import { classificarCanal } from "./canais";

function ehVendaMetaAds(c: { subId: string; referrer?: string; channelType?: string }): boolean {
  return classificarCanal({ subId: c.subId, referrer: c.referrer, channelType: c.channelType }).categoria === "meta_ads";
}

export type AcaoSugerida = {
  prioridade: "alta" | "media" | "baixa";
  tipo: "pausar" | "escalar" | "renovar_criativo" | "trocar_publico" | "verificar" | "celebrar";
  texto: string;
  alvo?: string; // ad_id ou criativo
  impactoEstimado?: string;
};

export type ResumoDiario = {
  textoNarrativo: string;
  comparativo: { campo: string; hoje: number; ontem: number; variacao: number }[];
  acoes: AcaoSugerida[];
};

/** Gera um resumo em pt-BR do que aconteceu hoje vs ontem + ações priorizadas */
export function gerarResumoDiario(): ResumoDiario {
  const insights = listarMetaInsights(2);
  const conversoes = listarConversoes(2);

  const hoje = new Date().toISOString().slice(0, 10);
  const ontem = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
  const inicioHoje = Math.floor(new Date(hoje + "T00:00:00").getTime() / 1000);
  const inicioOntem = Math.floor(new Date(ontem + "T00:00:00").getTime() / 1000);

  // Agrega Meta hoje vs ontem
  // Usa inline_link_clicks (= "Cliques no link" do Ads Manager) em vez de outbound_clicks (que é maior).
  const metaHoje = insights
    .filter((i) => i.data === hoje)
    .reduce((acc, i) => ({ spend: acc.spend + i.spend, clicks: acc.clicks + i.inlineLinkClicks, impressions: acc.impressions + i.impressions }), { spend: 0, clicks: 0, impressions: 0 });
  const metaOntem = insights
    .filter((i) => i.data === ontem)
    .reduce((acc, i) => ({ spend: acc.spend + i.spend, clicks: acc.clicks + i.inlineLinkClicks, impressions: acc.impressions + i.impressions }), { spend: 0, clicks: 0, impressions: 0 });

  // Agrega Shopee hoje vs ontem (apenas vendas classificadas como Meta Ads)
  const convHoje = conversoes.filter((c) => c.purchaseTime >= inicioHoje && ehVendaMetaAds(c));
  const convOntem = conversoes.filter((c) => c.purchaseTime >= inicioOntem && c.purchaseTime < inicioHoje && ehVendaMetaAds(c));

  const comissaoHoje = convHoje.reduce((s, c) => s + c.totalCommission, 0);
  const comissaoOntem = convOntem.reduce((s, c) => s + c.totalCommission, 0);
  const lucroHoje = comissaoHoje - metaHoje.spend * (1 + IMPOSTO_META);
  const lucroOntem = comissaoOntem - metaOntem.spend * (1 + IMPOSTO_META);

  // Cliques Shopee registrados manualmente do dashboard (input do user)
  const cliquesShopeeArr = listarCliquesShopee(2);
  const cliquesShopeeHoje = cliquesShopeeArr.filter((c) => c.data === hoje).reduce((s, c) => s + c.cliques, 0);
  const cliquesShopeeOntem = cliquesShopeeArr.filter((c) => c.data === ontem).reduce((s, c) => s + c.cliques, 0);

  const variacao = (a: number, b: number) => (b === 0 ? (a > 0 ? 100 : 0) : ((a - b) / Math.abs(b)) * 100);

  const comparativo = [
    { campo: "Gasto Meta", hoje: metaHoje.spend, ontem: metaOntem.spend, variacao: variacao(metaHoje.spend, metaOntem.spend) },
    { campo: "Cliques Meta", hoje: metaHoje.clicks, ontem: metaOntem.clicks, variacao: variacao(metaHoje.clicks, metaOntem.clicks) },
    { campo: "Cliques Shopee", hoje: cliquesShopeeHoje, ontem: cliquesShopeeOntem, variacao: variacao(cliquesShopeeHoje, cliquesShopeeOntem) },
    { campo: "Vendas", hoje: convHoje.length, ontem: convOntem.length, variacao: variacao(convHoje.length, convOntem.length) },
    { campo: "Comissão", hoje: comissaoHoje, ontem: comissaoOntem, variacao: variacao(comissaoHoje, comissaoOntem) },
    { campo: "Lucro", hoje: lucroHoje, ontem: lucroOntem, variacao: variacao(lucroHoje, lucroOntem) }
  ];

  // ========= TEXTO NARRATIVO =========
  const partes: string[] = [];

  if (metaHoje.spend === 0 && convHoje.length === 0) {
    partes.push("Hoje ainda não tem atividade — nenhum gasto Meta nem venda atribuída.");
  } else {
    if (metaHoje.spend > 0) {
      partes.push(`Hoje você gastou R$ ${metaHoje.spend.toFixed(2)} no Meta Ads e gerou ${metaHoje.clicks} cliques no link.`);
    }
    if (cliquesShopeeHoje > 0 && metaHoje.clicks > 0) {
      const perda = Math.max(0, metaHoje.clicks - cliquesShopeeHoje);
      const perdaPct = metaHoje.clicks > 0 ? (perda / metaHoje.clicks) * 100 : 0;
      partes.push(`A Shopee registrou ${cliquesShopeeHoje} cliques de redes sociais — ${perdaPct.toFixed(0)}% dos cliques Meta (${perda}) se perderam no redirect.`);
    } else if (metaHoje.clicks > 0 && cliquesShopeeHoje === 0) {
      partes.push(`Cliques Shopee ainda não registrados pra hoje (a API GraphQL da Shopee não expõe esse dado — registre manualmente no card "Redirect Meta → Shopee" abaixo, pegando o número em affiliate.shopee.com.br/dashboard).`);
    }
    if (convHoje.length > 0) {
      partes.push(`A Shopee atribuiu ${convHoje.length} venda(s) ao tráfego Meta, somando R$ ${comissaoHoje.toFixed(2)} de comissão.`);
    } else if (metaHoje.spend > 5) {
      partes.push(`Nenhuma venda foi atribuída ainda — pode ser delay da Shopee (relatório oficial só fica completo amanhã ~10h).`);
    }
    if (lucroHoje > 0) {
      partes.push(`Resultado parcial: lucro de R$ ${lucroHoje.toFixed(2)} 🎉`);
    } else if (lucroHoje < -5) {
      partes.push(`Resultado parcial: prejuízo de R$ ${Math.abs(lucroHoje).toFixed(2)} (lembrando do cookie 7d, vendas podem cair nos próximos dias).`);
    }
  }

  if (metaOntem.spend > 0 || convOntem.length > 0) {
    const variacaoLucro = variacao(lucroHoje, lucroOntem);
    if (variacaoLucro > 20 && lucroHoje > 0) {
      partes.push(`Comparado a ontem, lucro subiu ${variacaoLucro.toFixed(0)}%.`);
    } else if (variacaoLucro < -20 && metaHoje.spend > 5) {
      partes.push(`Comparado a ontem, lucro caiu ${Math.abs(variacaoLucro).toFixed(0)}% — fica de olho.`);
    }
  }

  // ========= AÇÕES SUGERIDAS =========
  const acoes: AcaoSugerida[] = [];

  // 1. Anúncios em prejuízo grande
  const insightsHoje = insights.filter((i) => i.data === hoje);
  for (const i of insightsHoje) {
    const cpc = i.outboundClicks > 0 ? i.spend / i.outboundClicks : 0;
    const vendasDoSub = conversoes.filter((c) => ehVendaMetaAds(c) && c.subId2 === i.subId2 && c.purchaseTime >= inicioHoje);
    const comissao = vendasDoSub.reduce((s, c) => s + c.totalCommission, 0);
    const lucro = comissao - i.spend * 1.13;

    if (cpc > 1 && vendasDoSub.length === 0 && i.spend > 10) {
      acoes.push({
        prioridade: "alta",
        tipo: "pausar",
        texto: `Pausar "${i.adName}" — CPC R$ ${cpc.toFixed(2)} alto + 0 vendas em R$ ${i.spend.toFixed(2)} gasto`,
        alvo: i.adId,
        impactoEstimado: `Economiza ~R$ ${(i.spend / 1).toFixed(2)}/dia`
      });
    } else if (lucro > 5 && i.spend > 10) {
      acoes.push({
        prioridade: "alta",
        tipo: "escalar",
        texto: `Escalar "${i.adName}" — lucro R$ ${lucro.toFixed(2)} hoje (ROAS ${(comissao / i.spend).toFixed(2)}x). Aumentar +50%.`,
        alvo: i.adId,
        impactoEstimado: `Projeção: +R$ ${(lucro * 0.5).toFixed(2)}/dia`
      });
    }
  }

  // 2. Sub_id sem atribuição (problema de tracking)
  const adsComSubVazio = insightsHoje.filter((i) => !i.subId2 || i.subId2 === "");
  if (adsComSubVazio.length > 0) {
    acoes.push({
      prioridade: "alta",
      tipo: "verificar",
      texto: `${adsComSubVazio.length} anúncio(s) sem Sub_ID 2 — vendas não vão ser atribuídas a criativo. Renomeie incluindo "Cri01", "Cri02" no nome do anúncio.`,
      impactoEstimado: "Necessário pra medir ROI por criativo"
    });
  }

  // 3. Detectar fadiga (CTR caindo)
  const fadigas = detectarFadiga();
  for (const f of fadigas) {
    acoes.push({
      prioridade: "media",
      tipo: "renovar_criativo",
      texto: `"${f.adName}" mostra fadiga: CTR caiu ${f.quedaPct.toFixed(0)}% nos últimos 3d vs início. Prepare criativo novo.`,
      alvo: f.adId,
      impactoEstimado: `Performance vai degradar em 2-5 dias`
    });
  }

  // 4. Celebrar se tudo bem
  if (acoes.length === 0 && lucroHoje > 0) {
    acoes.push({
      prioridade: "baixa",
      tipo: "celebrar",
      texto: "Tudo lucrativo hoje. Manter operação como está e monitorar.",
      impactoEstimado: ""
    });
  }

  // Ordena por prioridade
  const ordem = { alta: 0, media: 1, baixa: 2 };
  acoes.sort((a, b) => ordem[a.prioridade] - ordem[b.prioridade]);

  return {
    textoNarrativo: partes.join(" "),
    comparativo,
    acoes: acoes.slice(0, 5) // top 5 ações
  };
}

/** Detector de fadiga: compara CTR rolling 3d vs 7d */
export type FadigaCriativo = {
  adId: string;
  adName: string;
  ctrInicio: number; // CTR primeiro 3d do período
  ctrAgora: number; // CTR últimos 3d
  quedaPct: number; // % de queda
  diasAteParar: number; // estimativa
};

export function detectarFadiga(): FadigaCriativo[] {
  const insights = listarMetaInsights(7);

  // Agrupa por adId e ordena por data
  const porAd = new Map<string, typeof insights>();
  for (const i of insights) {
    const arr = porAd.get(i.adId) || [];
    arr.push(i);
    porAd.set(i.adId, arr);
  }

  const fadigas: FadigaCriativo[] = [];
  for (const [adId, arr] of porAd.entries()) {
    if (arr.length < 4) continue; // precisa de pelo menos 4 dias

    arr.sort((a, b) => a.data.localeCompare(b.data));
    const inicio = arr.slice(0, 3); // primeiros 3d
    const fim = arr.slice(-3); // últimos 3d

    const ctrInicio = mediaCtr(inicio);
    const ctrAgora = mediaCtr(fim);
    if (ctrInicio === 0) continue;

    const queda = ((ctrInicio - ctrAgora) / ctrInicio) * 100;
    if (queda > 25) {
      // Estimativa simples: se cair na mesma velocidade, em quantos dias zera
      const taxaQuedaDia = queda / arr.length;
      const diasAteParar = Math.max(1, Math.round(ctrAgora / Math.max(0.01, taxaQuedaDia * (ctrInicio / 100))));
      fadigas.push({
        adId,
        adName: fim[fim.length - 1].adName,
        ctrInicio,
        ctrAgora,
        quedaPct: queda,
        diasAteParar
      });
    }
  }

  return fadigas.sort((a, b) => b.quedaPct - a.quedaPct);
}

function mediaCtr(arr: { ctr: number }[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, i) => s + i.ctr, 0) / arr.length;
}
