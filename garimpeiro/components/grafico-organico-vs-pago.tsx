"use client";

import { useMemo, useState } from "react";
import { Heart, Megaphone, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { cn, formatBRL } from "@/lib/utils";

export type PontoDiarioCompleto = {
  data: string;
  spendMeta: number;
  spendMetaComImposto: number;
  impressoesMeta: number;
  cliquesMeta: number;
  cliquesShopeeTotal: number;
  cliquesRedesSociais: number;
  cliquesShopeeVideo: number;
  cliquesShopeeLive: number;
  temDadosCliquesShopee: boolean;
  pedidosTotal: number;
  itensVendidos: number;
  faturamentoTotal: number;
  novosCompradores: number;
  pedidosCancelados: number;
  comissaoConfirmada: number;
  comissaoPendente: number;
  vendasOrganicas: number;
  comissaoOrganica: number;
  vendasCampanha: number;
  comissaoCampanha: number;
  vendasVideo: number;
  comissaoVideo: number;
  vendasLive: number;
  comissaoLive: number;
  comissaoTotal: number;
  lucroLiquido: number;
};

type Props = {
  dados: PontoDiarioCompleto[];
  altura?: number;
  impostoMetaPct?: number;
};

/**
 * Gráfico de barras empilhadas separando comissão orgânica (verde) e comissão de campanha (rosa),
 * com linha de gasto Meta sobreposta. Útil pra Histórico mostrar visualmente o mix orgânico vs pago
 * e o impacto do gasto sobre o lucro.
 */
export function GraficoOrganicoVsPago({ dados, altura = 280, impostoMetaPct = 0.13 }: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const stats = useMemo(() => {
    if (!dados.length) return null;
    const totVendasOrg = dados.reduce((s, d) => s + d.vendasOrganicas, 0);
    const totVendasCamp = dados.reduce((s, d) => s + d.vendasCampanha, 0);
    const totComOrg = dados.reduce((s, d) => s + d.comissaoOrganica, 0);
    const totComCamp = dados.reduce((s, d) => s + d.comissaoCampanha, 0);
    const totSpend = dados.reduce((s, d) => s + d.spendMeta, 0);
    const totSpendImp = dados.reduce((s, d) => s + d.spendMetaComImposto, 0);
    const lucroAcumulado = totComOrg + totComCamp - totSpendImp;
    const totVendas = totVendasOrg + totVendasCamp;
    const pctOrganico = totVendas > 0 ? (totVendasOrg / totVendas) * 100 : 0;

    // Escala: usa o maior valor entre comissão total do dia e spend do dia (com imposto)
    // pra que a barra de spend seja comparável visualmente.
    const maxComissao = Math.max(...dados.map((d) => d.comissaoTotal), 0);
    const maxSpend = Math.max(...dados.map((d) => d.spendMetaComImposto), 0);
    const maxBar = Math.max(maxComissao, maxSpend, 1);

    return {
      totVendasOrg, totVendasCamp, totComOrg, totComCamp, totSpend, totSpendImp,
      lucroAcumulado, totVendas, pctOrganico, maxBar
    };
  }, [dados]);

  if (!dados.length || !stats) {
    return (
      <div className="glass rounded-2xl p-12 text-center text-xs text-zinc-500">
        Sem histórico de vendas pra plotar.
      </div>
    );
  }

  const W = 1000;
  const H = altura;
  const PAD_X = 56;
  const PAD_T = 24;
  const PAD_B = 36;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_T - PAD_B;

  // Escala bars verticais: 0 → maxBar
  const escalaY = (v: number) => PAD_T + innerH - (v / stats.maxBar) * innerH;
  const yBaseline = PAD_T + innerH;

  // Largura de cada coluna (par de barras orgânico+pago lado a lado)
  const slotW = innerW / Math.max(1, dados.length);
  const barGap = 2;
  const barW = (slotW - barGap * 3) / 2; // 2 barras por dia + gaps

  const formatarDataCurta = (d: string) => {
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
  };

  // Eixo Y: 3 ticks
  const ticksY = [
    { v: stats.maxBar, y: escalaY(stats.maxBar) },
    { v: stats.maxBar / 2, y: escalaY(stats.maxBar / 2) },
    { v: 0, y: yBaseline }
  ];

  // Ticks X: até 7
  const ticksX = dados.length <= 7
    ? dados.map((d, i) => ({ d, i }))
    : [0, Math.floor(dados.length * 0.25), Math.floor(dados.length * 0.5), Math.floor(dados.length * 0.75), dados.length - 1].map((i) => ({ d: dados[i], i }));

  // Linha de spend Meta (overlay)
  const pontosSpend = dados.map((d, i) => ({
    x: PAD_X + i * slotW + slotW / 2,
    y: escalaY(d.spendMetaComImposto),
    valor: d.spendMetaComImposto
  }));
  const pathSpend = pontosSpend.length > 0
    ? `M ${pontosSpend.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" L ")}`
    : "";

  return (
    <div className="glass relative overflow-hidden rounded-2xl">
      {/* HEADER com métricas combinadas */}
      <div className="border-b border-white/5 px-6 pb-4 pt-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Histórico · Orgânico vs Pago
            </div>
            <div
              className={cn(
                "mt-1 flex items-center gap-2 font-black tabular-nums",
                stats.lucroAcumulado >= 0 ? "text-emerald-400" : "text-rose-400"
              )}
              style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", lineHeight: 1, letterSpacing: "-0.03em" }}
            >
              {stats.lucroAcumulado >= 0 ? "+" : ""}{formatBRL(stats.lucroAcumulado)}
              {stats.lucroAcumulado >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            </div>
            <div className="mt-1 text-[11px] text-zinc-500">
              Lucro acumulado · {dados.length} {dados.length === 1 ? "dia" : "dias"}
            </div>
          </div>

          {/* MÉTRICAS COMBINADAS */}
          <div className="flex flex-wrap gap-4 text-right">
            <Bloco
              icone={<Heart className="h-3 w-3" />}
              label="Orgânico"
              vendas={stats.totVendasOrg}
              valor={stats.totComOrg}
              cor="emerald"
              extra={`${stats.pctOrganico.toFixed(0)}% das vendas`}
            />
            <Bloco
              icone={<Megaphone className="h-3 w-3" />}
              label="Pago"
              vendas={stats.totVendasCamp}
              valor={stats.totComCamp}
              cor="rose"
              extra="Meta Ads"
            />
            <Bloco
              icone={<Wallet className="h-3 w-3" />}
              label="Gasto Meta"
              vendas={null}
              valor={stats.totSpendImp}
              cor="amber"
              extra={impostoMetaPct > 0 ? `c/ imposto ${(impostoMetaPct * 100).toFixed(0)}%` : 'sem imposto'}
              negativo
            />
          </div>
        </div>
      </div>

      {/* GRÁFICO */}
      <div className="relative px-2 pb-3 pt-2">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          style={{ display: "block" }}
          preserveAspectRatio="none"
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="bar-organico" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="bar-campanha" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
          </defs>

          {/* GRID */}
          {ticksY.map((t, i) => (
            <line key={`gy-${i}`} x1={PAD_X} y1={t.y} x2={W - PAD_X} y2={t.y} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 5" />
          ))}

          {/* ROTULOS Y */}
          {ticksY.map((t, i) => (
            <text
              key={`ty-${i}`}
              x={PAD_X - 8}
              y={t.y + 4}
              textAnchor="end"
              className="fill-zinc-600"
              style={{ fontSize: "10px", fontFamily: "ui-monospace, monospace", fontWeight: 600 }}
            >
              {formatBRL(t.v).replace("R$ ", "").replace(",00", "")}
            </text>
          ))}

          {/* BARRAS */}
          {dados.map((d, i) => {
            const xBase = PAD_X + i * slotW + barGap;
            const yOrg = escalaY(d.comissaoOrganica);
            const yCamp = escalaY(d.comissaoCampanha);
            const ehHover = hoverIdx === i;
            return (
              <g key={`bar-${i}`} opacity={hoverIdx !== null && !ehHover ? 0.55 : 1}>
                {/* Barra orgânica */}
                {d.comissaoOrganica > 0 && (
                  <rect
                    x={xBase}
                    y={yOrg}
                    width={barW}
                    height={Math.max(0, yBaseline - yOrg)}
                    fill="url(#bar-organico)"
                    rx={2}
                    className="bar-anim"
                  />
                )}
                {/* Barra campanha (à direita) */}
                {d.comissaoCampanha > 0 && (
                  <rect
                    x={xBase + barW + barGap}
                    y={yCamp}
                    width={barW}
                    height={Math.max(0, yBaseline - yCamp)}
                    fill="url(#bar-campanha)"
                    rx={2}
                    className="bar-anim"
                  />
                )}
                {/* Hitbox invisível pra hover do dia inteiro */}
                <rect
                  x={PAD_X + i * slotW}
                  y={PAD_T}
                  width={slotW}
                  height={innerH}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(i)}
                />
              </g>
            );
          })}

          {/* LINHA DE SPEND META (overlay) */}
          {stats.totSpend > 0 && pathSpend && (
            <>
              <path d={pathSpend} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 4" opacity="0.85" />
              {pontosSpend.map((p, i) => p.valor > 0 && (
                <circle key={`sp-${i}`} cx={p.x} cy={p.y} r="3" fill="#f59e0b" stroke="#0a0a0a" strokeWidth="1.5" />
              ))}
            </>
          )}

          {/* CROSSHAIR no hover */}
          {hoverIdx !== null && dados[hoverIdx] && (
            <line
              x1={PAD_X + hoverIdx * slotW + slotW / 2}
              y1={PAD_T}
              x2={PAD_X + hoverIdx * slotW + slotW / 2}
              y2={yBaseline}
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="1"
              strokeDasharray="3 4"
            />
          )}

          {/* BASELINE */}
          <line x1={PAD_X} y1={yBaseline} x2={W - PAD_X} y2={yBaseline} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

          {/* ROTULOS X */}
          {ticksX.map(({ d, i }) => (
            <text
              key={`tx-${i}`}
              x={PAD_X + i * slotW + slotW / 2}
              y={H - 12}
              textAnchor="middle"
              className="fill-zinc-600"
              style={{ fontSize: "10px", fontFamily: "ui-monospace, monospace", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}
            >
              {formatarDataCurta(d.data)}
            </text>
          ))}
        </svg>

        {/* TOOLTIP */}
        {hoverIdx !== null && dados[hoverIdx] && (
          <Tooltip ponto={dados[hoverIdx]} idx={hoverIdx} total={dados.length} />
        )}

        {/* LEGENDA */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-[10px] uppercase tracking-wider text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-gradient-to-b from-emerald-400 to-emerald-500" />
            Comissão orgânica
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-gradient-to-b from-rose-400 to-rose-500" />
            Comissão campanha
          </span>
          {stats.totSpend > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 bg-amber-500" style={{ borderTop: "2px dashed #f59e0b" }} />
              {impostoMetaPct > 0 ? `Gasto Meta (c/ ${(impostoMetaPct * 100).toFixed(0)}% imp.)` : 'Gasto Meta (sem imposto)'}
            </span>
          )}
        </div>
      </div>

      <style jsx>{`
        :global(.bar-anim) {
          animation: barRise 0.7s cubic-bezier(0.65, 0, 0.35, 1) forwards;
          transform-origin: bottom;
          transform: scaleY(0);
        }
        @keyframes barRise {
          to { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}

function Bloco({
  icone, label, vendas, valor, cor, extra, negativo
}: {
  icone: React.ReactNode;
  label: string;
  vendas: number | null;
  valor: number;
  cor: "emerald" | "rose" | "amber";
  extra: string;
  negativo?: boolean;
}) {
  const corClass =
    cor === "emerald" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/[0.04]" :
    cor === "rose" ? "text-rose-400 border-rose-500/20 bg-rose-500/[0.04]" :
    "text-amber-400 border-amber-500/20 bg-amber-500/[0.04]";

  return (
    <div className={cn("rounded-lg border px-3 py-2 text-right", corClass)}>
      <div className="flex items-center justify-end gap-1 text-[9px] font-bold uppercase tracking-wider opacity-90">
        {icone} {label}
      </div>
      <div className="mt-0.5 text-base font-black tabular-nums" style={{ letterSpacing: "-0.02em" }}>
        {negativo && valor > 0 ? "−" : ""}{formatBRL(valor)}
      </div>
      <div className="text-[9px] text-zinc-500">
        {vendas !== null ? `${vendas} venda${vendas === 1 ? "" : "s"} · ` : ""}{extra}
      </div>
    </div>
  );
}

function Tooltip({ ponto, idx, total }: { ponto: PontoDiarioCompleto; idx: number; total: number }) {
  const dt = new Date(ponto.data + "T00:00:00");
  const dataFmt = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", weekday: "short" });
  const lucro = ponto.lucroLiquido;
  const conversao = ponto.temDadosCliquesShopee && ponto.cliquesShopeeTotal > 0
    ? (ponto.pedidosTotal / ponto.cliquesShopeeTotal) * 100
    : null;
  const xPct = total > 1 ? ((idx + 0.5) / total) * 100 : 50;
  return (
    <div
      className="pointer-events-none absolute top-3 z-10 -translate-x-1/2 rounded-xl border border-white/10 bg-zinc-950/95 px-3.5 py-2.5 shadow-2xl backdrop-blur-md"
      style={{ left: `${xPct}%`, minWidth: 220 }}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{dataFmt}</div>
      <div className={cn("mt-1 text-base font-black tabular-nums", lucro >= 0 ? "text-emerald-400" : "text-rose-400")}>
        Lucro {lucro >= 0 ? "+" : ""}{formatBRL(lucro)}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 rounded-lg bg-white/[0.025] p-2 text-center">
        <div>
          <div className="text-[8px] uppercase tracking-wider text-zinc-600">Pedidos</div>
          <div className="font-black tabular-nums text-zinc-200">{ponto.pedidosTotal}</div>
        </div>
        <div>
          <div className="text-[8px] uppercase tracking-wider text-zinc-600">GMV</div>
          <div className="font-black tabular-nums text-violet-300">{formatBRL(ponto.faturamentoTotal)}</div>
        </div>
        <div>
          <div className="text-[8px] uppercase tracking-wider text-zinc-600">Conversão</div>
          <div className="font-black tabular-nums text-cyan-300">{conversao === null ? "—" : `${conversao.toFixed(2)}%`}</div>
        </div>
      </div>
      <div className="mt-2 space-y-1 border-t border-white/5 pt-2 text-[10px] tabular-nums">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Orgânico
          </span>
          <span className="font-mono text-emerald-300">
            {ponto.vendasOrganicas} venda(s) · +{formatBRL(ponto.comissaoOrganica)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-rose-300">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Pago
          </span>
          <span className="font-mono text-rose-300">
            {ponto.vendasCampanha} venda(s) · +{formatBRL(ponto.comissaoCampanha)}
          </span>
        </div>
        {ponto.spendMeta > 0 && (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Gasto Meta
            </span>
            <span className="font-mono text-amber-300">−{formatBRL(ponto.spendMetaComImposto)}</span>
          </div>
        )}
        {ponto.temDadosCliquesShopee && (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> Cliques Shopee
            </span>
            <span className="font-mono text-cyan-300">{ponto.cliquesShopeeTotal} · {ponto.cliquesRedesSociais} social · {ponto.cliquesShopeeVideo} vídeo</span>
          </div>
        )}
      </div>
    </div>
  );
}
