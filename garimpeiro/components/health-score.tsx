"use client";

import { useMemo } from "react";
import { AlertTriangle, Heart, Shield, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type HealthScoreProps = { roas: number | null; ctr: number | null; cpc: number | null; conversoes: number | null; clicks: number | null; confiancaDados?: number };
type Status = "excellent" | "good" | "warning" | "critical";
type Item = { label: string; score: number; status: Status; detail: string; icon: typeof Heart };
const colors: Record<Status, { bg: string; text: string; ring: string }> = {
  excellent: { bg: "bg-emerald-500", text: "text-emerald-400", ring: "text-emerald-500" }, good: { bg: "bg-sky-500", text: "text-sky-400", ring: "text-sky-500" }, warning: { bg: "bg-amber-500", text: "text-amber-400", ring: "text-amber-500" }, critical: { bg: "bg-rose-500", text: "text-rose-400", ring: "text-rose-500" }
};
function score(value: number, good: number, okay: number, low: number, label: string, unit: string, icon: typeof Heart, inverse = false): Item {
  const excellent = inverse ? value <= good : value >= good;
  const healthy = inverse ? value <= okay : value >= okay;
  const attention = inverse ? value <= low : value >= low;
  const status: Status = excellent ? "excellent" : healthy ? "good" : attention ? "warning" : "critical";
  const points = excellent ? 100 : healthy ? 75 : attention ? 40 : 15;
  return { label, score: points, status, detail: `${unit}${value.toFixed(unit === "CPC R$ " ? 2 : 1)}${unit === "CTR " || unit === "Taxa " ? "%" : unit === "ROAS " ? "x" : ""}`, icon };
}

export function HealthScore({ roas, ctr, cpc, conversoes, clicks, confiancaDados = 100 }: HealthScoreProps) {
  const items = useMemo(() => {
    const list: Item[] = [];
    if (roas !== null) list.push(score(roas, 3, 2, 1.3, "Retorno atribuído", "ROAS ", TrendingUp));
    if (ctr !== null) list.push(score(ctr, 3, 1.5, 0.8, "Engajamento", "CTR ", Zap));
    if (cpc !== null) list.push(score(cpc, 0.5, 1.5, 3, "Eficiência de mídia", "CPC R$ ", TrendingDown, true));
    if (conversoes !== null && clicks !== null && clicks > 0) list.push(score((conversoes / clicks) * 100, 5, 2, 0.5, "Conversão atribuída", "Taxa ", Shield));
    return list;
  }, [roas, ctr, cpc, conversoes, clicks]);
  const overall = items.length ? Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length) : null;
  const status: Status = overall === null ? "warning" : overall >= 80 ? "excellent" : overall >= 60 ? "good" : overall >= 35 ? "warning" : "critical";
  const color = colors[status], radius = 52, circumference = 2 * Math.PI * radius;
  const offset = overall === null ? circumference : circumference - (overall / 100) * circumference;
  const podeDecidir = overall !== null && confiancaDados >= 75;
  return <div className="glass rounded-2xl p-6 animate-float-in">
    <div className="mb-5 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Heart className={cn("h-4 w-4", color.text)} /><h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Saúde da operação</h3></div><span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-bold text-zinc-400">Confiança {Math.round(confiancaDados)}%</span></div>
    <div className="flex items-center gap-6"><div className="relative shrink-0"><svg width="130" height="130" viewBox="0 0 130 130"><circle cx="65" cy="65" r={radius} fill="none" strokeWidth="8" className="score-ring-track" /><circle cx="65" cy="65" r={radius} fill="none" strokeWidth="8" strokeLinecap="round" className={color.ring} stroke="currentColor" strokeDasharray={circumference} strokeDashoffset={offset} /></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><span className={cn("text-3xl font-black", color.text)}>{overall ?? "N/D"}</span><span className="text-[9px] font-bold uppercase text-zinc-500">{overall === null ? "sem base" : "índice"}</span></div></div><div className="min-w-0 flex-1 space-y-3">{items.length ? items.map((item) => { const c = colors[item.status], Icon = item.icon; return <div key={item.label}><div className="mb-1 flex items-center justify-between text-xs"><span className="flex items-center gap-2 font-semibold text-zinc-300"><Icon className={cn("h-3 w-3", c.text)} />{item.label}</span><b className={c.text}>{item.score}</b></div><div className="h-1.5 overflow-hidden rounded-full bg-zinc-800"><div className={cn("h-full rounded-full", c.bg)} style={{ width: `${item.score}%` }} /></div><p className="mt-0.5 text-[10px] text-zinc-500">{item.detail}</p></div>; }) : <p className="text-sm text-zinc-400">Meta indisponível: não há base comparável para calcular o índice.</p>}</div></div>
    {!podeDecidir && <div className="mt-4 flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Recomendações automáticas pausadas até que a cobertura de dados seja suficiente.</div>}
  </div>;
}
