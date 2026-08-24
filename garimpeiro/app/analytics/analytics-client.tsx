"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Loader2,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Target,
  CheckCircle2,
  AlertCircle,
  Trophy,
  PieChart
} from "lucide-react";
import { cn, formatBRL, formatNumber } from "@/lib/utils";
import { StatCard } from "@/components/stat-card";

type Stats = {
  totalVendas: number;
  totalRevenue: number;
  totalComissao: number;
  porCanal: Record<string, { vendas: number; comissao: number }>;
  topProdutos: Array<{ nome: string; vendas: number; comissao: number }>;
  porDia: Array<{ dia: string; vendas: number; comissao: number }>;
};

const NOMES_CANAL: Record<string, string> = {
  shopeevd: "Shopee Vídeo",
  reels: "Instagram Reels",
  tiktok: "TikTok",
  kwai: "Kwai",
  ytshorts: "YouTube Shorts",
  facebook: "Facebook",
  wpp: "WhatsApp",
  tg: "Telegram",
  direto: "Sem rastreio",
  intelbeleza: "Intel · Beleza",
  intelcustom: "Intel · Custom"
};

export function AnalyticsClient({ statsIniciais }: { statsIniciais: Stats }) {
  const router = useRouter();
  const [stats, setStats] = useState(statsIniciais);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [, startTransition] = useTransition();

  async function sincronizar() {
    setCarregando(true);
    setMensagem(null);
    try {
      const r = await fetch("/api/analytics/sincronizar?dias=30", { method: "POST" });
      const d = await r.json();
      if (d.ok) {
        setMensagem({ tipo: "ok", texto: `${d.sincronizadas} conversões sincronizadas` });
        if (d.stats) setStats(d.stats);
        startTransition(() => router.refresh());
      } else {
        setMensagem({ tipo: "erro", texto: d.erro || "Falha desconhecida" });
        if (d.stats) setStats(d.stats);
      }
    } catch (e) {
      setMensagem({ tipo: "erro", texto: (e as Error).message });
    } finally {
      setCarregando(false);
      setTimeout(() => setMensagem(null), 8000);
    }
  }

  // Forecast simples baseado em média diária dos últimos 7 dias
  const forecast = useMemo(() => {
    const ultimos7 = stats.porDia.slice(-7);
    if (!ultimos7.length) return null;
    const mediaDia = ultimos7.reduce((s, d) => s + d.comissao, 0) / ultimos7.length;
    return {
      proximos30: mediaDia * 30,
      proximos90: mediaDia * 90,
      mediaDia
    };
  }, [stats.porDia]);

  const maxComissaoCanal = Math.max(...Object.values(stats.porCanal).map((c) => c.comissao), 0);
  const maxComissaoDia = Math.max(...stats.porDia.map((d) => d.comissao), 0);
  const ticketMedio = stats.totalVendas > 0 ? stats.totalRevenue / stats.totalVendas : 0;
  const roiMedio = stats.totalRevenue > 0 ? (stats.totalComissao / stats.totalRevenue) * 100 : 0;

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="text-sm text-zinc-400">Últimos 30 dias · sincroniza direto da API Shopee</div>
        <button
          onClick={sincronizar}
          disabled={carregando}
          className="flex items-center gap-2 rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-bold text-emerald-300 ring-1 ring-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50"
        >
          {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {carregando ? "Sincronizando..." : "Sincronizar conversões"}
        </button>
      </div>

      {mensagem && (
        <div className={cn(
          "mb-6 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium",
          mensagem.tipo === "ok" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"
        )}>
          {mensagem.tipo === "ok" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          {mensagem.texto}
        </div>
      )}

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Comissão 30d" value={formatBRL(stats.totalComissao)} icon={DollarSign} accent="emerald" />
        <StatCard label="Vendas" value={formatNumber(stats.totalVendas)} icon={ShoppingBag} accent="shopee" />
        <StatCard label="Ticket médio" value={formatBRL(ticketMedio)} icon={TrendingUp} accent="indigo" />
        <StatCard label="ROI médio" value={`${roiMedio.toFixed(1)}%`} icon={Target} accent="amber" />
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
            <PieChart className="h-4 w-4 text-emerald-400" /> Vendas por canal (SubID)
          </h3>
          {Object.keys(stats.porCanal).length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              Sem conversões ainda. Clique em "Sincronizar" pra puxar da Shopee.
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(stats.porCanal)
                .sort(([, a], [, b]) => b.comissao - a.comissao)
                .map(([canal, dados]) => (
                  <div key={canal}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-300">{NOMES_CANAL[canal] || canal}</span>
                      <span className="font-mono font-bold text-emerald-400">{formatBRL(dados.comissao)}</span>
                    </div>
                    <div className="overflow-hidden rounded-full bg-zinc-900">
                      <div
                        className="h-2 bg-gradient-to-r from-emerald-500 to-emerald-400"
                        style={{ width: maxComissaoCanal > 0 ? `${(dados.comissao / maxComissaoCanal) * 100}%` : "0%" }}
                      />
                    </div>
                    <div className="mt-0.5 text-[10px] text-zinc-500">{dados.vendas} vendas</div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
            <Trophy className="h-4 w-4 text-amber-400" /> Top produtos vendidos
          </h3>
          {stats.topProdutos.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">Sem produtos vendidos ainda.</div>
          ) : (
            <div className="space-y-2">
              {stats.topProdutos.map((p, i) => (
                <div key={p.nome} className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/20 p-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-xs font-black text-amber-300">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-xs font-semibold">{p.nome}</div>
                    <div className="text-[10px] text-zinc-500">{p.vendas} vendas</div>
                  </div>
                  <div className="text-xs font-bold text-emerald-400">{formatBRL(p.comissao)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {stats.porDia.length > 0 && (
        <section className="mb-6 glass rounded-2xl p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
            <TrendingUp className="h-4 w-4 text-indigo-400" /> Comissão por dia
          </h3>
          <div className="flex h-32 items-end gap-1">
            {stats.porDia.slice(-30).map((d) => (
              <div key={d.dia} className="group relative flex-1">
                <div
                  className="rounded-t bg-gradient-to-t from-indigo-500 to-indigo-400 transition-all"
                  style={{ height: maxComissaoDia > 0 ? `${(d.comissao / maxComissaoDia) * 100}%` : "0%" }}
                />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-black/90 px-2 py-1 text-[10px] opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap">
                  {d.dia}: {formatBRL(d.comissao)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {forecast && (
        <section className="glass rounded-2xl p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
            <Target className="h-4 w-4 text-shopee" /> Forecast de comissão (mantendo o ritmo)
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <ProjecaoCard label="Média/dia" valor={forecast.mediaDia} />
            <ProjecaoCard label="Próximos 30 dias" valor={forecast.proximos30} destaque />
            <ProjecaoCard label="Próximos 90 dias" valor={forecast.proximos90} />
          </div>
          <p className="mt-3 text-[11px] text-zinc-500">
            * Projeção baseada na média dos últimos 7 dias. Aumente postagens diárias pra escalar.
          </p>
        </section>
      )}
    </>
  );
}

function ProjecaoCard({ label, valor, destaque = false }: { label: string; valor: number; destaque?: boolean }) {
  return (
    <div className={cn(
      "rounded-xl border p-4",
      destaque ? "border-shopee/40 bg-shopee/10" : "border-white/5 bg-black/20"
    )}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={cn(
        "mt-1 text-2xl font-black tabular-nums",
        destaque ? "text-shopee" : "text-zinc-200"
      )}>{formatBRL(valor)}</div>
    </div>
  );
}

