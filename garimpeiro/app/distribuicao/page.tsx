import { listarProdutosHoje, listarProdutosHistorico } from "@/lib/db";
import { DistribuicaoClient } from "./distribuicao-client";

export const dynamic = "force-dynamic";

export default async function DistribuicaoPage() {
  let produtos = listarProdutosHoje(50);
  if (!produtos.length) produtos = listarProdutosHistorico(50);

  return (
    <div className="page-shell mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="page-header mb-8">
        <div className="flex items-center gap-2 text-xs font-medium text-sky-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
          DISTRIBUIÇÃO
        </div>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Distribuição Multicanal</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">
          Gere links de afiliado <strong className="text-sky-300">rastreáveis por canal</strong> (cada um com SubID único pra você saber qual rede converteu).
          Inclui copy adaptado por plataforma e QR code.
        </p>
      </header>
      <DistribuicaoClient produtos={produtos} />
    </div>
  );
}
