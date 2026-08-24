import { NextResponse } from "next/server";
import { consultarEspecialista } from "@/lib/ai";
import { validarMesmaOrigem } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const origem = validarMesmaOrigem(req);
  if (origem) return origem;
  let body: { pergunta?: string; contexto?: string };
  try {
    body = (await req.json()) as { pergunta?: string; contexto?: string };
  } catch {
    return NextResponse.json({ ok: false, erro: "Body JSON inválido" }, { status: 400 });
  }

  if (!body?.pergunta || body.pergunta.trim().length < 3) {
    return NextResponse.json({ ok: false, erro: "Pergunta vazia ou muito curta" });
  }
  // Limita tamanho pra evitar abuso
  if (body.pergunta.length > 2000) {
    return NextResponse.json({ ok: false, erro: "Pergunta muito longa (máx 2000 caracteres)" });
  }
  if (body.contexto && body.contexto.length > 20000) {
    body.contexto = body.contexto.slice(0, 20000);
  }

  try {
    const r = await consultarEspecialista(body.pergunta.trim(), body.contexto);
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ ok: false, erro: `Erro interno: ${(e as Error).message}` }, { status: 500 });
  }
}
