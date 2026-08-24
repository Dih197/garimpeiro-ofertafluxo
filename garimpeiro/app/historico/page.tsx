import { ProdutosGrid } from "@/components/produtos-grid";
import { listarProdutosHistorico, ultimaExecucao } from "@/lib/db";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HistoricoPage() {
  const produtos = listarProdutosHistorico(200);
  const ultima = ultimaExecucao();

  return (
    <div className="page-shell mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="page-header mb-8">
        <div className="flex items-center gap-2 text-xs font-medium text-indigo-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
          HISTÓRICO
        </div>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Tudo que você já garimpou</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Últimos 200 produtos extraídos. Use pra evitar repetir produto.
        </p>
        {ultima && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            Última execução: {timeAgo(ultima.executadoEm)} · {ultima.total} produtos · {ultima.roteiros} roteiros
          </div>
        )}
      </header>
      <ProdutosGrid produtos={produtos} />
    </div>
  );
}
