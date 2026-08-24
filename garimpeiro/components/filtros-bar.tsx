"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Nicho } from "@/lib/types";

type Props = {
  nichos: Nicho[];
  nichoSelecionado?: string;
};

export function FiltrosBar({ nichos, nichoSelecionado }: Props) {
  const router = useRouter();
  const [ativo, setAtivo] = useState(nichoSelecionado || "todos");

  function selecionar(id: string) {
    setAtivo(id);
    // Nicho é um filtro adicional: preserve preset e filtros avançados ativos.
    const url = new URL(window.location.href);
    if (id === "todos") url.searchParams.delete("nicho");
    else url.searchParams.set("nicho", id);
    router.push(url.pathname + (url.search || ""));
  }

  const ativos = nichos.filter((n) => n.ativo);
  if (!ativos.length) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
      <div className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-zinc-500">
        <Filter className="h-3.5 w-3.5" /> Nicho:
      </div>
      <button
        onClick={() => selecionar("todos")}
        className={cn(
          "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
          ativo === "todos"
            ? "border-shopee bg-shopee/15 text-shopee"
            : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10"
        )}
      >
        Todos
      </button>
      {ativos.map((n) => (
        <button
          key={n.id}
          onClick={() => selecionar(n.id)}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
            ativo === n.id
              ? "border-shopee bg-shopee/15 text-shopee"
              : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10"
          )}
        >
          <span>{n.emoji}</span>
          {n.nome.split(" ")[0]}
        </button>
      ))}
      {ativo !== "todos" && (
        <button
          onClick={() => selecionar("todos")}
          className="ml-1 flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-zinc-500 hover:bg-white/10"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
