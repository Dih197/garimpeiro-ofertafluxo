import { TrendingUp } from "lucide-react";
import { GarimparButton } from "@/components/garimpar-button";
import { ProdutosGrid } from "@/components/produtos-grid";
import { FiltrosBar } from "@/components/filtros-bar";
import { PresetsBar } from "@/components/presets-bar";
import { HomeStats } from "@/components/home-stats";
import { BuscaProdutos } from "@/components/busca-produtos";
import {
  listarNichos,
  listarProdutosHoje,
  listarProdutosPorNicho,
  estatisticasHoje,
  ultimaExecucao
} from "@/lib/db";
import { PRESETS, aplicarFiltroAvancado, ranquearPorProximidade, type FiltroAvancado } from "@/lib/presets";

export const dynamic = "force-dynamic";

type SP = {
  nicho?: string;
  preset?: string;
  "comissao-min"?: string;
  "comissao-max"?: string;
  "vendas-min"?: string;
  "vendas-max"?: string;
  "rating-min"?: string;
  "preco-min"?: string;
  "preco-max"?: string;
  "comissao-valor-min"?: string;
  "dias-restantes"?: string;
  "score-min"?: string;
  oficial?: string;
  preferred?: string;
  confiavel?: string;
  cupom?: string;
  extra?: string;
  ordenar?: string;
};

function paramsParaFiltro(params: SP, base?: FiltroAvancado | null): FiltroAvancado | null {
  const p: Partial<FiltroAvancado> = {};
  const num = (k: keyof SP, parser = parseFloat) => {
    const v = params[k];
    return v ? parser(v) : undefined;
  };
  const cmin = num("comissao-min");
  const cmax = num("comissao-max");
  const vmin = num("vendas-min", (s) => parseInt(s, 10));
  const vmax = num("vendas-max", (s) => parseInt(s, 10));
  const rmin = num("rating-min");
  const pmin = num("preco-min");
  const pmax = num("preco-max");
  const cvmin = num("comissao-valor-min");
  const dias = num("dias-restantes", (s) => parseInt(s, 10));
  const smin = num("score-min", (s) => parseInt(s, 10));

  if (cmin !== undefined) p.comissaoMinima = cmin;
  if (cmax !== undefined) p.comissaoMaxima = cmax;
  if (vmin !== undefined) p.vendasMinimas = vmin;
  if (vmax !== undefined) p.vendasMaximas = vmax;
  if (rmin !== undefined) p.ratingMinimo = rmin;
  if (pmin !== undefined) p.precoMinimo = pmin;
  if (pmax !== undefined) p.precoMaximo = pmax;
  if (cvmin !== undefined) p.comissaoValorMinimo = cvmin;
  if (dias !== undefined) p.diasOfertaRestantes = dias;
  if (smin !== undefined) p.scoreMinimo = smin;
  if (params.oficial === "true") p.apenasOficial = true;
  if (params.preferred === "true") p.apenasPreferred = true;
  if (params.confiavel === "true") p.apenasLojaConfiavel = true;
  if (params.cupom === "true") p.apenasComCupom = true;
  if (params.extra === "true") p.apenasComExtra = true;
  if (params.ordenar) p.ordenarPor = params.ordenar as FiltroAvancado["ordenarPor"];

  if (base) return { ...base, ...p };
  if (Object.keys(p).length === 0) return null;
  return {
    comissaoMinima: 0,
    vendasMinimas: 0,
    ratingMinimo: 0,
    ordenarPor: "score",
    limit: 60,
    ...p
  };
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<SP>;
}) {
  const params = await searchParams;
  const nichos = listarNichos();

  // Pega base
  const produtosBase = params.nicho
    ? listarProdutosPorNicho(params.nicho, 200)
    : listarProdutosHoje(200);
  let produtos = produtosBase;

  // Aplica preset OU custom
  const preset = params.preset ? PRESETS.find((p) => p.id === params.preset) : null;
  const filtro = paramsParaFiltro(params, preset?.filtro);

  let filtroAmpliado = false;
  if (filtro) {
    produtos = aplicarFiltroAvancado(produtosBase, filtro);
    // Um filtro não deve deixar a tela vazia quando existem produtos garimpados.
    // Mostra os melhores candidatos para o objetivo do preset, não uma lista genérica.
    if (!produtos.length && produtosBase.length) {
      filtroAmpliado = true;
      produtos = ranquearPorProximidade(produtosBase, filtro);
    }
  } else {
    produtos = produtos.slice(0, 60);
  }

  const stats = estatisticasHoje();
  const ultima = ultimaExecucao();
  const nichosAtivos = nichos.filter((n) => n.ativo).length;

  return (
    <div className="page-shell mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="page-header mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-medium text-shopee">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
            DASHBOARD
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Garimpo do dia</h1>
          <p className="text-sm text-zinc-400">
            Top produtos filtrados por comissão, vendas reais, rating e tempo de oferta.
          </p>
        </div>
        <GarimparButton />
      </header>

      <HomeStats
        stats={stats}
        nichosAtivos={nichosAtivos}
        nichosTotal={nichos.length}
        topScore={produtos[0]?.scoreOportunidade ?? "—"}
        totalOportunidades={produtos.length}
        ultimaExecucaoEm={ultima?.executadoEm ?? null}
      />

      {/* BUSCA DE PRODUTOS SHOPEE — pesquisa ao vivo com ranking por vendas + comissão */}
      <section className="mb-6 glass rounded-2xl p-5">
        <BuscaProdutos />
      </section>

      <section className="mb-6">
        <PresetsBar presetAtivo={params.preset || null} totalResultados={produtos.length} filtroAmpliado={filtroAmpliado} />
      </section>

      <section className="mb-6">
        <FiltrosBar nichos={nichos} nichoSelecionado={params.nicho} />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ee4d2d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            {produtos.length} {preset ? `${preset.emoji} ${preset.nome}` : "oportunidades ranqueadas"}
          </h2>
        </div>
        <ProdutosGrid produtos={produtos} />
      </section>
    </div>
  );
}
