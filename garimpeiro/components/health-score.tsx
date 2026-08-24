"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Heart, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Zap, Shield } from "lucide-react";

type HealthScoreProps = {
  roas: number;
  ctr: number;
  cpc: number;
  gastoTotal: number;
  receita: number;
  conversoes: number;
  clicks: number;
};

type ScoreItem = {
  label: string;
  score: number;
  status: "excellent" | "good" | "warning" | "critical";
  detail: string;
  icon: typeof Heart;
};

function getROASScore(roas: number): ScoreItem {
  let score: number;
  let status: ScoreItem["status"];
  let detail: string;
  if (roas >= 3) { score = 100; status = "excellent"; detail = `ROAS ${roas.toFixed(1)}x — operação altamente lucrativa`; }
  else if (roas >= 2) { score = 80; status = "good"; detail = `ROAS ${roas.toFixed(1)}x — margem saudável`; }
  else if (roas >= 1.3) { score = 50; status = "warning"; detail = `ROAS ${roas.toFixed(1)}x — margem apertada`; }
  else { score = 20; status = "critical"; detail = `ROAS ${roas.toFixed(1)}x — operação no prejuízo`; }
  return { label: "Retorno (ROAS)", score, status, detail, icon: TrendingUp };
}

function getCTRScore(ctr: number): ScoreItem {
  let score: number;
  let status: ScoreItem["status"];
  let detail: string;
  if (ctr >= 3) { score = 100; status = "excellent"; detail = `CTR ${ctr.toFixed(1)}% — criativos muito atrativos`; }
  else if (ctr >= 1.5) { score = 75; status = "good"; detail = `CTR ${ctr.toFixed(1)}% — performance normal`; }
  else if (ctr >= 0.8) { score = 40; status = "warning"; detail = `CTR ${ctr.toFixed(1)}% — criativos fracos`; }
  else { score = 15; status = "critical"; detail = `CTR ${ctr.toFixed(1)}% — urgente trocar criativos`; }
  return { label: "Engajamento (CTR)", score, status, detail, icon: Zap };
}

function getConversionScore(conversoes: number, clicks: number): ScoreItem {
  const taxa = clicks > 0 ? (conversoes / clicks) * 100 : 0;
  let score: number;
  let status: ScoreItem["status"];
  let detail: string;
  if (taxa >= 5) { score = 100; status = "excellent"; detail = `Taxa ${taxa.toFixed(1)}% — excelente conversão`; }
  else if (taxa >= 2) { score = 70; status = "good"; detail = `Taxa ${taxa.toFixed(1)}% — conversão ok`; }
  else if (taxa >= 0.5) { score = 40; status = "warning"; detail = `Taxa ${taxa.toFixed(1)}% — precisa otimizar funil`; }
  else { score = 15; status = "critical"; detail = `Taxa ${taxa.toFixed(1)}% — funil quebrado`; }
  return { label: "Conversão", score, status, detail, icon: Shield };
}

function getEfficiencyScore(cpc: number): ScoreItem {
  let score: number;
  let status: ScoreItem["status"];
  let detail: string;
  if (cpc <= 0.5) { score = 100; status = "excellent"; detail = `CPC R$ ${cpc.toFixed(2)} — tráfego muito barato`; }
  else if (cpc <= 1.5) { score = 75; status = "good"; detail = `CPC R$ ${cpc.toFixed(2)} — custo aceitável`; }
  else if (cpc <= 3) { score = 40; status = "warning"; detail = `CPC R$ ${cpc.toFixed(2)} — custo elevado`; }
  else { score = 15; status = "critical"; detail = `CPC R$ ${cpc.toFixed(2)} — custo insustentável`; }
  return { label: "Eficiência (CPC)", score, status, detail, icon: TrendingDown };
}

const STATUS_COLORS = {
  excellent: { bg: "bg-emerald-500", text: "text-emerald-400", ring: "text-emerald-500" },
  good: { bg: "bg-sky-500", text: "text-sky-400", ring: "text-sky-500" },
  warning: { bg: "bg-amber-500", text: "text-amber-400", ring: "text-amber-500" },
  critical: { bg: "bg-rose-500", text: "text-rose-400", ring: "text-rose-500" }
};

const STATUS_LABELS = {
  excellent: "Excelente",
  good: "Bom",
  warning: "Atenção",
  critical: "Crítico"
};

export function HealthScore({ roas, ctr, cpc, gastoTotal, receita, conversoes, clicks }: HealthScoreProps) {
  const items = useMemo(() => [
    getROASScore(roas),
    getCTRScore(ctr),
    getConversionScore(conversoes, clicks),
    getEfficiencyScore(cpc)
  ], [roas, ctr, cpc, conversoes, clicks]);

  const overall = useMemo(() => {
    const avg = items.reduce((s, i) => s + i.score, 0) / items.length;
    return Math.round(avg);
  }, [items]);

  const overallStatus = overall >= 80 ? "excellent" : overall >= 60 ? "good" : overall >= 35 ? "warning" : "critical";
  const colors = STATUS_COLORS[overallStatus];

  // SVG ring
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (overall / 100) * circumference;

  return (
    <div className="glass rounded-2xl p-6 animate-float-in">
      <div className="flex items-center gap-2 mb-5">
        <Heart className={cn("h-4 w-4", colors.text)} />
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Saúde da operação</h3>
      </div>

      <div className="flex items-center gap-8">
        {/* RING */}
        <div className="relative flex-shrink-0">
          <svg width="130" height="130" viewBox="0 0 130 130" className="score-ring">
            <circle
              cx="65" cy="65" r={radius}
              fill="none" strokeWidth="8"
              className="score-ring-track"
            />
            <circle
              cx="65" cy="65" r={radius}
              fill="none" strokeWidth="8"
              strokeLinecap="round"
              className={cn("score-ring-fill", colors.ring)}
              stroke="currentColor"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-3xl font-black tabular-nums", colors.text)}>{overall}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{STATUS_LABELS[overallStatus]}</span>
          </div>
        </div>

        {/* ITEMS */}
        <div className="flex-1 space-y-3">
          {items.map((item) => {
            const c = STATUS_COLORS[item.status];
            const Icon = item.icon;
            return (
              <div key={item.label} className="group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                    <Icon className={cn("h-3 w-3", c.text)} />
                    {item.label}
                  </div>
                  <span className={cn("text-xs font-bold tabular-nums", c.text)}>
                    {item.score}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800/80 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-1000 ease-out", c.bg)}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
                <div className="mt-0.5 text-[10px] text-zinc-600 group-hover:text-zinc-400 transition-colors">
                  {item.detail}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* QUICK ACTIONS */}
      {overallStatus === "critical" && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-300 leading-relaxed">
            <strong>Ação urgente:</strong> Operação em estado crítico. Pause anúncios com ROAS abaixo de 1.0 e renove os criativos imediatamente.
          </div>
        </div>
      )}
      {overallStatus === "excellent" && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
          <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-300 leading-relaxed">
            <strong>Operação saudável!</strong> Considere escalar orçamento em 20-30% pra capturar mais volume.
          </div>
        </div>
      )}
    </div>
  );
}
