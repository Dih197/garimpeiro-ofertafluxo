import { NextResponse } from "next/server";
import { buscarProduto } from "@/lib/db";
import { numeroNoIntervalo, validarMesmaOrigem } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const origem = validarMesmaOrigem(req);
  if (origem) return origem;
  const url = new URL(req.url);
  const produtoId = (url.searchParams.get("produtoId") || "").slice(0, 180);
  const quantidade = numeroNoIntervalo(url.searchParams.get("quantidade") || "10", 1, 20);
  const produto = buscarProduto(produtoId);
  if (!produto || quantidade === null) return NextResponse.json({ ok: false, erro: "Produto ou quantidade inválidos." }, { status: 400 });
  return NextResponse.json({
    ok: false,
    bloqueado: true,
    erro: "A Shopee não fornece os vídeos dos compradores pela Affiliate API. Use o QR para abrir o produto no aplicativo sem burlar a plataforma.",
    linkProduto: produto.linkProduto
  }, { status: 409 });
}
