"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Mic,
  Video,
  Send,
  DollarSign,
  ArrowRight,
  Zap,
  Package,
  Trophy,
  Loader2
} from "lucide-react";
import { cn, formatBRL, timeAgo } from "@/lib/utils";
import { calcularScoreViral, sugerirBundle, type ScoreViral } from "@/lib/score-viral";
import type { Produto } from "@/lib/types";

const ESTAGIOS = [
  { id: "garimpado", nome: "Garimpado", icon: Sparkles, cor: "violet" },
  { id: "roteirizado", nome: "Roteirizado", icon: Mic, cor: "indigo" },
  { id: "gravado", nome: "Gravado", icon: Video, cor: "sky" },
  { id: "postado", nome: "Postado", icon: Send, cor: "amber" },
  { id: "convertido", nome: "Convertido", icon: DollarSign, cor: "emerald" }
] as const;

type Estagio = typeof ESTAGIOS[number]["id"];

type ProdutoPipeline = Produto & { _estagio: string; _atualizadoEm: string };

export function EsteiraClient({
  produtos,
  pipelineInicial
}: {
  produtos: Produto[];
  pipelineInicial: ProdutoPipeline[];
}) {
  const [tab, setTab] = useState<"kanban" | "score">("kanban");

  return (
    <>
      <div className="mb-6 flex gap-1 rounded-xl border border-white/5 bg-white/5 p-1">
        <TabBtn ativo={tab === "kanban"} onClick={() => setTab("kanban")} icon={Package}>
          Pipeline Kanban
        </TabBtn>
        <TabBtn ativo={tab === "score"} onClick={() => setTab("score")} icon={Zap}>
          Score Viral & Bundles
        </TabBtn>
      </div>

      {tab === "kanban" && <Kanban produtos={produtos} pipelineInicial={pipelineInicial} />}
      {tab === "score" && <ScoreViralPanel produtos={produtos} />}
    </>
  );
}

function TabBtn({ ativo, onClick, children, icon: Icon }: {
  ativo: boolean; onClick: () => void; children: React.ReactNode; icon: typeof Sparkles;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
        ativo ? "bg-amber-500/15 text-amber-300" : "text-zinc-400 hover:bg-white/5"
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function Kanban({ produtos, pipelineInicial }: { produtos: Produto[]; pipelineInicial: ProdutoPipeline[] }) {
  const router = useRouter();
  const [pipeline, setPipeline] = useState(pipelineInicial);
  const [, startTransition] = useTransition();

  const grupos: Record<Estagio, ProdutoPipeline[]> = {
    garimpado: [], roteirizado: [], gravado: [], postado: [], convertido: []
  };
  for (const p of pipeline) {
    if (p._estagio in grupos) {
      grupos[p._estagio as Estagio].push(p);
    }
  }

  const novosProdutos = produtos.filter((p) => !pipeline.some((pp) => pp.id === p.id)).slice(0, 5);

  async function adicionarPipeline(produto: Produto, estagio: Estagio = "garimpado") {
    await fetch("/api/esteira/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produtoId: produto.id, estagio })
    });
    const novoItem: ProdutoPipeline = { ...produto, _estagio: estagio, _atualizadoEm: new Date().toISOString() };
    setPipeline([novoItem, ...pipeline]);
    startTransition(() => router.refresh());
  }

  async function mover(produto: ProdutoPipeline, novoEstagio: Estagio) {
    await fetch("/api/esteira/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produtoId: produto.id, estagio: novoEstagio })
    });
    setPipeline(pipeline.map((p) => p.id === produto.id ? { ...p, _estagio: novoEstagio, _atualizadoEm: new Date().toISOString() } : p));
  }

  return (
    <div className="space-y-4">
      {novosProdutos.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">+ Adicionar à esteira</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {novosProdutos.map((p) => (
              <button
                key={p.id}
                onClick={() => adicionarPipeline(p)}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-white/5 bg-white/5 p-2 transition-all hover:border-amber-500/30 hover:bg-amber-500/10"
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-800">
                  {p.imagem && <Image src={p.imagem} alt="" fill sizes="40px" className="object-cover" unoptimized />}
                </div>
                <div className="text-left">
                  <div className="line-clamp-1 max-w-[180px] text-xs font-semibold">{p.nome}</div>
                  <div className="text-[10px] text-zinc-500">{formatBRL(p.preco)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="scrollbar-thin grid grid-cols-2 gap-3 overflow-x-auto md:grid-cols-3 lg:grid-cols-5">
        {ESTAGIOS.map((e) => {
          const Icon = e.icon;
          const lista = grupos[e.id];
          return (
            <div key={e.id} className="glass min-w-[200px] rounded-2xl p-3">
              <div className="mb-3 flex items-center justify-between">
                <div className={cn(
                  "flex items-center gap-1.5 text-xs font-bold",
                  e.cor === "emerald" && "text-emerald-400",
                  e.cor === "amber" && "text-amber-400",
                  e.cor === "sky" && "text-sky-400",
                  e.cor === "indigo" && "text-indigo-400",
                  e.cor === "violet" && "text-violet-400"
                )}>
                  <Icon className="h-3.5 w-3.5" />
                  {e.nome}
                </div>
                <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400">
                  {lista.length}
                </span>
              </div>

              <div className="space-y-2">
                {lista.length === 0 && (
                  <div className="py-6 text-center text-[10px] text-zinc-600">vazio</div>
                )}
                {lista.map((p) => {
                  const indexAtual = ESTAGIOS.findIndex((s) => s.id === p._estagio);
                  const proximo = ESTAGIOS[indexAtual + 1];
                  return (
                    <div key={p.id} className="rounded-xl border border-white/5 bg-zinc-900/50 p-2.5">
                      <div className="flex gap-2">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-800">
                          {p.imagem && <Image src={p.imagem} alt="" fill sizes="40px" className="object-cover" unoptimized />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-2 text-[10px] font-semibold leading-tight">{p.nome}</div>
                          <div className="mt-0.5 text-[9px] text-zinc-500">{timeAgo(p._atualizadoEm)}</div>
                        </div>
                      </div>
                      {proximo && (
                        <button
                          onClick={() => mover(p, proximo.id)}
                          className="mt-2 flex w-full items-center justify-center gap-1 rounded-md bg-white/5 py-1 text-[10px] font-bold text-zinc-300 hover:bg-white/10"
                        >
                          {proximo.nome} <ArrowRight className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScoreViralPanel({ produtos }: { produtos: Produto[] }) {
  const [selecionado, setSelecionado] = useState<Produto | null>(produtos[0] || null);
  if (!produtos.length) {
    return <div className="glass rounded-2xl p-12 text-center text-sm text-zinc-500">Garimpe produtos primeiro</div>;
  }
  const score = selecionado ? calcularScoreViral(selecionado) : null;
  const bundle = selecionado ? sugerirBundle(produtos, selecionado) : [];

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-1.5">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Produtos</div>
        <div className="scrollbar-thin max-h-[70vh] space-y-1.5 overflow-y-auto pr-1">
          {produtos.slice(0, 30).map((p) => {
            const s = calcularScoreViral(p);
            return (
              <button
                key={p.id}
                onClick={() => setSelecionado(p)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl border p-2 text-left transition-all",
                  selecionado?.id === p.id ? "border-amber-500/50 bg-amber-500/10" : "border-white/5 bg-white/5 hover:bg-white/10"
                )}
              >
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded bg-zinc-800">
                  {p.imagem && <Image src={p.imagem} alt="" fill sizes="36px" className="object-cover" unoptimized />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-[11px] font-semibold">{p.nome}</div>
                  <div className="text-[10px] text-zinc-500">{formatBRL(p.preco)}</div>
                </div>
                <div className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-black",
                  s.total >= 80 && "bg-emerald-500/20 text-emerald-300",
                  s.total >= 60 && s.total < 80 && "bg-amber-500/20 text-amber-300",
                  s.total < 60 && "bg-zinc-500/20 text-zinc-400"
                )}>{s.total}</div>
              </button>
            );
          })}
        </div>
      </aside>

      {selecionado && score && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5">
            <div className="mb-3 flex items-start gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
                {selecionado.imagem && <Image src={selecionado.imagem} alt="" fill sizes="64px" className="object-cover" unoptimized />}
              </div>
              <div>
                <h3 className="line-clamp-2 text-sm font-bold leading-snug">{selecionado.nome}</h3>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
                  <span>{formatBRL(selecionado.preco)}</span>·
                  <span>{selecionado.comissaoPct.toFixed(1)}% comissão</span>
                  {selecionado.comissaoExtraPct > 0 && <span className="rounded bg-shopee/20 px-1 text-[9px] font-black text-shopee">EXTRA</span>}
                </div>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between rounded-xl border border-white/5 bg-black/30 p-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Score Viral</div>
                <div className={cn(
                  "text-4xl font-black tabular-nums",
                  score.veredito === "explosivo" && "text-emerald-400",
                  score.veredito === "promissor" && "text-amber-400",
                  score.veredito === "moderado" && "text-zinc-300",
                  score.veredito === "fraco" && "text-rose-400"
                )}>{score.total}<span className="text-lg text-zinc-600">/100</span></div>
              </div>
              <VereditoBadge veredito={score.veredito} />
            </div>

            <div className="space-y-2">
              {score.fatores.map((f) => (
                <div key={f.nome} className="flex items-center gap-3">
                  <div className="w-24 text-xs font-semibold text-zinc-400">{f.nome}</div>
                  <div className="flex-1 overflow-hidden rounded-full bg-zinc-900">
                    <div
                      className={cn(
                        "h-2",
                        f.cor === "emerald" && "bg-emerald-500",
                        f.cor === "amber" && "bg-amber-500",
                        f.cor === "rose" && "bg-rose-500"
                      )}
                      style={{ width: `${(f.pontos / f.max) * 100}%` }}
                    />
                  </div>
                  <div className="w-12 text-right text-[10px] font-mono text-zinc-500">{f.pontos}/{f.max}</div>
                </div>
              ))}
            </div>

            {score.observacoes.length > 0 && (
              <div className="mt-4 rounded-lg border border-white/5 bg-black/30 p-3">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Insights</div>
                <ul className="space-y-1 text-xs text-zinc-300">
                  {score.observacoes.map((o, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 text-emerald-400">•</span>{o}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {bundle.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                <Package className="h-4 w-4 text-amber-400" /> Bundle sugerido (kit de 3)
              </h3>
              <p className="mb-3 text-xs text-zinc-400">
                Faça um vídeo "kit completo" com esses produtos do mesmo nicho. Cada um com link de afiliado próprio.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {bundle.map((p) => {
                  const s = calcularScoreViral(p);
                  return (
                    <div key={p.id} className="flex gap-3 rounded-xl border border-white/5 bg-black/20 p-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                        {p.imagem && <Image src={p.imagem} alt="" fill sizes="56px" className="object-cover" unoptimized />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-xs font-semibold">{p.nome}</div>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-500">
                          <span className="font-bold text-shopee">{formatBRL(p.preco)}</span>
                          <span className="rounded bg-emerald-500/15 px-1 py-0.5 font-bold text-emerald-300">
                            {p.comissaoPct.toFixed(0)}%
                          </span>
                          <span className="rounded bg-amber-500/15 px-1 py-0.5 font-bold text-amber-300">
                            Score {s.total}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VereditoBadge({ veredito }: { veredito: ScoreViral["veredito"] }) {
  const cfg = {
    explosivo: { cor: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300", label: "🚀 EXPLOSIVO", desc: "Posta JÁ" },
    promissor: { cor: "border-amber-500/40 bg-amber-500/15 text-amber-300", label: "✨ PROMISSOR", desc: "Vale testar" },
    moderado: { cor: "border-zinc-500/40 bg-zinc-500/15 text-zinc-300", label: "⚪ MODERADO", desc: "Backup" },
    fraco: { cor: "border-rose-500/40 bg-rose-500/15 text-rose-300", label: "❌ FRACO", desc: "Pula" }
  }[veredito];
  return (
    <div className={cn("flex flex-col items-end gap-1 rounded-xl border px-3 py-2 text-right", cfg.cor)}>
      <div className="text-xs font-black">{cfg.label}</div>
      <div className="text-[10px] opacity-80">{cfg.desc}</div>
    </div>
  );
}
