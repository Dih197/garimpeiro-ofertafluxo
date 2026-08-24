import { listarNichos } from "@/lib/db";
import { NichosManager } from "./nichos-manager";

export const dynamic = "force-dynamic";

export default async function NichosPage() {
  const nichos = listarNichos();
  return (
    <div className="page-shell mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="page-header mb-8">
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="6" y2="2"/><line x1="12" x2="12" y1="22" y2="18"/></svg>
          NICHOS
        </div>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Configure seus nichos</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Ative os nichos que você quer rastrear e ajuste as palavras-chave de busca.
          Recomendamos começar com 3 nichos no máximo pra focar.
        </p>
      </header>
      <NichosManager nichos={nichos} />
    </div>
  );
}
