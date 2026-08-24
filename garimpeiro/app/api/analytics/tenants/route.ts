import { NextResponse } from "next/server";
import { infoTenants, limparDadosDeOutrasContas } from "@/lib/db";
import { validarMesmaOrigem } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET — retorna info sobre dados das contas conectadas (atual vs outras) */
export async function GET() {
  return NextResponse.json({ ok: true, ...infoTenants() });
}

/** DELETE — apaga dados de contas diferentes da atual (Shopee + Meta) */
export async function DELETE(req: Request) {
  const origem = validarMesmaOrigem(req);
  if (origem) return origem;
  const r = limparDadosDeOutrasContas();
  return NextResponse.json({ ok: true, ...r, info: infoTenants() });
}
