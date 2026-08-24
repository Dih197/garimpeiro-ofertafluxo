import { NextResponse } from "next/server";
import { buscarProduto, listarRoteirosPorProduto, salvarRoteiros, marcarComoUsado } from "@/lib/db";
import { gerarRoteirosIA } from "@/lib/ai";
import { lerJson, numeroNoIntervalo, textoSeguro, validarMesmaOrigem } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const produtoId = url.searchParams.get("produtoId");
  if (!produtoId) return NextResponse.json({ erro: "produtoId obrigatorio" }, { status: 400 });
  const roteiros = listarRoteirosPorProduto(produtoId);
  return NextResponse.json({ roteiros });
}

export async function POST(req: Request) {
  const origem = validarMesmaOrigem(req);
  if (origem) return origem;
  const json = await lerJson<{ produtoId?: unknown; quantidade?: unknown }>(req);
  if (!json.ok) return json.resposta;
  const produtoId = textoSeguro(json.valor.produtoId, 180);
  const quantidade = json.valor.quantidade === undefined ? 3 : numeroNoIntervalo(json.valor.quantidade, 1, 10);
  if (!produtoId || quantidade === null) return NextResponse.json({ erro: "Produto ou quantidade inválidos." }, { status: 400 });
  const produto = buscarProduto(produtoId);
  if (!produto) return NextResponse.json({ erro: "Produto nao encontrado" }, { status: 404 });
  const roteiros = await gerarRoteirosIA(produto, Math.floor(quantidade));
  salvarRoteiros(roteiros);
  marcarComoUsado(produto.id);
  return NextResponse.json({ roteiros });
}
