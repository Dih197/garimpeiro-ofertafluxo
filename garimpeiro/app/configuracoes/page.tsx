import { listarConfigs, mascarar, statusShopee, statusLLM, statusMeta, type ChaveConfig } from "@/lib/configs";
import { ConfiguracoesClient } from "./configuracoes-client";

export const dynamic = "force-dynamic";

const SECRETAS: ChaveConfig[] = [
  "SHOPEE_PARTNER_KEY", "LLM_API_KEY", "CRON_SECRET", "META_ACCESS_TOKEN",
  "META_CAPI_TOKEN", "WHATSAPP_WEBHOOK_VERIFY_TOKEN", "WHATSAPP_APP_SECRET"
];

export default async function ConfiguracoesPage() {
  const todas = listarConfigs();
  const configs: Record<string, { valor: string; mascarado: boolean }> = {};
  for (const [k, v] of Object.entries(todas)) {
    if (SECRETAS.includes(k as ChaveConfig)) {
      configs[k] = { valor: v ? mascarar(v) : "", mascarado: true };
    } else {
      configs[k] = { valor: v, mascarado: false };
    }
  }

  return (
    <div className="page-shell mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="page-header mb-8">
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          CONFIGURAÇÕES
        </div>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Configurações do Garimpeiro</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">
          Configure suas chaves direto pelo painel — Shopee Open API, Meta Marketing API (anúncios) e LLM (OpenAI / Claude / Gemini).
          Tudo é salvo localmente no SQLite (não vai pra lugar nenhum).
        </p>
      </header>

      <ConfiguracoesClient
        configsIniciais={configs}
        statusInicial={{ shopee: statusShopee(), llm: statusLLM(), meta: statusMeta() }}
      />
    </div>
  );
}
