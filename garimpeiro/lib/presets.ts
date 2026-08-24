import type { Produto } from "./types";

// ===== Filtro avançado =====
export type FiltroAvancado = {
  comissaoMinima: number;        // %
  comissaoMaxima?: number;       // %
  vendasMinimas: number;
  vendasMaximas?: number;
  ratingMinimo: number;
  precoMinimo?: number;          // R$
  precoMaximo?: number;          // R$
  comissaoValorMinimo?: number;  // R$ por venda
  diasOfertaRestantes?: number;  // <= X dias
  scoreMinimo?: number;          // 0-100
  apenasOficial?: boolean;
  apenasPreferred?: boolean;
  /** Loja Oficial (Mall) OU Preferida */
  apenasLojaConfiavel?: boolean;
  apenasComCupom?: boolean;
  apenasComExtra?: boolean;      // tem comissão extra do seller
  ordenarPor?: "score" | "vendas" | "comissao" | "comissao-valor" | "rating" | "desconto" | "fim-oferta";
  limit?: number;
};

export const FILTRO_DEFAULT: FiltroAvancado = {
  comissaoMinima: 9,
  vendasMinimas: 1000,
  ratingMinimo: 4.5,
  ordenarPor: "score",
  limit: 60
};

// ===== Presets =====
export type Preset = {
  id: string;
  nome: string;
  emoji: string;
  descricao: string;
  cor: string; // tailwind base color
  filtro: FiltroAvancado;
};

export const PRESETS: Preset[] = [
  {
    id: "vendendo-agora",
    nome: "Vendendo agora",
    emoji: "🔥",
    descricao: "Alta tração: vendas + boa avaliação",
    cor: "rose",
    filtro: {
      comissaoMinima: 8,
      vendasMinimas: 5000,
      ratingMinimo: 4.5,
      apenasComCupom: false, // cupom é bônus, não obrigatório aqui
      ordenarPor: "vendas",
      limit: 60
    }
  },
  {
    id: "em-alta",
    nome: "Ofertas em alta",
    emoji: "🚀",
    descricao: "Comissão >15% + loja confiável",
    cor: "amber",
    filtro: {
      comissaoMinima: 15,
      vendasMinimas: 2000,
      ratingMinimo: 4.5,
      apenasLojaConfiavel: true,
      ordenarPor: "comissao",
      limit: 60
    }
  },
  {
    id: "sem-concorrencia",
    nome: "Sem concorrência",
    emoji: "🎯",
    descricao: "Vendas baixas-médias com comissão alta (vácuo)",
    cor: "violet",
    filtro: {
      comissaoMinima: 18,
      vendasMinimas: 500,
      vendasMaximas: 3000, // baixa concorrência (proxy)
      ratingMinimo: 4.5,
      ordenarPor: "comissao",
      limit: 60
    }
  },
  {
    id: "melhores",
    nome: "Melhores ofertas",
    emoji: "💎",
    descricao: "Score alto: combinação de tudo",
    cor: "emerald",
    filtro: {
      comissaoMinima: 10,
      vendasMinimas: 1000,
      ratingMinimo: 4.6,
      scoreMinimo: 80,
      ordenarPor: "score",
      limit: 60
    }
  },
  {
    id: "maior-comissao",
    nome: "Maior R$ por venda",
    emoji: "💰",
    descricao: "Quem paga mais em valor absoluto",
    cor: "yellow",
    filtro: {
      comissaoMinima: 5,
      comissaoValorMinimo: 5,
      vendasMinimas: 500,
      ratingMinimo: 4.3,
      ordenarPor: "comissao-valor",
      limit: 60
    }
  },
  {
    id: "top-vendas",
    nome: "Top vendas",
    emoji: "🏆",
    descricao: "Os mais vendidos do momento",
    cor: "orange",
    filtro: {
      comissaoMinima: 5,
      vendasMinimas: 10000,
      ratingMinimo: 4.5,
      ordenarPor: "vendas",
      limit: 60
    }
  },
  {
    id: "acabando",
    nome: "Acabando logo",
    emoji: "⏰",
    descricao: "Oferta termina em <3 dias - urgência alta",
    cor: "red",
    filtro: {
      comissaoMinima: 8,
      vendasMinimas: 500,
      ratingMinimo: 4.0,
      diasOfertaRestantes: 3,
      ordenarPor: "fim-oferta",
      limit: 60
    }
  },
  {
    id: "com-cupom",
    nome: "Com cupom ativo",
    emoji: "🎟️",
    descricao: "Apenas produtos com cupom (converte mais)",
    cor: "emerald",
    filtro: {
      comissaoMinima: 5,
      vendasMinimas: 500,
      ratingMinimo: 4.3,
      apenasComCupom: true,
      ordenarPor: "score",
      limit: 60
    }
  },
  {
    id: "oficiais",
    nome: "Lojas oficiais (Mall)",
    emoji: "✅",
    descricao: "Mall - máxima credibilidade",
    cor: "blue",
    filtro: {
      comissaoMinima: 5,
      vendasMinimas: 500,
      ratingMinimo: 4.5,
      apenasOficial: true,
      ordenarPor: "score",
      limit: 60
    }
  },
  {
    id: "ate-30",
    nome: "Até R$30 (impulso)",
    emoji: "🛒",
    descricao: "Preço de impulso, alta conversão",
    cor: "pink",
    filtro: {
      comissaoMinima: 8,
      vendasMinimas: 1000,
      ratingMinimo: 4.5,
      precoMaximo: 30,
      ordenarPor: "score",
      limit: 60
    }
  },
  {
    id: "comissao-turbo",
    nome: "Comissão turbo",
    emoji: "⚡",
    descricao: "Maior potencial de ganho por venda",
    cor: "yellow",
    filtro: {
      comissaoMinima: 20,
      comissaoValorMinimo: 4,
      vendasMinimas: 100,
      ratingMinimo: 0,
      ordenarPor: "comissao-valor",
      limit: 60
    }
  },
  {
    id: "bem-avaliados",
    nome: "Bem avaliados",
    emoji: "⭐",
    descricao: "Produtos com ótima reputação",
    cor: "amber",
    filtro: {
      comissaoMinima: 5,
      vendasMinimas: 50,
      ratingMinimo: 4.7,
      ordenarPor: "rating",
      limit: 60
    }
  },
  {
    id: "ticket-premium",
    nome: "Ticket premium",
    emoji: "💎",
    descricao: "Comissão alta em produtos de maior valor",
    cor: "violet",
    filtro: {
      comissaoMinima: 10,
      precoMinimo: 80,
      comissaoValorMinimo: 8,
      vendasMinimas: 0,
      ratingMinimo: 0,
      ordenarPor: "comissao-valor",
      limit: 60
    }
  },
  {
    id: "inicio-rapido",
    nome: "Início rápido",
    emoji: "🎬",
    descricao: "Preço acessível para criar vídeos hoje",
    cor: "pink",
    filtro: {
      comissaoMinima: 5,
      precoMaximo: 50,
      vendasMinimas: 0,
      ratingMinimo: 4.3,
      ordenarPor: "score",
      limit: 60
    }
  }
];

// ===== Aplicador =====
export function calcularScoreAvancado(p: Produto): number {
  let score = 0;
  const cms = p.comissaoPct;
  if (cms >= 9) score += 30;
  if (cms >= 15) score += 15;
  if (cms >= 25) score += 15;
  if (p.vendas >= 1000) score += 15;
  if (p.vendas >= 5000) score += 10;
  if (p.vendas >= 10000) score += 5;
  if (p.rating >= 4.5) score += 10;
  if (p.cupomDisponivel) score += 5;
  if (p.preco > 0 && p.preco <= 50) score += 5;
  if (p.lojaOficial) score += 5;
  return Math.min(100, Math.round(score));
}

export function aplicarFiltroAvancado(produtos: Produto[], filtro: FiltroAvancado): Produto[] {
  const agora = Math.floor(Date.now() / 1000);
  const limiteDias = filtro.diasOfertaRestantes !== undefined
    ? agora + filtro.diasOfertaRestantes * 86400
    : 0;

  let filtrados = produtos
    .map((p) => ({ ...p, scoreOportunidade: calcularScoreAvancado(p) }))
    .filter((p) => {
      const cms = p.comissaoPct;
      if (cms < filtro.comissaoMinima) return false;
      if (filtro.comissaoMaxima !== undefined && cms > filtro.comissaoMaxima) return false;
      if (p.vendas < filtro.vendasMinimas) return false;
      if (filtro.vendasMaximas !== undefined && p.vendas > filtro.vendasMaximas) return false;
      if (p.rating > 0 && p.rating < filtro.ratingMinimo) return false;
      if (filtro.precoMinimo !== undefined && p.preco < filtro.precoMinimo) return false;
      if (filtro.precoMaximo !== undefined && p.preco > filtro.precoMaximo) return false;
      if (filtro.comissaoValorMinimo !== undefined && p.comissaoValor < filtro.comissaoValorMinimo) return false;
      if (filtro.scoreMinimo !== undefined && p.scoreOportunidade < filtro.scoreMinimo) return false;
      if (filtro.apenasOficial && !p.lojaOficial) return false;
      if (filtro.apenasPreferred && !p.lojaPreferred) return false;
      if (filtro.apenasLojaConfiavel && !p.lojaOficial && !p.lojaPreferred) return false;
      if (filtro.apenasComCupom && !p.cupomDisponivel) return false;
      if (filtro.apenasComExtra && p.comissaoExtraPct <= 0) return false;
      // Filtro de tempo restante: só produtos com fim_oferta dentro do limite
      if (limiteDias > 0) {
        if (p.fimOferta === 0 || p.fimOferta > 4_102_444_800) return false;
        if (p.fimOferta < agora) return false; // já encerrou
        if (p.fimOferta > limiteDias) return false; // muito longe
      }
      return true;
    });

  // Ordenação
  switch (filtro.ordenarPor) {
    case "vendas":
      filtrados.sort((a, b) => b.vendas - a.vendas);
      break;
    case "comissao":
      filtrados.sort((a, b) => b.comissaoPct - a.comissaoPct);
      break;
    case "comissao-valor":
      filtrados.sort((a, b) => b.comissaoValor - a.comissaoValor);
      break;
    case "rating":
      filtrados.sort((a, b) => b.rating - a.rating);
      break;
    case "desconto": {
      const desc = (p: Produto) =>
        p.precoOriginal > p.preco ? (p.precoOriginal - p.preco) / p.precoOriginal : 0;
      filtrados.sort((a, b) => desc(b) - desc(a));
      break;
    }
    case "fim-oferta":
      filtrados.sort((a, b) => {
        const fimA = a.fimOferta > 4_102_444_800 ? 0 : a.fimOferta;
        const fimB = b.fimOferta > 4_102_444_800 ? 0 : b.fimOferta;
        if (fimA === 0) return 1;
        if (fimB === 0) return -1;
        return fimA - fimB;
      });
      break;
    case "score":
    default:
      filtrados.sort((a, b) => b.scoreOportunidade - a.scoreOportunidade);
  }

  return filtrados.slice(0, filtro.limit || 60);
}

/**
 * Quando não há item que atenda 100% dos filtros, ordena os produtos pela
 * proximidade com o objetivo escolhido. Assim o painel continua útil sem
 * transformar todos os presets na mesma lista genérica.
 */
export function ranquearPorProximidade(produtos: Produto[], filtro: FiltroAvancado): Produto[] {
  const agora = Math.floor(Date.now() / 1000);
  const limiteDias = filtro.diasOfertaRestantes !== undefined
    ? agora + filtro.diasOfertaRestantes * 86400
    : 0;
  const limite = filtro.limit || 60;

  const distancia = (p: Produto) => {
    let total = 0;
    const score = calcularScoreAvancado(p);
    total += Math.max(0, filtro.comissaoMinima - p.comissaoPct) / Math.max(filtro.comissaoMinima, 1);
    if (filtro.comissaoMaxima !== undefined) total += Math.max(0, p.comissaoPct - filtro.comissaoMaxima) / Math.max(filtro.comissaoMaxima, 1);
    total += Math.max(0, filtro.vendasMinimas - p.vendas) / Math.max(filtro.vendasMinimas, 1);
    if (filtro.vendasMaximas !== undefined) total += Math.max(0, p.vendas - filtro.vendasMaximas) / Math.max(filtro.vendasMaximas, 1);
    total += Math.max(0, filtro.ratingMinimo - p.rating) / Math.max(filtro.ratingMinimo, 1);
    if (filtro.precoMinimo !== undefined) total += Math.max(0, filtro.precoMinimo - p.preco) / Math.max(filtro.precoMinimo, 1);
    if (filtro.precoMaximo !== undefined) total += Math.max(0, p.preco - filtro.precoMaximo) / Math.max(filtro.precoMaximo, 1);
    if (filtro.comissaoValorMinimo !== undefined) total += Math.max(0, filtro.comissaoValorMinimo - p.comissaoValor) / Math.max(filtro.comissaoValorMinimo, 1);
    if (filtro.scoreMinimo !== undefined) total += Math.max(0, filtro.scoreMinimo - score) / Math.max(filtro.scoreMinimo, 1);
    if (filtro.apenasOficial && !p.lojaOficial) total += 1;
    if (filtro.apenasPreferred && !p.lojaPreferred) total += 1;
    if (filtro.apenasLojaConfiavel && !p.lojaOficial && !p.lojaPreferred) total += 1;
    if (filtro.apenasComCupom && !p.cupomDisponivel) total += 1;
    if (filtro.apenasComExtra && p.comissaoExtraPct <= 0) total += 1;
    if (limiteDias > 0 && (p.fimOferta === 0 || p.fimOferta > 4_102_444_800 || p.fimOferta < agora || p.fimOferta > limiteDias)) total += 1;
    return total;
  };

  const compararObjetivo = (a: Produto, b: Produto) => {
    switch (filtro.ordenarPor) {
      case "vendas": return b.vendas - a.vendas;
      case "comissao": return b.comissaoPct - a.comissaoPct;
      case "comissao-valor": return b.comissaoValor - a.comissaoValor;
      case "rating": return b.rating - a.rating;
      case "desconto": {
        const desconto = (p: Produto) => p.precoOriginal > p.preco ? (p.precoOriginal - p.preco) / p.precoOriginal : 0;
        return desconto(b) - desconto(a);
      }
      case "fim-oferta": {
        const fim = (p: Produto) => p.fimOferta > 0 && p.fimOferta <= 4_102_444_800 ? p.fimOferta : Number.MAX_SAFE_INTEGER;
        return fim(a) - fim(b);
      }
      case "score":
      default: return calcularScoreAvancado(b) - calcularScoreAvancado(a);
    }
  };

  return produtos
    .map((p) => ({ produto: { ...p, scoreOportunidade: calcularScoreAvancado(p) }, distancia: distancia(p) }))
    .sort((a, b) => a.distancia - b.distancia || compararObjetivo(a.produto, b.produto) || b.produto.scoreOportunidade - a.produto.scoreOportunidade)
    .slice(0, limite)
    .map(({ produto }) => produto);
}
