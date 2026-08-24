import type { Produto } from "./types";

export type CopyPlatform = "shopeevd" | "reels" | "tiktok" | "kwai" | "ytshorts" | "facebook" | "wpp" | "tg";

export function gerarCopy(produto: Produto, plataforma: CopyPlatform, link: string): string {
  const desc = produto.precoOriginal > produto.preco
    ? `R$${produto.preco.toFixed(2)} (de R$${produto.precoOriginal.toFixed(2)})`
    : `R$${produto.preco.toFixed(2)}`;
  const cupom = produto.cupomDisponivel ? ` 🎟️ Cupom ${produto.cupomValor || "ativo"}!` : "";
  const nome = produto.nome.length > 60 ? produto.nome.slice(0, 60) + "..." : produto.nome;

  switch (plataforma) {
    case "shopeevd":
      return [
        `🔥 ${nome}`,
        `${desc}${cupom}`,
        `⭐ ${produto.rating.toFixed(1)} · ${produto.vendas.toLocaleString("pt-BR")} vendidos`,
        ``,
        `Cliquei no carrinho amarelinho aqui embaixo 👇`,
        ``,
        `#achadinhoshopee #shopeebrasil #shopeevideo #achadinho`
      ].join("\n");

    case "reels":
      return [
        `Achei essa joia na Shopee 🤩`,
        `${nome} por ${desc}${cupom}`,
        ``,
        `Link na bio ✨`,
        ``,
        `#reels #achadinhos #shopeebrasil #achadosdashopee`
      ].join("\n");

    case "tiktok":
      return [
        `POV: você descobriu o achadinho da Shopee 🛒`,
        `${nome} - ${desc}${cupom}`,
        `Link na bio 👆`,
        ``,
        `#tiktokmademebuyit #achadinhosshopee #shopeebrasil #fyp`
      ].join("\n");

    case "kwai":
      return [
        `Achadinho de ${desc} pra você 🔥`,
        `${nome}${cupom}`,
        `Link aqui 👉 ${link}`,
        ``,
        `#kwai #achadinhos #shopee`
      ].join("\n");

    case "ytshorts":
      return [
        `${nome} | Achadinho Shopee #shorts`,
        ``,
        `🛒 Link com cupom: ${link}`,
        `${desc}${cupom}`,
        `⭐ ${produto.rating.toFixed(1)} · ${produto.vendas.toLocaleString("pt-BR")} compraram`,
        ``,
        `#shorts #achadinhoshopee #shopeebrasil`
      ].join("\n");

    case "facebook":
      return [
        `🎯 ${nome}`,
        ``,
        `Hoje achei na Shopee por ${desc}.${cupom}`,
        `${produto.vendas.toLocaleString("pt-BR")} pessoas já compraram e a nota é ${produto.rating.toFixed(1)}/5.`,
        ``,
        `Link direto: ${link}`,
        ``,
        `#shopee #achadinhos #ofertas`
      ].join("\n");

    case "wpp":
      return [
        `🛒 *Achei isso na Shopee:*`,
        `${nome}`,
        ``,
        `💰 ${desc}${cupom}`,
        `⭐ ${produto.rating.toFixed(1)} · ${produto.vendas.toLocaleString("pt-BR")} vendas`,
        ``,
        `*Link com cupom:* ${link}`,
        ``,
        `_Compra direto na Shopee, super seguro 💚_`
      ].join("\n");

    case "tg":
      return [
        `🔥 **${nome}**`,
        ``,
        `💰 ${desc}${cupom}`,
        `⭐ ${produto.rating.toFixed(1)} | 📦 ${produto.vendas.toLocaleString("pt-BR")} vendidos`,
        ``,
        `🛒 [COMPRAR COM CUPOM](${link})`
      ].join("\n");

    default:
      return `${nome}\n${desc}\n${link}`;
  }
}
