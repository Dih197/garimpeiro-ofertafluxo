import { listarProdutosFavoritados } from "@/lib/db";
import { ProdutosGrid } from "@/components/produtos-grid";

export const dynamic = "force-dynamic";

export default async function FavoritosPage() {
  const produtos = listarProdutosFavoritados();

  return (
    <div className="page-shell mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="page-header mb-8">
        <div className="flex items-center gap-2 text-xs font-medium text-rose-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          FAVORITOS
        </div>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Seus produtos favoritos</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Os produtos que você marcou com 💖 — guardados aqui pra você revisitar e gravar.
          {produtos.length > 0 && <span className="ml-2 text-rose-300">{produtos.length} favorito{produtos.length !== 1 && "s"}</span>}
        </p>
      </header>

      {produtos.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center gap-3 rounded-2xl py-16 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-700"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          <div className="text-sm font-semibold text-zinc-300">Nenhum favorito ainda</div>
          <div className="max-w-sm text-xs text-zinc-500">
            No dashboard, clique no coração 🤍 de qualquer produto pra adicionar aqui.
          </div>
        </div>
      ) : (
        <ProdutosGrid produtos={produtos} />
      )}
    </div>
  );
}
