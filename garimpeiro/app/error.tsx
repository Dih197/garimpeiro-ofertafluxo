"use client";

import Link from "next/link";
import { AlertTriangle, Home, RefreshCw, Settings } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="glass max-w-lg rounded-2xl p-8 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-400" />
        <h1 className="mt-4 text-xl font-black">Algo não saiu como esperado</h1>
        <p className="mt-2 text-sm text-zinc-400">{error.message || "A tela encontrou um erro inesperado."}</p>
        {error.digest && <div className="mt-2 font-mono text-[10px] text-zinc-600">Código: {error.digest}</div>}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={reset} className="flex items-center gap-2 rounded-xl bg-shopee px-4 py-2.5 text-sm font-bold text-white"><RefreshCw className="h-4 w-4" /> Tentar novamente</button>
          <Link href="/" className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold"><Home className="h-4 w-4" /> Painel</Link>
          <Link href="/configuracoes" className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold"><Settings className="h-4 w-4" /> Configurações</Link>
        </div>
      </div>
    </div>
  );
}
