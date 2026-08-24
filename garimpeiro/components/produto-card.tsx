"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  Star,
  Users,
  TrendingUp,
  Tag,
  ExternalLink,
  Copy,
  Check,
  Wand2,
  ShoppingBag,
  Trophy,
  Video,
  Heart,
  BadgeCheck,
  ShieldCheck,
  Clock,
  DollarSign
} from "lucide-react";
import { cn, formatBRL, formatNumber, formatPct } from "@/lib/utils";
import type { Produto } from "@/lib/types";
import { SyncAppDialog } from "./sync-app-dialog";

type Props = {
  produto: Produto;
  rank?: number;
  onAbrirRoteiros: (produto: Produto) => void;
};

export function ProdutoCard({ produto, rank, onAbrirRoteiros }: Props) {
  const [copiado, setCopiado] = useState(false);
  const [favorito, setFavorito] = useState(false);
  const [salvandoFav, setSalvandoFav] = useState(false);
  const [mostrarSync, setMostrarSync] = useState(false);

  const comissaoTotal = produto.comissaoPct;
  const temExtra = produto.comissaoExtraPct > 0;
  const desconto = produto.precoOriginal > produto.preco
    ? Math.round(((produto.precoOriginal - produto.preco) / produto.precoOriginal) * 100)
    : 0;

  // Verifica se já é favorito ao montar
  useEffect(() => {
    let cancelado = false;
    fetch(`/api/favoritos?ids=true`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelado) return;
        if (Array.isArray(d.ids) && d.ids.includes(produto.id)) setFavorito(true);
      })
      .catch(() => {});
    return () => { cancelado = true; };
  }, [produto.id]);

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(produto.linkAfiliado);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {}
  }

  async function alternarFavorito() {
    setSalvandoFav(true);
    const proximo = !favorito;
    setFavorito(proximo);
    try {
      const r = await fetch(`/api/favoritos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produtoId: produto.id })
      });
      const d = await r.json();
      const ehFav = Boolean(d.favoritado);
      setFavorito(ehFav);
      if (ehFav) setMostrarSync(true); // abre QR pra sincronizar com app
    } catch {
      setFavorito(!proximo);
    } finally {
      setSalvandoFav(false);
    }
  }

  return (
    <div className="glass glass-hover group relative flex flex-col overflow-hidden rounded-2xl">
      {rank !== undefined && rank < 3 && (
        <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full shopee-gradient px-2.5 py-1 text-[10px] font-bold text-white shadow-lg">
          <Trophy className="h-3 w-3" strokeWidth={2.5} />
          TOP {rank + 1}
        </div>
      )}
      {/* Badges no topo (cupom, oficial, preferred) */}
      <div className="absolute right-12 top-3 z-10 flex flex-col gap-1">
        {produto.lojaOficial && (
          <div className="flex items-center gap-1 rounded-full bg-red-500/90 px-2 py-1 text-[9px] font-black text-white shadow-lg backdrop-blur" title="Loja Shopee Mall - Oficial">
            <BadgeCheck className="h-3 w-3" />
            OFICIAL
          </div>
        )}
        {!produto.lojaOficial && produto.lojaPreferred && (
          <div className="flex items-center gap-1 rounded-full bg-rose-500/90 px-2 py-1 text-[9px] font-black text-white shadow-lg backdrop-blur" title="Loja Preferida">
            <ShieldCheck className="h-3 w-3" />
            PREFERIDA
          </div>
        )}
        {produto.cupomDisponivel && (
          <div className="flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-1 text-[10px] font-bold text-white shadow-lg backdrop-blur">
            <Tag className="h-3 w-3" />
            {produto.cupomValor || "CUPOM"}
          </div>
        )}
      </div>

      {/* Botão coração no topo direito */}
      <button
        type="button"
        onClick={alternarFavorito}
        disabled={salvandoFav}
        title={favorito ? "Remover dos favoritos" : "Favoritar"}
        className={cn(
          "absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur transition-all",
          favorito
            ? "bg-rose-500/90 text-white shadow-lg shadow-rose-500/40 hover:bg-rose-500"
            : "bg-black/40 text-white/80 hover:bg-black/60 hover:text-white"
        )}
      >
        <Heart className={cn("h-4 w-4 transition-transform", favorito && "fill-white scale-110")} strokeWidth={2.5} />
      </button>

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
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute bottom-2 left-3 flex items-center gap-1.5 text-xs font-semibold text-white">
          <Video className="h-3.5 w-3.5" />
          {produto.videosAprenderCriadores} vídeos
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-100" title={produto.nome}>
          {produto.nome}
        </h3>

        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-shopee">{formatBRL(produto.preco)}</span>
          {desconto > 0 && (
            <>
              <span className="text-xs text-zinc-500 line-through">{formatBRL(produto.precoOriginal)}</span>
              <span className="rounded bg-shopee/20 px-1.5 py-0.5 text-[10px] font-bold text-shopee">-{desconto}%</span>
            </>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-xl bg-black/30 p-2.5 text-center">
          <div className="space-y-0.5">
            <TrendingUp className={cn("mx-auto h-3.5 w-3.5", comissaoTotal >= 15 ? "text-emerald-400" : "text-zinc-500")} />
            <div className="flex items-center justify-center gap-1">
              <div className={cn("text-[11px] font-bold tabular-nums", comissaoTotal >= 15 ? "text-emerald-400" : "text-zinc-200")}>{formatPct(comissaoTotal)}</div>
              {temExtra && (
                <span className="rounded bg-shopee/30 px-1 py-px text-[8px] font-black leading-none text-shopee" title={`Bônus do seller: ${produto.comissaoExtraPct.toFixed(1)}%`}>
                  EX
                </span>
              )}
            </div>
            <div className="text-[9px] uppercase tracking-wider text-zinc-500">Comissão</div>
          </div>
          <Metric icon={ShoppingBag} label="Vendas" value={formatNumber(produto.vendas)} />
          <div className="space-y-0.5" title="Valor R$ que você ganha por venda">
            <DollarSign className={cn("mx-auto h-3.5 w-3.5", produto.comissaoValor >= 5 ? "text-emerald-400" : "text-zinc-500")} />
            <div className={cn("text-[11px] font-bold tabular-nums", produto.comissaoValor >= 5 ? "text-emerald-400" : "text-zinc-200")}>
              {produto.comissaoValor > 0 ? `R$${produto.comissaoValor.toFixed(2)}` : "—"}
            </div>
            <div className="text-[9px] uppercase tracking-wider text-zinc-500">Por venda</div>
          </div>
        </div>

        {/* Faturamento estimado: vendas × comissão R$ - mostra quanto outros afiliados já ganharam */}
        {produto.comissaoValor > 0 && produto.vendas > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-1.5 text-[10px]">
            <span className="text-zinc-400">Comissão acumulada (todos afiliados):</span>
            <span className="font-bold tabular-nums text-emerald-300">
              R$ {(produto.comissaoValor * produto.vendas).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            </span>
          </div>
        )}

        {/* Linha extra: tempo de oferta + comissão new user + categoria */}
        {(produto.fimOferta > 0 || produto.comissaoNovoUsuarioPct > comissaoTotal) && (
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            {produto.fimOferta > 0 && (
              <TempoOferta inicio={produto.inicioOferta} fim={produto.fimOferta} />
            )}
            {produto.comissaoNovoUsuarioPct > comissaoTotal && (
              <span className="flex items-center gap-1 rounded-md bg-violet-500/15 px-1.5 py-0.5 font-bold text-violet-300" title="Comissão pra usuário novo do app">
                <Star className="h-2.5 w-2.5" /> Novo: {produto.comissaoNovoUsuarioPct.toFixed(0)}%
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-medium text-zinc-200">{produto.rating.toFixed(1)}</span>
            <span className="text-[10px] text-zinc-500">· {produto.loja.slice(0, 18)}</span>
          </div>
          <Score score={produto.scoreOportunidade} />
        </div>

        <div className="mt-auto space-y-2 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={copiarLink}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold transition-all",
                "hover:border-white/20 hover:bg-white/10",
                copiado && "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              )}
            >
              {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiado ? "Copiado!" : "Link"}
            </button>
            <button
              type="button"
              onClick={() => onAbrirRoteiros(produto)}
              className="flex items-center justify-center gap-1.5 rounded-lg shopee-gradient px-3 py-2 text-xs font-bold text-white shadow-lg shadow-shopee/20 transition-transform hover:scale-[1.02]"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Roteiros
            </button>
          </div>
        </div>

        <a
          href={produto.linkProduto}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-300"
        >
          Ver na Shopee <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <SyncAppDialog produto={mostrarSync ? produto : null} onClose={() => setMostrarSync(false)} />
    </div>
  );
}

function Metric({ icon: Icon, label, value, highlight = false }: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <Icon className={cn("mx-auto h-3.5 w-3.5", highlight ? "text-emerald-400" : "text-zinc-500")} />
      <div className={cn("text-[11px] font-bold tabular-nums", highlight ? "text-emerald-400" : "text-zinc-200")}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}

function TempoOferta({ inicio, fim }: { inicio: number; fim: number }) {
  // Registros antigos podem conter a data sentinela da API (ano 3000).
  // Nesse caso não existe um prazo real para exibir.
  if (fim > 4_102_444_800) return null;
  const agora = Math.floor(Date.now() / 1000);
  const segRest = fim - agora;
  const dias = Math.floor(segRest / 86400);
  const horas = Math.floor((segRest % 86400) / 3600);

  if (segRest <= 0) {
    return (
      <span className="flex items-center gap-1 rounded-md bg-rose-500/15 px-1.5 py-0.5 font-bold text-rose-300">
        <Clock className="h-2.5 w-2.5" /> Oferta encerrada
      </span>
    );
  }

  const cor = dias <= 1
    ? "bg-rose-500/20 text-rose-300"
    : dias <= 3
    ? "bg-amber-500/15 text-amber-300"
    : "bg-emerald-500/15 text-emerald-300";

  return (
    <span className={cn("flex items-center gap-1 rounded-md px-1.5 py-0.5 font-bold", cor)} title={`Oferta começou ${new Date(inicio * 1000).toLocaleDateString("pt-BR")}`}>
      <Clock className="h-2.5 w-2.5" />
      {dias > 0 ? `${dias}d` : `${horas}h`} restantes
    </span>
  );
}

function Score({ score }: { score: number }) {
  const cor = score >= 80 ? "text-emerald-400 bg-emerald-500/10" : score >= 60 ? "text-amber-400 bg-amber-500/10" : "text-zinc-400 bg-zinc-500/10";
  return (
    <div className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", cor)} title="Score de Oportunidade calculado a partir de comissão, vendas, rating e cupom">
      <Trophy className="h-2.5 w-2.5" />
      Score {score}
    </div>
  );
}
