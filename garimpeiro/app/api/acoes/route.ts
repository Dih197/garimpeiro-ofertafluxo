import { NextResponse } from "next/server";
import { ativarAnuncio, escalarOrcamento, pausarAnuncio } from "@/lib/meta";
import { gerarLinkComSubIds } from "@/lib/shopee";
import { lerJson, numeroNoIntervalo, textoSeguro, urlHttpsPublica, validarMesmaOrigem } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const origem = validarMesmaOrigem(req);
  if (origem) return origem;
  const json = await lerJson<Record<string, unknown>>(req);
  if (!json.ok) return json.resposta;
  const tipo = textoSeguro(json.valor.tipo, 40);
  if (tipo === "pausar_ad" || tipo === "ativar_ad") {
    const adId = textoSeguro(json.valor.adId, 80);
    if (!/^\d+$/.test(adId)) return NextResponse.json({ ok: false, mensagem: "ID do anúncio inválido." }, { status: 400 });
    return NextResponse.json(tipo === "pausar_ad" ? await pausarAnuncio(adId) : await ativarAnuncio(adId));
  }
  if (tipo === "escalar_orcamento") {
    const alvoId = textoSeguro(json.valor.alvoId, 80);
    const alvoTipo = textoSeguro(json.valor.alvoTipo, 20);
    const percentual = numeroNoIntervalo(json.valor.percentual, -25, 50);
    if (!/^\d+$/.test(alvoId) || !["campaign", "adset"].includes(alvoTipo) || percentual === null) {
      return NextResponse.json({ ok: false, mensagem: "Ajuste de orçamento inválido ou fora do limite seguro (-25% a +50%)." }, { status: 400 });
    }
    return NextResponse.json(await escalarOrcamento(alvoId, alvoTipo as "campaign" | "adset", percentual));
  }
  if (tipo === "gerar_link_shopee") {
    const produtoUrl = textoSeguro(json.valor.produtoUrl, 1000);
    const subIds = Array.isArray(json.valor.subIds) ? json.valor.subIds.map((s) => textoSeguro(s, 50)).slice(0, 5) : [];
    if (!urlHttpsPublica(produtoUrl)) return NextResponse.json({ ok: false, mensagem: "URL de produto inválida." }, { status: 400 });
    const resultado = await gerarLinkComSubIds(produtoUrl, subIds);
    return NextResponse.json({ ...resultado, mensagem: resultado.ok ? `Link gerado: ${resultado.shortLink}` : resultado.erro });
  }
  return NextResponse.json({ ok: false, mensagem: "Ação não permitida." }, { status: 400 });
}
