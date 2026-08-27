import { NextResponse } from "next/server";
import { registrarCliqueRastreado, resolverLinkRastreado } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Link público: registra um clique próprio e redireciona sem alterar o link afiliado da Shopee. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{12,64}$/.test(token)) return new NextResponse("Link inválido.", { status: 404 });
  const link = resolverLinkRastreado(token);
  if (!link) return new NextResponse("Link não encontrado.", { status: 404 });
  registrarCliqueRastreado(token, req.headers.get("referer") || "");
  return NextResponse.redirect(link.urlDestino, { status: 302 });
}
