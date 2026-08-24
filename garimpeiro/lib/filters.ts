import type { Produto, FiltroEstrategia } from "./types";

export function calcularScore(p: Produto, filtro: FiltroEstrategia): number {
  let score = 0;
  const comissaoTotal = p.comissaoPct;
  if (comissaoTotal >= filtro.comissaoMinima) score += 30;
  if (comissaoTotal >= 15) score += 15;
  if (comissaoTotal >= 25) score += 15;

  if (p.afiliados > 0) {
    if (p.afiliados <= filtro.afiliadosMaximos) score += 25;
    if (p.afiliados <= 100) score += 10;
  } else {
    score += 15;
  }

  if (p.vendas >= filtro.vendasMinimas) score += 15;
  if (p.vendas >= 5000) score += 10;
  if (p.vendas >= 10000) score += 5;

  if (p.rating >= filtro.ratingMinimo) score += 10;
  if (p.cupomDisponivel) score += 5;
  if (p.preco > 0 && p.preco <= 50) score += 5;

  return Math.min(100, Math.round(score));
}

export function aplicarFiltros(produtos: Produto[], filtro: FiltroEstrategia): Produto[] {
  return produtos
    .map((p) => ({ ...p, scoreOportunidade: calcularScore(p, filtro) }))
    .filter((p) => {
      const comissaoTotal = p.comissaoPct;
      if (comissaoTotal < filtro.comissaoMinima) return false;
      if (p.afiliados > 0 && p.afiliados > filtro.afiliadosMaximos) return false;
      if (p.vendas > 0 && p.vendas < filtro.vendasMinimas) return false;
      if (p.rating > 0 && p.rating < filtro.ratingMinimo) return false;
      return true;
    })
    .sort((a, b) => b.scoreOportunidade - a.scoreOportunidade);
}
