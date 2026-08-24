"use client";

import { useState } from "react";
import { ProdutoCard } from "./produto-card";
import { RoteirosDialog } from "./roteiros-dialog";
import type { Produto } from "@/lib/types";

export function ProdutosGrid({ produtos }: { produtos: Produto[] }) {
  const [selecionado, setSelecionado] = useState<Produto | null>(null);

  if (!produtos.length) {
    return (
      <div className="glass flex flex-col items-center justify-center gap-3 rounded-2xl py-16 text-center">
        <div className="text-sm font-semibold text-zinc-300">Nenhum produto garimpado ainda</div>
        <div className="max-w-sm text-xs text-zinc-500">
          Clica em <span className="font-bold text-shopee">Garimpar agora</span> no canto superior direito pra extrair os melhores achados do dia.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {produtos.map((p, i) => (
          <ProdutoCard key={p.id} produto={p} rank={i} onAbrirRoteiros={setSelecionado} />
        ))}
      </div>
      <RoteirosDialog produto={selecionado} onClose={() => setSelecionado(null)} />
    </>
  );
}
