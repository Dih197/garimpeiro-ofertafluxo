"use client";

import { useState } from "react";
import { Calendar, Compass, Search, Loader2, Sparkles, Flame, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EventoComStatus } from "@/lib/sazonalidade";
import type { Produto } from "@/lib/types";
import { ProdutoCard } from "@/components/produto-card";
import { RoteirosDialog } from "@/components/roteiros-dialog";

type Tab = "sazonal" | "virgem";

export function IntelClient({ eventosIniciais }: { eventosIniciais: EventoComStatus[] }) {
  const [tab, setTab] = useState<Tab>("sazonal");

  return (
    <>
      <div className="mb-6 flex gap-1 rounded-xl border border-white/5 bg-white/5 p-1">
        <TabBtn ativo={tab === "sazonal"} onClick={() => setTab("sazonal")} icon={Calendar}>
          Sazonalidade
        </TabBtn>
        <TabBtn ativo={tab === "virgem"} onClick={() => setTab("virgem")} icon={Compass}>
          Detector de nicho virgem
        </TabBtn>
      </div>

      {tab === "sazonal" && <Sazonal eventos={eventosIniciais} />}
      {tab === "virgem" && <NichoVirgem />}
    </>
  );
}

function TabBtn({
  ativo,
  onClick,
  children,
  icon: Icon
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon: typeof Calendar;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
        ativo
          ? "bg-violet-500/15 text-violet-300 shadow-sm shadow-violet-500/20"
          : "text-zinc-400 hover:bg-white/5"
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function Sazonal({ eventos }: { eventos: EventoComStatus[] }) {
  const [eventoAtivo, setEventoAtivo] = useState<EventoComStatus | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [selecionado, setSelecionado] = useState<Produto | null>(null);

  async function abrirEvento(e: EventoComStatus) {
    setEventoAtivo(e);
    setCarregando(true);
    setProdutos([]);
    try {
      const r = await fetch("/api/inteligencia/sazonal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventoId: e.id })
      });
      const d = await r.json();
      if (d.produtos) setProdutos(d.produtos);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div>
      <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {eventos.slice(0, 12).map((e) => (
          <CardEvento key={e.id} evento={e} ativo={eventoAtivo?.id === e.id} onClick={() => abrirEvento(e)} />
        ))}
      </div>

      {eventoAtivo && (
        <div className="space-y-4 border-t border-white/5 pt-6">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-bold">
              <span className="text-2xl">{eventoAtivo.emoji}</span>
              Produtos pra {eventoAtivo.nome}
            </h3>
            <span className="text-xs text-zinc-500">{produtos.length} oportunidades</span>
          </div>

          {carregando && (
            <div className="flex items-center justify-center gap-2 py-12 text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
              Buscando produtos sazonais com link de afiliado...
            </div>
          )}

          {!carregando && produtos.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {produtos.map((p, i) => (
                <ProdutoCard key={p.id} produto={p} rank={i} onAbrirRoteiros={setSelecionado} />
              ))}
            </div>
          )}

          {!carregando && produtos.length === 0 && (
            <div className="glass rounded-xl p-8 text-center text-sm text-zinc-500">
              Nenhum produto encontrado. Tente outro evento.
            </div>
          )}
        </div>
      )}

      <RoteirosDialog produto={selecionado} onClose={() => setSelecionado(null)} />
    </div>
  );
}

function CardEvento({ evento, ativo, onClick }: { evento: EventoComStatus; ativo: boolean; onClick: () => void }) {
  const cores = {
    "iniciar-agora": "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    preparar: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    futuro: "border-white/10 bg-white/5 text-zinc-400"
  };
  const iconStatus = {
    "iniciar-agora": Flame,
    preparar: Clock,
    futuro: Calendar
  };
  const Icon = iconStatus[evento.status];

  const labels = {
    "iniciar-agora": "Postar agora",
    preparar: "Preparar logo",
    futuro: "Em breve"
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "group glass relative flex flex-col items-start gap-2 rounded-2xl p-4 text-left transition-all hover:border-violet-500/30",
        ativo && "border-violet-500/50 bg-violet-500/5 ring-1 ring-violet-500/30"
      )}
    >
      <div className="flex w-full items-start justify-between gap-3">
        <div className="text-3xl">{evento.emoji}</div>
        <div className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold", cores[evento.status])}>
          <Icon className="h-3 w-3" /> {labels[evento.status]}
        </div>
      </div>

      <h3 className="text-sm font-bold">{evento.nome}</h3>

      <div className="text-[11px] text-zinc-500">
        {evento.diasAteEvento === 0 ? "É HOJE" : `em ${evento.diasAteEvento} dias`} · {evento.proximaData}
      </div>

      <div className="mt-1 flex flex-wrap gap-1">
        {evento.produtosFoco.slice(0, 3).map((p) => (
          <span key={p} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">{p}</span>
        ))}
      </div>

      <ArrowRight className="absolute bottom-3 right-3 h-3.5 w-3.5 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-violet-400" />
    </button>
  );
}

function NichoVirgem() {
  const [palavras, setPalavras] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [selecionado, setSelecionado] = useState<Produto | null>(null);

  async function buscar() {
    const lista = palavras.split(",").map((p) => p.trim()).filter(Boolean);
    if (!lista.length) return;
    setCarregando(true);
    setProdutos([]);
    try {
      const r = await fetch("/api/inteligencia/nicho-virgem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ palavras: lista, nichoId: "intel" })
      });
      const d = await r.json();
      if (d.produtos) setProdutos(d.produtos);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Sparkles className="h-4 w-4 text-violet-400" /> Detectar nicho virgem
        </div>
        <p className="mb-4 text-sm text-zinc-400">
          Cole até 8 palavras-chave separadas por vírgula. O sistema busca em todas e ranqueia por comissão + vendas + qualidade,
          com link de afiliado já gerado.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={palavras}
            onChange={(e) => setPalavras(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscar()}
            placeholder="ex: chinelo nuvem, sapato bordado, kit unhas gel..."
            className="flex-1 rounded-lg border border-white/10 bg-black/30 px-4 py-2.5 text-sm outline-none focus:border-violet-500/50"
          />
          <button
            onClick={buscar}
            disabled={carregando || !palavras.trim()}
            className="flex items-center justify-center gap-2 rounded-lg bg-violet-500/20 px-5 py-2.5 text-sm font-bold text-violet-200 ring-1 ring-violet-500/30 transition-all hover:bg-violet-500/30 disabled:opacity-50"
          >
            {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {carregando ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </div>

      {produtos.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-400">
            {produtos.length} oportunidades encontradas
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {produtos.map((p, i) => (
              <ProdutoCard key={p.id} produto={p} rank={i} onAbrirRoteiros={setSelecionado} />
            ))}
          </div>
        </div>
      )}

      <RoteirosDialog produto={selecionado} onClose={() => setSelecionado(null)} />
    </div>
  );
}
