"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, Sliders, RotateCcw, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const ORDENS = [
  { id: "score", label: "Score de oportunidade" },
  { id: "vendas", label: "Mais vendidos" },
  { id: "comissao", label: "Maior % de comissão" },
  { id: "comissao-valor", label: "Maior R$ por venda" },
  { id: "rating", label: "Melhor avaliação" },
  { id: "desconto", label: "Maior desconto" },
  { id: "fim-oferta", label: "Acabando logo" }
];

export function FiltrosAvancadosDrawer({
  aberto,
  onClose
}: {
  aberto: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [comissaoMin, setComissaoMin] = useState(0);
  const [comissaoMax, setComissaoMax] = useState(100);
  const [vendasMin, setVendasMin] = useState(0);
  const [vendasMax, setVendasMax] = useState(0);
  const [ratingMin, setRatingMin] = useState(0);
  const [precoMin, setPrecoMin] = useState(0);
  const [precoMax, setPrecoMax] = useState(0);
  const [comissaoValorMin, setComissaoValorMin] = useState(0);
  const [diasRestantes, setDiasRestantes] = useState(0);
  const [scoreMin, setScoreMin] = useState(0);
  const [oficial, setOficial] = useState(false);
  const [preferred, setPreferred] = useState(false);
  const [confiavel, setConfiavel] = useState(false);
  const [cupom, setCupom] = useState(false);
  const [extra, setExtra] = useState(false);
  const [ordenar, setOrdenar] = useState("score");

  // Pré-popula do URL
  useEffect(() => {
    if (!aberto) return;
    setComissaoMin(parseFloat(searchParams.get("comissao-min") || "0"));
    setComissaoMax(parseFloat(searchParams.get("comissao-max") || "100"));
    setVendasMin(parseInt(searchParams.get("vendas-min") || "0", 10));
    setVendasMax(parseInt(searchParams.get("vendas-max") || "0", 10));
    setRatingMin(parseFloat(searchParams.get("rating-min") || "0"));
    setPrecoMin(parseFloat(searchParams.get("preco-min") || "0"));
    setPrecoMax(parseFloat(searchParams.get("preco-max") || "0"));
    setComissaoValorMin(parseFloat(searchParams.get("comissao-valor-min") || "0"));
    setDiasRestantes(parseInt(searchParams.get("dias-restantes") || "0", 10));
    setScoreMin(parseInt(searchParams.get("score-min") || "0", 10));
    setOficial(searchParams.get("oficial") === "true");
    setPreferred(searchParams.get("preferred") === "true");
    setConfiavel(searchParams.get("confiavel") === "true");
    setCupom(searchParams.get("cupom") === "true");
    setExtra(searchParams.get("extra") === "true");
    setOrdenar(searchParams.get("ordenar") || "score");
  }, [aberto, searchParams]);

  function aplicar() {
    const url = new URL(window.location.href);
    const setOrDel = (k: string, v: string | null) => {
      if (v === null || v === "" || v === "0" || v === "false") url.searchParams.delete(k);
      else url.searchParams.set(k, v);
    };
    setOrDel("comissao-min", comissaoMin > 0 ? String(comissaoMin) : null);
    setOrDel("comissao-max", comissaoMax < 100 && comissaoMax > 0 ? String(comissaoMax) : null);
    setOrDel("vendas-min", vendasMin > 0 ? String(vendasMin) : null);
    setOrDel("vendas-max", vendasMax > 0 ? String(vendasMax) : null);
    setOrDel("rating-min", ratingMin > 0 ? String(ratingMin) : null);
    setOrDel("preco-min", precoMin > 0 ? String(precoMin) : null);
    setOrDel("preco-max", precoMax > 0 ? String(precoMax) : null);
    setOrDel("comissao-valor-min", comissaoValorMin > 0 ? String(comissaoValorMin) : null);
    setOrDel("dias-restantes", diasRestantes > 0 ? String(diasRestantes) : null);
    setOrDel("score-min", scoreMin > 0 ? String(scoreMin) : null);
    setOrDel("oficial", oficial ? "true" : null);
    setOrDel("preferred", preferred ? "true" : null);
    setOrDel("confiavel", confiavel ? "true" : null);
    setOrDel("cupom", cupom ? "true" : null);
    setOrDel("extra", extra ? "true" : null);
    setOrDel("ordenar", ordenar !== "score" ? ordenar : null);
    router.push(url.pathname + (url.search || ""));
    onClose();
  }

  function reset() {
    setComissaoMin(0); setComissaoMax(100); setVendasMin(0); setVendasMax(0);
    setRatingMin(0); setPrecoMin(0); setPrecoMax(0); setComissaoValorMin(0);
    setDiasRestantes(0); setScoreMin(0); setOficial(false); setPreferred(false);
    setConfiavel(false); setCupom(false); setExtra(false); setOrdenar("score");
  }

  const filtrosAtivos = useMemo(() => [
    comissaoMin > 0, comissaoMax < 100, vendasMin > 0, vendasMax > 0,
    ratingMin > 0, precoMin > 0, precoMax > 0, comissaoValorMin > 0,
    diasRestantes > 0, scoreMin > 0, oficial, preferred, confiavel, cupom, extra, ordenar !== "score"
  ].filter(Boolean).length, [comissaoMin, comissaoMax, vendasMin, vendasMax, ratingMin, precoMin, precoMax, comissaoValorMin, diasRestantes, scoreMin, oficial, preferred, confiavel, cupom, extra, ordenar]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end bg-black/70 backdrop-blur-sm animate-fade-in sm:items-center"
      onClick={onClose}
    >
      <div
        className="glass scrollbar-thin h-full w-full max-w-md overflow-y-auto rounded-t-2xl shadow-2xl sm:h-[90vh] sm:rounded-2xl sm:mr-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-zinc-950/80 p-5 backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-shopee">
              <Sliders className="h-3.5 w-3.5" /> FILTROS AVANÇADOS
            </div>
            <h2 className="mt-1 text-lg font-bold">Ajuste fino</h2>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 p-5">
          {/* Comissão */}
          <Group label="💰 Comissão" descricao="Faixa de % de comissão paga (commissionRate da API)">
            <Range label="Mínima" valor={comissaoMin} max={50} step={1} sufixo="%" onChange={setComissaoMin} cor="emerald" />
            <Range label="Máxima" valor={comissaoMax} max={100} step={1} sufixo="%" onChange={setComissaoMax} cor="emerald" />
          </Group>

          {/* Vendas */}
          <Group label="🛒 Vendas" descricao="Quantidade de vendas históricas">
            <Range label="Mínimo" valor={vendasMin} max={50000} step={500} onChange={setVendasMin} cor="indigo" />
            <Range label="Máximo (0 = ilimitado)" valor={vendasMax} max={50000} step={500} onChange={setVendasMax} cor="indigo" />
          </Group>

          {/* Rating */}
          <Group label="⭐ Avaliação mínima">
            <Range label="Estrelas" valor={ratingMin} max={5} step={0.1} sufixo="⭐" onChange={setRatingMin} cor="amber" />
          </Group>

          {/* Preço */}
          <Group label="💵 Faixa de preço">
            <Range label="Mínimo" valor={precoMin} max={500} step={5} sufixo="R$" prefixoSufixo onChange={setPrecoMin} cor="rose" />
            <Range label="Máximo (0 = ilimitado)" valor={precoMax} max={500} step={5} sufixo="R$" prefixoSufixo onChange={setPrecoMax} cor="rose" />
          </Group>

          {/* Comissão R$ */}
          <Group label="💎 Mínimo R$ por venda" descricao="Quanto você ganha por venda em valor absoluto">
            <Range label="Mínimo" valor={comissaoValorMin} max={50} step={1} sufixo="R$" prefixoSufixo onChange={setComissaoValorMin} cor="emerald" />
          </Group>

          {/* Tempo de oferta */}
          <Group label="⏰ Oferta acaba em">
            <Range label="Dias (0 = qualquer)" valor={diasRestantes} max={30} step={1} sufixo="d" onChange={setDiasRestantes} cor="orange" />
          </Group>

          {/* Score */}
          <Group label="🏆 Score mínimo">
            <Range label="Pontos" valor={scoreMin} max={100} step={5} onChange={setScoreMin} cor="violet" />
          </Group>

          {/* Toggles */}
          <Group label="✨ Filtros booleanos">
            <Toggle label="✅ Apenas Loja Oficial (Mall)" valor={oficial} onChange={setOficial} />
            <Toggle label="🛡️ Apenas Loja Preferida" valor={preferred} onChange={setPreferred} />
            <Toggle label="🏪 Oficial ou Preferida" valor={confiavel} onChange={setConfiavel} />
            <Toggle label="🎟️ Apenas com cupom ativo" valor={cupom} onChange={setCupom} />
            <Toggle label="⚡ Apenas com bônus EXTRA do seller" valor={extra} onChange={setExtra} />
          </Group>

          {/* Ordenação */}
          <Group label="📊 Ordenar por">
            <div className="grid grid-cols-1 gap-1.5">
              {ORDENS.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setOrdenar(o.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all",
                    ordenar === o.id
                      ? "border-shopee bg-shopee/15 text-shopee"
                      : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10"
                  )}
                >
                  {ordenar === o.id ? <Check className="h-3.5 w-3.5" /> : <span className="w-3.5" />}
                  {o.label}
                </button>
              ))}
            </div>
          </Group>
        </div>

        <div className="sticky bottom-0 z-10 flex items-center gap-2 border-t border-white/5 bg-zinc-950/80 p-4 backdrop-blur-xl">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/10"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Resetar
          </button>
          <button
            onClick={aplicar}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg shopee-gradient px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-shopee/30"
          >
            <Sliders className="h-4 w-4" /> {filtrosAtivos > 0 ? `Aplicar ${filtrosAtivos} filtro(s)` : "Aplicar filtros"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Group({ label, descricao, children }: { label: string; descricao?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-col">
        <span className="text-sm font-bold">{label}</span>
        {descricao && <span className="text-[10px] text-zinc-500">{descricao}</span>}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Range({
  label, valor, max, step = 1, sufixo, prefixoSufixo = false, onChange, cor = "shopee"
}: {
  label: string;
  valor: number;
  max: number;
  step?: number;
  sufixo?: string;
  prefixoSufixo?: boolean;
  onChange: (n: number) => void;
  cor?: "shopee" | "emerald" | "indigo" | "amber" | "rose" | "violet" | "orange";
}) {
  const corMap: Record<string, string> = {
    shopee: "accent-shopee",
    emerald: "accent-emerald-500",
    indigo: "accent-indigo-500",
    amber: "accent-amber-500",
    rose: "accent-rose-500",
    violet: "accent-violet-500",
    orange: "accent-orange-500"
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="font-mono font-bold text-zinc-200 tabular-nums">
          {prefixoSufixo && sufixo ? `${sufixo} ${valor}` : `${valor}${sufixo || ""}`}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={valor}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={cn("w-full cursor-pointer", corMap[cor])}
      />
    </div>
  );
}

function Toggle({ label, valor, onChange }: { label: string; valor: boolean; onChange: (b: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!valor)}
      className={cn(
        "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-xs font-semibold transition-all",
        valor
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10"
      )}
    >
      <span>{label}</span>
      <div className={cn(
        "relative h-5 w-9 rounded-full border transition-colors",
        valor ? "border-emerald-500/40 bg-emerald-500/30" : "border-white/10 bg-zinc-800"
      )}>
        <div className={cn(
          "absolute top-0.5 h-3.5 w-3.5 rounded-full transition-transform",
          valor ? "translate-x-[18px] bg-emerald-400" : "translate-x-0.5 bg-zinc-500"
        )} />
      </div>
    </button>
  );
}
