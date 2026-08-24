import type { Nicho } from "./types";

export const NICHOS_PADRAO: Nicho[] = [
  {
    id: "beleza",
    nome: "Beleza & Skincare",
    emoji: "💄",
    palavrasChave: ["prime maquiagem", "base", "skincare", "acido hialuronico", "protetor solar", "batom", "delineador"],
    ativo: true
  },
  {
    id: "cozinha",
    nome: "Cozinha & Utensilios",
    emoji: "🍳",
    palavrasChave: ["organizador cozinha", "descascador", "fatiador", "tabua", "escorredor", "pote hermetico"],
    ativo: true
  },
  {
    id: "casa",
    nome: "Casa & Organizacao",
    emoji: "🏠",
    palavrasChave: ["organizador", "cabide", "decoracao quarto", "luminaria", "tapete", "cortina"],
    ativo: true
  },
  {
    id: "tech",
    nome: "Tecnologia & Gadgets",
    emoji: "📱",
    palavrasChave: ["mouse gamer", "fone bluetooth", "carregador", "suporte celular", "iluminacao led"],
    ativo: true
  },
  {
    id: "pet",
    nome: "Pet",
    emoji: "🐾",
    palavrasChave: ["caminha pet", "comedouro", "brinquedo cachorro", "coleira", "racao"],
    ativo: false
  },
  {
    id: "fitness",
    nome: "Fitness & Saude",
    emoji: "💪",
    palavrasChave: ["faixa elastica", "garrafa agua", "corda pular", "halter ajustavel", "tapete yoga"],
    ativo: false
  },
  {
    id: "moda",
    nome: "Moda & Acessorios",
    emoji: "👗",
    palavrasChave: ["bolsa feminina", "tenis", "oculos sol", "relogio", "brincos"],
    ativo: false
  },
  {
    id: "papelaria",
    nome: "Papelaria & Organizacao",
    emoji: "📒",
    palavrasChave: ["caderno", "caneta", "planner", "agenda", "marca texto"],
    ativo: false
  },
  {
    id: "infantil",
    nome: "Brinquedos & Infantil",
    emoji: "🧸",
    palavrasChave: ["brinquedo educativo", "boneca", "pelucia", "carrinho", "fantasia"],
    ativo: false
  },
  {
    id: "automotivo",
    nome: "Ferramentas & Automotivo",
    emoji: "🔧",
    palavrasChave: ["chaveiro", "kit ferramenta", "limpador", "porta celular carro", "aspirador automotivo"],
    ativo: false
  }
];
