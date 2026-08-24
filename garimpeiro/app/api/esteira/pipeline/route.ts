import { NextResponse } from "next/server";
import { buscarProduto, ESTAGIOS, listarPipeline, moverPipeline, type EstagioPipeline } from "@/lib/db";
import { lerJson, textoSeguro, validarMesmaOrigem } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, pipeline: listarPipeline() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const origem = validarMesmaOrigem(req);
  if (origem) return origem;
  const json = await lerJson<{ produtoId?: unknown; estagio?: unknown; observacao?: unknown }>(req);
  if (!json.ok) return json.resposta;
  const produtoId = textoSeguro(json.valor.produtoId, 180);
  const estagio = textoSeguro(json.valor.estagio, 30) as EstagioPipeline;
  if (!buscarProduto(produtoId)) return NextResponse.json({ ok: false, erro: "Produto não encontrado." }, { status: 404 });
  if (!ESTAGIOS.includes(estagio)) return NextResponse.json({ ok: false, erro: "Estágio inválido." }, { status: 400 });
  moverPipeline(produtoId, estagio, textoSeguro(json.valor.observacao, 500));
  return NextResponse.json({ ok: true, pipeline: listarPipeline() });
}
