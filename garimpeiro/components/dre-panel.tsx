"use client";

import { cn, formatBRL, formatPct } from "@/lib/utils";
import { FileSpreadsheet, Download, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { useMemo } from "react";

type PnLProps = {
  receitaBruta: number;
  comissaoShopee: number;
  gastoMeta: number;
  periodo: string;
  diasNoPerido: number;
  impostoMetaPct?: number;
};

function Linha({
  label,
  valor,
  total,
  tipo = "normal",
  indent = false,
  highlight = false
}: {
  label: string;
  valor: number;
  total?: number;
  tipo?: "normal" | "receita" | "despesa" | "resultado";
  indent?: boolean;
  highlight?: boolean;
}) {
  const pct = total && total !== 0 ? (valor / total) * 100 : undefined;
  const corValor =
    tipo === "receita" ? "text-emerald-400" :
    tipo === "despesa" ? "text-rose-400" :
    tipo === "resultado" ? (valor >= 0 ? "text-emerald-400 glow-text-emerald" : "text-rose-400 glow-text-rose") :
    "text-zinc-300";

  return (
    <div className={cn(
      "flex items-center justify-between py-2 text-sm transition-colors hover:bg-white/[0.02] rounded px-2 -mx-2",
      highlight && "border-t border-b border-white/10 bg-white/[0.02]",
      indent && "pl-6"
    )}>
      <div className="flex items-center gap-2">
        {tipo === "receita" && <ArrowUp className="h-3 w-3 text-emerald-500" />}
        {tipo === "despesa" && <ArrowDown className="h-3 w-3 text-rose-500" />}
        {tipo === "resultado" && <Minus className="h-3 w-3 text-zinc-500" />}
        <span className={cn(
          "font-medium",
          highlight ? "text-zinc-100 font-bold" : tipo === "resultado" ? "text-zinc-100 font-bold text-base" : "text-zinc-400"
        )}>
          {label}
        </span>
      </div>
      <div className="flex items-center gap-4 tabular-nums">
        {pct !== undefined && (
          <span className="text-[10px] text-zinc-600 min-w-[40px] text-right">{formatPct(pct)}</span>
        )}
        <span className={cn("font-bold", corValor, highlight && "text-base")}>
          {tipo === "despesa" ? `(${formatBRL(Math.abs(valor))})` : formatBRL(valor)}
        </span>
      </div>
    </div>
  );
}

function exportCSV(dados: { label: string; valor: number }[], periodo: string) {
  const csvContent = [
    "DRE Painel ROI — " + periodo,
    "",
    "Item,Valor (R$)",
    ...dados.map(d => `"${d.label}","${d.valor.toFixed(2)}"`)
  ].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dre-roi-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function DREPanel({ receitaBruta, comissaoShopee, gastoMeta, periodo, diasNoPerido, impostoMetaPct = 0.13 }: PnLProps) {
  const dados = useMemo(() => {
    const impostoMeta = gastoMeta * impostoMetaPct;
    const custoTotal = gastoMeta + impostoMeta;
    const lucroLiquido = comissaoShopee - custoTotal;
    const margemLiquida = comissaoShopee > 0 ? (lucroLiquido / comissaoShopee) * 100 : 0;
    const lucroDiario = diasNoPerido > 0 ? lucroLiquido / diasNoPerido : 0;
    const projecao30d = lucroDiario * 30;

    return {
      impostoMeta,
      custoTotal,
      lucroLiquido,
      margemLiquida,
      lucroDiario,
      projecao30d,
      csvData: [
        { label: "Receita Bruta (GMV Shopee)", valor: receitaBruta },
        { label: "Comissão Shopee", valor: comissaoShopee },
        { label: "Gasto Meta Ads", valor: -gastoMeta },
        { label: `Imposto (${(impostoMetaPct * 100).toFixed(0)}% Meta)`, valor: -impostoMeta },
        { label: "Custo Total", valor: -custoTotal },
        { label: "Lucro Líquido", valor: lucroLiquido },
        { label: "Margem Líquida %", valor: margemLiquida },
        { label: "Lucro/dia", valor: lucroDiario },
        { label: "Projeção 30 dias", valor: projecao30d }
      ]
    };
  }, [receitaBruta, comissaoShopee, gastoMeta, diasNoPerido, impostoMetaPct]);

  return (
    <div className="glass rounded-2xl p-6 animate-float-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-indigo-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
            DRE · Demonstrativo de Resultado
          </h3>
        </div>
        <button
          onClick={() => exportCSV(dados.csvData, periodo)}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-zinc-400 hover:bg-white/10 hover:text-zinc-100 transition-colors"
        >
          <Download className="h-3 w-3" />
          Exportar CSV
        </button>
      </div>

      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
        Período: {periodo}
      </div>

      <div className="space-y-0">
        {/* RECEITA */}
        <div className="border-b border-white/5 pb-1 mb-1">
          <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-0.5 mt-2">Receita</div>
          <Linha label="GMV total Shopee" valor={receitaBruta} tipo="receita" />
          <Linha label="(—) Comissão líquida recebida" valor={comissaoShopee} tipo="receita" indent />
        </div>

        {/* DESPESAS */}
        <div className="border-b border-white/5 pb-1 mb-1">
          <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-0.5 mt-2">Despesas</div>
          <Linha label="Gasto Meta Ads" valor={gastoMeta} total={comissaoShopee} tipo="despesa" />
          <Linha label={`Imposto (≈${(impostoMetaPct * 100).toFixed(0)}%)`} valor={dados.impostoMeta} total={comissaoShopee} tipo="despesa" indent />
          <Linha label="Total de custos" valor={dados.custoTotal} total={comissaoShopee} tipo="despesa" highlight />
        </div>

        {/* RESULTADO */}
        <div className="pt-2">
          <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-0.5">Resultado</div>
          <Linha label="🏆 Lucro Líquido" valor={dados.lucroLiquido} tipo="resultado" highlight />
          <div className="flex items-center justify-between text-xs text-zinc-500 mt-2 px-2">
            <span>Margem líquida</span>
            <span className={cn(
              "font-bold",
              dados.margemLiquida >= 30 ? "text-emerald-400" : dados.margemLiquida >= 0 ? "text-amber-400" : "text-rose-400"
            )}>
              {formatPct(dados.margemLiquida)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-500 px-2">
            <span>Lucro/dia (média)</span>
            <span className={cn("font-bold", dados.lucroDiario >= 0 ? "text-emerald-400" : "text-rose-400")}>
              {formatBRL(dados.lucroDiario)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-500 px-2">
            <span>Projeção 30 dias</span>
            <span className={cn("font-bold", dados.projecao30d >= 0 ? "text-emerald-400" : "text-rose-400")}>
              {formatBRL(dados.projecao30d)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
