import { NextResponse } from "next/server";
import {
  buscarCampanhaGrupoPorId,
  buscarCampanhaGrupoPorSlug,
  buscarLeadGrupo,
  capturarLead,
  confirmarEntradaGrupo,
  normalizarTelefone,
  registrarCliqueGrupo,
  registrarVisualizacao
} from "@/lib/campanhas-grupo";
import { enviarEventoMetaCapi } from "@/lib/meta-capi";
import { excedeuLimite, ipDaRequisicao, lerJson, textoSeguro, validarMesmaOrigem } from "@/lib/api";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

function chaveIp(req: Request, acao: string): string {
  return createHash("sha256").update(`${acao}:${ipDaRequisicao(req)}`).digest("hex");
}

function origemPagina(req: Request, slug: string): string {
  const url = new URL(req.url);
  return `${url.origin}/entrar/${encodeURIComponent(slug)}`;
}

export async function POST(req: Request) {
  const origem = validarMesmaOrigem(req);
  if (origem) return origem;
  const json = await lerJson<Record<string, unknown>>(req, 32_000);
  if (!json.ok) return json.resposta;
  const acao = textoSeguro(json.valor.acao, 30);
  if (excedeuLimite(chaveIp(req, acao), acao === "visualizacao" ? 120 : 30, 60_000)) {
    return NextResponse.json({ ok: false, erro: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });
  }

  if (acao === "visualizacao") {
    const campanha = buscarCampanhaGrupoPorSlug(textoSeguro(json.valor.slug, 64));
    if (!campanha) return NextResponse.json({ ok: false, erro: "Campanha não encontrada." }, { status: 404 });
    const visitanteId = textoSeguro(json.valor.visitanteId, 100);
    if (!visitanteId) return NextResponse.json({ ok: false, erro: "Identificador de visita ausente." }, { status: 400 });
    const eventId = registrarVisualizacao(campanha.id, visitanteId, {
      utm_source: textoSeguro(json.valor.utmSource, 120),
      utm_medium: textoSeguro(json.valor.utmMedium, 120),
      utm_campaign: textoSeguro(json.valor.utmCampaign, 160),
      utm_content: textoSeguro(json.valor.utmContent, 160),
      fbclid: textoSeguro(json.valor.fbclid, 300)
    });
    return NextResponse.json({ ok: true, eventId });
  }

  if (acao === "lead") {
    const campanha = buscarCampanhaGrupoPorSlug(textoSeguro(json.valor.slug, 64));
    if (!campanha) return NextResponse.json({ ok: false, erro: "Campanha não encontrada." }, { status: 404 });
    const nome = textoSeguro(json.valor.nome, 100);
    const telefone = normalizarTelefone(textoSeguro(json.valor.telefone, 30));
    const consentimento = json.valor.consentimento === true;
    if (nome.length < 2) return NextResponse.json({ ok: false, erro: "Informe seu nome." }, { status: 400 });
    if (telefone.length < 10) return NextResponse.json({ ok: false, erro: "Informe um WhatsApp válido com DDD." }, { status: 400 });
    if (!consentimento) return NextResponse.json({ ok: false, erro: "É necessário aceitar o uso dos dados para continuar." }, { status: 400 });
    const fbclid = textoSeguro(json.valor.fbclid, 300);
    const fbc = textoSeguro(json.valor.fbc, 400) || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : "");
    const resultado = capturarLead({
      campanhaId: campanha.id,
      visitanteId: textoSeguro(json.valor.visitanteId, 100),
      nome,
      telefone,
      consentimento,
      utmSource: textoSeguro(json.valor.utmSource, 120),
      utmMedium: textoSeguro(json.valor.utmMedium, 120),
      utmCampaign: textoSeguro(json.valor.utmCampaign, 160),
      utmContent: textoSeguro(json.valor.utmContent, 160),
      utmTerm: textoSeguro(json.valor.utmTerm, 160),
      fbclid,
      fbp: textoSeguro(json.valor.fbp, 400),
      fbc
    });
    const meta = await enviarEventoMetaCapi({
      eventName: "Contact", eventId: resultado.eventId, lead: resultado.lead, campanha,
      sourceUrl: origemPagina(req, campanha.slug), ip: ipDaRequisicao(req),
      userAgent: textoSeguro(req.headers.get("user-agent"), 500)
    });
    return NextResponse.json({ ok: true, leadId: resultado.lead.id, eventId: resultado.eventId, metaEnviado: meta.ok });
  }

  if (acao === "clique") {
    const resultado = registrarCliqueGrupo(textoSeguro(json.valor.leadId, 80));
    if (!resultado) return NextResponse.json({ ok: false, erro: "Lead não encontrado." }, { status: 404 });
    const campanha = buscarCampanhaGrupoPorId(resultado.lead.campanhaId)!;
    const meta = resultado.lead.consentimento ? await enviarEventoMetaCapi({
      eventName: "WhatsAppGroupClick", eventId: resultado.eventId, lead: resultado.lead, campanha,
      sourceUrl: origemPagina(req, campanha.slug), ip: ipDaRequisicao(req),
      userAgent: textoSeguro(req.headers.get("user-agent"), 500)
    }) : { ok: false };
    return NextResponse.json({ ok: true, link: campanha.whatsappLink, eventId: resultado.eventId, metaEnviado: meta.ok });
  }

  if (acao === "confirmar") {
    const resultado = confirmarEntradaGrupo(textoSeguro(json.valor.leadId, 80));
    if (!resultado) return NextResponse.json({ ok: false, erro: "Lead não encontrado." }, { status: 404 });
    const campanha = buscarCampanhaGrupoPorId(resultado.lead.campanhaId)!;
    const meta = resultado.novo && resultado.lead.consentimento ? await enviarEventoMetaCapi({
      eventName: "CompleteRegistration", eventId: resultado.eventId, lead: resultado.lead, campanha,
      sourceUrl: origemPagina(req, campanha.slug), ip: ipDaRequisicao(req),
      userAgent: textoSeguro(req.headers.get("user-agent"), 500)
    }) : { ok: false };
    return NextResponse.json({ ok: true, eventId: resultado.eventId, metaEnviado: meta.ok, jaConfirmado: !resultado.novo });
  }

  return NextResponse.json({ ok: false, erro: "Ação inválida." }, { status: 400 });
}
