import { NextResponse } from "next/server";
import { alternarFavorito, listarProdutosFavoritados, listarFavoritosIds } from "@/lib/db";
import { lerJson, textoSeguro, validarMesmaOrigem } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const apenasIds = url.searchParams.get("ids") === "true";
  if (apenasIds) {
    return NextResponse.json({ ids: Array.from(listarFavoritosIds()) });
  }
  return NextResponse.json({ produtos: listarProdutosFavoritados() });
}

export async function POST(req: Request) {
  const origem = validarMesmaOrigem(req);
  if (origem) return origem;
  const json = await lerJson<{ produtoId?: unknown }>(req);
  if (!json.ok) return json.resposta;
  const produtoId = textoSeguro(json.valor.produtoId, 180);
  if (!produtoId) return NextResponse.json({ erro: "produtoId obrigatório" }, { status: 400 });
  const agora = alternarFavorito(produtoId);
  return NextResponse.json({ ok: true, favoritado: agora });
}
