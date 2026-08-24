"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Nicho } from "@/lib/types";

export function NichosManager({ nichos: nichosIniciais }: { nichos: Nicho[] }) {
  const router = useRouter();
  const [nichos, setNichos] = useState(nichosIniciais);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [novaPalavra, setNovaPalavra] = useState("");
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function toggle(id: string, ativo: boolean) {
    setSalvandoId(id);
    setNichos((prev) => prev.map((n) => (n.id === id ? { ...n, ativo } : n)));
    await fetch("/api/nichos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ativo })
    });
    setSalvandoId(null);
    startTransition(() => router.refresh());
  }

  async function salvarPalavras(id: string, palavrasChave: string[]) {
    setSalvandoId(id);
    setNichos((prev) => prev.map((n) => (n.id === id ? { ...n, palavrasChave } : n)));
    await fetch("/api/nichos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, palavrasChave })
    });
    setSalvandoId(null);
  }

  function adicionarPalavra(nicho: Nicho) {
    const palavra = novaPalavra.trim();
    if (!palavra) return;
    const novas = [...nicho.palavrasChave, palavra];
    setNovaPalavra("");
    void salvarPalavras(nicho.id, novas);
  }

  function removerPalavra(nicho: Nicho, palavra: string) {
    const novas = nicho.palavrasChave.filter((p) => p !== palavra);
    void salvarPalavras(nicho.id, novas);
  }

  return (
    <div className="space-y-3">
      {nichos.map((n) => (
        <div key={n.id} className="glass rounded-2xl p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-2xl">
                {n.emoji}
              </div>
              <div>
                <h3 className="font-bold">{n.nome}</h3>
                <div className="text-xs text-zinc-500">
                  {n.palavrasChave.length} palavra{n.palavrasChave.length !== 1 && "s"}-chave
                </div>
              </div>
            </div>
            <ToggleButton
              ativo={n.ativo}
              salvando={salvandoId === n.id}
              onClick={() => toggle(n.id, !n.ativo)}
            />
          </div>

          {n.ativo && (
            <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
              <div className="flex flex-wrap gap-1.5">
                {n.palavrasChave.map((p) => (
                  <span
                    key={p}
                    className="group flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs"
                  >
                    {p}
                    <button
                      onClick={() => removerPalavra(n, p)}
                      className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-400"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              {editandoId === n.id ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={novaPalavra}
                    onChange={(e) => setNovaPalavra(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        adicionarPalavra(n);
                        setEditandoId(null);
                      }
                      if (e.key === "Escape") setEditandoId(null);
                    }}
                    placeholder="ex: caminha pet grande"
                    className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm outline-none focus:border-shopee/50"
                  />
                  <button
                    onClick={() => {
                      adicionarPalavra(n);
                      setEditandoId(null);
                    }}
                    className="rounded-lg shopee-gradient px-3 text-sm font-bold text-white"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditandoId(n.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-dashed border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:border-shopee/30 hover:text-shopee"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar palavra-chave
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ToggleButton({ ativo, salvando, onClick }: { ativo: boolean; salvando: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={salvando}
      className={cn(
        "relative flex h-7 w-12 items-center rounded-full border transition-colors",
        ativo ? "border-shopee/30 bg-shopee/30" : "border-white/10 bg-zinc-800"
      )}
    >
      <div
        className={cn(
          "absolute h-5 w-5 rounded-full transition-transform",
          ativo ? "translate-x-6 shopee-gradient" : "translate-x-0.5 bg-zinc-500"
        )}
      />
      {salvando && <Loader2 className="absolute inset-0 m-auto h-3 w-3 animate-spin" />}
    </button>
  );
}
