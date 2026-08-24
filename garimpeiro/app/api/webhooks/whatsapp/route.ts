import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { lerConfig } from "@/lib/configs";
import { buscarCampanhaGrupoPorId, confirmarEntradaPorWebhook } from "@/lib/campanhas-grupo";
import { enviarEventoMetaCapi } from "@/lib/meta-capi";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const modo = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token") || "";
  const desafio = url.searchParams.get("hub.challenge") || "";
  const esperado = lerConfig("WHATSAPP_WEBHOOK_VERIFY_TOKEN");
  if (modo === "subscribe" && esperado && token === esperado) return new NextResponse(desafio, { status: 200 });
  return NextResponse.json({ ok: false, erro: "Verificação recusada." }, { status: 403 });
}

type GrupoEvento = { group_id?: string; type?: string; added_participants?: Array<{ wa_id?: string; input?: string }> };

function extrairEntradas(payload: unknown): Array<{ grupoId: string; telefone: string }> {
  if (!payload || typeof payload !== "object") return [];
  const raiz = payload as { entry?: Array<{ changes?: Array<{ field?: string; value?: { groups?: GrupoEvento[] } }> }> };
  const entradas: Array<{ grupoId: string; telefone: string }> = [];
  for (const entry of raiz.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== "group_participants_update") continue;
      for (const grupo of change.value?.groups || []) {
        if (grupo.type !== "group_participants_add" || !grupo.group_id) continue;
        for (const participante of grupo.added_participants || []) {
          const telefone = participante.wa_id || participante.input || "";
          if (telefone) entradas.push({ grupoId: grupo.group_id, telefone });
        }
      }
    }
  }
  return entradas;
}

export async function POST(req: Request) {
  const segredo = lerConfig("WHATSAPP_APP_SECRET");
  if (!segredo) return NextResponse.json({ ok: false, erro: "App Secret não configurado." }, { status: 503 });
  const corpo = await req.text();
  const assinatura = req.headers.get("x-hub-signature-256") || "";
  const esperada = `sha256=${createHmac("sha256", segredo).update(corpo).digest("hex")}`;
  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ ok: false, erro: "Assinatura inválida." }, { status: 401 });
  }
  let payload: unknown;
  try { payload = JSON.parse(corpo); } catch {
    return NextResponse.json({ ok: false, erro: "JSON inválido." }, { status: 400 });
  }
  let confirmados = 0;
  for (const entrada of extrairEntradas(payload)) {
    const resultado = confirmarEntradaPorWebhook(entrada.grupoId, entrada.telefone);
    if (!resultado || !resultado.novo) continue;
    confirmados += 1;
    const campanha = buscarCampanhaGrupoPorId(resultado.lead.campanhaId);
    if (campanha && resultado.lead.consentimento) {
      await enviarEventoMetaCapi({
        eventName: "CompleteRegistration", eventId: resultado.eventId, lead: resultado.lead,
        campanha, sourceUrl: `${new URL(req.url).origin}/entrar/${encodeURIComponent(campanha.slug)}`
      });
    }
  }
  return NextResponse.json({ ok: true, recebidos: extrairEntradas(payload).length, confirmados });
}
