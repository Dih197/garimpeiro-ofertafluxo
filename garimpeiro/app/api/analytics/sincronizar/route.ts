import { NextResponse } from "next/server";
import { buscarConversoes, shopeeConfigurado } from "@/lib/shopee";
import { salvarConversoes, statsConversoes, type ConversaoLocal } from "@/lib/db";
import { gerarConversoesMock } from "@/lib/mock";
import { modoMockAtivo } from "@/lib/configs";
import { classificarCanal } from "@/lib/canais";
import { numeroNoIntervalo, validarMesmaOrigem } from "@/lib/api";
import { dataHojeBR, dataUltimoFechamentoShopeeBR, timestampInicioDiaBR, timestampFimDiaBR } from "@/lib/datas";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function lerPeriodo(req: Request): { dias: number; inicio?: string; fim?: string } {
  const url = new URL(req.url);
  const inicio = url.searchParams.get("inicio") || undefined;
  const fim = url.searchParams.get("fim") || undefined;
  if (inicio && fim && /^\d{4}-\d{2}-\d{2}$/.test(inicio) && /^\d{4}-\d{2}-\d{2}$/.test(fim)) {
    const diferenca = Math.floor((new Date(fim + "T12:00:00-03:00").getTime() - new Date(inicio + "T12:00:00-03:00").getTime()) / 86400000) + 1;
    return { dias: Math.min(730, Math.max(1, diferenca)), inicio, fim };
  }
  return { dias: numeroNoIntervalo(url.searchParams.get("dias") || "30", 1, 730) || 30 };
}

function filtrarConversoesMock(dias: number, inicio?: string, fim?: string): ConversaoLocal[] {
  let conv = gerarConversoesMock();
  if (inicio && fim) {
    const ini = timestampInicioDiaBR(inicio);
    const ate = timestampFimDiaBR(fim);
    return conv.filter((c) => c.purchaseTime >= ini && c.purchaseTime <= ate);
  }
  if (dias === 1) {
    const ini = timestampInicioDiaBR(dataHojeBR());
    return conv.filter((c) => c.purchaseTime >= ini);
  }
  if (dias === 2) {
    const ultimoFechado = dataUltimoFechamentoShopeeBR();
    const ini = timestampInicioDiaBR(ultimoFechado);
    const ate = timestampFimDiaBR(ultimoFechado);
    return conv.filter((c) => c.purchaseTime >= ini && c.purchaseTime <= ate);
  }
  const fmtBR = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  const primeiroDia = fmtBR.format(new Date(Date.now() - (dias - 1) * 86400000));
  const ini = timestampInicioDiaBR(primeiroDia);
  return conv.filter((c) => c.purchaseTime >= ini);
}

function statsMock(dias: number, inicio?: string, fim?: string) {
  const conv = filtrarConversoesMock(dias, inicio, fim);
  const totalVendas = conv.length;
  const totalRevenue = conv.reduce((s, c) => s + c.amount, 0);
  const totalComissao = conv.reduce((s, c) => s + c.totalCommission, 0);
  const totalComissaoConfirmada = conv.reduce((s, c) => {
    const s_ = String(c.status).toUpperCase();
    const confirmado = s_ === "2" || s_ === "COMPLETED" || s_ === "SETTLED";
    return s + (confirmado ? c.totalCommission : 0);
  }, 0);
  const porCanalMap = new Map<string, { vendas: number; comissao: number; canal: string; tipo: "campanha" | "organico" | "indefinido" }>();
  const porTipo = { campanha: { vendas: 0, comissao: 0 }, organico: { vendas: 0, comissao: 0 } };
  for (const c of conv) {
    const cls = classificarCanal({ subId: c.subId, referrer: c.referrer, channelType: c.channelType });
    const cur = porCanalMap.get(cls.categoria) || { vendas: 0, comissao: 0, canal: cls.canal, tipo: cls.tipo };
    porCanalMap.set(cls.categoria, {
      vendas: cur.vendas + 1,
      comissao: cur.comissao + c.totalCommission,
      canal: cls.canal,
      tipo: cls.tipo
    });
    if (cls.tipo === "campanha") {
      porTipo.campanha.vendas += 1;
      porTipo.campanha.comissao += c.totalCommission;
    } else {
      porTipo.organico.vendas += 1;
      porTipo.organico.comissao += c.totalCommission;
    }
  }

  // Mock também por itemId pra simular enriquecimento
  type AggMock = { nome: string; vendas: number; comissao: number; revenue: number; itemId?: number; shopId?: number; shopName?: string };
  const produtosMap = new Map<string, AggMock>();
  for (const c of conv) {
    const k = c.itemId > 0 ? `i${c.itemId}` : c.produtoNome;
    const cur = produtosMap.get(k) || { nome: c.produtoNome, vendas: 0, comissao: 0, revenue: 0, itemId: c.itemId || undefined, shopId: c.shopId || undefined, shopName: c.shopName || undefined };
    cur.vendas += 1;
    cur.comissao += c.totalCommission;
    cur.revenue += c.amount;
    produtosMap.set(k, cur);
  }
  const topProdutos = Array.from(produtosMap.values())
    .sort((a, b) => b.comissao - a.comissao)
    .slice(0, 10)
    .map((p, i) => ({
      nome: p.nome,
      vendas: p.vendas,
      comissao: parseFloat(p.comissao.toFixed(2)),
      itemId: p.itemId,
      shopId: p.shopId,
      shopName: p.shopName,
      // Imagens picsum determinísticas — uma diferente pra cada produto mockado
      imagem: `https://picsum.photos/seed/${p.itemId || i}/400/300`,
      preco: parseFloat((p.revenue / Math.max(1, p.vendas)).toFixed(2)),
      rating: 4.5 + Math.random() * 0.4,
      linkProduto: p.itemId && p.shopId ? `https://shopee.com.br/product/${p.shopId}/${p.itemId}` : undefined,
      ticketMedio: parseFloat((p.revenue / Math.max(1, p.vendas)).toFixed(2))
    }));

  const porDiaMap = new Map<string, { vendas: number; comissao: number }>();
  const fmtDiaBR = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  for (const c of conv) {
    const dia = fmtDiaBR.format(new Date(c.purchaseTime * 1000));
    const cur = porDiaMap.get(dia) || { vendas: 0, comissao: 0 };
    porDiaMap.set(dia, { vendas: cur.vendas + 1, comissao: cur.comissao + c.totalCommission });
  }
  const porDia = Array.from(porDiaMap.entries())
    .map(([dia, v]) => ({ dia, ...v }))
    .sort((a, b) => a.dia.localeCompare(b.dia));

  return {
    totalVendas,
    totalRevenue,
    totalComissao,
    totalComissaoConfirmada,
    porCanal: Object.fromEntries(porCanalMap),
    porTipo,
    topProdutos,
    porDia
  };
}

export async function POST(req: Request) {
  const origem = validarMesmaOrigem(req);
  if (origem) return origem;
  const { dias, inicio, fim } = lerPeriodo(req);

  if (modoMockAtivo()) {
    return NextResponse.json({ ok: true, mock: true, sincronizadas: 0, stats: statsMock(dias, inicio, fim) });
  }

  if (!shopeeConfigurado()) {
    return NextResponse.json({ erro: "Shopee nao configurada", stats: statsConversoes(dias, inicio, fim) });
  }

  try {
    let inicioTs: number | undefined;
    let fimTs: number | undefined;
    if (inicio && fim) {
      inicioTs = timestampInicioDiaBR(inicio) - 7 * 86400;
      fimTs = timestampFimDiaBR(fim);
    }
    const conversoes = await buscarConversoes(Math.max(dias, 30), inicioTs, fimTs);
    const adapted: ConversaoLocal[] = conversoes
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
    return NextResponse.json({
      ok: true,
      sincronizadas: adapted.length,
      stats: statsConversoes(dias, inicio, fim)
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      erro: (e as Error).message,
      stats: statsConversoes(dias, inicio, fim)
    });
  }
}

export async function GET(req: Request) {
  const { dias, inicio, fim } = lerPeriodo(req);
  if (modoMockAtivo()) {
    return NextResponse.json({ ok: true, mock: true, stats: statsMock(dias, inicio, fim) });
  }
  return NextResponse.json({ stats: statsConversoes(dias, inicio, fim) });
}
