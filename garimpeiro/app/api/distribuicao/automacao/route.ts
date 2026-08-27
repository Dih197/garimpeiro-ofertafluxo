import { NextResponse } from "next/server";
import {
  buscarDestinoDistribuicao, buscarProduto, concluirEnvioDistribuicao, criarDestinoDistribuicao,
  excluirDestinoDistribuicao, limitesEnvioDistribuicao, listarDestinosDistribuicao, listarEnviosDistribuicao,
  registrarEnvioDistribuicao, salvarLinkCanal, criarLinkRastreado, atualizarDestinoDistribuicao, obterAutomacaoDistribuicao,
  salvarAutomacaoDistribuicao, obterSegurancaDistribuicao, salvarSegurancaDistribuicao, resumoCliquesRastreados
} from "@/lib/db";
import { escreverConfig, lerConfig } from "@/lib/configs";
import { listarCampanhasGrupo } from "@/lib/campanhas-grupo";
import { evolutionConfigurada, enviarTextoEvolution, textoOfertaWhatsApp } from "@/lib/oferta-whatsapp";
import { atualizarGruposWhatsAppDireto, conectarWhatsAppDireto, enviarTextoWhatsAppDireto, estadoWhatsAppDireto, sessaoWhatsAppDiretoExiste } from "@/lib/whatsapp-direto";
import { cloudWhatsAppConfigurado, enviarTextoWhatsAppCloud } from "@/lib/whatsapp-cloud";
import { gerarLinkComSubIds, shopeeConfigurado } from "@/lib/shopee";
import { lerJson, textoSeguro, validarMesmaOrigem } from "@/lib/api";
import { sincronizarOfertaFluxo } from "@/lib/ofertafluxo-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const tipos = new Set(["grupo", "contato"]);
const configEvolution = () => ({ url: lerConfig("EVOLUTION_API_URL"), key: lerConfig("EVOLUTION_API_KEY"), instance: lerConfig("EVOLUTION_INSTANCE_NAME") });
const configCloud = () => ({ token: lerConfig("WHATSAPP_CLOUD_TOKEN"), phoneNumberId: lerConfig("WHATSAPP_CLOUD_PHONE_NUMBER_ID") });

export async function GET() {
  if (sessaoWhatsAppDiretoExiste() && estadoWhatsAppDireto().status === "desconectado") {
    conectarWhatsAppDireto().catch(() => {});
  }
  const config = configEvolution();
  const ofertaFluxo = sincronizarOfertaFluxo();
  const diretoLocal = estadoWhatsAppDireto();
  // Quando o OfertaFluxo está conectado, ele é a fonte de verdade dos grupos
  // autorizados. Isso impede que a tela misture grupos não cadastrados.
  const direto = ofertaFluxo.disponivel && ofertaFluxo.integracoes.whatsappDireto
    ? { ...diretoLocal, status: "conectado" as const, qr: null, erro: null, grupos: ofertaFluxo.gruposAutorizados }
    : diretoLocal;
  return NextResponse.json({
    ok: true,
    destinos: listarDestinosDistribuicao(),
    envios: listarEnviosDistribuicao(),
    campanhasGrupo: listarCampanhasGrupo(),
    cliquesRastreados: resumoCliquesRastreados(30),
    agenda: obterAutomacaoDistribuicao(),
    seguranca: obterSegurancaDistribuicao(),
    direto,
    ofertaFluxo,
    evolution: { configurada: evolutionConfigurada(config), instancia: config.instance },
    cloud: { configurada: cloudWhatsAppConfigurado(configCloud()) }
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const origem = validarMesmaOrigem(req);
  if (origem) return origem;
  const json = await lerJson<{ acao?: unknown; [key: string]: unknown }>(req);
  if (!json.ok) return json.resposta;
  const acao = textoSeguro(json.valor.acao, 32);

  if (acao === "salvar_evolution") {
    const url = textoSeguro(json.valor.url, 500);
    const instancia = textoSeguro(json.valor.instancia, 100);
    const key = textoSeguro(json.valor.key, 1_000);
    try {
      const destino = new URL(url);
      if (!/^https?:$/.test(destino.protocol) || destino.username || destino.password) throw new Error();
    } catch { return NextResponse.json({ ok: false, erro: "Informe uma URL HTTP(S) válida da Evolution API." }, { status: 400 }); }
    if (!instancia || !key) return NextResponse.json({ ok: false, erro: "Informe a instância e a chave da API." }, { status: 400 });
    escreverConfig("EVOLUTION_API_URL", url.replace(/\/$/, ""));
    escreverConfig("EVOLUTION_INSTANCE_NAME", instancia);
    escreverConfig("EVOLUTION_API_KEY", key);
    return NextResponse.json({ ok: true });
  }

  if (acao === "salvar_cloud") {
    const token = textoSeguro(json.valor.token, 2_000);
    const phoneNumberId = textoSeguro(json.valor.phoneNumberId, 100);
    if (!token || !/^\d{5,}$/.test(phoneNumberId)) return NextResponse.json({ ok: false, erro: "Informe o token e o Phone Number ID do WhatsApp Cloud." }, { status: 400 });
    escreverConfig("WHATSAPP_CLOUD_TOKEN", token);
    escreverConfig("WHATSAPP_CLOUD_PHONE_NUMBER_ID", phoneNumberId);
    return NextResponse.json({ ok: true });
  }

  if (acao === "conectar_direto") {
    await conectarWhatsAppDireto();
    return NextResponse.json({ ok: true, direto: estadoWhatsAppDireto() });
  }

  if (acao === "atualizar_grupos_direto") {
    await atualizarGruposWhatsAppDireto();
    return NextResponse.json({ ok: true, direto: estadoWhatsAppDireto() });
  }

  if (acao === "criar_destino") {
    const nome = textoSeguro(json.valor.nome, 100);
    const tipo = textoSeguro(json.valor.tipo, 20);
    const destinoOriginal = textoSeguro(json.valor.destino, 180);
    const destino = tipo === "contato" ? destinoOriginal.replace(/\D/g, "") : destinoOriginal;
    if (!nome || !tipos.has(tipo) || !destino || destino.length < (tipo === "contato" ? 10 : 6)) return NextResponse.json({ ok: false, erro: "Preencha nome, tipo e identificador válido do destino." }, { status: 400 });
    if (json.valor.confirmado !== true) return NextResponse.json({ ok: false, erro: "Confirme que você administra o destino e tem autorização para publicar nele." }, { status: 400 });
    return NextResponse.json({ ok: true, destino: criarDestinoDistribuicao({ nome, destino, tipo: tipo as "grupo" | "contato", confirmado: true, ativo: true }) }, { status: 201 });
  }

  if (acao === "salvar_agenda") {
    const intervalo = Number(json.valor.intervaloMinutos);
    if (!Number.isFinite(intervalo) || intervalo < 15 || intervalo > 1_440) return NextResponse.json({ ok: false, erro: "Use um intervalo entre 15 minutos e 24 horas." }, { status: 400 });
    return NextResponse.json({ ok: true, agenda: salvarAutomacaoDistribuicao({ ativa: json.valor.ativa === true, intervaloMinutos: intervalo }) });
  }

  if (acao === "salvar_seguranca") {
    const valores = ["maxPorHora", "maxPorDia", "intervaloDestinoMinutos", "descansoInicio", "descansoFim"].map(chave => Number(json.valor[chave]));
    if (valores.some(valor => !Number.isFinite(valor))) return NextResponse.json({ ok: false, erro: "Preencha todos os limites de segurança." }, { status: 400 });
    return NextResponse.json({ ok: true, seguranca: salvarSegurancaDistribuicao({ maxPorHora: valores[0], maxPorDia: valores[1], intervaloDestinoMinutos: valores[2], descansoInicio: valores[3], descansoFim: valores[4] }) });
  }

  if (acao === "atualizar_destino") {
    const id = textoSeguro(json.valor.id, 80);
    const atual = buscarDestinoDistribuicao(id);
    if (!atual) return NextResponse.json({ ok: false, erro: "Destino não encontrado." }, { status: 404 });
    const ativo = typeof json.valor.ativo === "boolean" ? json.valor.ativo : atual.ativo;
    const destino = atualizarDestinoDistribuicao(id, { ativo });
    return NextResponse.json({ ok: true, destino });
  }

  if (acao === "excluir_destino") {
    const excluido = excluirDestinoDistribuicao(textoSeguro(json.valor.id, 80));
    return NextResponse.json({ ok: excluido }, { status: excluido ? 200 : 404 });
  }

  if (acao === "enviar") {
    const produto = buscarProduto(textoSeguro(json.valor.produtoId, 180));
    const destino = buscarDestinoDistribuicao(textoSeguro(json.valor.destinoId, 80));
    if (!produto || !destino) return NextResponse.json({ ok: false, erro: "Produto ou destino não encontrado." }, { status: 404 });
    if (!destino.ativo || !destino.confirmado) return NextResponse.json({ ok: false, erro: "Ative e confirme o destino antes do envio." }, { status: 400 });
    const config = configEvolution(); const cloud = configCloud();
    const direto = estadoWhatsAppDireto();
    const provedor = textoSeguro(json.valor.provedor, 20) || (destino.tipo === "contato" && cloudWhatsAppConfigurado(cloud) ? "cloud" : direto.status === "conectado" ? "direto" : "evolution");
    if (provedor === "cloud" && (destino.tipo !== "contato" || !cloudWhatsAppConfigurado(cloud))) return NextResponse.json({ ok: false, erro: "WhatsApp Cloud exige contato com opt-in e credenciais configuradas." }, { status: 400 });
    if (provedor === "direto" && direto.status !== "conectado") return NextResponse.json({ ok: false, erro: "Conecte o WhatsApp por QR antes de enviar." }, { status: 400 });
    if (provedor === "evolution" && !evolutionConfigurada(config)) return NextResponse.json({ ok: false, erro: "Configure a Evolution API antes de enviar." }, { status: 400 });
    const limites = limitesEnvioDistribuicao(destino.id);
    const seguranca = obterSegurancaDistribuicao();
    if (limites.hora >= seguranca.maxPorHora) return NextResponse.json({ ok: false, erro: `Limite de segurança de ${seguranca.maxPorHora} envios por hora atingido.` }, { status: 429 });
    if (limites.dia >= seguranca.maxPorDia) return NextResponse.json({ ok: false, erro: `Limite de segurança de ${seguranca.maxPorDia} envios por dia atingido.` }, { status: 429 });
    if (limites.ultimoDestinoEm && Date.now() - new Date(limites.ultimoDestinoEm).getTime() < seguranca.intervaloDestinoMinutos * 60_000) return NextResponse.json({ ok: false, erro: `Aguarde ${seguranca.intervaloDestinoMinutos} minutos antes de enviar novamente para este destino.` }, { status: 429 });

    let link = produto.linkAfiliado || produto.linkProduto;
    if (shopeeConfigurado() && produto.linkProduto) {
      const gerado = await gerarLinkComSubIds(produto.linkProduto, ["wpp", produto.nichoId || "geral"]);
      if (gerado.ok && gerado.shortLink) link = gerado.shortLink;
    }
    if (!link) return NextResponse.json({ ok: false, erro: "Este produto não possui link para distribuição." }, { status: 400 });
    const linkRastreado = criarLinkRastreado({
      produtoId: produto.id,
      destinoId: destino.id,
      canal: "wpp",
      urlDestino: link,
      baseUrl: new URL(req.url).origin
    });
    salvarLinkCanal(produto.id, "wpp", linkRastreado);
    const texto = textoOfertaWhatsApp(produto, linkRastreado);
    const envio = registrarEnvioDistribuicao(produto.id, destino.id, texto);
    try {
      if (provedor === "cloud") await enviarTextoWhatsAppCloud({ ...cloud, para: destino.destino, texto });
      else if (provedor === "evolution") await enviarTextoEvolution({ ...config, destino: destino.destino, texto });
      else await enviarTextoWhatsAppDireto(destino.destino, texto, produto.imagem);
      concluirEnvioDistribuicao(envio.id);
      return NextResponse.json({ ok: true, envio: { ...envio, status: "enviado" } });
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "Falha desconhecida ao enviar.";
      concluirEnvioDistribuicao(envio.id, mensagem);
      return NextResponse.json({ ok: false, erro: mensagem }, { status: 502 });
    }
  }

  return NextResponse.json({ ok: false, erro: "Ação inválida." }, { status: 400 });
}
