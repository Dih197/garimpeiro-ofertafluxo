import { eventosProximos } from "@/lib/sazonalidade";
import { IntelClient } from "./intel-client";

export const dynamic = "force-dynamic";

export default async function IntelPage() {
  const eventos = eventosProximos(120);
  return (
    <div className="page-shell mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="page-header mb-8">
        <div className="flex items-center gap-2 text-xs font-medium text-violet-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          INTELIGÊNCIA
        </div>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Inteligência de Mercado</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">
          Veja o que ninguém vê. Sazonalidade, micro-nichos virgens, oportunidades em tempo real.
        </p>
      </header>
      <IntelClient eventosIniciais={eventos} />
    </div>
  );
}
