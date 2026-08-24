"use client";

import { useState, useEffect, useMemo } from "react";
import { cn, formatBRL } from "@/lib/utils";
import { Target, Trophy, Flame, Edit3, Check, X as XIcon } from "lucide-react";

type GoalTrackerProps = {
  comissaoAtual: number;
  lucroAtual: number;
  diasNoPerido: number;
  diasTotais: number;
};

export function GoalTracker({ comissaoAtual, lucroAtual, diasNoPerido, diasTotais }: GoalTrackerProps) {
  const [metaMensal, setMetaMensal] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("garimpeiro_meta_mensal");
      return saved ? Number(saved) : 3000;
    }
    return 3000;
  });
  const [editing, setEditing] = useState(false);
  const [tempMeta, setTempMeta] = useState(String(metaMensal));

  useEffect(() => {
    localStorage.setItem("garimpeiro_meta_mensal", String(metaMensal));
  }, [metaMensal]);

  const stats = useMemo(() => {
    const pctAtingido = metaMensal > 0 ? (lucroAtual / metaMensal) * 100 : 0;
    const mediaDiaria = diasNoPerido > 0 ? lucroAtual / diasNoPerido : 0;
    const diasRestantes = Math.max(0, diasTotais - diasNoPerido);
    const projecaoFinal = lucroAtual + mediaDiaria * diasRestantes;
    const pctProjetado = metaMensal > 0 ? (projecaoFinal / metaMensal) * 100 : 0;
    const faltaPraMeta = Math.max(0, metaMensal - lucroAtual);
    const precisaPorDia = diasRestantes > 0 ? faltaPraMeta / diasRestantes : faltaPraMeta;

    let statusEmoji: string;
    let statusLabel: string;
    let statusColor: string;
    if (pctAtingido >= 100) {
      statusEmoji = "🏆";
      statusLabel = "Meta batida!";
      statusColor = "text-emerald-400";
    } else if (pctProjetado >= 100) {
      statusEmoji = "🔥";
      statusLabel = "No ritmo certo";
      statusColor = "text-amber-400";
    } else if (pctProjetado >= 70) {
      statusEmoji = "⚡";
      statusLabel = "Quase lá";
      statusColor = "text-amber-400";
    } else {
      statusEmoji = "💪";
      statusLabel = "Acelerar";
      statusColor = "text-rose-400";
    }

    return {
      pctAtingido: Math.min(pctAtingido, 100),
      pctProjetado: Math.min(pctProjetado, 150),
      mediaDiaria,
      diasRestantes,
      projecaoFinal,
      faltaPraMeta,
      precisaPorDia,
      statusEmoji,
      statusLabel,
      statusColor,
      atingiu: pctAtingido >= 100
    };
  }, [lucroAtual, metaMensal, diasNoPerido, diasTotais]);

  function salvarMeta() {
    const val = parseFloat(tempMeta);
    if (!isNaN(val) && val > 0) {
      setMetaMensal(val);
    }
    setEditing(false);
  }

  return (
    <div className="glass rounded-2xl p-6 animate-float-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-shopee" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Meta mensal</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">{stats.statusEmoji}</span>
          <span className={cn("text-xs font-bold", stats.statusColor)}>{stats.statusLabel}</span>
        </div>
      </div>

      {/* META VALUE */}
      <div className="flex items-center gap-3 mb-4">
        {editing ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">R$</span>
            <input
              type="number"
              value={tempMeta}
              onChange={(e) => setTempMeta(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && salvarMeta()}
              className="w-32 rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-lg font-bold tabular-nums focus:border-shopee/50 focus:outline-none"
              autoFocus
            />
            <button onClick={salvarMeta} className="rounded-md bg-emerald-500/20 p-1.5 text-emerald-400 hover:bg-emerald-500/30">
              <Check className="h-4 w-4" />
            </button>
            <button onClick={() => setEditing(false)} className="rounded-md bg-zinc-800 p-1.5 text-zinc-400 hover:bg-zinc-700">
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setTempMeta(String(metaMensal)); setEditing(true); }}
            className="group flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-white/5"
          >
            <span className="text-2xl font-black tabular-nums text-zinc-100">{formatBRL(metaMensal)}</span>
            <Edit3 className="h-3.5 w-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </div>

      {/* PROGRESS BAR */}
      <div className="relative mb-2">
        <div className="h-3 rounded-full bg-zinc-800/80 overflow-hidden">
          {/* Projeção (fundo mais escuro) */}
          <div
            className="absolute top-0 left-0 h-3 rounded-full bg-shopee/20 transition-all duration-1000"
            style={{ width: `${Math.min(stats.pctProjetado, 100)}%` }}
          />
          {/* Progresso real */}
          <div
            className={cn(
              "relative h-3 rounded-full transition-all duration-1000",
              stats.atingiu
                ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                : "bg-gradient-to-r from-shopee to-orange-400"
            )}
            style={{ width: `${stats.pctAtingido}%` }}
          />
        </div>
        {/* Labels */}
        <div className="mt-1.5 flex items-center justify-between text-[10px] tabular-nums">
          <span className={cn("font-bold", stats.atingiu ? "text-emerald-400" : "text-shopee")}>
            {stats.pctAtingido.toFixed(0)}%
          </span>
          <span className="text-zinc-600">
            {formatBRL(lucroAtual)} / {formatBRL(metaMensal)}
          </span>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <MiniStat label="Lucro/dia" valor={formatBRL(stats.mediaDiaria)} cor={stats.mediaDiaria >= 0 ? "emerald" : "rose"} />
        <MiniStat label="Falta" valor={formatBRL(stats.faltaPraMeta)} cor="amber" />
        <MiniStat label="Precisa/dia" valor={formatBRL(stats.precisaPorDia)} cor="indigo" />
        <MiniStat label="Dias restantes" valor={String(stats.diasRestantes)} cor="zinc" />
      </div>

      {stats.atingiu && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
          <Trophy className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-bold text-emerald-300">
            Parabéns! Meta batida — considere aumentar pra {formatBRL(metaMensal * 1.5)}
          </span>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, valor, cor }: { label: string; valor: string; cor: "emerald" | "rose" | "amber" | "indigo" | "zinc" }) {
  const corTexto = {
    emerald: "text-emerald-400",
    rose: "text-rose-400",
    amber: "text-amber-400",
    indigo: "text-indigo-400",
    zinc: "text-zinc-300"
  };
  return (
    <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
      <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">{label}</div>
      <div className={cn("mt-0.5 text-sm font-bold tabular-nums", corTexto[cor])}>{valor}</div>
    </div>
  );
}
