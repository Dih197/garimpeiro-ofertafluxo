import { NextResponse } from "next/server";
import { listarProdutosHoje, listarProdutosPorNicho, listarProdutosHistorico } from "@/lib/db";
import { PRESETS, aplicarFiltroAvancado, type FiltroAvancado } from "@/lib/presets";
import type { Produto } from "@/lib/types";
import { numeroNoIntervalo } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const escopo = url.searchParams.get("escopo") || "hoje";
  const nicho = url.searchParams.get("nicho");
  const presetId = url.searchParams.get("preset");
  const limit = numeroNoIntervalo(url.searchParams.get("limit") || "60", 1, 200) || 60;

  // Pega base de produtos
  let base: Produto[];
  if (nicho) base = listarProdutosPorNicho(nicho, 200);
  else if (escopo === "tudo") base = listarProdutosHistorico(200);
  else base = listarProdutosHoje(200);

  // Aplica preset OU filtros customizados via querystring
  let filtroFinal: FiltroAvancado | null = null;

  if (presetId) {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (preset) filtroFinal = { ...preset.filtro, limit };
  }

  // Permite override de cada parâmetro via querystring
  const params: Partial<FiltroAvancado> = {};
  const ler = (k: string, parser = parseFloat) => {
    const v = url.searchParams.get(k);
    if (v === null || v === "") return undefined;
    const n = parser(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const lerBool = (k: string) => {
    const v = url.searchParams.get(k);
    return v === "true" ? true : v === "false" ? false : undefined;
  };

  const cmin = ler("comissao-min");
  const cmax = ler("comissao-max");
  const vmin = ler("vendas-min", (s) => parseInt(s, 10));
  const vmax = ler("vendas-max", (s) => parseInt(s, 10));
  const rmin = ler("rating-min");
  const pmin = ler("preco-min");
  const pmax = ler("preco-max");
  const cvmin = ler("comissao-valor-min");
  const dias = ler("dias-restantes", (s) => parseInt(s, 10));
  const smin = ler("score-min", (s) => parseInt(s, 10));
  const oficial = lerBool("oficial");
  const preferred = lerBool("preferred");
  const confiavel = lerBool("confiavel");
  const cupom = lerBool("cupom");
  const extra = lerBool("extra");
  const ordenarRaw = url.searchParams.get("ordenar");
  const ordenar = (["score", "vendas", "comissao", "comissao-valor", "rating", "desconto", "fim-oferta"] as const)
    .find((item) => item === ordenarRaw) as FiltroAvancado["ordenarPor"] | undefined;

  if (cmin !== undefined) params.comissaoMinima = cmin;
  if (cmax !== undefined) params.comissaoMaxima = cmax;
  if (vmin !== undefined) params.vendasMinimas = vmin;
  if (vmax !== undefined) params.vendasMaximas = vmax;
  if (rmin !== undefined) params.ratingMinimo = rmin;
  if (pmin !== undefined) params.precoMinimo = pmin;
  if (pmax !== undefined) params.precoMaximo = pmax;
  if (cvmin !== undefined) params.comissaoValorMinimo = cvmin;
  if (dias !== undefined) params.diasOfertaRestantes = dias;
  if (smin !== undefined) params.scoreMinimo = smin;
  if (oficial !== undefined) params.apenasOficial = oficial;
  if (preferred !== undefined) params.apenasPreferred = preferred;
  if (confiavel !== undefined) params.apenasLojaConfiavel = confiavel;
  if (cupom !== undefined) params.apenasComCupom = cupom;
  if (extra !== undefined) params.apenasComExtra = extra;
  if (ordenar) params.ordenarPor = ordenar;

  const temCustom = Object.keys(params).length > 0;

  if (filtroFinal) {
    filtroFinal = { ...filtroFinal, ...params, limit };
  } else if (temCustom) {
    // só custom (sem preset): combina com defaults seguros
    filtroFinal = {
      comissaoMinima: 0,
      vendasMinimas: 0,
      ratingMinimo: 0,
      ordenarPor: "score",
      limit,
      ...params
    };
  }

  const produtos = filtroFinal ? aplicarFiltroAvancado(base, filtroFinal) : base.slice(0, limit);

  return NextResponse.json({
    produtos,
    presetAplicado: presetId,
    totalAntes: base.length,
    totalDepois: produtos.length
  });
}
