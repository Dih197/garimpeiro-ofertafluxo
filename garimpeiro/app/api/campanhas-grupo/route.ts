import { NextResponse } from "next/server";
import {
  atualizarCampanhaGrupo,
  criarCampanhaGrupo,
  excluirCampanhaGrupo,
  listarCampanhasGrupo,
  listarLeadsGrupo,
  slugCampanha
} from "@/lib/campanhas-grupo";
import { lerJson, textoSeguro, validarMesmaOrigem } from "@/lib/api";

export const dynamic = "force-dynamic";

function linkWhatsAppValido(valor: string): boolean {
  try {
    const url = new URL(valor);
    return url.protocol === "https:" && (url.hostname === "chat.whatsapp.com" || url.hostname.endsWith(".whatsapp.com"));
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  return NextResponse.json(
    id
      ? { ok: true, campanhas: listarCampanhasGrupo(), leads: listarLeadsGrupo(id) }
      : { ok: true, campanhas: listarCampanhasGrupo() },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: Request) {
  const origem = validarMesmaOrigem(req);
  if (origem) return origem;
  const json = await lerJson<Record<string, unknown>>(req);
  if (!json.ok) return json.resposta;
  const nome = textoSeguro(json.valor.nome, 100);
  const whatsappLink = textoSeguro(json.valor.whatsappLink, 500);
  if (nome.length < 3) return NextResponse.json({ ok: false, erro: "Informe um nome com pelo menos 3 caracteres." }, { status: 400 });
  if (!linkWhatsAppValido(whatsappLink)) return NextResponse.json({ ok: false, erro: "Use um link de convite oficial https://chat.whatsapp.com/..." }, { status: 400 });
  try {
    const campanha = criarCampanhaGrupo({
      nome,
      slug: slugCampanha(textoSeguro(json.valor.slug, 64)),
      whatsappLink,
      whatsappGroupId: textoSeguro(json.valor.whatsappGroupId, 180),
      metaCampaignId: textoSeguro(json.valor.metaCampaignId, 80),
      titulo: textoSeguro(json.valor.titulo, 140),
      descricao: textoSeguro(json.valor.descricao, 500),
      textoBotao: textoSeguro(json.valor.textoBotao, 80),
      corDestaque: /^#[0-9a-f]{6}$/i.test(String(json.valor.corDestaque || "")) ? String(json.valor.corDestaque) : "#22c55e"
    });
    return NextResponse.json({ ok: true, campanha }, { status: 201 });
  } catch (erro) {
    return NextResponse.json({ ok: false, erro: erro instanceof Error ? erro.message : "Não foi possível criar a campanha." }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const origem = validarMesmaOrigem(req);
  if (origem) return origem;
  const json = await lerJson<Record<string, unknown>>(req);
  if (!json.ok) return json.resposta;
  const id = textoSeguro(json.valor.id, 80);
  if (!id) return NextResponse.json({ ok: false, erro: "ID obrigatório." }, { status: 400 });
  if (json.valor.whatsappLink !== undefined && !linkWhatsAppValido(textoSeguro(json.valor.whatsappLink, 500))) {
    return NextResponse.json({ ok: false, erro: "Link de convite do WhatsApp inválido." }, { status: 400 });
  }
  try {
    const campanha = atualizarCampanhaGrupo(id, {
      ...(json.valor.nome !== undefined ? { nome: textoSeguro(json.valor.nome, 100) } : {}),
      ...(json.valor.slug !== undefined ? { slug: slugCampanha(textoSeguro(json.valor.slug, 64)) } : {}),
      ...(json.valor.whatsappLink !== undefined ? { whatsappLink: textoSeguro(json.valor.whatsappLink, 500) } : {}),
      ...(json.valor.whatsappGroupId !== undefined ? { whatsappGroupId: textoSeguro(json.valor.whatsappGroupId, 180) } : {}),
      ...(json.valor.metaCampaignId !== undefined ? { metaCampaignId: textoSeguro(json.valor.metaCampaignId, 80) } : {}),
      ...(json.valor.titulo !== undefined ? { titulo: textoSeguro(json.valor.titulo, 140) } : {}),
      ...(json.valor.descricao !== undefined ? { descricao: textoSeguro(json.valor.descricao, 500) } : {}),
      ...(json.valor.textoBotao !== undefined ? { textoBotao: textoSeguro(json.valor.textoBotao, 80) } : {}),
      ...(typeof json.valor.ativo === "boolean" ? { ativo: json.valor.ativo } : {})
    });
    if (!campanha) return NextResponse.json({ ok: false, erro: "Campanha não encontrada." }, { status: 404 });
    return NextResponse.json({ ok: true, campanha });
  } catch (erro) {
    return NextResponse.json({ ok: false, erro: erro instanceof Error ? erro.message : "Não foi possível atualizar." }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const origem = validarMesmaOrigem(req);
  if (origem) return origem;
  const json = await lerJson<{ id?: unknown }>(req);
  if (!json.ok) return json.resposta;
  const id = textoSeguro(json.valor.id, 80);
  if (!id) return NextResponse.json({ ok: false, erro: "ID obrigatório." }, { status: 400 });
  const excluida = excluirCampanhaGrupo(id);
  if (!excluida) return NextResponse.json({ ok: false, erro: "Campanha não encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
