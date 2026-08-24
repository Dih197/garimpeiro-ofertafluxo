"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, Sliders, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRESETS } from "@/lib/presets";
import { FiltrosAvancadosDrawer } from "./filtros-avancados-drawer";

const COR_PRESET: Record<string, string> = {
  rose: "border-rose-500/40 bg-rose-500/15 text-rose-300",
  amber: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  violet: "border-violet-500/40 bg-violet-500/15 text-violet-300",
  emerald: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  yellow: "border-yellow-500/40 bg-yellow-500/15 text-yellow-300",
  orange: "border-orange-500/40 bg-orange-500/15 text-orange-300",
  red: "border-red-500/40 bg-red-500/15 text-red-300",
  blue: "border-blue-500/40 bg-blue-500/15 text-blue-300",
  pink: "border-pink-500/40 bg-pink-500/15 text-pink-300"
};

type Props = {
  presetAtivo: string | null;
  totalResultados: number;
  filtroAmpliado: boolean;
};

const FILTROS_CUSTOMIZADOS = [
  "comissao-min", "comissao-max", "vendas-min", "vendas-max", "rating-min",
  "preco-min", "preco-max", "comissao-valor-min", "dias-restantes",
  "score-min", "oficial", "preferred", "confiavel", "cupom", "extra", "ordenar"
] as const;

const ROTULO_FILTRO: Record<string, (valor: string) => string> = {
  "comissao-min": (v) => `Comissão ≥ ${v}%`,
  "comissao-max": (v) => `Comissão ≤ ${v}%`,
  "vendas-min": (v) => `Vendas ≥ ${v}`,
  "vendas-max": (v) => `Vendas ≤ ${v}`,
  "rating-min": (v) => `Nota ≥ ${v}`,
  "preco-min": (v) => `Preço ≥ R$ ${v}`,
  "preco-max": (v) => `Preço ≤ R$ ${v}`,
  "comissao-valor-min": (v) => `Ganho ≥ R$ ${v}`,
  "dias-restantes": (v) => `Termina em até ${v}d`,
  "score-min": (v) => `Score ≥ ${v}`,
  oficial: () => "Só lojas oficiais",
  preferred: () => "Só lojas preferidas",
  confiavel: () => "Lojas confiáveis",
  cupom: () => "Com cupom",
  extra: () => "Com bônus extra",
  ordenar: (v) => `Ordenar: ${v.replaceAll("-", " ")}`
};

export function PresetsBar({ presetAtivo, totalResultados, filtroAmpliado }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [drawerAberto, setDrawerAberto] = useState(false);
  const filtrosAtivos = useMemo(
    () => FILTROS_CUSTOMIZADOS
      .map((chave) => ({ chave, valor: searchParams.get(chave) }))
      .filter((f): f is { chave: typeof FILTROS_CUSTOMIZADOS[number]; valor: string } => Boolean(f.valor)),
    [searchParams]
  );
  const nichoAtivo = searchParams.get("nicho");
  const temFiltrosAtivos = Boolean(presetAtivo || nichoAtivo || filtrosAtivos.length > 0);

  const navegar = (url: URL) => router.push(url.pathname + (url.search || ""));

  function selecionar(id: string | null) {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("preset", id);
    else url.searchParams.delete("preset");
    // Limpa filtros customizados ao mudar preset
    FILTROS_CUSTOMIZADOS.forEach((k) => url.searchParams.delete(k));
    navegar(url);
  }

  function removerFiltro(chave: string) {
    const url = new URL(window.location.href);
    url.searchParams.delete(chave);
    navegar(url);
  }

  function limparTudo() {
    const url = new URL(window.location.href);
    url.searchParams.delete("preset");
    url.searchParams.delete("nicho");
    FILTROS_CUSTOMIZADOS.forEach((k) => url.searchParams.delete(k));
    navegar(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
            <Filter className="h-3.5 w-3.5 text-shopee" />
            Presets de filtragem
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">Use um atalho ou combine filtros para refinar {totalResultados} resultado(s).</p>
        </div>
        <div className="flex items-center gap-2">
          {temFiltrosAtivos && (
            <button
              onClick={limparTudo}
              className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-zinc-400 hover:bg-white/10"
            >
              <RotateCcw className="h-3 w-3" /> Limpar filtros
            </button>
          )}
          <button
            onClick={() => setDrawerAberto(true)}
            className="flex items-center gap-1.5 rounded-lg border border-shopee/30 bg-shopee/10 px-3 py-1.5 text-xs font-bold text-shopee transition-colors hover:bg-shopee/20"
          >
            <Sliders className="h-3.5 w-3.5" /> Filtros avançados
            {filtrosAtivos.length > 0 && <span className="rounded-full bg-shopee px-1.5 py-0.5 text-[9px] text-white">{filtrosAtivos.length}</span>}
          </button>
        </div>
      </div>

      {temFiltrosAtivos && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Ativos</span>
          {presetAtivo && <span className="rounded-full border border-shopee/30 bg-shopee/10 px-2.5 py-1 text-[10px] font-bold text-shopee">{PRESETS.find((p) => p.id === presetAtivo)?.emoji} {PRESETS.find((p) => p.id === presetAtivo)?.nome}</span>}
          {nichoAtivo && (
            <button onClick={() => removerFiltro("nicho")} title="Mostrar todos os nichos" className="flex items-center gap-1 rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold text-violet-200 hover:border-rose-400/40 hover:text-rose-300">
              Nicho: {nichoAtivo} <X className="h-3 w-3" />
            </button>
          )}
          {filtrosAtivos.map(({ chave, valor }) => (
            <button key={chave} onClick={() => removerFiltro(chave)} title="Remover filtro" className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-zinc-300 hover:border-rose-400/40 hover:text-rose-300">
              {ROTULO_FILTRO[chave]?.(valor) || chave} <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}

      {filtroAmpliado && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-500/[0.07] px-3 py-2.5 text-[11px] leading-relaxed text-amber-100">
          <span className="mt-0.5">✨</span>
          <span><strong>Mostrando os resultados mais próximos.</strong> Não havia combinação exata nos produtos atuais; este ranking respeita o objetivo do preset para você não ficar sem resultados.</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {PRESETS.map((p) => {
          const ativo = presetAtivo === p.id;
          const cor = COR_PRESET[p.cor] || COR_PRESET.emerald;
          return (
            <button
              key={p.id}
              onClick={() => selecionar(p.id)}
              className={cn(
                "group relative flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all",
                ativo
                  ? cor + " ring-2 ring-offset-1 ring-offset-zinc-950"
                  : "border-white/5 bg-white/5 text-zinc-300 hover:border-white/10 hover:bg-white/10"
              )}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-xl">{p.emoji}</span>
                {ativo && (
                  <span className="rounded-full bg-current/20 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider">
                    Ativo
                  </span>
                )}
              </div>
              <div className="text-xs font-bold leading-tight">{p.nome}</div>
              <div className="text-[10px] leading-tight opacity-70 line-clamp-2">{p.descricao}</div>
            </button>
          );
        })}
      </div>

      <FiltrosAvancadosDrawer aberto={drawerAberto} onClose={() => setDrawerAberto(false)} />
    </div>
  );
}
