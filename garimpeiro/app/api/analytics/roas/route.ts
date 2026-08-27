import { NextResponse } from "next/server";
import { listarConversoes, listarMetaInsights, listarCliquesShopee, listarMetricasShopee, listarMetricasCliquesRastreados } from "@/lib/db";
import { metaConfigurado, resolverAdAccountId, listarAdsComCreative, buscarInsightsPorAd, extrairLinkDoCreative, inferirSubIdsDoAdName, ultimoErroMeta } from "@/lib/meta";
import { buscarConversoes, shopeeConfigurado } from "@/lib/shopee";
import { salvarConversoes, salvarMetaInsights, type ConversaoLocal, type MetaInsightLocal } from "@/lib/db";
import { gerarConversoesMock, gerarInsightsMock } from "@/lib/mock";
import { modoMockAtivo } from "@/lib/configs";
import { janelaConfianca, projetarFinal, type JanelaConfianca } from "@/lib/shopee-delay";
import { COOKIE_DIAS_SHOPEE } from "@/lib/constantes";
import { dataHojeBR, dataOntemBR, dataDiasAtrasBR, dataUltimoFechamentoShopeeBR, timestampInicioDiaBR, timestampFimDiaBR } from "@/lib/datas";
import { classificarCanal, type CategoriaCanal, type TipoTrafego } from "@/lib/canais";
import { resolverInfoMoeda, lerInfoMoeda, type InfoMoeda } from "@/lib/cambio";
import { numeroNoIntervalo, validarMesmaOrigem } from "@/lib/api";
import { classificarStatusPedido, pedidoEhValido, resumirPedidosRoi, type ResumoPedidosRoi } from "@/lib/roi-metrics";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

// Cookie da Shopee = 7 dias
const COOKIE_DIAS = COOKIE_DIAS_SHOPEE;

type RoasPorAnuncio = {
  adId: string;
  adName: string;
  adsetName: string;
  campaignName: string;
  status: string;
  linkDestino: string;
  thumbnail?: string;
  // Custos Meta
  spend: number; // moeda nativa da conta
  spendBRL: number; // convertido pra BRL (spend * cotacao)
  spendComImposto: number; // spendBRL + imposto (se houver)
  impressions: number;
  /** Total de cliques (inclui likes, shares, etc) — equivale a "Cliques (todos)" no Ads Manager */
  clicks: number;
  /** Cliques no link — equivale a "Cliques no link" no Ads Manager (mais conservador, métrica oficial) */
  linkClicks: number;
  /** Cliques que potencialmente saíram do FB — geralmente > linkClicks (taps acidentais) */
  outboundClicks: number;
  cpc: number;
  ctr: number;
  // Vendas Shopee atribuidas (sub_id_2)
  vendas: number;
  vendasDiretas: number; // mesmo produto do link, sellerCommission > 0
  vendasMesmaLoja: number; // mesma loja, produto diferente, sem boost (cookie)
  vendasCrossShop: number; // loja diferente — attributionType ORDERED_IN_DIFFERENT_SHOP
  comissao: number;
  comissaoDireta: number;
  comissaoIndireta: number; // mesma loja + cross-shop
  // Calculos
  roas: number; // comissao / spend
  lucro: number; // comissao - spend_com_imposto
  cpa: number; // spend / vendas
  status_lucro: "lucrativo" | "empate" | "prejuizo" | "sem_dados";
  recomendacao: "ESCALAR" | "MANTER" | "PAUSAR" | "AGUARDAR" | "OTIMIZAR_CRIATIVO";
  motivo: string;
  subIdInferido: string;
};

function parsePeriodo(req: Request): { dias: number; inicio?: string; fim?: string } {
  const url = new URL(req.url);
  const inicio = url.searchParams.get("inicio") || undefined;
  const fim = url.searchParams.get("fim") || undefined;

  if (inicio && fim && /^\d{4}-\d{2}-\d{2}$/.test(inicio) && /^\d{4}-\d{2}-\d{2}$/.test(fim)) {
    // Range custom: calcula dias = diff em dias + 1 (inclusivo)
    const dInicio = new Date(inicio + "T00:00:00");
    const dFim = new Date(fim + "T00:00:00");
    const diffMs = dFim.getTime() - dInicio.getTime();
    const dias = Math.min(730, Math.max(1, Math.floor(diffMs / (24 * 3600 * 1000)) + 1));
    return { dias, inicio, fim };
  }
  return { dias: numeroNoIntervalo(url.searchParams.get("dias") || "7", 1, 730) || 7 };
}

export async function GET(req: Request) {
  const { dias, inicio, fim } = parsePeriodo(req);
  const auto = new URL(req.url).searchParams.get("auto") === "true";

  // MOCK MODE
  if (modoMockAtivo()) {
    return NextResponse.json(montarRelatorioMock(dias, inicio, fim));
  }

  let avisos: string[] = [];
  if (auto) {
    avisos = await sincronizarTudo(dias, inicio, fim);
  }

  return NextResponse.json({ ...montarRelatorio(dias, inicio, fim), avisos });
}

export async function POST(req: Request) {
  const origem = validarMesmaOrigem(req);
  if (origem) return origem;
  const { dias, inicio, fim } = parsePeriodo(req);

  if (modoMockAtivo()) {
    return NextResponse.json(montarRelatorioMock(dias, inicio, fim));
  }

  const avisos = await sincronizarTudo(dias, inicio, fim);
  return NextResponse.json({ ...montarRelatorio(dias, inicio, fim), avisos });
}

async function sincronizarTudo(dias: number, inicio?: string, fim?: string): Promise<string[]> {
  const avisos: string[] = [];
  // Sync Shopee
  if (shopeeConfigurado()) {
    try {
      let startTime: number | undefined;
      let endTime: number | undefined;
      if (inicio && fim) {
        // Range custom: buscar especificamente aquele período (com margem de cookie)
        // Usa o timestamp de inicio - COOKIE_DIAS, ate timestamp de fim
        const tsInicio = Math.floor(new Date(inicio + "T00:00:00-03:00").getTime() / 1000);
        const tsFim = Math.floor(new Date(fim + "T23:59:59-03:00").getTime() / 1000);
        startTime = tsInicio - COOKIE_DIAS * 24 * 3600;
        endTime = tsFim;
      }
      const conv = await buscarConversoes(Math.max(dias, COOKIE_DIAS), startTime, endTime);
      const adapted: ConversaoLocal[] = conv
        .filter((c) => c.orderId)
        .map((c) => ({
          orderId: c.orderId!,
          itemId: c.itemId || 0,
          shopId: c.shopId || 0,
          produtoNome: c.productName || "",
          produtoImagem: c.productImage || "",
          shopName: c.shopName || "",
          purchaseTime: c.purchaseTime || 0,
          completeTime: c.completeTime || 0,
          clickTime: c.clickTime || 0,
          totalCommission: parseFloat(c.totalCommission || "0"),
          sellerCommission: parseFloat(c.sellerCommission || "0"),
          shopeeCommission: parseFloat(c.shopeeCommission || "0"),
          amount: parseFloat(c.amount || "0"),
          payoutAmount: parseFloat(c.payoutAmount || "0"),
          status: c.status || "",
          subId: c.subId1 || "",
          subId2: c.subId2 || "",
          subId3: c.subId3 || "",
          subId4: c.subId4 || "",
          subId5: c.subId5 || "",
          referrer: c.referrer || "",
          channelType: c.channelType || "",
          campaignType: c.campaignType || "",
          attributionType: c.attributionType || "",
          buyerType: c.buyerType || "",
          device: c.device || "",
          quantidade: c.quantity || 1
        }));
      salvarConversoes(adapted);
    } catch (e) {
      const msg = (e as Error).message;
      console.warn("[roas] sync shopee:", msg);
      avisos.push(`Shopee API: ${msg}`);
    }
  } else {
    avisos.push("Shopee nao configurada (SHOPEE_APP_ID/PARTNER_KEY)");
  }

  // Sync Meta
  if (metaConfigurado()) {
    try {
      const adAccountId = await resolverAdAccountId();
      if (!adAccountId) {
        avisos.push(`Meta: ${ultimoErroMeta() || "Ad Account nao encontrada"}`);
      } else {
        let queryArg: string | number | { since: string; until: string } = dias;
        if (inicio && fim) {
           queryArg = { since: inicio, until: fim };
        } else {
           // dias=1 → today | dias=2 → yesterday | resto → time_range custom (inclui hoje)
           queryArg = dias === 1 ? "today" : dias === 2 ? "yesterday" : dias;
        }
        // Detecta moeda da conta e cotação (cache 24h)
        resolverInfoMoeda(adAccountId).catch(() => {});

        const ads = await listarAdsComCreative(adAccountId);
        const erroAds = ultimoErroMeta();
        if (ads.length === 0 && erroAds) {
          avisos.push(`Meta: ${erroAds}`);
          return avisos;
        }
        const mapaAds = new Map(ads.map((a) => [a.id, a]));
        const insights = await buscarInsightsPorAd(adAccountId, queryArg);
        // NÃO filtra insights órfãos — ads arquivados/deletados ainda têm gastos válidos
        // que precisam ser contabilizados pra bater com o Meta Ads Manager
        const localItems: MetaInsightLocal[] = insights.map((i) => {
          const ad = mapaAds.get(i.ad_id);
          const linkDestino = ad ? extrairLinkDoCreative(ad) : "";
          const { subId1, subId2 } = inferirSubIdsDoAdName(
            ad?.name || i.ad_name || "",
            i.campaign_name || ad?.campaign_id ? i.campaign_name : undefined,
            i.adset_name
          );
          const outbound = i.outbound_clicks?.find((o) => o.action_type === "outbound_click")?.value || "0";
          return {
            adId: i.ad_id,
            data: i.date_start || new Date().toISOString().slice(0, 10),
            adName: ad?.name || i.ad_name || "",
            adsetId: i.adset_id || "",
            adsetName: i.adset_name || "",
            campaignId: i.campaign_id || "",
            campaignName: i.campaign_name || "",
            spend: parseFloat(i.spend || "0"),
            impressions: parseInt(i.impressions || "0", 10),
            clicks: parseInt(i.clicks || "0", 10),
            inlineLinkClicks: parseInt(i.inline_link_clicks || "0", 10),
            outboundClicks: parseInt(outbound, 10),
            cpc: parseFloat(i.cpc || "0"),
            ctr: parseFloat(i.ctr || "0"),
            cpm: parseFloat(i.cpm || "0"),
            reach: parseInt(i.reach || "0", 10),
            subId1,
            subId2,
            linkDestino,
            status: ad?.effective_status || ad?.status || ""
          };
        });
        salvarMetaInsights(localItems);
      }
    } catch (e) {
      const msg = (e as Error).message;
      console.warn("[roas] sync meta:", msg);
      avisos.push(`Meta: ${msg}`);
    }
  } else {
    avisos.push("Meta nao configurada (META_ACCESS_TOKEN)");
  }
  return avisos;
}

function dataOntem(): string {
  return dataOntemBR();
}

function dataHoje(): string {
  return dataHojeBR();
}

/** Versão mock do relatório — gera dados fictícios sem tocar DB nem APIs */
function montarRelatorioMock(dias: number, inicio?: string, fim?: string) {
  const { impostoMeta: impMock, cotacao: cotMock } = lerInfoMoeda();
  const insights = gerarInsightsMock();
  const conversoes = gerarConversoesMock();

  // Filtra por dias (mesma lógica do real)
  let insightsFiltro = insights;
  let convFiltro = conversoes;
  if (inicio && fim) {
    insightsFiltro = insights.filter((i) => i.data >= inicio && i.data <= fim);
    const tsInicio = timestampInicioDiaBR(inicio);
    const tsFim = timestampFimDiaBR(fim);
    convFiltro = conversoes.filter((c) => c.purchaseTime >= tsInicio && c.purchaseTime <= tsFim);
  } else if (dias === 1) {
    const hoje = dataHoje();
    insightsFiltro = insights.filter((i) => i.data === hoje);
    const inicioHoje = timestampInicioDiaBR(hoje);
    convFiltro = conversoes.filter((c) => c.purchaseTime >= inicioHoje);
  } else if (dias === 2) {
    const ontem = dataOntem();
    insightsFiltro = insights.filter((i) => i.data === ontem);
    const inicioOntem = timestampInicioDiaBR(ontem);
    const fimOntem = inicioOntem + 24 * 3600;
    convFiltro = conversoes.filter((c) => c.purchaseTime >= inicioOntem && c.purchaseTime < fimOntem);
  } else {
    // dias > 2 — usa fuso BR consistente
    const hojeBR = dataHoje();
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
    const dataInicioPeriodo = fmt.format(new Date(Date.now() - (dias - 1) * 86400 * 1000));
    insightsFiltro = insights.filter((i) => i.data >= dataInicioPeriodo && i.data <= hojeBR);
    const tsInicio = timestampInicioDiaBR(dataInicioPeriodo);
    convFiltro = conversoes.filter((c) => c.purchaseTime >= tsInicio);
  }

  // Agrupa por adId
  const porAd = new Map<string, MetaInsightLocal & { _count: number }>();
  for (const i of insightsFiltro) {
    const cur = porAd.get(i.adId);
    if (cur) {
      cur.spend += i.spend;
      cur.impressions += i.impressions;
      cur.clicks += i.clicks;
      cur.inlineLinkClicks += i.inlineLinkClicks;
      cur.outboundClicks += i.outboundClicks;
      cur._count += 1;
    } else {
      porAd.set(i.adId, { ...i, _count: 1 });
    }
  }

  const porSub2 = new Map<string, ConversaoLocal[]>();
  for (const c of convFiltro) {
    const cls = classificarCanal({ subId: c.subId, referrer: c.referrer, channelType: c.channelType });
    if (cls.categoria !== "meta_ads") continue;
    const k = c.subId2 || "_sem_criativo";
    const arr = porSub2.get(k) || [];
    arr.push(c);
    porSub2.set(k, arr);
  }

  // Spend total por subId2 pra rateio proporcional
  const spendPorSub2Mock = new Map<string, number>();
  for (const [, ins] of porAd) {
    const k = ins.subId2 || "_sem_criativo";
    spendPorSub2Mock.set(k, (spendPorSub2Mock.get(k) || 0) + ins.spend);
  }

  const porAnuncio: RoasPorAnuncio[] = Array.from(porAd.values()).map((ins) => {
    const vendasArr = porSub2.get(ins.subId2) || [];
    const spendTotalSub2 = spendPorSub2Mock.get(ins.subId2) || ins.spend;
    const fator = spendTotalSub2 > 0 ? ins.spend / spendTotalSub2 : 0;
    const vendas = Math.round(vendasArr.length * fator);
    const comissao = parseFloat((vendasArr.reduce((s, c) => s + c.totalCommission, 0) * fator).toFixed(2));
    const spendBRL = ins.spend * cotMock;
    const spendComImposto = spendBRL * (1 + impMock);
    const roas = spendBRL > 0 ? comissao / spendBRL : 0;
    const lucro = parseFloat((comissao - spendComImposto).toFixed(2));
    const cpa = vendas > 0 ? spendComImposto / vendas : 0;
    const cpc = ins.inlineLinkClicks > 0 ? ins.spend / ins.inlineLinkClicks : 0;
    const ctr = ins.impressions > 0 ? (ins.clicks / ins.impressions) * 100 : 0;
    const vendasDiretas = Math.round(vendasArr.filter((c) => (c.sellerCommission || 0) > 0).length * fator);
    const vendasCrossShop = Math.round(vendasArr.filter((c) => (c.sellerCommission || 0) === 0 && c.attributionType === "ORDERED_IN_DIFFERENT_SHOP").length * fator);
    const vendasMesmaLoja = vendas - vendasDiretas - vendasCrossShop;
    const comissaoDireta = parseFloat((vendasArr.filter((c) => (c.sellerCommission || 0) > 0).reduce((s, c) => s + c.totalCommission, 0) * fator).toFixed(2));
    const comissaoIndireta = parseFloat((comissao - comissaoDireta).toFixed(2));

    let status_lucro: RoasPorAnuncio["status_lucro"] = "sem_dados";
    if (vendas === 0 && ins.spend > 0) status_lucro = "prejuizo";
    else if (lucro > 0) status_lucro = "lucrativo";
    else if (Math.abs(lucro) < 2) status_lucro = "empate";
    else if (lucro < 0) status_lucro = "prejuizo";

    let recomendacao: RoasPorAnuncio["recomendacao"] = "AGUARDAR";
    let motivo = "";
    if (status_lucro === "lucrativo" && roas > 1.5) {
      recomendacao = "ESCALAR";
      motivo = `ROAS ${roas.toFixed(2)}x · lucro R$ ${lucro.toFixed(2)} — escalar +50%`;
    } else if (status_lucro === "lucrativo") {
      recomendacao = "MANTER";
      motivo = `Lucrativo mas ROAS modesto (${roas.toFixed(2)}x)`;
    } else if (status_lucro === "empate") {
      recomendacao = "MANTER";
      motivo = "Empata — aguardar mais vendas";
    } else if (status_lucro === "prejuizo" && cpc > 0.5) {
      recomendacao = "PAUSAR";
      motivo = `CPC R$ ${cpc.toFixed(2)} alto + sem retorno`;
    } else {
      recomendacao = "OTIMIZAR_CRIATIVO";
      motivo = "Performance abaixo do esperado — testar variação";
    }

    return {
      adId: ins.adId,
      adName: ins.adName,
      adsetName: ins.adsetName,
      campaignName: ins.campaignName,
      status: ins.status,
      linkDestino: ins.linkDestino,
      spend: ins.spend,
      spendBRL,
      spendComImposto,
      impressions: ins.impressions,
      clicks: ins.clicks,
      outboundClicks: ins.outboundClicks,
      linkClicks: ins.inlineLinkClicks,
      cpc,
      ctr,
      vendas,
      vendasDiretas,
      vendasMesmaLoja,
      vendasCrossShop,
      comissao,
      comissaoDireta,
      comissaoIndireta,
      roas,
      lucro,
      cpa,
      status_lucro,
      recomendacao,
      motivo,
      subIdInferido: ins.subId2 || ins.subId1
    };
  });

  // Click-time refinement para mock também (usando insights mockados)
  const gruposPorLinkMock = new Map<string, RoasPorAnuncio[]>();
  for (const a of porAnuncio) {
    const linkKey = a.linkDestino || `_sem_link_${a.adId}`;
    const g = gruposPorLinkMock.get(linkKey) || [];
    g.push(a);
    gruposPorLinkMock.set(linkKey, g);
  }
  const clicksDiariosMock = new Map<string, Map<string, number>>();
  for (const i of insightsFiltro) {
    let diaMap = clicksDiariosMock.get(i.data);
    if (!diaMap) { diaMap = new Map(); clicksDiariosMock.set(i.data, diaMap); }
    diaMap.set(i.adId, (diaMap.get(i.adId) || 0) + i.inlineLinkClicks);
  }
  for (const [, grupo] of gruposPorLinkMock) {
    if (grupo.length <= 1) continue;
    if (grupo.reduce((s, a) => s + a.spend, 0) === 0) continue;
    const subIdsGrupo = new Set(grupo.map((a) => a.subIdInferido));
    for (const a of grupo) { a.vendas = 0; a.vendasDiretas = 0; a.vendasMesmaLoja = 0; a.vendasCrossShop = 0; a.comissao = 0; a.comissaoDireta = 0; a.comissaoIndireta = 0; }
    for (const c of convFiltro) {
      const cls = classificarCanal({ subId: c.subId, referrer: c.referrer, channelType: c.channelType });
      if (cls.categoria !== "meta_ads") continue;
      if (!subIdsGrupo.has(c.subId2 || "_sem_criativo")) continue;
      const clickDay = c.clickTime && c.clickTime > 0 ? new Date(c.clickTime * 1000).toISOString().slice(0, 10) : null;
      const pesos = new Map<string, number>();
      if (clickDay) { const diaMap = clicksDiariosMock.get(clickDay); if (diaMap) for (const a of grupo) pesos.set(a.adId, diaMap.get(a.adId) || 0); }
      if (Array.from(pesos.values()).reduce((s, v) => s + v, 0) === 0) for (const a of grupo) pesos.set(a.adId, a.spend);
      const totalW = Array.from(pesos.values()).reduce((s, v) => s + v, 0);
      if (totalW === 0) continue;
      const isDireta = (c.sellerCommission || 0) > 0;
      const isCrossShop = !isDireta && c.attributionType === "ORDERED_IN_DIFFERENT_SHOP";
      for (const a of grupo) {
        const share = (pesos.get(a.adId) || 0) / totalW;
        a.vendas += share; a.comissao += c.totalCommission * share;
        if (isDireta) { a.vendasDiretas += share; a.comissaoDireta += c.totalCommission * share; }
        else if (isCrossShop) { a.vendasCrossShop += share; a.comissaoIndireta += c.totalCommission * share; }
        else { a.vendasMesmaLoja += share; a.comissaoIndireta += c.totalCommission * share; }
      }
    }
    for (const a of grupo) {
      a.vendas = Math.round(a.vendas); a.vendasDiretas = Math.round(a.vendasDiretas);
      a.vendasCrossShop = Math.round(a.vendasCrossShop);
      a.vendasMesmaLoja = a.vendas - a.vendasDiretas - a.vendasCrossShop;
      a.comissao = parseFloat(a.comissao.toFixed(2));
      a.comissaoDireta = parseFloat(a.comissaoDireta.toFixed(2));
      a.comissaoIndireta = parseFloat(a.comissaoIndireta.toFixed(2));
      a.roas = a.spend > 0 ? a.comissao / a.spend : 0;
      a.lucro = parseFloat((a.comissao - a.spendComImposto).toFixed(2));
      a.cpa = a.vendas > 0 ? a.spendComImposto / a.vendas : 0;
      if (a.vendas === 0 && a.spend > 0) a.status_lucro = "prejuizo";
      else if (a.lucro > 0) a.status_lucro = "lucrativo";
      else a.status_lucro = Math.abs(a.lucro) < 2 ? "empate" : "sem_dados";
    }
  }

  const consolidado = porAnuncio.reduce(
    (acc, a) => ({
      spend: acc.spend + a.spend,
      spendBRL: (acc as any).spendBRL + a.spendBRL,
      spendComImposto: acc.spendComImposto + a.spendComImposto,
      impressions: acc.impressions + a.impressions,
      clicks: acc.clicks + a.clicks,
      linkClicks: acc.linkClicks + a.linkClicks,
      outboundClicks: acc.outboundClicks + a.outboundClicks,
      vendas: acc.vendas + a.vendas,
      comissao: acc.comissao + a.comissao,
      roas: 0, lucro: 0
    }),
    { spend: 0, spendBRL: 0, spendComImposto: 0, impressions: 0, clicks: 0, linkClicks: 0, outboundClicks: 0, vendas: 0, comissao: 0, roas: 0, lucro: 0 }
  );
  consolidado.roas = consolidado.spendBRL > 0 ? consolidado.comissao / consolidado.spendBRL : 0;
  consolidado.lucro = consolidado.comissao - consolidado.spendComImposto;

  const porCriativo: Record<string, { vendas: number; comissao: number; spend: number; roas: number }> = {};
  for (const a of porAnuncio) {
    const k = a.subIdInferido || "indefinido";
    if (!porCriativo[k]) porCriativo[k] = { vendas: 0, comissao: 0, spend: 0, roas: 0 };
    porCriativo[k].vendas += a.vendas;
    porCriativo[k].comissao += a.comissao;
    porCriativo[k].spend += a.spendBRL;
  }
  for (const k of Object.keys(porCriativo)) {
    porCriativo[k].roas = porCriativo[k].spend > 0 ? porCriativo[k].comissao / porCriativo[k].spend : 0;
  }

  porAnuncio.sort((a, b) => b.lucro - a.lucro);

  const breakdownCanal = montarBreakdownCanal(convFiltro);
  const conteudoShopee = montarConteudoShopee(convFiltro, dias, inicio, fim);
  const resumoShopee = montarResumoShopeePeriodo(convFiltro);
  const resumoPedidos = resumirPedidosRoi(convFiltro);
  const analiseCookies = montarAnaliseCookies(convFiltro);
  const analiseRedirect = montarAnaliseRedirect(insightsFiltro, convFiltro, dias, inicio, fim);
  const problemasDropoff = diagnosticarDropoff(insightsFiltro, porAnuncio, analiseRedirect);
  const serieLucroDiario = construirSerieLucroDiario(insightsFiltro, convFiltro, dias, inicio, fim, impMock);
  const serieDiariaCompleta = construirSerieDiariaCompleta(insightsFiltro, convFiltro, dias, inicio, fim, impMock, []);
  const diasAposFim = fim ? Math.max(0, Math.floor((Date.now() - new Date(fim + "T23:59:59").getTime()) / (24 * 3600 * 1000))) : 0;
  const confianca = janelaConfianca(dias, diasAposFim);
  const projecao = projetarFinal(dias, consolidado.vendas, consolidado.comissao);
  const lucroProjetadoFinal = projecao.comissaoFinal - consolidado.spendComImposto;
  const roasProjetadoFinal = consolidado.spendBRL > 0 ? projecao.comissaoFinal / consolidado.spendBRL : 0;

  return {
    ok: true,
    mock: true,
    dias,
    totalAnuncios: porAnuncio.length,
    consolidado,
    porAnuncio,
    porCriativo,
    breakdownCanal,
    conteudoShopee,
    resumoShopee,
    analiseCookies,
    analiseRedirect,
    problemasDropoff,
    alertas: ["🎭 MODO DEMONSTRAÇÃO ATIVO — todos os números abaixo são fictícios pra testar a interface."],
    avisos: [] as string[],
    confianca,
    serieLucroDiario,
    serieDiariaCompleta,
    projecao: {
      vendasFinais: projecao.vendasFinais,
      comissaoFinal: projecao.comissaoFinal,
      lucroProjetadoFinal,
      roasProjetadoFinal,
      multiplicador: projecao.multiplicador
    },
    conversoesBrutas: convFiltro,
    resumoPedidos,
    meta: { disponibilidade: "atual" as const, configurada: true, erro: null, possuiCache: true },
    infoMoeda: lerInfoMoeda()
  };
}

type PontoLucroDia = { data: string; spend: number; comissao: number; lucro: number };
type PontoDiarioCompleto = {
  data: string;
  spendMeta: number;
  spendMetaComImposto: number;
  impressoesMeta: number;
  cliquesMeta: number;
  cliquesShopeeTotal: number;
  cliquesRedesSociais: number;
  cliquesShopeeVideo: number;
  cliquesShopeeLive: number;
  temDadosCliquesShopee: boolean;
  pedidosTotal: number;
  itensVendidos: number;
  faturamentoTotal: number;
  novosCompradores: number;
  pedidosCancelados: number;
  comissaoConfirmada: number;
  comissaoPendente: number;
  vendasOrganicas: number;
  comissaoOrganica: number;
  vendasCampanha: number;
  comissaoCampanha: number;
  vendasVideo: number;
  comissaoVideo: number;
  vendasLive: number;
  comissaoLive: number;
  comissaoTotal: number;
  lucroLiquido: number;
};

/**
 * Constrói série diária separando vendas orgânicas (sem custo) das vendas de campanha paga.
 * Útil pra Histórico mostrar visualmente que um pico orgânico é "lucro grátis" vs um pico
 * pago que precisa descontar spend Meta.
 */
function construirSerieDiariaCompleta(
  insights: MetaInsightLocal[],
  conversoes: ConversaoLocal[],
  dias: number,
  inicio?: string,
  fim?: string,
  impostoRate = 0.13,
  metricasShopee: ReturnType<typeof listarMetricasShopee> = []
): PontoDiarioCompleto[] {
  const fmtBR = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  const diasArr: string[] = [];
  if (inicio && fim) {
    const di = new Date(inicio + "T12:00:00-03:00");
    const df = new Date(fim + "T12:00:00-03:00");
    for (let d = new Date(di); d <= df; d.setDate(d.getDate() + 1)) {
      diasArr.push(fmtBR.format(d));
    }
  } else {
    for (let i = dias - 1; i >= 0; i--) {
      diasArr.push(fmtBR.format(new Date(Date.now() - i * 86400 * 1000)));
    }
  }

  const mapa = new Map<string, PontoDiarioCompleto>();
  for (const d of diasArr) {
    mapa.set(d, {
      data: d, spendMeta: 0, spendMetaComImposto: 0,
      impressoesMeta: 0, cliquesMeta: 0,
      cliquesShopeeTotal: 0, cliquesRedesSociais: 0, cliquesShopeeVideo: 0, cliquesShopeeLive: 0,
      temDadosCliquesShopee: false,
      pedidosTotal: 0, itensVendidos: 0, faturamentoTotal: 0,
      novosCompradores: 0, pedidosCancelados: 0,
      comissaoConfirmada: 0, comissaoPendente: 0,
      vendasOrganicas: 0, comissaoOrganica: 0,
      vendasCampanha: 0, comissaoCampanha: 0,
      vendasVideo: 0, comissaoVideo: 0,
      vendasLive: 0, comissaoLive: 0,
      comissaoTotal: 0, lucroLiquido: 0
    });
  }

  for (const i of insights) {
    const cur = mapa.get(i.data);
    if (cur) {
      cur.spendMeta += i.spend;
      cur.spendMetaComImposto += i.spend * (1 + impostoRate);
      cur.impressoesMeta += i.impressions;
      cur.cliquesMeta += i.inlineLinkClicks;
    }
  }

  for (const c of conversoes) {
    const dia = fmtBR.format(new Date(c.purchaseTime * 1000));
    const cur = mapa.get(dia);
    if (!cur) continue;
    const cls = classificarCanal({ subId: c.subId, referrer: c.referrer, channelType: c.channelType });
    const quantidade = Math.max(1, c.quantidade || 1);
    const estado = classificarStatusPedido(c.status);

    cur.pedidosTotal += 1;
    if (estado === "cancelado") {
      cur.pedidosCancelados += 1;
      continue;
    }
    // Estados não reconhecidos ficam fora das métricas até a Shopee confirmar o significado.
    if (estado === "desconhecido") continue;

    cur.itensVendidos += quantidade;
    cur.faturamentoTotal += c.amount;
    if (/NEW|NOVO/.test(String(c.buyerType || "").toUpperCase())) cur.novosCompradores += 1;
    if (estado === "concluido") cur.comissaoConfirmada += c.totalCommission;
    else cur.comissaoPendente += c.totalCommission;

    if (cls.tipo === "campanha") {
      cur.vendasCampanha += 1;
      cur.comissaoCampanha += c.totalCommission;
    } else {
      cur.vendasOrganicas += 1;
      cur.comissaoOrganica += c.totalCommission;
    }
    if (cls.categoria === "shopee_video") {
      cur.vendasVideo += 1;
      cur.comissaoVideo += c.totalCommission;
    } else if (cls.categoria === "shopee_live") {
      cur.vendasLive += 1;
      cur.comissaoLive += c.totalCommission;
    }
    cur.comissaoTotal += c.totalCommission;
  }

  for (const metrica of metricasShopee) {
    const cur = mapa.get(metrica.data);
    if (!cur) continue;
    cur.cliquesShopeeTotal += metrica.cliquesTotal;
    cur.cliquesRedesSociais += metrica.cliquesRedesSociais;
    cur.cliquesShopeeVideo += metrica.cliquesShopeeVideo;
    cur.cliquesShopeeLive += metrica.cliquesShopeeLive;
    cur.temDadosCliquesShopee = true;
  }

  for (const ponto of mapa.values()) {
    ponto.lucroLiquido = parseFloat((ponto.comissaoTotal - ponto.spendMetaComImposto).toFixed(2));
    ponto.spendMeta = parseFloat(ponto.spendMeta.toFixed(2));
    ponto.spendMetaComImposto = parseFloat(ponto.spendMetaComImposto.toFixed(2));
    ponto.comissaoOrganica = parseFloat(ponto.comissaoOrganica.toFixed(2));
    ponto.comissaoCampanha = parseFloat(ponto.comissaoCampanha.toFixed(2));
    ponto.faturamentoTotal = parseFloat(ponto.faturamentoTotal.toFixed(2));
    ponto.comissaoConfirmada = parseFloat(ponto.comissaoConfirmada.toFixed(2));
    ponto.comissaoPendente = parseFloat(ponto.comissaoPendente.toFixed(2));
    ponto.comissaoVideo = parseFloat(ponto.comissaoVideo.toFixed(2));
    ponto.comissaoLive = parseFloat(ponto.comissaoLive.toFixed(2));
    ponto.comissaoTotal = parseFloat(ponto.comissaoTotal.toFixed(2));
  }

  return diasArr.map((d) => mapa.get(d)!);
}

function construirSerieLucroDiario(
  insights: MetaInsightLocal[],
  conversoes: ConversaoLocal[],
  dias: number,
  inicio?: string,
  fim?: string,
  impostoRate = 0.13
): PontoLucroDia[] {
  const mapaDias = new Map<string, { spend: number; comissao: number }>();
  const fmtBR = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

  // Determina range de datas a popular (mesmo zerado), usando fuso BR
  const diasArr: string[] = [];
  if (inicio && fim) {
    const di = new Date(inicio + "T12:00:00-03:00");
    const df = new Date(fim + "T12:00:00-03:00");
    for (let d = new Date(di); d <= df; d.setDate(d.getDate() + 1)) {
      diasArr.push(fmtBR.format(d));
    }
  } else {
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400 * 1000);
      diasArr.push(fmtBR.format(d));
    }
  }
  for (const d of diasArr) mapaDias.set(d, { spend: 0, comissao: 0 });

  // Soma spend Meta (i.data já vem em fuso BR da Meta API)
  for (const i of insights) {
    const cur = mapaDias.get(i.data);
    if (cur) cur.spend += i.spend;
  }

  // Comissão estimada só de pedidos concluídos ou pendentes; cancelados não entram.
  for (const c of conversoes) {
    if (!pedidoEhValido(c)) continue;
    const dia = fmtBR.format(new Date(c.purchaseTime * 1000));
    const cur = mapaDias.get(dia);
    if (cur) cur.comissao += c.totalCommission;
  }

  return diasArr.map((data) => {
    const v = mapaDias.get(data)!;
    const lucro = v.comissao - v.spend * (1 + impostoRate);
    return { data, spend: v.spend, comissao: v.comissao, lucro: parseFloat(lucro.toFixed(2)) };
  });
}

type ResumoTrafego = {
  vendas: number;
  /** Faturamento bruto (GMV) — soma de actualAmount das vendas (quanto comprador pagou ao seller) */
  faturamento: number;
  /** Comissão líquida do afiliado */
  comissao: number;
  ticketMedio: number;
};

type BreakdownCanal = {
  campanha: ResumoTrafego;
  organico: ResumoTrafego;
  porCategoria: Record<string, { categoria: CategoriaCanal; canal: string; tipo: TipoTrafego; vendas: number; comissao: number; faturamento: number }>;
};

type ResumoCanalConteudo = ResumoTrafego & {
  participacaoVendasPct: number;
  participacaoComissaoPct: number;
  comissaoPorVenda: number;
};

type ConteudoShopee = {
  video: ResumoCanalConteudo;
  live: ResumoCanalConteudo;
  total: ResumoCanalConteudo;
  porDia: Array<{
    data: string;
    vendasVideo: number;
    comissaoVideo: number;
    vendasLive: number;
    comissaoLive: number;
  }>;
  topProdutos: Array<{
    itemId: number;
    produtoNome: string;
    produtoImagem: string;
    canal: "shopee_video" | "shopee_live";
    vendas: number;
    comissao: number;
    faturamento: number;
  }>;
};

type PerformanceShopee = {
  periodoInicio: string;
  periodoFim: string;
  dataSolicitada?: string;
  usandoUltimoDisponivel: boolean;
  atualizadoDiariamenteAs: string;
  cliquesTotal: number | null;
  cliquesRedesSociais: number | null;
  cliquesShopeeVideo: number | null;
  cliquesShopeeLive: number | null;
  fonteCliques: "painel_shopee" | "rastreador_proprio" | "mista" | "indisponivel";
  diasComCliques: number;
  diasNoPeriodo: number;
  pedidos: number;
  itensVendidos: number;
  comissaoEstimada: number;
  valorPedidos: number;
  novosCompradores: number;
  topProdutos: Array<{
    itemId: number;
    produtoNome: string;
    produtoImagem: string;
    itensVendidos: number;
    comissao: number;
    valorPedidos: number;
  }>;
};

/** O painel Shopee prevalece quando existe. Nos outros dias entram os cliques automáticos dos links da plataforma. */
function listarMetricasShopeeComRastreamento(diasAtras = 730) {
  const porDia = new Map<string, ReturnType<typeof listarMetricasShopee>[number]>();
  for (const metrica of listarMetricasCliquesRastreados(diasAtras)) porDia.set(metrica.data, metrica);
  for (const metrica of listarMetricasShopee(diasAtras)) porDia.set(metrica.data, metrica);
  return Array.from(porDia.values()).sort((a, b) => b.data.localeCompare(a.data));
}

type ResumoShopeePeriodo = {
  vendas: number;
  faturamento: number;
  comissao: number;
  comissaoConfirmada: number;
  comissaoPendente: number;
  pedidosGerados: number;
  pedidosCancelados: number;
  pedidosDesconhecidos: number;
  ticketMedio: number | null;
  taxaCancelamentoPct: number | null;
};

type DisponibilidadeMeta = "atual" | "cache" | "indisponivel";

/**
 * Análise da janela de cookie da Shopee (7 dias).
 * Cada conversão tem clickTime (quando alguém clicou no link) e purchaseTime (quando comprou).
 * O delay entre os dois revela:
 *  - Compras instantâneas (<1h): alta intenção, conteúdo persuasivo
 *  - Cookie 1-3d: comprador "marinou" — conteúdo plantou semente
 *  - Cookie 3-7d: cookie no limite, está prestes a expirar
 *  - Além de 7d: não deveria existir (cookie expira)
 *
 * Também separa direta (mesma loja, com boost de comissão do seller) vs indireta (cross-shop ou
 * sem boost, ou seja, comprou outro produto da loja dentro da janela).
 */
type BucketDelay = "instant" | "ate1h" | "ate24h" | "ate3d" | "ate7d" | "alem7d";

/**
 * Diagnóstico automático de drop-off Meta→Shopee.
 * Analisa cada anúncio Meta + dados de redirect + cookies, e produz lista priorizada
 * de problemas encontrados + ação recomendada pra cada um.
 */
type ProblemaDropoff = {
  prioridade: "alta" | "media" | "baixa";
  categoria: "link" | "tracking" | "criativo" | "configuracao" | "qualidade";
  titulo: string;
  detalhe: string;
  acao: string;
  /** Anúncios afetados (adId ou nome) */
  afetados?: string[];
  /** Impacto estimado em redução de drop-off */
  impactoPct?: number;
};

function diagnosticarDropoff(
  insights: MetaInsightLocal[],
  porAnuncio: RoasPorAnuncio[],
  redirect: AnaliseRedirect
): ProblemaDropoff[] {
  const problemas: ProblemaDropoff[] = [];

  // 1. SHORTLINKS s.shopee — força redirect extra que perde cliques
  const adsComShortlink = porAnuncio.filter((a) =>
    a.linkDestino && /(?:s\.shopee\.com|sho\.pee|s\.shopeebr)/i.test(a.linkDestino)
  );
  if (adsComShortlink.length > 0) {
    problemas.push({
      prioridade: "alta",
      categoria: "link",
      titulo: `${adsComShortlink.length} anúncio(s) usando shortlink Shopee`,
      detalhe: "Shortlinks adicionam 1 redirect extra antes de chegar no produto. ~10-20% dos cliques caem nesse hop.",
      acao: "Troque por link direto: https://shopee.com.br/product/<shopId>/<itemId>?sub_id1=MetaAds&sub_id2=CriXX",
      afetados: adsComShortlink.map((a) => a.adName),
      impactoPct: 15
    });
  }

  // 2. ANÚNCIOS SEM sub_id_2 — não dá pra atribuir criativo
  const adsSemSub2 = porAnuncio.filter((a) => !a.subIdInferido || a.subIdInferido === "MetaAds");
  if (adsSemSub2.length > 0) {
    problemas.push({
      prioridade: "alta",
      categoria: "tracking",
      titulo: `${adsSemSub2.length} anúncio(s) sem Sub_ID 2 no nome`,
      detalhe: "Sem Sub_ID 2 (Cri01, Cri02...), as vendas Shopee não conseguem ser atribuídas a um criativo específico.",
      acao: "Renomeie os anúncios incluindo 'Cri01', 'Cri02' etc no nome. O sistema infere o sub_id pelo nome.",
      afetados: adsSemSub2.map((a) => a.adName),
      impactoPct: 0  // não reduz drop-off mas habilita análise
    });
  }

  // 3. CPC MUITO BAIXO — sinal de cliques acidentais
  const adsCpcBaixo = porAnuncio.filter((a) => a.spend > 5 && a.cpc > 0 && a.cpc < 0.10);
  if (adsCpcBaixo.length > 0) {
    problemas.push({
      prioridade: "alta",
      categoria: "qualidade",
      titulo: `${adsCpcBaixo.length} anúncio(s) com CPC < R$ 0,10 (bait clique)`,
      detalhe: "CPC abaixo de R$ 0,10 geralmente indica audiência de baixa qualidade — cliques acidentais ou bots. Esses cliques inflam o número Meta mas não chegam à Shopee.",
      acao: "Suba o CPC alvo manualmente OU mude pra otimização por 'Cliques no link' (não 'engajamento'). CPC saudável Shopee Vídeo: R$ 0,30–0,80.",
      afetados: adsCpcBaixo.map((a) => `${a.adName} (R$ ${a.cpc.toFixed(2)})`),
      impactoPct: 25
    });
  }

  // 4. CTR ANORMALMENTE ALTO — clickbait
  const adsCtrAlto = porAnuncio.filter((a) => a.ctr > 5 && a.impressions > 500);
  if (adsCtrAlto.length > 0) {
    problemas.push({
      prioridade: "media",
      categoria: "criativo",
      titulo: `${adsCtrAlto.length} anúncio(s) com CTR > 5% (possível clickbait)`,
      detalhe: "CTR muito alto (>5%) sem conversões correspondentes sugere criativo clickbait. Pessoas clicam por curiosidade, não compram.",
      acao: "Revise o copy/criativo: deve prometer só o que o produto entrega. Use CTA específico ('Clique pra ver na Shopee') em vez de genérico ('Saiba mais').",
      afetados: adsCtrAlto.map((a) => `${a.adName} (CTR ${a.ctr.toFixed(1)}%)`),
      impactoPct: 10
    });
  }

  // 5. OUTBOUND >> LINK CLICKS — taps acidentais
  let totalOutbound = 0, totalClicks = 0;
  for (const i of insights) {
    totalOutbound += i.outboundClicks;
    totalClicks += i.inlineLinkClicks;
  }
  if (totalClicks > 50 && totalOutbound > totalClicks * 1.4) {
    problemas.push({
      prioridade: "media",
      categoria: "qualidade",
      titulo: `Outbound ${totalOutbound} ≫ Link clicks ${totalClicks} (taps acidentais)`,
      detalhe: "Outbound clicks (cliques que potencialmente saem) é muito maior que link clicks (cliques de fato no link). Indica taps em outros elementos do anúncio.",
      acao: "Mude objetivo da campanha pra 'Cliques no link' em vez de 'Tráfego' genérico. Otimização por outcome 'OUTCOME_TRAFFIC' com kpi 'LINK_CLICKS'.",
      impactoPct: 15
    });
  }

  // 6. PERDA DE REDIRECT MUITO ALTA
  if (redirect.coberturaCompativel && redirect.perdaPct !== null && redirect.perdaPct > 70) {
    problemas.push({
      prioridade: "alta",
      categoria: "configuracao",
      titulo: `${redirect.perdaPct.toFixed(0)}% dos cliques se perdem antes da Shopee`,
      detalhe: `${redirect.cliquesPerdidos} cliques pagos não chegam à Shopee. Provável combinação de placement Audience Network + deeplink falhando + in-app browser bloqueando.`,
      acao: "Exclua placements: Audience Network + Messenger. Mantenha só Feed/Stories/Reels Instagram + Facebook. Em Configurações Avançadas → 'Allow Placements'.",
      impactoPct: 20
    });
  }

  // 7. ANÚNCIOS SEM ENTREGA — gasto 0 mas ativos
  const adsParados = porAnuncio.filter((a) => a.status === "ACTIVE" && a.spend === 0 && a.impressions === 0);
  if (adsParados.length > 0) {
    problemas.push({
      prioridade: "baixa",
      categoria: "configuracao",
      titulo: `${adsParados.length} anúncio(s) ativo(s) sem entrega`,
      detalhe: "Anúncios ATIVOS mas com 0 impressões. CBO está concentrando orçamento em outros anúncios da campanha, ou pixel/criativo em revisão.",
      acao: "Verifique status de revisão no Meta Ads Manager. Considere ABO em vez de CBO se quiser controle granular.",
      afetados: adsParados.map((a) => a.adName)
    });
  }

  return problemas.sort((a, b) => {
    const ord = { alta: 0, media: 1, baixa: 2 };
    return ord[a.prioridade] - ord[b.prioridade];
  });
}

type AnaliseRedirect = {
  /** Cliques outbound contabilizados pelo Meta no período */
  cliquesMeta: number;
  /** Cliques contabilizados pela Shopee (input manual do dashboard) */
  cliquesShopee: number;
  /** % de cliques Meta que NÃO chegaram à Shopee — gargalo de redirect */
  perdaPct: number | null;
  /** Cliques perdidos = Meta - Shopee */
  cliquesPerdidos: number;
  /** CPC real considerando só os cliques que chegaram à Shopee (mais honesto que o CPC Meta) */
  cpcShopeeReal: number | null;
  /** Conversão real = vendas / cliques Shopee */
  conversaoRealPct: number | null;
  /** Indica se há registros de cliques Shopee no período (se não, drop-off não pode ser calculado) */
  temDadosShopee: boolean;
  /** Só é verdadeira quando os cliques Shopee são marcados como tráfego Meta comparável. */
  coberturaCompativel: boolean;
  /** Diário pra UI: data + meta + shopee */
  porDia: Array<{ data: string; cliquesMeta: number; cliquesShopee: number; perda: number }>;
};

function montarAnaliseRedirect(
  insights: MetaInsightLocal[],
  conversoes: ConversaoLocal[],
  diasAtras: number,
  inicio?: string,
  fim?: string
): AnaliseRedirect {
  const cliquesShopeeArr = listarCliquesShopee(Math.max(diasAtras + COOKIE_DIAS, 60));

  // Filtra cliques Shopee pelo período
  const fmtBR = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  let dataInicio: string;
  let dataFim: string;
  if (inicio && fim) {
    dataInicio = inicio; dataFim = fim;
  } else if (diasAtras === 1) {
    dataInicio = dataFim = fmtBR.format(new Date());
  } else if (diasAtras === 2) {
    dataInicio = dataFim = fmtBR.format(new Date(Date.now() - 86400000));
  } else {
    dataInicio = fmtBR.format(new Date(Date.now() - (diasAtras - 1) * 86400000));
    dataFim = fmtBR.format(new Date());
  }

  const cliquesShopeeFiltro = cliquesShopeeArr.filter((c) => c.data >= dataInicio && c.data <= dataFim);

  // Mapa por dia
  const porDiaMap = new Map<string, { cliquesMeta: number; cliquesShopee: number }>();
  // Constrói lista de dias do período
  const dStart = new Date(dataInicio + "T12:00:00-03:00");
  const dEnd = new Date(dataFim + "T12:00:00-03:00");
  for (let d = new Date(dStart); d <= dEnd; d.setDate(d.getDate() + 1)) {
    porDiaMap.set(fmtBR.format(d), { cliquesMeta: 0, cliquesShopee: 0 });
  }

  for (const i of insights) {
    const cur = porDiaMap.get(i.data);
    // Usa inline_link_clicks (mesma métrica que Meta Ads Manager mostra como "Cliques no link")
    if (cur) cur.cliquesMeta += i.inlineLinkClicks;
  }
  for (const cs of cliquesShopeeFiltro) {
    const cur = porDiaMap.get(cs.data);
    if (cur) cur.cliquesShopee += cs.cliques;
  }

  const cliquesMeta = Array.from(porDiaMap.values()).reduce((s, v) => s + v.cliquesMeta, 0);
  const cliquesShopee = Array.from(porDiaMap.values()).reduce((s, v) => s + v.cliquesShopee, 0);
  const coberturaCompativel = cliquesShopeeFiltro.some((c) => /meta|facebook|instagram/i.test(String(c.origem || "")));
  const cliquesPerdidos = coberturaCompativel ? Math.max(0, cliquesMeta - cliquesShopee) : 0;
  const perdaPct = coberturaCompativel && cliquesMeta > 0 && cliquesShopee <= cliquesMeta
    ? (cliquesPerdidos / cliquesMeta) * 100
    : null;
  const spendTotal = insights.reduce((s, i) => s + i.spend, 0);
  const cpcShopeeReal = coberturaCompativel && cliquesShopee > 0 ? spendTotal / cliquesShopee : null;

  // Vendas Meta Ads no período (mesma classificação da função de roas)
  const vendasMetaAds = conversoes.filter((c) =>
    pedidoEhValido(c) && classificarCanal({ subId: c.subId, referrer: c.referrer, channelType: c.channelType }).categoria === "meta_ads"
  ).length;
  const conversaoRealPct = coberturaCompativel && cliquesShopee > 0 ? (vendasMetaAds / cliquesShopee) * 100 : null;

  const porDia = Array.from(porDiaMap.entries()).map(([data, v]) => ({
    data,
    cliquesMeta: v.cliquesMeta,
    cliquesShopee: v.cliquesShopee,
    perda: Math.max(0, v.cliquesMeta - v.cliquesShopee)
  }));

  return {
    cliquesMeta,
    cliquesShopee,
    perdaPct: perdaPct === null ? null : parseFloat(perdaPct.toFixed(1)),
    cliquesPerdidos,
    cpcShopeeReal: cpcShopeeReal === null ? null : parseFloat(cpcShopeeReal.toFixed(2)),
    conversaoRealPct: conversaoRealPct === null ? null : parseFloat(conversaoRealPct.toFixed(2)),
    temDadosShopee: cliquesShopeeFiltro.length > 0,
    coberturaCompativel,
    porDia
  };
}

type AnaliseCookies = {
  totalVendas: number;
  /** Distribuição por bucket de tempo entre clique e compra */
  distribuicaoDelay: Record<BucketDelay, { vendas: number; comissao: number; faturamento: number }>;
  /** Tempo médio de decisão (clique → compra) em segundos, considerando só vendas com clickTime válido */
  tempoMedioDecisaoSeg: number;
  /** Mediana — mais robusta que média pra mostrar comportamento típico */
  tempoMedianoDecisaoSeg: number;
  /** Vendas com sellerCommission > 0 = comprou produto com boost de campanha (mesma loja, item do link) */
  vendasComBoostSeller: { vendas: number; comissao: number };
  /** Vendas sem boost = só comissão Shopee padrão (provavelmente cross-sell via cookie) */
  vendasSemBoost: { vendas: number; comissao: number };
  /** Quantas vendas foram da mesma loja do link clicado */
  mesmaLoja: number;
  /** Quantas vendas foram de outra loja (cookie cross-shop — só pra orders Shopee Vídeo) */
  lojaDiferente: number;
  /** % de vendas onde o cookie de 7d foi decisivo (comprou após 24h do clique) */
  pctCookieAtivo: number;
};

function montarAnaliseCookies(conversoes: ConversaoLocal[]): AnaliseCookies {
  const distribuicaoDelay: Record<BucketDelay, { vendas: number; comissao: number; faturamento: number }> = {
    instant: { vendas: 0, comissao: 0, faturamento: 0 },
    ate1h: { vendas: 0, comissao: 0, faturamento: 0 },
    ate24h: { vendas: 0, comissao: 0, faturamento: 0 },
    ate3d: { vendas: 0, comissao: 0, faturamento: 0 },
    ate7d: { vendas: 0, comissao: 0, faturamento: 0 },
    alem7d: { vendas: 0, comissao: 0, faturamento: 0 }
  };

  let comBoost = { vendas: 0, comissao: 0 };
  let semBoost = { vendas: 0, comissao: 0 };
  let mesmaLoja = 0;
  let lojaDiferente = 0;
  const delays: number[] = [];

  for (const c of conversoes) {
    if (!pedidoEhValido(c)) continue;
    const click = c.clickTime || 0;
    const purchase = c.purchaseTime || 0;
    const delay = click > 0 && purchase > click ? purchase - click : 0;

    let bucket: BucketDelay;
    if (click === 0 || delay < 60) bucket = "instant";
    else if (delay < 3600) bucket = "ate1h";
    else if (delay < 24 * 3600) bucket = "ate24h";
    else if (delay < 3 * 24 * 3600) bucket = "ate3d";
    else if (delay < 7 * 24 * 3600) bucket = "ate7d";
    else bucket = "alem7d";

    distribuicaoDelay[bucket].vendas += 1;
    distribuicaoDelay[bucket].comissao += c.totalCommission;
    distribuicaoDelay[bucket].faturamento += c.amount;

    if (delay > 0) delays.push(delay);

    const seller = c.sellerCommission || 0;
    if (seller > 0) {
      comBoost.vendas += 1;
      comBoost.comissao += c.totalCommission;
    } else {
      semBoost.vendas += 1;
      semBoost.comissao += c.totalCommission;
    }

    if (c.attributionType === "ORDERED_IN_DIFFERENT_SHOP") lojaDiferente += 1;
    else mesmaLoja += 1;
  }

  delays.sort((a, b) => a - b);
  const mediana = delays.length > 0 ? delays[Math.floor(delays.length / 2)] : 0;
  const media = delays.length > 0 ? delays.reduce((s, v) => s + v, 0) / delays.length : 0;

  const totalVendas = conversoes.filter(pedidoEhValido).length;
  const vendasComCookie =
    distribuicaoDelay.ate24h.vendas +
    distribuicaoDelay.ate3d.vendas +
    distribuicaoDelay.ate7d.vendas +
    distribuicaoDelay.alem7d.vendas;
  const pctCookieAtivo = totalVendas > 0 ? (vendasComCookie / totalVendas) * 100 : 0;

  return {
    totalVendas,
    distribuicaoDelay,
    tempoMedioDecisaoSeg: Math.round(media),
    tempoMedianoDecisaoSeg: Math.round(mediana),
    vendasComBoostSeller: { vendas: comBoost.vendas, comissao: parseFloat(comBoost.comissao.toFixed(2)) },
    vendasSemBoost: { vendas: semBoost.vendas, comissao: parseFloat(semBoost.comissao.toFixed(2)) },
    mesmaLoja,
    lojaDiferente,
    pctCookieAtivo: parseFloat(pctCookieAtivo.toFixed(1))
  };
}

function montarBreakdownCanal(conversoes: ConversaoLocal[]): BreakdownCanal {
  const campanha: ResumoTrafego = { vendas: 0, faturamento: 0, comissao: 0, ticketMedio: 0 };
  const organico: ResumoTrafego = { vendas: 0, faturamento: 0, comissao: 0, ticketMedio: 0 };
  const porCategoria: BreakdownCanal["porCategoria"] = {};

  for (const c of conversoes) {
    if (!pedidoEhValido(c)) continue;
    const cls = classificarCanal({ subId: c.subId, referrer: c.referrer, channelType: c.channelType });
    const alvo = cls.tipo === "campanha" ? campanha : organico;
    alvo.vendas += 1;
    alvo.comissao += c.totalCommission;
    alvo.faturamento += c.amount;

    if (!porCategoria[cls.categoria]) {
      porCategoria[cls.categoria] = { categoria: cls.categoria, canal: cls.canal, tipo: cls.tipo, vendas: 0, comissao: 0, faturamento: 0 };
    }
    porCategoria[cls.categoria].vendas += 1;
    porCategoria[cls.categoria].comissao += c.totalCommission;
    porCategoria[cls.categoria].faturamento += c.amount;
  }

  campanha.ticketMedio = campanha.vendas > 0 ? campanha.faturamento / campanha.vendas : 0;
  organico.ticketMedio = organico.vendas > 0 ? organico.faturamento / organico.vendas : 0;
  return { campanha, organico, porCategoria };
}

function montarResumoShopeePeriodo(conversoes: ConversaoLocal[]): ResumoShopeePeriodo {
  const resumo = resumirPedidosRoi(conversoes);

  return {
    vendas: resumo.pedidosValidos,
    faturamento: resumo.gmvValido,
    comissao: resumo.comissaoEstimada,
    comissaoConfirmada: resumo.comissaoConfirmada,
    comissaoPendente: resumo.comissaoPendente,
    pedidosGerados: resumo.pedidosGerados,
    pedidosCancelados: resumo.pedidosCancelados,
    pedidosDesconhecidos: resumo.pedidosDesconhecidos,
    ticketMedio: resumo.ticketMedioValido,
    taxaCancelamentoPct: resumo.taxaCancelamentoPct
  };
}

function conversoesDoDia(conversoes: ConversaoLocal[], data: string): ConversaoLocal[] {
  const inicio = timestampInicioDiaBR(data);
  const fim = timestampFimDiaBR(data);
  return conversoes.filter((conversao) => conversao.purchaseTime >= inicio && conversao.purchaseTime <= fim);
}

function montarPerformanceShopee(
  conversoes: ConversaoLocal[],
  periodoInicio: string,
  periodoFim: string,
  dataSolicitada?: string,
  usandoUltimoDisponivel = false
): PerformanceShopee {
  const metricas = listarMetricasShopeeComRastreamento(730).filter((item) => item.data >= periodoInicio && item.data <= periodoFim);
  const temMetricas = metricas.length > 0;
  const fontes = new Set(metricas.map((item) => item.fonte));
  const fonteCliques: PerformanceShopee["fonteCliques"] = !temMetricas
    ? "indisponivel"
    : fontes.size > 1 ? "mista"
    : fontes.has("rastreador_proprio") ? "rastreador_proprio" : "painel_shopee";
  const diasNoPeriodo = listarDatasPeriodo(1, periodoInicio, periodoFim).length;
  const produtos = new Map<string, PerformanceShopee["topProdutos"][number]>();

  for (const conversao of conversoes) {
    if (!pedidoEhValido(conversao)) continue;
    const chave = String(conversao.itemId || conversao.produtoNome || conversao.orderId);
    const quantidade = Math.max(1, conversao.quantidade || 1);
    const atual = produtos.get(chave) || {
      itemId: conversao.itemId || 0,
      produtoNome: conversao.produtoNome || "Produto sem nome",
      produtoImagem: conversao.produtoImagem || "",
      itensVendidos: 0,
      comissao: 0,
      valorPedidos: 0
    };
    atual.itensVendidos += quantidade;
    atual.comissao += conversao.totalCommission;
    atual.valorPedidos += conversao.amount;
    produtos.set(chave, atual);
  }

  const somaMetrica = (campo: "cliquesTotal" | "cliquesRedesSociais" | "cliquesShopeeVideo" | "cliquesShopeeLive") =>
    metricas.reduce((total, item) => total + item[campo], 0);

  return {
    periodoInicio,
    periodoFim,
    dataSolicitada,
    usandoUltimoDisponivel,
    atualizadoDiariamenteAs: "17:30",
    cliquesTotal: temMetricas ? somaMetrica("cliquesTotal") : null,
    cliquesRedesSociais: temMetricas ? somaMetrica("cliquesRedesSociais") : null,
    cliquesShopeeVideo: temMetricas ? somaMetrica("cliquesShopeeVideo") : null,
    cliquesShopeeLive: temMetricas ? somaMetrica("cliquesShopeeLive") : null,
    fonteCliques,
    diasComCliques: metricas.length,
    diasNoPeriodo,
    pedidos: new Set(conversoes.map((conversao) => conversao.orderId)).size,
    itensVendidos: conversoes.reduce((total, conversao) => total + Math.max(1, conversao.quantidade || 1), 0),
    comissaoEstimada: parseFloat(conversoes.reduce((total, conversao) => total + conversao.totalCommission, 0).toFixed(2)),
    valorPedidos: parseFloat(conversoes.reduce((total, conversao) => total + conversao.amount, 0).toFixed(2)),
    novosCompradores: conversoes.filter((conversao) => /NEW|NOVO/.test(String(conversao.buyerType || "").toUpperCase())).length,
    topProdutos: Array.from(produtos.values())
      .sort((a, b) => b.itensVendidos - a.itensVendidos || b.comissao - a.comissao)
      .slice(0, 5)
      .map((produto) => ({
        ...produto,
        comissao: parseFloat(produto.comissao.toFixed(2)),
        valorPedidos: parseFloat(produto.valorPedidos.toFixed(2))
      }))
  };
}

function listarDatasPeriodo(dias: number, inicio?: string, fim?: string): string[] {
  const fmtBR = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  const datas: string[] = [];
  if (inicio && fim) {
    const di = new Date(inicio + "T12:00:00-03:00");
    const df = new Date(fim + "T12:00:00-03:00");
    for (let d = new Date(di); d <= df; d.setDate(d.getDate() + 1)) datas.push(fmtBR.format(d));
  } else {
    for (let i = dias - 1; i >= 0; i--) datas.push(fmtBR.format(new Date(Date.now() - i * 86400 * 1000)));
  }
  return datas;
}

/** Métricas específicas de conteúdo orgânico retornadas pelo conversionReport da Shopee. */
function montarConteudoShopee(
  conversoes: ConversaoLocal[],
  dias: number,
  inicio?: string,
  fim?: string
): ConteudoShopee {
  const conversoesValidas = conversoes.filter(pedidoEhValido);
  const totalComissaoGeral = conversoesValidas.reduce((s, c) => s + c.totalCommission, 0);
  const datas = listarDatasPeriodo(dias, inicio, fim);
  const porDiaMap = new Map<
    string,
    ConteudoShopee["porDia"][number]
  >(datas.map((data) => [data, { data, vendasVideo: 0, comissaoVideo: 0, vendasLive: 0, comissaoLive: 0 }]));
  const fmtBR = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

  const videoConversoes: ConversaoLocal[] = [];
  const liveConversoes: ConversaoLocal[] = [];
  const produtos = new Map<string, ConteudoShopee["topProdutos"][number]>();

  for (const c of conversoesValidas) {
    const cls = classificarCanal({ subId: c.subId, referrer: c.referrer, channelType: c.channelType });
    if (cls.categoria !== "shopee_video" && cls.categoria !== "shopee_live") continue;

    const ehVideo = cls.categoria === "shopee_video";
    (ehVideo ? videoConversoes : liveConversoes).push(c);

    if (c.purchaseTime > 0) {
      const ponto = porDiaMap.get(fmtBR.format(new Date(c.purchaseTime * 1000)));
      if (ponto) {
        if (ehVideo) {
          ponto.vendasVideo += 1;
          ponto.comissaoVideo += c.totalCommission;
        } else {
          ponto.vendasLive += 1;
          ponto.comissaoLive += c.totalCommission;
        }
      }
    }

    const chaveProduto = `${cls.categoria}:${c.itemId || c.produtoNome || c.orderId}`;
    const atual = produtos.get(chaveProduto) || {
      itemId: c.itemId || 0,
      produtoNome: c.produtoNome || "Produto sem nome",
      produtoImagem: c.produtoImagem || "",
      canal: cls.categoria,
      vendas: 0,
      comissao: 0,
      faturamento: 0
    };
    atual.vendas += 1;
    atual.comissao += c.totalCommission;
    atual.faturamento += c.amount;
    produtos.set(chaveProduto, atual);
  }

  function resumir(lista: ConversaoLocal[]): ResumoCanalConteudo {
    const vendas = lista.length;
    const faturamento = lista.reduce((s, c) => s + c.amount, 0);
    const comissao = lista.reduce((s, c) => s + c.totalCommission, 0);
    return {
      vendas,
      faturamento: parseFloat(faturamento.toFixed(2)),
      comissao: parseFloat(comissao.toFixed(2)),
      ticketMedio: vendas > 0 ? parseFloat((faturamento / vendas).toFixed(2)) : 0,
      participacaoVendasPct: conversoesValidas.length > 0 ? parseFloat(((vendas / conversoesValidas.length) * 100).toFixed(1)) : 0,
      participacaoComissaoPct: totalComissaoGeral > 0 ? parseFloat(((comissao / totalComissaoGeral) * 100).toFixed(1)) : 0,
      comissaoPorVenda: vendas > 0 ? parseFloat((comissao / vendas).toFixed(2)) : 0
    };
  }

  const video = resumir(videoConversoes);
  const live = resumir(liveConversoes);
  const total = resumir([...videoConversoes, ...liveConversoes]);

  return {
    video,
    live,
    total,
    porDia: datas.map((data) => {
      const ponto = porDiaMap.get(data)!;
      return {
        ...ponto,
        comissaoVideo: parseFloat(ponto.comissaoVideo.toFixed(2)),
        comissaoLive: parseFloat(ponto.comissaoLive.toFixed(2))
      };
    }),
    topProdutos: Array.from(produtos.values())
      .sort((a, b) => b.comissao - a.comissao)
      .slice(0, 5)
      .map((p) => ({
        ...p,
        comissao: parseFloat(p.comissao.toFixed(2)),
        faturamento: parseFloat(p.faturamento.toFixed(2))
      }))
  };
}

function montarRelatorio(dias: number, inicio?: string, fim?: string): {
  ok: boolean;
  dias: number;
  totalAnuncios: number;
  consolidado: {
    spend: number;
    spendBRL: number;
    spendComImposto: number;
    impressions: number;
    clicks: number;
    /** "Cliques no link" (Meta Ads Manager) — métrica oficial Meta */
    linkClicks: number;
    /** Outbound clicks — geralmente > linkClicks (taps acidentais) */
    outboundClicks: number;
    vendas: number;
    comissao: number;
    roas: number;
    lucro: number;
  };
  porAnuncio: RoasPorAnuncio[];
  porCriativo: Record<string, { vendas: number; comissao: number; spend: number; roas: number }>;
  breakdownCanal: BreakdownCanal;
  conteudoShopee: ConteudoShopee;
  performanceShopee: PerformanceShopee;
  resumoShopee: ResumoShopeePeriodo;
  analiseCookies: AnaliseCookies;
  analiseRedirect: AnaliseRedirect;
  problemasDropoff: ProblemaDropoff[];
  alertas: string[];
  confianca?: JanelaConfianca;
  serieLucroDiario?: PontoLucroDia[];
  serieDiariaCompleta?: PontoDiarioCompleto[];
  projecao?: { vendasFinais: number; comissaoFinal: number; lucroProjetadoFinal: number; roasProjetadoFinal: number; multiplicador: number };
  conversoesBrutas: ConversaoLocal[];
  resumoPedidos: ResumoPedidosRoi;
  meta: { disponibilidade: DisponibilidadeMeta; configurada: boolean; erro: string | null; possuiCache: boolean };
  infoMoeda: InfoMoeda;
} {
  const info = lerInfoMoeda();
  const { impostoMeta, cotacao } = info;

  let diasAtrasInsights = Math.max(dias, 2);
  let diasAtrasConversoes = Math.max(dias + COOKIE_DIAS, 30);
  if (inicio) {
    const diffToToday = Math.floor((Date.now() - new Date(inicio + "T00:00:00").getTime()) / (24 * 3600 * 1000));
    diasAtrasInsights = Math.max(diasAtrasInsights, diffToToday + 2); // +2 for safety
    diasAtrasConversoes = Math.max(diasAtrasConversoes, diffToToday + COOKIE_DIAS + 2);
  }
  let insights = listarMetaInsights(diasAtrasInsights);
  const todasConversoes = listarConversoes(diasAtrasConversoes);
  let conversoes = todasConversoes;

  // Range custom (inicio + fim) tem prioridade
  if (inicio && fim) {
    insights = insights.filter((i) => i.data >= inicio && i.data <= fim);
    const tsInicio = timestampInicioDiaBR(inicio);
    const tsFim = timestampFimDiaBR(fim);
    conversoes = conversoes.filter((c) => c.purchaseTime >= tsInicio && c.purchaseTime <= tsFim);
  } else if (dias === 1) {
    const hoje = dataHoje();
    insights = insights.filter((i) => i.data === hoje);
    const inicioHoje = timestampInicioDiaBR(hoje);
    conversoes = conversoes.filter((c) => c.purchaseTime >= inicioHoje);
  } else if (dias === 2) {
    const ontem = dataOntem();
    insights = insights.filter((i) => i.data === ontem);
    const inicioOntem = timestampInicioDiaBR(ontem);
    const fimOntem = inicioOntem + 24 * 3600;
    conversoes = conversoes.filter((c) => c.purchaseTime >= inicioOntem && c.purchaseTime < fimOntem);
  } else {
    // dias > 2 — filtra conversoes/insights pra exatamente N dias (sem incluir janela cookie no display).
    // listarConversoes carregou +COOKIE_DIAS pra atribuição interna, mas pra UI mostrar "30 dias" só queremos 30.
    const hoje = dataHoje();
    const dataInicioPeriodo = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" })
      .format(new Date(Date.now() - (dias - 1) * 86400 * 1000));
    insights = insights.filter((i) => i.data >= dataInicioPeriodo && i.data <= hoje);
    const tsInicio = timestampInicioDiaBR(dataInicioPeriodo);
    conversoes = conversoes.filter((c) => c.purchaseTime >= tsInicio);
  }

  const erroMeta = ultimoErroMeta();
  const possuiCacheMeta = insights.length > 0;
  const disponibilidadeMeta: DisponibilidadeMeta = !metaConfigurado() || (!possuiCacheMeta && Boolean(erroMeta))
    ? "indisponivel"
    : erroMeta ? "cache" : "atual";

  // Agrupa insights por adId (soma os dias)
  const porAd = new Map<string, MetaInsightLocal & { _count: number }>();
  for (const i of insights) {
    const cur = porAd.get(i.adId);
    if (cur) {
      cur.spend += i.spend;
      cur.impressions += i.impressions;
      cur.clicks += i.clicks;
      cur.inlineLinkClicks += i.inlineLinkClicks;
      cur.outboundClicks += i.outboundClicks;
      cur._count += 1;
    } else {
      porAd.set(i.adId, { ...i, _count: 1 });
    }
  }

  // Agrupa conversoes por sub_id_2 (criativo) — apenas vendas classificadas como Meta Ads
  const conversoesPorSub2 = new Map<string, ConversaoLocal[]>();
  for (const c of conversoes) {
    if (!pedidoEhValido(c)) continue;
    const cls = classificarCanal({ subId: c.subId, referrer: c.referrer, channelType: c.channelType });
    if (cls.categoria !== "meta_ads") continue;
    const key = c.subId2 || "_sem_criativo";
    const arr = conversoesPorSub2.get(key) || [];
    arr.push(c);
    conversoesPorSub2.set(key, arr);
  }

  // Spend total por subId2 pra rateio proporcional quando multiplos ads compartilham o mesmo criativo
  const spendPorSub2 = new Map<string, number>();
  for (const [, ins] of porAd) {
    const k = ins.subId2 || "_sem_criativo";
    spendPorSub2.set(k, (spendPorSub2.get(k) || 0) + ins.spend);
  }

  const porAnuncio: RoasPorAnuncio[] = Array.from(porAd.values()).map((ins) => {
    const vendasDoCriativo = conversoesPorSub2.get(ins.subId2) || [];
    const spendTotalSub2 = spendPorSub2.get(ins.subId2) || ins.spend;
    // Rateio proporcional: se este ad gastou 30% do grupo, leva 30% das vendas/comissao
    const fator = spendTotalSub2 > 0 ? ins.spend / spendTotalSub2 : 0;
    const vendas = Math.round(vendasDoCriativo.length * fator);
    const comissao = parseFloat((vendasDoCriativo.reduce((s, c) => s + c.totalCommission, 0) * fator).toFixed(2));
    const spendBRL = ins.spend * cotacao;
    const spendComImposto = spendBRL * (1 + impostoMeta);
    const roas = spendBRL > 0 ? comissao / spendBRL : 0;
    const lucro = parseFloat((comissao - spendComImposto).toFixed(2));
    const cpa = vendas > 0 ? spendComImposto / vendas : 0;
    // CPC usa inline_link_clicks (= "Cliques no link" do Ads Manager). Fallback pra ins.cpc médio se não houver.
    const cpc = ins.inlineLinkClicks > 0 ? ins.spend / ins.inlineLinkClicks : ins.cpc / ins._count;
    const ctr = ins.impressions > 0 ? (ins.clicks / ins.impressions) * 100 : 0;

    // Classificação granular de vendas:
    // Direta = seller pagou boost (mesmo produto do link)
    // Cross-shop = attributionType ORDERED_IN_DIFFERENT_SHOP
    // Mesma loja = sem boost, mesma loja (cookie cross-sell)
    const vendasDiretas = Math.round(vendasDoCriativo.filter((c) => (c.sellerCommission || 0) > 0).length * fator);
    const vendasCrossShop = Math.round(vendasDoCriativo.filter((c) => (c.sellerCommission || 0) === 0 && c.attributionType === "ORDERED_IN_DIFFERENT_SHOP").length * fator);
    const vendasMesmaLoja = vendas - vendasDiretas - vendasCrossShop;
    const comissaoDireta = parseFloat((vendasDoCriativo.filter((c) => (c.sellerCommission || 0) > 0).reduce((s, c) => s + c.totalCommission, 0) * fator).toFixed(2));
    const comissaoIndireta = parseFloat((comissao - comissaoDireta).toFixed(2));

    let status_lucro: RoasPorAnuncio["status_lucro"] = "sem_dados";
    if (vendas === 0 && ins.spend > 0) status_lucro = "prejuizo";
    else if (lucro > 0) status_lucro = "lucrativo";
    else if (Math.abs(lucro) < 2) status_lucro = "empate";
    else if (lucro < 0) status_lucro = "prejuizo";

    let recomendacao: RoasPorAnuncio["recomendacao"] = "AGUARDAR";
    let motivo = "";

    if (ins.spend === 0) {
      recomendacao = "AGUARDAR";
      motivo = "Anúncio ainda não gastou — aguardar entrega";
    } else if (cpc > 0.5 && vendas === 0) {
      recomendacao = "PAUSAR";
      motivo = `CPC R$ ${cpc.toFixed(2)} alto + 0 vendas`;
    } else if (cpc > 1.5) {
      recomendacao = "PAUSAR";
      motivo = `CPC R$ ${cpc.toFixed(2)} muito alto (limite recomendado: R$ 0,15)`;
    } else if (status_lucro === "lucrativo" && roas > 1.5) {
      recomendacao = "ESCALAR";
      motivo = `ROAS ${roas.toFixed(2)}x · lucro R$ ${lucro.toFixed(2)} — escalar +50%`;
    } else if (status_lucro === "lucrativo") {
      recomendacao = "MANTER";
      motivo = `Lucrativo mas ROAS modesto (${roas.toFixed(2)}x) — manter e observar`;
    } else if (status_lucro === "empate" && vendas > 0) {
      recomendacao = "MANTER";
      motivo = "Empata — aguardar mais vendas dentro da janela cookie 7d";
    } else if (status_lucro === "prejuizo" && vendas > 0) {
      recomendacao = "OTIMIZAR_CRIATIVO";
      motivo = `Prejuízo R$ ${Math.abs(lucro).toFixed(2)} — testar variação de criativo/copy`;
    } else if (status_lucro === "prejuizo" && vendas === 0 && cpc < 0.3) {
      recomendacao = "AGUARDAR";
      motivo = "Sem vendas mas CPC ok — aguardar 24h pelo cookie 7d";
    } else {
      recomendacao = "PAUSAR";
      motivo = "Sem performance positiva";
    }

    return {
      adId: ins.adId,
      adName: ins.adName,
      adsetName: ins.adsetName,
      campaignName: ins.campaignName,
      status: ins.status,
      linkDestino: ins.linkDestino,
      spend: ins.spend,
      spendBRL,
      spendComImposto,
      impressions: ins.impressions,
      clicks: ins.clicks,
      outboundClicks: ins.outboundClicks,
      linkClicks: ins.inlineLinkClicks,
      cpc,
      ctr,
      vendas,
      vendasDiretas,
      vendasMesmaLoja,
      vendasCrossShop,
      comissao,
      comissaoDireta,
      comissaoIndireta,
      roas,
      lucro,
      cpa,
      status_lucro,
      recomendacao,
      motivo,
      subIdInferido: ins.subId2 || ins.subId1
    };
  });

  // ===== REFINAMENTO: Click-Time Attribution =====
  // Quando múltiplos anúncios compartilham o mesmo linkDestino (ex: mesma landing page
  // com o mesmo Sub_ID no botão), o Sub_ID sozinho não diferencia qual anúncio gerou a venda.
  // Usamos o clickTime da conversão Shopee + distribuição diária de cliques Meta
  // pra atribuir cada venda ao anúncio com maior share de cliques naquele dia específico.

  const gruposPorLink = new Map<string, RoasPorAnuncio[]>();
  for (const a of porAnuncio) {
    const linkKey = a.linkDestino || `_sem_link_${a.adId}`;
    const g = gruposPorLink.get(linkKey) || [];
    g.push(a);
    gruposPorLink.set(linkKey, g);
  }

  const clicksDiarios = new Map<string, Map<string, number>>();
  for (const i of insights) {
    let diaMap = clicksDiarios.get(i.data);
    if (!diaMap) { diaMap = new Map(); clicksDiarios.set(i.data, diaMap); }
    diaMap.set(i.adId, (diaMap.get(i.adId) || 0) + i.inlineLinkClicks);
  }

  for (const [, grupo] of gruposPorLink) {
    if (grupo.length <= 1) continue;
    const spendGrupo = grupo.reduce((s, a) => s + a.spend, 0);
    if (spendGrupo === 0) continue;

    const subIdsNoGrupo = new Set(grupo.map((a) => a.subIdInferido));

    // Zera vendas/comissao do grupo pra redistribuir com click-time
    for (const a of grupo) {
      a.vendas = 0;
      a.vendasDiretas = 0;
      a.vendasMesmaLoja = 0;
      a.vendasCrossShop = 0;
      a.comissao = 0;
      a.comissaoDireta = 0;
      a.comissaoIndireta = 0;
    }

    for (const c of conversoes) {
      if (!pedidoEhValido(c)) continue;
      const cls = classificarCanal({ subId: c.subId, referrer: c.referrer, channelType: c.channelType });
      if (cls.categoria !== "meta_ads") continue;
      const sub2Conv = c.subId2 || "_sem_criativo";
      if (!subIdsNoGrupo.has(sub2Conv)) continue;

      const clickDay = c.clickTime && c.clickTime > 0
        ? new Date(c.clickTime * 1000).toISOString().slice(0, 10)
        : null;

      const pesos = new Map<string, number>();
      if (clickDay) {
        const diaMap = clicksDiarios.get(clickDay);
        if (diaMap) for (const a of grupo) pesos.set(a.adId, diaMap.get(a.adId) || 0);
      }

      const somaPesos = Array.from(pesos.values()).reduce((s, v) => s + v, 0);
      if (somaPesos === 0) for (const a of grupo) pesos.set(a.adId, a.spend);

      const totalWeight = Array.from(pesos.values()).reduce((s, v) => s + v, 0);
      if (totalWeight === 0) continue;

      const isDireta = (c.sellerCommission || 0) > 0;
      const isCrossShop = !isDireta && c.attributionType === "ORDERED_IN_DIFFERENT_SHOP";
      for (const a of grupo) {
        const share = (pesos.get(a.adId) || 0) / totalWeight;
        a.vendas += share;
        a.comissao += c.totalCommission * share;
        if (isDireta) { a.vendasDiretas += share; a.comissaoDireta += c.totalCommission * share; }
        else if (isCrossShop) { a.vendasCrossShop += share; a.comissaoIndireta += c.totalCommission * share; }
        else { a.vendasMesmaLoja += share; a.comissaoIndireta += c.totalCommission * share; }
      }
    }

    // Arredonda e recalcula métricas do grupo
    for (const a of grupo) {
      a.vendas = Math.round(a.vendas);
      a.vendasDiretas = Math.round(a.vendasDiretas);
      a.vendasCrossShop = Math.round(a.vendasCrossShop);
      a.vendasMesmaLoja = a.vendas - a.vendasDiretas - a.vendasCrossShop;
      a.comissao = parseFloat(a.comissao.toFixed(2));
      a.comissaoDireta = parseFloat(a.comissaoDireta.toFixed(2));
      a.comissaoIndireta = parseFloat(a.comissaoIndireta.toFixed(2));
      a.roas = a.spend > 0 ? a.comissao / a.spend : 0;
      a.lucro = parseFloat((a.comissao - a.spendComImposto).toFixed(2));
      a.cpa = a.vendas > 0 ? a.spendComImposto / a.vendas : 0;

      if (a.vendas === 0 && a.spend > 0) a.status_lucro = "prejuizo";
      else if (a.lucro > 0) a.status_lucro = "lucrativo";
      else if (Math.abs(a.lucro) < 2) a.status_lucro = "empate";
      else if (a.lucro < 0) a.status_lucro = "prejuizo";
      else a.status_lucro = "sem_dados";

      if (a.spend === 0) {
        a.recomendacao = "AGUARDAR"; a.motivo = "Anúncio ainda não gastou — aguardar entrega";
      } else if (a.cpc > 0.5 && a.vendas === 0) {
        a.recomendacao = "PAUSAR"; a.motivo = `CPC R$ ${a.cpc.toFixed(2)} alto + 0 vendas`;
      } else if (a.cpc > 1.5) {
        a.recomendacao = "PAUSAR"; a.motivo = `CPC R$ ${a.cpc.toFixed(2)} muito alto`;
      } else if (a.status_lucro === "lucrativo" && a.roas > 1.5) {
        a.recomendacao = "ESCALAR"; a.motivo = `ROAS ${a.roas.toFixed(2)}x · lucro R$ ${a.lucro.toFixed(2)} — escalar +50%`;
      } else if (a.status_lucro === "lucrativo") {
        a.recomendacao = "MANTER"; a.motivo = `Lucrativo mas ROAS modesto (${a.roas.toFixed(2)}x)`;
      } else if (a.status_lucro === "empate" && a.vendas > 0) {
        a.recomendacao = "MANTER"; a.motivo = "Empata — aguardar mais vendas (cookie 7d)";
      } else if (a.status_lucro === "prejuizo" && a.vendas > 0) {
        a.recomendacao = "OTIMIZAR_CRIATIVO"; a.motivo = `Prejuízo R$ ${Math.abs(a.lucro).toFixed(2)} — testar variação`;
      } else if (a.status_lucro === "prejuizo" && a.vendas === 0 && a.cpc < 0.3) {
        a.recomendacao = "AGUARDAR"; a.motivo = "Sem vendas mas CPC ok — aguardar 24h (cookie 7d)";
      } else {
        a.recomendacao = "PAUSAR"; a.motivo = "Sem performance positiva";
      }
    }
  }

  // Consolidado
  const consolidado = porAnuncio.reduce(
    (acc, a) => ({
      spend: acc.spend + a.spend,
      spendBRL: (acc as any).spendBRL + a.spendBRL,
      spendComImposto: acc.spendComImposto + a.spendComImposto,
      impressions: acc.impressions + a.impressions,
      clicks: acc.clicks + a.clicks,
      linkClicks: acc.linkClicks + a.linkClicks,
      outboundClicks: acc.outboundClicks + a.outboundClicks,
      vendas: acc.vendas + a.vendas,
      comissao: acc.comissao + a.comissao,
      roas: 0, lucro: 0
    }),
    { spend: 0, spendBRL: 0, spendComImposto: 0, impressions: 0, clicks: 0, linkClicks: 0, outboundClicks: 0, vendas: 0, comissao: 0, roas: 0, lucro: 0 }
  );
  consolidado.roas = consolidado.spendBRL > 0 ? consolidado.comissao / consolidado.spendBRL : 0;
  consolidado.lucro = consolidado.comissao - consolidado.spendComImposto;

  // Por criativo (subId2)
  const porCriativo: Record<string, { vendas: number; comissao: number; spend: number; roas: number }> = {};
  for (const a of porAnuncio) {
    const key = a.subIdInferido || "indefinido";
    if (!porCriativo[key]) {
      porCriativo[key] = { vendas: 0, comissao: 0, spend: 0, roas: 0 };
    }
    porCriativo[key].vendas += a.vendas;
    porCriativo[key].comissao += a.comissao;
    porCriativo[key].spend += a.spendBRL;
  }
  for (const k of Object.keys(porCriativo)) {
    porCriativo[k].roas = porCriativo[k].spend > 0 ? porCriativo[k].comissao / porCriativo[k].spend : 0;
  }

  // Sem fonte Meta atual, o cache serve apenas para contexto; não gera ações automáticas.
  if (disponibilidadeMeta !== "atual") {
    for (const anuncio of porAnuncio) {
      anuncio.recomendacao = "AGUARDAR";
      anuncio.motivo = disponibilidadeMeta === "cache"
        ? "Dados Meta em cache; aguarde a sincronização antes de decidir."
        : "Meta indisponível; sem recomendação até receber dados válidos.";
    }
  }

  // Alertas inteligentes
  const alertas: string[] = [];
  if (disponibilidadeMeta === "indisponivel") {
    alertas.push("Meta Ads indisponível neste período. Métricas de mídia, ROAS, CPC e CTR são N/D — não zero.");
  } else if (disponibilidadeMeta === "cache") {
    alertas.push("Meta Ads com dados em cache. Recomendações automáticas ficam pausadas até a próxima sincronização.");
  }
  const totalSpend = consolidado.spendBRL;
  if (disponibilidadeMeta === "atual" && totalSpend > 0 && consolidado.vendas === 0) {
    alertas.push(`Já gastou R$ ${totalSpend.toFixed(2)} sem vendas atribuídas. Verifique se Sub_ID 'MetaAds' está cadastrado nos links.`);
  }
  if (disponibilidadeMeta === "atual" && consolidado.lucro < -10) {
    alertas.push(`Prejuízo consolidado de R$ ${Math.abs(consolidado.lucro).toFixed(2)}. Avalie pausar anúncios com CPC alto.`);
  }
  if (disponibilidadeMeta === "atual" && consolidado.lucro > 50 && consolidado.roas > 2) {
    alertas.push(`Conta lucrativa! ROAS ${consolidado.roas.toFixed(2)}x — ideal pra escalar gradual (+50%/dia).`);
  }
  const ativosSemDados = disponibilidadeMeta === "atual" ? porAnuncio.filter((a) => a.status === "ACTIVE" && a.spend === 0).length : 0;
  if (ativosSemDados > 0) {
    alertas.push(`${ativosSemDados} anúncio(s) ATIVO(s) sem entrega. CBO pode estar concentrando gasto.`);
  }

  porAnuncio.sort((a, b) => b.lucro - a.lucro);

  // ===== BREAKDOWN + COOKIES + REDIRECT + DIAGNÓSTICO DROP-OFF =====
  let conversoesPerformance = conversoes;
  let performanceInicio = inicio || (dias === 1 ? dataHoje() : dias === 2 ? dataOntem() : dataDiasAtrasBR(dias - 1));
  let performanceFim = fim || (dias === 2 ? dataOntem() : dataHoje());
  let dataSolicitada: string | undefined;
  let usandoUltimoDisponivel = false;

  // Antes das 17:30, o painel oficial da Shopee ainda mostra D-2. O preset
  // "Ontem" passa a exibir esse último fechamento em vez de um zero enganoso.
  if (!inicio && !fim && dias === 2) {
    dataSolicitada = dataOntem();
    const ultimoFechado = dataUltimoFechamentoShopeeBR();
    if (ultimoFechado !== dataSolicitada) {
      performanceInicio = ultimoFechado;
      performanceFim = ultimoFechado;
      conversoesPerformance = conversoesDoDia(todasConversoes, ultimoFechado);
      usandoUltimoDisponivel = true;
    }
  }

  const breakdownCanal = montarBreakdownCanal(conversoesPerformance);
  const conteudoShopee = montarConteudoShopee(
    conversoesPerformance,
    usandoUltimoDisponivel ? 1 : dias,
    usandoUltimoDisponivel ? performanceInicio : inicio,
    usandoUltimoDisponivel ? performanceFim : fim
  );
  const performanceShopee = montarPerformanceShopee(
    conversoesPerformance,
    performanceInicio,
    performanceFim,
    dataSolicitada,
    usandoUltimoDisponivel
  );
  const resumoShopee = montarResumoShopeePeriodo(conversoesPerformance);
  const analiseCookies = montarAnaliseCookies(conversoesPerformance);
  const analiseRedirect = montarAnaliseRedirect(insights, conversoes, dias, inicio, fim);
  const problemasDropoff = diagnosticarDropoff(insights, porAnuncio, analiseRedirect);
  if (analiseRedirect.coberturaCompativel && analiseRedirect.perdaPct !== null && analiseRedirect.perdaPct > 50) {
    alertas.push(`🚨 ${analiseRedirect.perdaPct.toFixed(0)}% dos cliques Meta (${analiseRedirect.cliquesPerdidos}) NÃO chegam à Shopee. CPC Shopee real: ${analiseRedirect.cpcShopeeReal?.toFixed(2).replace(".", ",")} R$/clique.`);
  }
  if (breakdownCanal.organico.vendas > 0 && disponibilidadeMeta === "atual" && consolidado.spend === 0) {
    alertas.push(`💚 ${breakdownCanal.organico.vendas} venda(s) orgânica(s) (R$ ${breakdownCanal.organico.comissao.toFixed(2)} de comissão) sem custo de tráfego. Continue produzindo conteúdo!`);
  }
  if (breakdownCanal.organico.vendas > 0 && breakdownCanal.campanha.vendas > 0) {
    const pctOrganico = Math.round(100 * breakdownCanal.organico.vendas / (breakdownCanal.organico.vendas + breakdownCanal.campanha.vendas));
    alertas.push(`📊 Mix de tráfego: ${pctOrganico}% orgânico · ${100 - pctOrganico}% pago.`);
  }
  if (conteudoShopee.total.vendas > 0) {
    alertas.push(`🎬 Shopee Vídeo + Live geraram ${conteudoShopee.total.vendas} venda(s) e R$ ${conteudoShopee.total.comissao.toFixed(2)} de comissão no período.`);
  }

  // ===== SÉRIE DIÁRIA DE LUCRO LÍQUIDO + COMPLETA (orgânico vs pago) =====
  const serieDias = usandoUltimoDisponivel ? 1 : dias;
  const serieInicio = usandoUltimoDisponivel ? performanceInicio : inicio;
  const serieFim = usandoUltimoDisponivel ? performanceFim : fim;
  const serieInsights = usandoUltimoDisponivel ? [] : insights;
  const metricasHistorico = listarMetricasShopeeComRastreamento(Math.max(dias + 10, 30));
  const resumoPedidos = resumirPedidosRoi(conversoesPerformance);
  const serieLucroDiario = construirSerieLucroDiario(
    serieInsights,
    conversoesPerformance,
    serieDias,
    serieInicio,
    serieFim,
    impostoMeta
  );
  const serieDiariaCompleta = construirSerieDiariaCompleta(
    serieInsights,
    conversoesPerformance,
    serieDias,
    serieInicio,
    serieFim,
    impostoMeta,
    metricasHistorico
  );

  // ===== LÓGICA DE DELAY SHOPEE =====
  // Se range custom termina antes de hoje, ajusta a confiabilidade
  const diasAposFim = fim ? Math.max(0, Math.floor((Date.now() - new Date(fim + "T23:59:59").getTime()) / (24 * 3600 * 1000))) : 0;
  const confianca = janelaConfianca(dias, diasAposFim);
  const projecao = projetarFinal(dias, consolidado.vendas, consolidado.comissao);
  const lucroProjetadoFinal = projecao.comissaoFinal - consolidado.spendComImposto;
  const roasProjetadoFinal = consolidado.spendBRL > 0 ? projecao.comissaoFinal / consolidado.spendBRL : 0;

  // Adiciona alerta se confiança baixa
  if (confianca.confiabilidadePct < 80) {
    alertas.unshift(`${confianca.emoji} ${confianca.textoExplicativo}`);
  }

  return {
    ok: true,
    dias,
    totalAnuncios: porAnuncio.length,
    consolidado,
    porAnuncio,
    porCriativo,
    breakdownCanal,
    conteudoShopee,
    performanceShopee,
    resumoShopee,
    analiseCookies,
    analiseRedirect,
    problemasDropoff,
    alertas,
    confianca,
    serieLucroDiario,
    serieDiariaCompleta,
    projecao: {
      vendasFinais: projecao.vendasFinais,
      comissaoFinal: projecao.comissaoFinal,
      lucroProjetadoFinal,
      roasProjetadoFinal,
      multiplicador: projecao.multiplicador
    },
    conversoesBrutas: conversoes,
    resumoPedidos,
    meta: {
      disponibilidade: disponibilidadeMeta,
      configurada: metaConfigurado(),
      erro: erroMeta,
      possuiCache: possuiCacheMeta
    },
    infoMoeda: info
  };
}
