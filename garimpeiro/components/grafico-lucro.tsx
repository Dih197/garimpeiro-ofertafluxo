"use client";

import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn, formatBRL } from "@/lib/utils";

export type PontoLucro = { data: string; spend: number; comissao: number; lucro: number };

type Props = {
  dados: PontoLucro[];
  altura?: number;
  impostoMetaPct?: number;
};

/**
 * Gráfico de Lucro Líquido — direção editorial (Bloomberg + Bauhaus).
 * SVG puro, sem libs. Curva smoothed via splines cardinais, área com gradiente
 * verde/vermelho conforme sinal, anotações nos pontos extremos, animação de
 * entrada por stroke-dashoffset, hover com crosshair + tooltip.
 */
export function GraficoLucro({ dados, altura = 320, impostoMetaPct = 0.13 }: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Estatísticas e bounds
  const stats = useMemo(() => {
    if (!dados.length) return null;
    const lucros = dados.map((d) => d.lucro);
    const lucroAcumulado = lucros.reduce((s, v) => s + v, 0);
    const max = Math.max(...lucros, 0);
    const min = Math.min(...lucros, 0);
    const range = Math.max(Math.abs(max), Math.abs(min)) || 1;
    const idxMelhor = lucros.indexOf(Math.max(...lucros));
    const idxPior = lucros.indexOf(Math.min(...lucros));
    const diasPositivos = lucros.filter((v) => v > 0).length;
    const diasNegativos = lucros.filter((v) => v < 0).length;
    return { lucroAcumulado, max, min, range, idxMelhor, idxPior, diasPositivos, diasNegativos };
  }, [dados]);

  if (!dados.length || !stats) {
    return (
      <div className="glass rounded-2xl p-12 text-center text-xs text-zinc-500">
        Sem dados pra plotar. Espere a primeira venda atribuída.
      </div>
    );
  }

  // Geometria
  const W = 1000;
  const H = altura;
  const PAD_X = 56;
  const PAD_T = 40;
  const PAD_B = 48;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_T - PAD_B;

  // Escala Y simétrica em torno de zero (visual de "balança")
  const escalaY = (v: number) => {
    const yMid = PAD_T + innerH / 2;
    return yMid - (v / stats.range) * (innerH / 2);
  };
  const yZero = escalaY(0);

  // Pontos
  const pontos = dados.map((d, i) => {
    const x = PAD_X + (i / Math.max(1, dados.length - 1)) * innerW;
    const y = escalaY(d.lucro);
    return { x, y, ...d, idx: i };
  });

  // Linha smoothed via Catmull-Rom interpolation simples
  function pathSuavizado(): string {
    if (pontos.length === 0) return "";
    if (pontos.length === 1) return `M ${pontos[0].x} ${pontos[0].y}`;
    let d = `M ${pontos[0].x.toFixed(2)} ${pontos[0].y.toFixed(2)}`;
    for (let i = 0; i < pontos.length - 1; i++) {
      const p0 = pontos[i - 1] || pontos[i];
      const p1 = pontos[i];
      const p2 = pontos[i + 1];
      const p3 = pontos[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return d;
  }
  const dPath = pathSuavizado();
  const dArea = `${dPath} L ${pontos[pontos.length - 1].x} ${yZero} L ${pontos[0].x} ${yZero} Z`;

  // Eixo X: 4-5 datas equidistantes
  const ticksX = pontos.length <= 7
    ? pontos.map((p, i) => ({ p, i }))
    : [0, Math.floor(pontos.length * 0.25), Math.floor(pontos.length * 0.5), Math.floor(pontos.length * 0.75), pontos.length - 1].map((i) => ({ p: pontos[i], i }));

  // Eixo Y: 3 tícks (max, 0, min)
  const ticksY = [
    { v: stats.range, y: escalaY(stats.range) },
    { v: 0, y: yZero },
    { v: -stats.range, y: escalaY(-stats.range) }
  ];

  const formatarDataCurta = (d: string) => {
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
  };

  // Trend: lucroAcumulado vs zero
  const ehLucro = stats.lucroAcumulado >= 0;
  const menorResultado = dados[stats.idxPior].lucro;

  return (
    <div className="glass relative overflow-hidden rounded-2xl">
      {/* Textura de fundo: grid + grain sutil */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)`,
          backgroundSize: "32px 32px"
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(ellipse at top, ${ehLucro ? "rgba(16,185,129,0.4)" : "rgba(244,63,94,0.4)"}, transparent 70%)`
        }}
      />

      {/* HEADER EDITORIAL */}
      <div className="relative flex flex-wrap items-end justify-between gap-6 border-b border-white/5 px-7 pb-5 pt-6">
        <div>
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">
            <span className="h-px w-8 bg-zinc-600" />
            Lucro líquido acumulado
            <span className="h-px w-8 bg-zinc-600" />
          </div>
          <div
            className={cn(
              "mt-2 flex items-center gap-3 font-black tabular-nums tracking-tight",
              ehLucro ? "text-emerald-400" : "text-rose-400"
            )}
            style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", lineHeight: 1 }}
          >
            {ehLucro ? "+" : ""}
            <span style={{ letterSpacing: "-0.04em" }}>{formatBRL(stats.lucroAcumulado)}</span>
            {ehLucro ? <TrendingUp className="h-7 w-7" strokeWidth={2.5} /> : <TrendingDown className="h-7 w-7" strokeWidth={2.5} />}
          </div>
          <div className="mt-1.5 text-[11px] text-zinc-500">
            Comissão Shopee menos gasto Meta{impostoMetaPct > 0 ? ` + ${(impostoMetaPct * 100).toFixed(0)}% imposto` : ''} · {dados.length} {dados.length === 1 ? "dia" : "dias"} no período
          </div>
        </div>

        {/* MICRO-STATS */}
        <div className="flex gap-6 border-l border-white/5 pl-6">
          <Stat label="Melhor dia" valor={formatBRL(dados[stats.idxMelhor].lucro)} sub={formatarDataCurta(dados[stats.idxMelhor].data)} cor="emerald" />
          <Stat
            label="Menor resultado"
            valor={formatBRL(menorResultado)}
            sub={formatarDataCurta(dados[stats.idxPior].data)}
            cor={menorResultado < 0 ? "rose" : menorResultado > 0 ? "emerald" : "zinc"}
          />
          <Stat label="Positivo / Neg" valor={`${stats.diasPositivos} / ${stats.diasNegativos}`} sub="dias" cor="zinc" />
        </div>
      </div>

      {/* GRÁFICO */}
      <div className="relative px-2 pb-3 pt-1">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          style={{ display: "block" }}
          preserveAspectRatio="none"
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* DEFS */}
          <defs>
            <linearGradient id="grad-lucro" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#10b981" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="grad-prejuizo" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#e11d48" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="stroke-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset={`${(yZero / H) * 100}%`} stopColor="#34d399" />
              <stop offset={`${(yZero / H) * 100}%`} stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
            <clipPath id="acima-zero">
              <rect x="0" y="0" width={W} height={yZero} />
            </clipPath>
            <clipPath id="abaixo-zero">
              <rect x="0" y={yZero} width={W} height={H - yZero} />
            </clipPath>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* GRID HORIZONTAL */}
          {ticksY.map((t, i) => (
            <line key={`gy-${i}`} x1={PAD_X} y1={t.y} x2={W - PAD_X} y2={t.y} stroke="rgba(255,255,255,0.04)" strokeDasharray={i === 1 ? "" : "4 6"} strokeWidth={i === 1 ? 1 : 0.5} />
          ))}

          {/* ROTULOS Y */}
          {ticksY.map((t, i) => (
            <text key={`ty-${i}`} x={PAD_X - 8} y={t.y + 4} textAnchor="end" className="fill-zinc-600" style={{ fontSize: "10px", fontFamily: "ui-monospace, monospace", fontWeight: 600 }}>
              {t.v === 0 ? "R$ 0" : (t.v > 0 ? "+" : "") + formatBRL(t.v).replace("R$ ", "").replace(",00", "")}
            </text>
          ))}

          {/* AREA POSITIVA (verde) */}
          <path d={dArea} fill="url(#grad-lucro)" clipPath="url(#acima-zero)" />
          {/* AREA NEGATIVA (vermelho) */}
          <path d={dArea} fill="url(#grad-prejuizo)" clipPath="url(#abaixo-zero)" />

          {/* LINHA ZERO destacada */}
          <line x1={PAD_X} y1={yZero} x2={W - PAD_X} y2={yZero} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

          {/* LINHA PRINCIPAL — desenha verde acima, vermelho abaixo */}
          <path d={dPath} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" clipPath="url(#acima-zero)" filter="url(#glow)" className="grafico-path-anim" />
          <path d={dPath} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" clipPath="url(#abaixo-zero)" filter="url(#glow)" className="grafico-path-anim" />

          {/* PONTOS */}
          {pontos.map((p, i) => {
            const cor = p.lucro >= 0 ? "#34d399" : "#f43f5e";
            const ehExtremo = i === stats.idxMelhor || i === stats.idxPior;
            return (
              <g key={`pt-${i}`}>
                {ehExtremo && (
                  <circle cx={p.x} cy={p.y} r="9" fill={cor} opacity="0.15" />
                )}
                <circle cx={p.x} cy={p.y} r={ehExtremo ? 4 : 2.5} fill={cor} stroke="#0a0a0a" strokeWidth="1.5" />
              </g>
            );
          })}

          {/* ANOTAÇÕES NO MELHOR/PIOR DIA — dedup quando idxMelhor=idxPior (1 dia) */}
          {Array.from(new Set([stats.idxMelhor, stats.idxPior]))
            .filter((idx) => Math.abs(dados[idx].lucro) > 0.5)
            .map((idx) => {
              const p = pontos[idx];
              const ehMelhor = idx === stats.idxMelhor;
              const cor = ehMelhor ? "#34d399" : "#f43f5e";
              const labelY = ehMelhor ? p.y - 18 : p.y + 24;
              const tipo = ehMelhor ? "melhor" : "pior";
              return (
                <g key={`anot-${tipo}-${idx}`}>
                  <text x={p.x} y={labelY} textAnchor="middle" fill={cor} style={{ fontSize: "11px", fontWeight: 800, fontFamily: "ui-monospace, monospace" }}>
                    {p.lucro > 0 ? "+" : ""}{formatBRL(p.lucro).replace("R$ ", "")}
                  </text>
                </g>
              );
            })}

          {/* CROSSHAIR (hover) */}
          {hoverIdx !== null && pontos[hoverIdx] && (
            <>
              <line x1={pontos[hoverIdx].x} y1={PAD_T} x2={pontos[hoverIdx].x} y2={H - PAD_B} stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="3 4" />
              <circle cx={pontos[hoverIdx].x} cy={pontos[hoverIdx].y} r="6" fill="white" stroke={pontos[hoverIdx].lucro >= 0 ? "#34d399" : "#f43f5e"} strokeWidth="2" />
            </>
          )}

          {/* AREA DE HOVER (invisível) */}
          {pontos.map((p, i) => {
            const larguraSeg = innerW / Math.max(1, pontos.length - 1);
            return (
              <rect
                key={`hov-${i}`}
                x={p.x - larguraSeg / 2}
                y={PAD_T}
                width={larguraSeg}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
              />
            );
          })}

          {/* ROTULOS X */}
          {ticksX.map(({ p, i }) => (
            <text key={`tx-${i}`} x={p.x} y={H - 12} textAnchor="middle" className="fill-zinc-600" style={{ fontSize: "10px", fontFamily: "ui-monospace, monospace", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              {formatarDataCurta(p.data)}
            </text>
          ))}
        </svg>

        {/* TOOLTIP */}
        {hoverIdx !== null && pontos[hoverIdx] && (
          <Tooltip ponto={pontos[hoverIdx]} larguraTotal={W} impostoMetaPct={impostoMetaPct} />
        )}
      </div>

      {/* Animação de entrada */}
      <style jsx>{`
        :global(.grafico-path-anim) {
          stroke-dasharray: 3000;
          stroke-dashoffset: 3000;
          animation: drawPath 1.6s cubic-bezier(0.65, 0, 0.35, 1) forwards;
        }
        @keyframes drawPath {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}

function Stat({ label, valor, sub, cor }: { label: string; valor: string; sub: string; cor: "emerald" | "rose" | "zinc" }) {
  const corClass = cor === "emerald" ? "text-emerald-400" : cor === "rose" ? "text-rose-400" : "text-zinc-300";
  return (
    <div className="text-right">
      <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-600">{label}</div>
      <div className={cn("mt-1 text-base font-black tabular-nums", corClass)} style={{ letterSpacing: "-0.02em" }}>
        {valor}
      </div>
      <div className="text-[9px] uppercase tracking-wider text-zinc-700">{sub}</div>
    </div>
  );
}

function Tooltip({ ponto, larguraTotal, impostoMetaPct = 0.13 }: { ponto: { idx: number; x: number; data: string; spend: number; comissao: number; lucro: number }; larguraTotal: number; impostoMetaPct?: number }) {
  const ehLucro = ponto.lucro >= 0;
  const xPct = (ponto.x / larguraTotal) * 100;
  const dt = new Date(ponto.data + "T00:00:00");
  const dataFmt = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", weekday: "short" });
  return (
    <div
      className="pointer-events-none absolute top-3 z-10 -translate-x-1/2 rounded-xl border border-white/10 bg-zinc-950/95 px-3.5 py-2.5 shadow-2xl backdrop-blur-md"
      style={{ left: `${xPct}%` }}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{dataFmt}</div>
      <div className={cn("mt-1 text-base font-black tabular-nums", ehLucro ? "text-emerald-400" : "text-rose-400")}>
        {ehLucro ? "+" : ""}{formatBRL(ponto.lucro)}
      </div>
      <div className="mt-1.5 space-y-0.5 border-t border-white/5 pt-1.5 text-[10px] tabular-nums text-zinc-400">
        <div className="flex justify-between gap-4">
          <span className="text-zinc-500">Gasto Meta</span>
          <span className="font-mono text-rose-300">−{formatBRL(ponto.spend * (1 + impostoMetaPct))}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-zinc-500">Comissão Shopee</span>
          <span className="font-mono text-emerald-300">+{formatBRL(ponto.comissao)}</span>
        </div>
      </div>
    </div>
  );
}
