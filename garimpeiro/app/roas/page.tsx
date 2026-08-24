import { RoasClient } from "./roas-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Painel ROI · Meta Ads + Shopee | Garimpeiro",
  description: "Painel completo de ROI para afiliados Shopee com Meta Ads — KPIs, ROAS, DRE, health score e forecast."
};

export default function RoasPage() {
  return (
    <div className="page-shell mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="page-header mb-6 animate-slide-up">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-shopee">
          <div className="flex h-6 w-6 items-center justify-center rounded-md shopee-gradient">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v12" /><path d="m15 9-3-3-3 3" />
            </svg>
          </div>
          ROI · TRÁFEGO &amp; VENDAS
          <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-black text-emerald-400">
            LIVE
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
          Painel ROI{" "}
          <span className="bg-gradient-to-r from-shopee to-orange-400 bg-clip-text text-transparent">
            Meta Ads + Shopee
          </span>
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">
          Painel único com tudo: KPIs, ROAS por anúncio Meta, performance por criativo (Sub_ID 2),
          atribuição por canal Shopee (Sub_ID 1), DRE financeiro, health score, meta mensal, funil de conversão e forecast.
          Sincroniza Meta + Shopee em tempo real.
        </p>
      </header>
      <RoasClient />
    </div>
  );
}
