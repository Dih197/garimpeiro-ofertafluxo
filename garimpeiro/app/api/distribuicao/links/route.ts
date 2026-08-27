import { NextResponse } from "next/server";
import { buscarProduto, criarLinkRastreado, salvarLinkCanal } from "@/lib/db";
import { gerarLinkComSubIds, shopeeConfigurado } from "@/lib/shopee";
import { lerJson, textoSeguro, validarMesmaOrigem } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const CANAIS = new Set(["shopeevd", "reels", "tiktok", "kwai", "ytshorts", "facebook", "wpp", "tg"]);

export async function POST(req: Request) {
  const origem = validarMesmaOrigem(req);
  if (origem) return origem;
  const json = await lerJson<{ produtoId?: unknown; canais?: unknown }>(req);
  if (!json.ok) return json.resposta;
  const produtoId = textoSeguro(json.valor.produtoId, 180);
  const canais = Array.isArray(json.valor.canais)
    ? [...new Set(json.valor.canais.map((c) => textoSeguro(c, 20)).filter((c) => CANAIS.has(c)))].slice(0, CANAIS.size)
    : [];
  const produto = buscarProduto(produtoId);
  if (!produto) return NextResponse.json({ ok: false, erro: "Produto não encontrado." }, { status: 404 });
  if (!canais.length) return NextResponse.json({ ok: false, erro: "Selecione ao menos um canal." }, { status: 400 });

  const links: Record<string, string> = {};
  const avisos: string[] = [];
  const origemProduto = produto.linkProduto || produto.linkAfiliado;
  for (const canal of canais) {
    let link = produto.linkAfiliado || origemProduto;
    if (shopeeConfigurado() && origemProduto) {
      const gerado = await gerarLinkComSubIds(origemProduto, [canal, produto.nichoId || "geral"]);
      if (gerado.ok && gerado.shortLink) link = gerado.shortLink;
      else avisos.push(`${canal}: ${gerado.erro || "link não gerado"}`);
    }
    if (link) {
      const rastreado = criarLinkRastreado({ produtoId: produto.id, canal, urlDestino: link, baseUrl: new URL(req.url).origin });
      links[canal] = rastreado;
      salvarLinkCanal(produto.id, canal, rastreado);
    }
  }
  return NextResponse.json({ ok: true, links, avisos });
}
