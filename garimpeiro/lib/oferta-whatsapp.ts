import type { Produto } from "./types";

const brl = (valor: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);

/** Mensagem curta, pronta para destinos onde o usuário tem autorização de publicação. */
export function textoOfertaWhatsApp(produto: Produto, link: string): string {
  const desconto = produto.precoOriginal > produto.preco && produto.preco > 0
    ? Math.round((1 - produto.preco / produto.precoOriginal) * 100)
    : 0;
  const antes = produto.precoOriginal > produto.preco ? `\n~De ${brl(produto.precoOriginal)}~` : "";
  const cupom = produto.cupomDisponivel && produto.cupomValor ? `\n🏷️ Cupom: *${produto.cupomValor}*` : "";
  const selo = desconto > 0 ? `🔥 *${desconto}% OFF*\n` : "🛍️ *Oferta selecionada*\n";
  return `🛍️ *${produto.nome}*${antes}\n\n${selo}❤️ *Por ${brl(produto.preco)}*${cupom}\n⭐ ${produto.rating.toFixed(1)} · ${produto.vendas.toLocaleString("pt-BR")} vendas\n\n🛒 *Link:* ${link}\n\n⚠️ Preço e estoque podem mudar na Shopee.`;
}

export function evolutionConfigurada(config: { url: string; key: string; instance: string }): boolean {
  return Boolean(config.url && config.key && config.instance);
}

export async function enviarTextoEvolution(dados: { url: string; key: string; instance: string; destino: string; texto: string }) {
  const endpoint = `${dados.url.replace(/\/$/, "")}/message/sendText/${encodeURIComponent(dados.instance)}`;
  const resposta = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: dados.key },
    body: JSON.stringify({ number: dados.destino, textMessage: { text: dados.texto }, linkPreview: true }),
    signal: AbortSignal.timeout(20_000)
  });
  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(`Evolution API recusou o envio (${resposta.status}). ${JSON.stringify(corpo).slice(0, 240)}`);
  return corpo;
}
