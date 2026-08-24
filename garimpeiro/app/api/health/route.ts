import { NextResponse } from "next/server";
import { estatisticasHoje, ultimaExecucao } from "@/lib/db";
import { modoMockAtivo, statusLLM, statusMeta, statusShopee } from "@/lib/configs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      servico: "garimpeiro",
      versao: "2.0.0",
      modo: modoMockAtivo() ? "demonstracao" : "real",
      integracoes: { shopee: statusShopee(), meta: statusMeta(), ia: statusLLM() },
      dadosHoje: estatisticasHoje(),
      ultimaExecucao: ultimaExecucao(),
      uptimeSegundos: Math.floor(process.uptime()),
      horario: new Date().toISOString()
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (erro) {
    return NextResponse.json({ ok: false, erro: erro instanceof Error ? erro.message : "Banco indisponível" }, { status: 503 });
  }
}
