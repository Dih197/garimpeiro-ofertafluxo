export function cloudWhatsAppConfigurado(config: { token: string; phoneNumberId: string }) {
  return Boolean(config.token && config.phoneNumberId);
}

/** Cloud API é usada apenas para contatos com opt-in; grupos não são suportados pela API oficial. */
export async function enviarTextoWhatsAppCloud(dados: { token: string; phoneNumberId: string; para: string; texto: string }) {
  const resposta = await fetch(`https://graph.facebook.com/v24.0/${encodeURIComponent(dados.phoneNumberId)}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${dados.token}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: dados.para.replace(/\D/g, ""), type: "text", text: { preview_url: true, body: dados.texto } }),
    signal: AbortSignal.timeout(20_000)
  });
  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(`WhatsApp Cloud recusou o envio (${resposta.status}). ${JSON.stringify(corpo).slice(0, 240)}`);
  return corpo;
}
