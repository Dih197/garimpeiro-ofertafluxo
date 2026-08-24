import { createHash } from "crypto";
import { lerConfig } from "./configs";
import type { CampanhaGrupo, LeadGrupo } from "./campanhas-grupo";

function sha(valor: string): string {
  return createHash("sha256").update(valor.trim().toLowerCase()).digest("hex");
}

export async function enviarEventoMetaCapi(dados: {
  eventName: "Contact" | "CompleteRegistration" | "WhatsAppGroupClick";
  eventId: string;
  lead: LeadGrupo;
  campanha: CampanhaGrupo;
  sourceUrl: string;
  ip?: string;
  userAgent?: string;
}): Promise<{ ok: boolean; erro?: string }> {
  const pixelId = lerConfig("META_PIXEL_ID").trim();
  const token = (lerConfig("META_CAPI_TOKEN") || lerConfig("META_ACCESS_TOKEN")).trim();
  if (!pixelId || !token) return { ok: false, erro: "Pixel/CAPI não configurado" };

  const primeiroNome = dados.lead.nome.trim().split(/\s+/)[0] || "";
  const userData: Record<string, string | string[]> = {
    ph: [sha(dados.lead.telefone)],
    external_id: [sha(dados.lead.id)]
  };
  if (primeiroNome) userData.fn = [sha(primeiroNome)];
  if (dados.lead.fbp) userData.fbp = dados.lead.fbp;
  if (dados.lead.fbc) userData.fbc = dados.lead.fbc;
  if (dados.ip && dados.ip !== "desconhecido") userData.client_ip_address = dados.ip;
  if (dados.userAgent) userData.client_user_agent = dados.userAgent;

  const payload: Record<string, unknown> = {
    data: [{
      event_name: dados.eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: dados.eventId,
      event_source_url: dados.sourceUrl,
      action_source: "website",
      user_data: userData,
      custom_data: {
        campaign_id: dados.campanha.metaCampaignId || dados.campanha.id,
        campaign_name: dados.campanha.nome,
        funnel: "whatsapp_group"
      }
    }]
  };
  const testCode = lerConfig("META_CAPI_TEST_CODE").trim();
  if (testCode) payload.test_event_code = testCode;
  const versao = /^v\d+\.\d+$/.test(lerConfig("META_API_VERSION")) ? lerConfig("META_API_VERSION") : "v23.0";

  try {
    const resposta = await fetch(`https://graph.facebook.com/${versao}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000)
    });
    const retorno = await resposta.json().catch(() => ({})) as { error?: { message?: string } };
    if (!resposta.ok) return { ok: false, erro: retorno.error?.message || `Meta HTTP ${resposta.status}` };
    return { ok: true };
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : "Falha ao enviar evento" };
  }
}
