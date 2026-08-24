import { NextResponse } from "next/server";
import { atualizarPalavrasChave, listarNichos, toggleNicho } from "@/lib/db";
import { lerJson, textoSeguro, validarMesmaOrigem } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, nichos: listarNichos() }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(req: Request) {
  const origem = validarMesmaOrigem(req);
  if (origem) return origem;
  const json = await lerJson<{ id?: unknown; ativo?: unknown; palavrasChave?: unknown }>(req);
  if (!json.ok) return json.resposta;
  const id = textoSeguro(json.valor.id, 80);
  const nicho = listarNichos().find((n) => n.id === id);
  if (!nicho) return NextResponse.json({ ok: false, erro: "Nicho não encontrado." }, { status: 404 });
  if (typeof json.valor.ativo === "boolean") toggleNicho(id, json.valor.ativo);
  if (json.valor.palavrasChave !== undefined) {
    if (!Array.isArray(json.valor.palavrasChave)) return NextResponse.json({ ok: false, erro: "Lista de palavras inválida." }, { status: 400 });
    const palavras = [...new Set(json.valor.palavrasChave.map((p) => textoSeguro(p, 80)).filter((p) => p.length >= 2))].slice(0, 30);
    atualizarPalavrasChave(id, palavras);
  }
  return NextResponse.json({ ok: true, nichos: listarNichos() });
}
