import { listarProdutosHoje, listarProdutosHistorico, listarPipeline, buscarProduto } from "@/lib/db";
import { EsteiraClient } from "./esteira-client";

export const dynamic = "force-dynamic";

export default async function EsteiraPage() {
  let produtos = listarProdutosHoje(60);
  if (!produtos.length) produtos = listarProdutosHistorico(60);

  const pipeline = listarPipeline();
  const produtosPipeline = pipeline
    .map((p) => {
      const prod = buscarProduto(p.produtoId);
      return prod ? { ...prod, _estagio: p.estagio, _atualizadoEm: p.atualizadoEm } : null;
    })
    .filter(Boolean) as Array<ReturnType<typeof buscarProduto> & { _estagio: string; _atualizadoEm: string }>;

  return (
    <div className="page-shell mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="page-header mb-8">
        <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg>
          ESTEIRA IA
        </div>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Esteira de Produção</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">
          Pipeline kanban dos seus produtos. Score viral preditivo. Bundle suggester pra kits de 3.
        </p>
      </header>
      <EsteiraClient produtos={produtos} pipelineInicial={produtosPipeline} />
    </div>
  );
}
