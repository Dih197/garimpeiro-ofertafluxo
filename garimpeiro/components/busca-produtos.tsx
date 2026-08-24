"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Search,
  Loader2,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Star,
  ExternalLink,
  Copy,
  Check,
  Trophy,
  Flame,
  Heart,
  Filter,
  ArrowUpDown,
  Sparkles,
  X,
  BadgeCheck,
  ShieldCheck,
  Tag,
  Clock
} from "lucide-react";
import Image from "next/image";
import { cn, formatBRL, formatNumber, formatPct } from "@/lib/utils";
import type { Produto } from "@/lib/types";

type SortMode = "score" | "vendas" | "comissao" | "ganho" | "preco";

const SUGESTOES = [
  "fone bluetooth", "air fryer", "whey protein", "organizador", "garrafa térmica",
  "carregador", "luminária", "mouse gamer", "maquiagem", "suplemento",
  "relógio", "fritadeira", "fone sem fio", "skincare", "panela elétrica",
  "kit cozinha", "escova secadora", "câmera wifi", "smartwatch", "mala viagem",
  "tapete", "pote hermético", "mochila", "chapinha", "perfume", "creatina",
  "cadeira escritório", "anel led", "cabide", "jogo de cama", "aspirador portátil",
  "caixa de som", "extensão elétrica", "fraldas", "brinquedo educativo", "pet shop"
];

export function BuscaProdutos() {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<(Produto & { scoreBusca?: number })[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [buscouAlgo, setBuscouAlgo] = useState(false);
  const [sort, setSort] = useState<SortMode>("score");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function buscar(termo?: string) {
    const q = (termo || query).trim();
    if (!q || q.length < 2) return;

    // Cancel previous request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setBuscando(true);
    setErro(null);
    setBuscouAlgo(true);

    try {
      // sortType 0 foi descontinuado pela Shopee e retorna "System Error".
      // O score final é aplicado no cliente, então relevância (1) é a base ideal.
      const sortMap: Record<SortMode, number> = { score: 1, vendas: 2, comissao: 3, ganho: 3, preco: 1 };
      let url = `/api/buscar-produtos?q=${encodeURIComponent(q)}&limit=50&sort=${sortMap[sort]}`;
      if (minPrice && !isNaN(Number(minPrice))) url += `&minPrice=${Number(minPrice)}`;
      if (maxPrice && !isNaN(Number(maxPrice))) url += `&maxPrice=${Number(maxPrice)}`;

      const r = await fetch(url, {
        signal: controller.signal
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.erro || `Erro ${r.status}`);
      setResultados(data.produtos || []);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setErro((e as Error).message);
    } finally {
      setBuscando(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    buscar();
  }

  function buscarSugestao(s: string) {
    setQuery(s);
    buscar(s);
  }

  async function copiarLink(produto: Produto) {
    try {
      await navigator.clipboard.writeText(produto.linkAfiliado || produto.linkProduto);
      setCopiadoId(produto.id);
      setTimeout(() => setCopiadoId(null), 2000);
    } catch {}
  }

  // Sort results locally
  const sorted = [...resultados].sort((a, b) => {
    if (sort === "ganho") return b.comissaoValor - a.comissaoValor || b.vendas - a.vendas;
    if (sort === "comissao") return b.comissaoPct - a.comissaoPct || b.vendas - a.vendas;
    if (sort === "vendas") return b.vendas - a.vendas || b.comissaoPct - a.comissaoPct;
    if (sort === "preco") return a.preco - b.preco;
    // score (default)
    return (b.scoreBusca ?? 0) - (a.scoreBusca ?? 0);
  });

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-shopee to-orange-600 shadow-lg shadow-shopee/20">
          <Search className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="text-base font-bold tracking-tight sm:text-lg">Buscar na Shopee</h2>
          <p className="text-[11px] text-zinc-500">Encontre produtos com mais vendas e maior comissão pra afiliados</p>
        </div>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="glass relative flex items-center gap-3 rounded-2xl border border-white/5 px-4 py-3 transition-all focus-within:border-shopee/40 focus-within:shadow-[0_0_20px_rgba(238,77,45,0.1)]">
          <Search className="h-5 w-5 shrink-0 text-zinc-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: fone bluetooth, air fryer, whey protein…"
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-600 outline-none"
            onKeyDown={(e) => e.key === "Enter" && buscar()}
          />
          {query && (
            <button type="button" onClick={() => { setQuery(""); setResultados([]); setBuscouAlgo(false); }} className="text-zinc-500 hover:text-zinc-300">
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all",
              showFilters ? "bg-shopee/10 text-shopee" : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
            )}
            title="Filtros avançados"
          >
            <Filter className="h-4 w-4" />
          </button>

          <button
            type="submit"
            disabled={buscando || query.length < 2}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-shopee to-orange-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-shopee/20 transition-all hover:scale-[1.02] hover:shadow-shopee/30 disabled:opacity-50 disabled:hover:scale-100"
          >
            {buscando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Buscar
          </button>
        </div>

        {/* Filtros Dropdown */}
        {showFilters && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 rounded-2xl border border-white/10 bg-[#151515] p-4 shadow-2xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
              <Filter className="h-3.5 w-3.5" />
              Ajuste fino de Busca
            </div>
            
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[120px] space-y-1.5">
                <label className="text-xs text-zinc-500">Preço Mínimo (R$)</label>
                <input
                  type="number"
                  placeholder="Ex: 50"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full rounded-xl border border-white/5 bg-black/50 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-shopee/50"
                />
              </div>
              <div className="flex-1 min-w-[120px] space-y-1.5">
                <label className="text-xs text-zinc-500">Preço Máximo (R$)</label>
                <input
                  type="number"
                  placeholder="Ex: 5000"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full rounded-xl border border-white/5 bg-black/50 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-shopee/50"
                />
              </div>
            </div>
            
            <div className="mt-4 rounded-lg bg-shopee/10 px-3 py-2 text-[11px] text-shopee/90">
              <strong className="font-bold">Dica:</strong> Se você pesquisar por "Geladeira" ou "iPhone", defina um Preço Mínimo para <strong>excluir</strong> cases, adesivos e acessórios baratos que roubam o lugar do produto principal.
            </div>
          </div>
        )}
      </form>

      {/* Sugestões rápidas */}
      {!buscouAlgo && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">
            <Flame className="h-3 w-3 text-shopee" /> Pesquisas populares
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGESTOES.map((s) => (
              <button
                key={s}
                onClick={() => buscarSugestao(s)}
                className="rounded-lg border border-white/5 bg-zinc-900/50 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-all hover:border-shopee/30 hover:bg-shopee/5 hover:text-zinc-200"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Erro */}
      {erro && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs text-rose-300">
          {erro}
        </div>
      )}

      {/* Resultados */}
      {buscouAlgo && !buscando && resultados.length > 0 && (
        <>
          {/* Sort + Counter */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Sparkles className="h-3.5 w-3.5 text-shopee" />
              <span className="font-bold text-zinc-200">{resultados.length}</span> produtos encontrados para "<span className="font-medium text-shopee">{query}</span>"
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3 w-3 text-zinc-500" />
              {(["score", "vendas", "comissao", "ganho", "preco"] as SortMode[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all",
                    sort === s
                      ? "bg-shopee/15 text-shopee"
                      : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                  )}
                >
                  {s === "score" ? "Melhor" : s === "vendas" ? "Vendas" : s === "comissao" ? "Comissão %" : s === "ganho" ? "Ganho R$" : "Preço"}
                </button>
              ))}
            </div>
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sorted.map((p, i) => (
              <BuscaCard key={p.id} produto={p} rank={i} copiado={copiadoId === p.id} onCopiar={() => copiarLink(p)} />
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {buscouAlgo && !buscando && resultados.length === 0 && !erro && (
        <div className="glass flex flex-col items-center gap-3 rounded-2xl py-12 text-center">
          <ShoppingBag className="h-10 w-10 text-zinc-700" />
          <div className="text-sm font-semibold text-zinc-400">Nenhum produto encontrado</div>
          <div className="text-xs text-zinc-600">Tente outra palavra-chave</div>
        </div>
      )}

      {/* Loading */}
      {buscando && (
        <div className="glass flex items-center justify-center gap-3 rounded-2xl py-16">
          <Loader2 className="h-6 w-6 animate-spin text-shopee" />
          <span className="text-sm font-medium text-zinc-400">Buscando produtos na Shopee…</span>
        </div>
      )}
    </section>
  );
}

/* Mini product card optimized for search results */
function BuscaCard({ produto, rank, copiado, onCopiar }: {
  produto: Produto & { scoreBusca?: number };
  rank: number;
  copiado: boolean;
  onCopiar: () => void;
}) {
  const desconto = produto.precoOriginal > produto.preco
    ? Math.round(((produto.precoOriginal - produto.preco) / produto.precoOriginal) * 100)
    : 0;
  const temExtra = produto.comissaoExtraPct > 0;
  const comissaoTotal = produto.comissaoPct;
  const ganho = produto.comissaoValor;
  const ofertaAtiva = produto.fimOferta > 0 && produto.fimOferta > Math.floor(Date.now() / 1000);
  const diasRestantes = ofertaAtiva ? Math.floor((produto.fimOferta - Date.now() / 1000) / 86400) : 0;

  return (
    <div className="glass glass-hover group relative flex flex-col overflow-hidden rounded-2xl transition-all">
      {/* TOP badge */}
      {rank < 3 && (
        <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-gradient-to-r from-shopee to-orange-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg">
          <Trophy className="h-3 w-3" strokeWidth={2.5} />
          TOP {rank + 1}
        </div>
      )}

      {/* Shop badges */}
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-1">
        {produto.lojaOficial && (
          <div className="flex items-center gap-1 rounded-full bg-red-500/90 px-2 py-1 text-[9px] font-black text-white shadow-lg backdrop-blur">
            <BadgeCheck className="h-3 w-3" /> OFICIAL
          </div>
        )}
        {!produto.lojaOficial && produto.lojaPreferred && (
          <div className="flex items-center gap-1 rounded-full bg-rose-500/90 px-2 py-1 text-[9px] font-black text-white shadow-lg backdrop-blur">
            <ShieldCheck className="h-3 w-3" /> PREFERIDA
          </div>
        )}
      </div>

      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden bg-zinc-900">
        {produto.imagem ? (
          <Image
            src={produto.imagem}
            alt={produto.nome}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ShoppingBag className="h-12 w-12 text-zinc-700" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Commission highlight overlay */}
        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
          <div className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-black tabular-nums backdrop-blur-sm",
            comissaoTotal >= 15
              ? "bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.2)]"
              : comissaoTotal >= 10
              ? "bg-amber-500/15 text-amber-300"
              : "bg-zinc-900/60 text-zinc-300"
          )}>
            <TrendingUp className="h-3 w-3" />
            {formatPct(comissaoTotal)}
            {temExtra && (
              <span className="rounded bg-shopee/40 px-1 py-px text-[8px] font-black leading-none text-shopee">+EX</span>
            )}
          </div>
          {ganho > 0 && (
            <div className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2 py-1.5 text-[10px] font-bold text-emerald-300 backdrop-blur-sm">
              <DollarSign className="h-3 w-3" />
              R${ganho.toFixed(2)}/venda
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-100" title={produto.nome}>
          {produto.nome}
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-shopee">{formatBRL(produto.preco)}</span>
          {desconto > 0 && (
            <>
              <span className="text-[11px] text-zinc-500 line-through">{formatBRL(produto.precoOriginal)}</span>
              <span className="rounded bg-shopee/20 px-1.5 py-0.5 text-[10px] font-bold text-shopee">-{desconto}%</span>
            </>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-black/30 p-2 text-center">
          <div className="space-y-0.5">
            <ShoppingBag className="mx-auto h-3 w-3 text-zinc-500" />
            <div className="text-[11px] font-bold tabular-nums text-zinc-200">{formatNumber(produto.vendas)}</div>
            <div className="text-[8px] uppercase tracking-wider text-zinc-600">Vendas</div>
          </div>
          <div className="space-y-0.5">
            <Star className="mx-auto h-3 w-3 fill-amber-400 text-amber-400" />
            <div className="text-[11px] font-bold tabular-nums text-zinc-200">{produto.rating.toFixed(1)}</div>
            <div className="text-[8px] uppercase tracking-wider text-zinc-600">Rating</div>
          </div>
          <div className="space-y-0.5">
            <DollarSign className={cn("mx-auto h-3 w-3", ganho >= 5 ? "text-emerald-400" : "text-zinc-500")} />
            <div className={cn("text-[11px] font-bold tabular-nums", ganho >= 5 ? "text-emerald-400" : "text-zinc-200")}>
              {ganho > 0 ? `R$${ganho.toFixed(0)}` : "—"}
            </div>
            <div className="text-[8px] uppercase tracking-wider text-zinc-600">Ganho</div>
          </div>
        </div>

        {/* Extras */}
        {(ofertaAtiva || produto.comissaoNovoUsuarioPct > comissaoTotal) && (
          <div className="flex flex-wrap gap-1.5">
            {ofertaAtiva && (
              <span className={cn(
                "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                diasRestantes <= 1 ? "bg-rose-500/15 text-rose-300" : diasRestantes <= 3 ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"
              )}>
                <Clock className="h-2.5 w-2.5" /> {diasRestantes}d
              </span>
            )}
            {produto.comissaoNovoUsuarioPct > comissaoTotal && (
              <span className="flex items-center gap-1 rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-bold text-violet-300">
                <Star className="h-2.5 w-2.5" /> Novo: {produto.comissaoNovoUsuarioPct.toFixed(0)}%
              </span>
            )}
          </div>
        )}

        {/* Loja */}
        {produto.loja && (
          <div className="text-[10px] text-zinc-500 truncate">
            {produto.loja}
          </div>
        )}

        {/* Accumulated commission estimator */}
        {ganho > 0 && produto.vendas > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-2.5 py-1.5 text-[9px]">
            <span className="text-zinc-400">Comissão acumulada:</span>
            <span className="font-bold tabular-nums text-emerald-300">
              R$ {(ganho * produto.vendas).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={onCopiar}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold transition-all hover:border-white/20 hover:bg-white/10",
              copiado && "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            )}
          >
            {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copiado ? "Copiado!" : "Link"}
          </button>
          <a
            href={produto.linkProduto}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-shopee to-orange-600 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-shopee/20 transition-all hover:scale-[1.02]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ver
          </a>
        </div>
      </div>
    </div>
  );
}
