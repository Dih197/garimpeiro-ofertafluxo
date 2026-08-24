"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, CheckCircle2, AlertCircle, Search, Link2 } from "lucide-react";

type Estado = "idle" | "buscando" | "gerando-links" | "pronto" | "erro";

const ETAPAS_PROGRESSO: Record<Estado, { texto: string; icon: typeof Loader2 }> = {
  idle: { texto: "Garimpar agora", icon: Sparkles },
  buscando: { texto: "Buscando produtos…", icon: Search },
  "gerando-links": { texto: "Gerando links afiliado…", icon: Link2 },
  pronto: { texto: "Pronto!", icon: CheckCircle2 },
  erro: { texto: "Erro", icon: AlertCircle }
};

export function GarimparButton() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("idle");
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [, startTransition] = useTransition();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Atualiza o texto pra simular progresso enquanto requisição roda
  useEffect(() => {
    if (estado !== "buscando") return;
    timerRef.current = setTimeout(() => {
      setEstado((cur) => (cur === "buscando" ? "gerando-links" : cur));
    }, 6000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [estado]);

  async function executar() {
    setEstado("buscando");
    setMensagem(null);
    try {
      // Default: SEM roteiros (gera sob demanda no card). Muito mais rápido.
      const r = await fetch("/api/garimpar", { method: "POST" });
      const d = await r.json();
      if (d.ok) {
        setEstado("pronto");
        const segundos = (d.duracaoMs / 1000).toFixed(1);
        setMensagem({
          tipo: "ok",
          texto: `${d.totalFiltrados} produtos · ${segundos}s${d.modo === "mock" ? " (mock)" : ""}`
        });
        startTransition(() => router.refresh());
      } else {
        setEstado("erro");
        setMensagem({ tipo: "erro", texto: d.erro || "Falha desconhecida" });
      }
    } catch (e) {
      setEstado("erro");
      setMensagem({ tipo: "erro", texto: (e as Error).message });
    } finally {
      setTimeout(() => {
        setEstado("idle");
        setMensagem(null);
      }, 5000);
    }
  }

  const carregando = estado === "buscando" || estado === "gerando-links";
  const Icon = ETAPAS_PROGRESSO[estado].icon;
  const texto = ETAPAS_PROGRESSO[estado].texto;

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        data-garimpar
        onClick={executar}
        disabled={carregando}
        className="group flex items-center gap-2.5 rounded-xl shopee-gradient px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-shopee/30 transition-all hover:shadow-shopee/50 disabled:opacity-90"
      >
        {carregando ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : estado === "pronto" ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Icon className="h-4 w-4 transition-transform group-hover:rotate-12" />
        )}
        {texto}
      </button>

      {mensagem && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium animate-fade-in ${
            mensagem.tipo === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-rose-500/30 bg-rose-500/10 text-rose-400"
          }`}
        >
          {mensagem.tipo === "ok" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          {mensagem.texto}
        </div>
      )}

      {carregando && (
        <div className="text-[10px] text-zinc-500">
          {estado === "buscando" ? "Pode levar 10-30s na primeira vez" : "Quase lá…"}
        </div>
      )}
    </div>
  );
}
