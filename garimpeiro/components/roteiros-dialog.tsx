"use client";

import { useCallback, useEffect, useState } from "react";
import {
  X,
  Loader2,
  Copy,
  Check,
  Wand2,
  Heart,
  Sparkles,
  Eye,
  RefreshCw,
  Users,
  Volume2,
  ArrowLeftRight,
  MessageCircle,
  Package
} from "lucide-react";
import type { Produto, Roteiro } from "@/lib/types";
import { cn } from "@/lib/utils";

const ESTILO_INFO: Record<string, { label: string; icon: typeof Heart; color: string }> = {
  dor: { label: "Dor → Solução", icon: Heart, color: "text-rose-400 bg-rose-500/10 ring-rose-500/20" },
  descoberta: { label: "Descoberta", icon: Sparkles, color: "text-amber-400 bg-amber-500/10 ring-amber-500/20" },
  curiosidade: { label: "Curiosidade", icon: Eye, color: "text-indigo-400 bg-indigo-500/10 ring-indigo-500/20" },
  comparacao: { label: "Antes / Depois", icon: ArrowLeftRight, color: "text-violet-400 bg-violet-500/10 ring-violet-500/20" },
  "prova-social": { label: "Prova Social", icon: Users, color: "text-emerald-400 bg-emerald-500/10 ring-emerald-500/20" },
  asmr: { label: "ASMR / Satisfação", icon: Volume2, color: "text-sky-400 bg-sky-500/10 ring-sky-500/20" },
  ugc: { label: "UGC / Recomendação", icon: MessageCircle, color: "text-pink-400 bg-pink-500/10 ring-pink-500/20" },
  unboxing: { label: "Unboxing / Mão", icon: Package, color: "text-orange-400 bg-orange-500/10 ring-orange-500/20" }
};

type Props = {
  produto: Produto | null;
  onClose: () => void;
};

export function RoteirosDialog({ produto, onClose }: Props) {
  const [roteiros, setRoteiros] = useState<Roteiro[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const gerarNovos = useCallback(async () => {
    if (!produto) return;
    setCarregando(true);
    try {
      const r = await fetch(`/api/roteiros`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produtoId: produto.id, quantidade: 3 })
      });
      const d = await r.json();
      if (d.roteiros) setRoteiros(d.roteiros);
    } finally {
      setCarregando(false);
    }
  }, [produto]);

  const carregarOuGerar = useCallback(async () => {
    if (!produto) return;
    setCarregando(true);
    try {
      const r = await fetch(`/api/roteiros?produtoId=${encodeURIComponent(produto.id)}`);
      const d = await r.json();
      if (d.roteiros?.length > 0) setRoteiros(d.roteiros);
      else await gerarNovos();
    } finally {
      setCarregando(false);
    }
  }, [produto, gerarNovos]);

  useEffect(() => {
    if (!produto) return;
    void carregarOuGerar();
  }, [produto, carregarOuGerar]);

  async function copiarRoteiro(r: Roteiro, modo: "formatado" | "puro") {
    const texto = modo === "puro" ? montarTextoPuro(r) : montarTextoCompleto(r);
    const idMarcador = `${r.id}-${modo}`;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoId(idMarcador);
      setTimeout(() => setCopiadoId(null), 2000);
    } catch {}
  }

  if (!produto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="glass scrollbar-thin relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/5 bg-zinc-950/80 p-5 backdrop-blur-xl">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-shopee">
              <Wand2 className="h-3.5 w-3.5" /> Roteiros para Shopee Vídeo
            </div>
            <h2 className="line-clamp-2 text-base font-bold leading-snug">{produto.nome}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={gerarNovos}
              disabled={carregando}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", carregando && "animate-spin")} />
              Novos
            </button>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {carregando && roteiros.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-400">
              <Loader2 className="h-8 w-8 animate-spin text-shopee" />
              <div className="text-sm">Gerando roteiros com IA…</div>
            </div>
          )}
          {roteiros.map((r, i) => (
            <RoteiroCard
              key={r.id}
              roteiro={r}
              index={i}
              copiadoFormatado={copiadoId === `${r.id}-formatado`}
              copiadoPuro={copiadoId === `${r.id}-puro`}
              onCopiarFormatado={() => copiarRoteiro(r, "formatado")}
              onCopiarPuro={() => copiarRoteiro(r, "puro")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function RoteiroCard({
  roteiro,
  index,
  copiadoFormatado,
  copiadoPuro,
  onCopiarFormatado,
  onCopiarPuro
}: {
  roteiro: Roteiro;
  index: number;
  copiadoFormatado: boolean;
  copiadoPuro: boolean;
  onCopiarFormatado: () => void;
  onCopiarPuro: () => void;
}) {
  const info = ESTILO_INFO[roteiro.estilo] || ESTILO_INFO.descoberta;
  const Icon = info.icon;
  return (
    <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1", info.color)}>
          <Icon className="h-3.5 w-3.5" /> Roteiro {index + 1} · {info.label}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={onCopiarPuro}
            title="Só o texto que você fala (sem [GANCHO], [CTA] etc)"
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-all",
              copiadoPuro
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
            )}
          >
            {copiadoPuro ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copiadoPuro ? "Copiado!" : "Texto puro"}
          </button>
          <button
            onClick={onCopiarFormatado}
            title="Roteiro completo com seções marcadas"
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-all",
              copiadoFormatado
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-shopee/30 bg-shopee/10 text-shopee hover:bg-shopee/20"
            )}
          >
            {copiadoFormatado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copiadoFormatado ? "Copiado!" : "Formatado"}
          </button>
        </div>
      </div>

      <div className="space-y-2.5 text-sm leading-relaxed">
        <Linha label="Gancho (0-3s)" value={roteiro.gancho} accent />
        <Linha label="Benefício" value={roteiro.beneficio} />
        <Linha label="Demonstração" value={roteiro.demonstracao} />
        <Linha label="CTA" value={roteiro.cta} accent />
      </div>

      {roteiro.hashtags?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {roteiro.hashtags.map((h) => (
            <span key={h} className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
              {h}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Linha({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="grid grid-cols-[100px_1fr] items-baseline gap-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={cn("text-zinc-200", accent && "font-semibold text-white")}>{value}</div>
    </div>
  );
}

function montarTextoCompleto(r: Roteiro): string {
  return [
    `🎬 ROTEIRO SHOPEE VÍDEO (${r.estilo.toUpperCase()})`,
    "",
    `[GANCHO 0-3s]`,
    r.gancho,
    "",
    `[BENEFÍCIO]`,
    r.beneficio,
    "",
    `[DEMONSTRAÇÃO]`,
    r.demonstracao,
    "",
    `[CTA]`,
    r.cta,
    "",
    `[HASHTAGS]`,
    r.hashtags.join(" ")
  ].join("\n");
}

// Texto corrido pra colar como legenda/narração - sem marcadores
function montarTextoPuro(r: Roteiro): string {
  return [
    r.gancho,
    r.beneficio,
    r.demonstracao,
    r.cta,
    "",
    r.hashtags.join(" ")
  ].join("\n\n");
}
