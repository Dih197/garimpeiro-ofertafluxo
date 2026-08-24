"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Sparkles,
  Eye,
  EyeOff,
  Save,
  TestTube,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  Lock,
  Trash2,
  Rocket,
  ExternalLink,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

type ConfigsServidor = Record<string, { valor: string; mascarado: boolean }>;
type Status = { shopee: "ok" | "incompleto" | "vazio"; llm: "ok" | "vazio"; meta?: "ok" | "incompleto" | "vazio" };

const PROVIDERS = [
  { id: "nenhum", nome: "Sem IA (usa templates)", modeloPadrao: "" },
  { id: "openai", nome: "OpenAI (GPT)", modeloPadrao: "gpt-4o-mini" },
  { id: "anthropic", nome: "Anthropic (Claude)", modeloPadrao: "claude-haiku-4-5-20251001" },
  { id: "gemini", nome: "Google (Gemini)", modeloPadrao: "gemini-2.5-flash" }
];

type ModeloOpcao = { id: string; nome: string; descricao: string; tag?: "rapido" | "balanceado" | "premium" | "legacy" };

const MODELOS_POR_PROVIDER: Record<string, ModeloOpcao[]> = {
  openai: [
    { id: "gpt-4o-mini", nome: "GPT-4o mini", descricao: "Rápido e barato — recomendado pra roteiros", tag: "rapido" },
    { id: "gpt-4o", nome: "GPT-4o", descricao: "Mais inteligente, custa ~10x mais", tag: "premium" },
    { id: "gpt-4.1", nome: "GPT-4.1", descricao: "Geração mais nova", tag: "balanceado" },
    { id: "gpt-4.1-mini", nome: "GPT-4.1 mini", descricao: "Versão econômica do 4.1", tag: "rapido" },
    { id: "o1-mini", nome: "o1-mini", descricao: "Reasoning — pensa antes de responder", tag: "balanceado" },
    { id: "gpt-3.5-turbo", nome: "GPT-3.5 Turbo", descricao: "Antigo, barato mas inferior", tag: "legacy" }
  ],
  anthropic: [
    { id: "claude-opus-4-7", nome: "Claude Opus 4.7", descricao: "Modelo mais capaz da Anthropic", tag: "premium" },
    { id: "claude-sonnet-4-6", nome: "Claude Sonnet 4.6", descricao: "Balanço ideal qualidade/custo", tag: "balanceado" },
    { id: "claude-haiku-4-5-20251001", nome: "Claude Haiku 4.5", descricao: "Rápido e barato — recomendado", tag: "rapido" },
    { id: "claude-3-5-sonnet-20241022", nome: "Claude 3.5 Sonnet", descricao: "Geração anterior", tag: "legacy" },
    { id: "claude-3-5-haiku-20241022", nome: "Claude 3.5 Haiku", descricao: "Geração anterior, rápido", tag: "legacy" }
  ],
  gemini: [
    { id: "gemini-2.5-flash", nome: "Gemini 2.5 Flash", descricao: "Rápido e gratuito até quota — recomendado", tag: "rapido" },
    { id: "gemini-2.5-pro", nome: "Gemini 2.5 Pro", descricao: "Mais inteligente, contexto longo", tag: "premium" },
    { id: "gemini-2.0-flash", nome: "Gemini 2.0 Flash", descricao: "Geração 2.0", tag: "balanceado" },
    { id: "gemini-1.5-pro", nome: "Gemini 1.5 Pro", descricao: "Geração anterior", tag: "legacy" },
    { id: "gemini-1.5-flash", nome: "Gemini 1.5 Flash", descricao: "Geração anterior, rápido", tag: "legacy" }
  ],
  nenhum: []
};

const TAG_STYLES = {
  rapido: { bg: "bg-emerald-500/15", text: "text-emerald-300", label: "RÁPIDO" },
  balanceado: { bg: "bg-blue-500/15", text: "text-blue-300", label: "BALANCEADO" },
  premium: { bg: "bg-violet-500/15", text: "text-violet-300", label: "PREMIUM" },
  legacy: { bg: "bg-zinc-500/15", text: "text-zinc-400", label: "LEGACY" }
} as const;

export function ConfiguracoesClient({
  configsIniciais,
  statusInicial
}: {
  configsIniciais: ConfigsServidor;
  statusInicial: Status;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Estados editáveis
  const [appId, setAppId] = useState(configsIniciais.SHOPEE_APP_ID?.valor || "");
  const [partnerKey, setPartnerKey] = useState(configsIniciais.SHOPEE_PARTNER_KEY?.valor || "");
  const [partnerKeyTouched, setPartnerKeyTouched] = useState(false);
  const [apiUrl, setApiUrl] = useState(configsIniciais.SHOPEE_AFFILIATE_API?.valor || "https://open-api.affiliate.shopee.com.br/graphql");
  const [useMock, setUseMock] = useState(configsIniciais.USE_MOCK_DATA?.valor === "true");

  const [provider, setProvider] = useState(configsIniciais.LLM_PROVIDER?.valor || "nenhum");
  const [llmKey, setLlmKey] = useState(configsIniciais.LLM_API_KEY?.valor || "");
  const [llmKeyTouched, setLlmKeyTouched] = useState(false);
  const [llmModel, setLlmModel] = useState(configsIniciais.LLM_MODEL?.valor || "");

  // Meta Ads
  const [metaToken, setMetaToken] = useState(configsIniciais.META_ACCESS_TOKEN?.valor || "");
  const [metaTokenTouched, setMetaTokenTouched] = useState(false);
  const [metaAdAccount, setMetaAdAccount] = useState(configsIniciais.META_AD_ACCOUNT_ID?.valor || "");
  const [metaPixel, setMetaPixel] = useState(configsIniciais.META_PIXEL_ID?.valor || "");
  const [metaCapiToken, setMetaCapiToken] = useState("");
  const [metaCapiTokenTouched, setMetaCapiTokenTouched] = useState(false);
  const [metaCapiTestCode, setMetaCapiTestCode] = useState(configsIniciais.META_CAPI_TEST_CODE?.valor || "");
  const [whatsappVerifyToken, setWhatsappVerifyToken] = useState("");
  const [whatsappVerifyTokenTouched, setWhatsappVerifyTokenTouched] = useState(false);
  const [whatsappAppSecret, setWhatsappAppSecret] = useState("");
  const [whatsappAppSecretTouched, setWhatsappAppSecretTouched] = useState(false);
  const [metaPage, setMetaPage] = useState(configsIniciais.META_PAGE_ID?.valor || "");
  const [metaIg, setMetaIg] = useState(configsIniciais.META_INSTAGRAM_ID?.valor || "");
  const [metaApiVersion, setMetaApiVersion] = useState(configsIniciais.META_API_VERSION?.valor || "v23.0");
  const [mostrarMetaToken, setMostrarMetaToken] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<{ user?: string; expiraEmHoras?: number | null; valido?: boolean; vitalicio?: boolean } | null>(null);

  const [mostrarPartnerKey, setMostrarPartnerKey] = useState(false);
  const [mostrarLlmKey, setMostrarLlmKey] = useState(false);

  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState<"shopee" | "llm" | "meta" | null>(null);
  const [mensagem, setMensagem] = useState<{ secao: "shopee" | "llm" | "meta" | "geral"; tipo: "ok" | "erro"; texto: string } | null>(null);
  const [status, setStatus] = useState(statusInicial);

  async function salvar() {
    setSalvando(true);
    setMensagem(null);
    const body: Record<string, string> = {
      SHOPEE_APP_ID: appId,
      SHOPEE_AFFILIATE_API: apiUrl,
      USE_MOCK_DATA: useMock ? "true" : "false",
      LLM_PROVIDER: provider,
      LLM_MODEL: llmModel,
      META_AD_ACCOUNT_ID: metaAdAccount,
      META_PIXEL_ID: metaPixel,
      META_CAPI_TEST_CODE: metaCapiTestCode,
      META_PAGE_ID: metaPage,
      META_INSTAGRAM_ID: metaIg,
      META_API_VERSION: metaApiVersion
    };
    // Só envia secrets se foram tocados (ou são novos)
    if (partnerKeyTouched) body.SHOPEE_PARTNER_KEY = partnerKey;
    if (llmKeyTouched) body.LLM_API_KEY = llmKey;
    if (metaTokenTouched) body.META_ACCESS_TOKEN = metaToken;
    if (metaCapiTokenTouched) body.META_CAPI_TOKEN = metaCapiToken;
    if (whatsappVerifyTokenTouched) body.WHATSAPP_WEBHOOK_VERIFY_TOKEN = whatsappVerifyToken;
    if (whatsappAppSecretTouched) body.WHATSAPP_APP_SECRET = whatsappAppSecret;

    try {
      const r = await fetch("/api/configuracoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const d = await r.json();
      if (d.ok) {
        setMensagem({ secao: "geral", tipo: "ok", texto: "Configurações salvas." });
        setStatus(d.status);
        setPartnerKeyTouched(false);
        setLlmKeyTouched(false);
        setMetaTokenTouched(false);
        setMetaCapiTokenTouched(false);
        setWhatsappVerifyTokenTouched(false);
        setWhatsappAppSecretTouched(false);
        startTransition(() => router.refresh());
      } else {
        setMensagem({ secao: "geral", tipo: "erro", texto: d.erro || "Erro ao salvar" });
      }
    } catch (e) {
      setMensagem({ secao: "geral", tipo: "erro", texto: (e as Error).message });
    } finally {
      setSalvando(false);
      setTimeout(() => setMensagem(null), 6000);
    }
  }

  async function testar(tipo: "shopee" | "llm" | "meta") {
    setTestando(tipo);
    setMensagem(null);
    try {
      // Salva primeiro pra garantir que o teste use o valor atual
      await salvar();
      const r = await fetch("/api/configuracoes/testar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo })
      });
      const d = await r.json();
      setMensagem({
        secao: tipo,
        tipo: d.ok ? "ok" : "erro",
        texto: d.mensagem || (d.ok ? "Conectado!" : "Falha na conexão")
      });
      if (tipo === "meta" && d.ok) {
        setTokenInfo({
          user: d.user?.name,
          expiraEmHoras: d.token?.expiraEmHoras ?? null,
          valido: d.token?.valido !== false,
          vitalicio: d.token?.vitalicio === true
        });
        // Auto-preenche AD_ACCOUNT_ID se vazio e o user só tem 1 conta ativa
        if (!metaAdAccount && d.adAccounts?.length) {
          const ativa = d.adAccounts.find((a: { account_status: number }) => a.account_status === 1) || d.adAccounts[0];
          setMetaAdAccount(ativa.id);
        }
      }
    } catch (e) {
      setMensagem({ secao: tipo, tipo: "erro", texto: (e as Error).message });
    } finally {
      setTestando(null);
      setTimeout(() => setMensagem(null), 12000);
    }
  }

  function handlePartnerKeyChange(v: string) {
    setPartnerKey(v);
    setPartnerKeyTouched(true);
  }
  function handleLlmKeyChange(v: string) {
    setLlmKey(v);
    setLlmKeyTouched(true);
  }
  function limparPartnerKey() {
    setPartnerKey("");
    setPartnerKeyTouched(true);
  }
  function limparLlmKey() {
    setLlmKey("");
    setLlmKeyTouched(true);
  }

  function selecionarProvider(p: string) {
    setProvider(p);
    const padrao = PROVIDERS.find((x) => x.id === p)?.modeloPadrao || "";
    setLlmModel(padrao);
  }

  return (
    <div className="space-y-6">
      <div className="glass flex items-start gap-3 rounded-2xl border-amber-500/20 bg-amber-500/5 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <div className="text-xs leading-relaxed text-amber-200/90">
          <strong>Importante:</strong> as chaves ficam salvas no SQLite local em <code className="rounded bg-black/30 px-1">data/garimpeiro.db</code>.
          Não compartilhe esse arquivo. As chaves do <code>.env.local</code> servem como fallback se você não preencher aqui.
        </div>
      </div>

      {/* SHOPEE */}
      <Secao
        titulo="Shopee Open Platform"
        descricao="Affiliate API. Pegue suas chaves em open.shopee.com"
        icon={ShoppingBag}
        cor="shopee"
        status={status.shopee}
      >
        <Campo label="AppID">
          <input
            type="text"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            placeholder="ex: 18188280004"
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-mono outline-none focus:border-shopee/50"
          />
        </Campo>

        <Campo label="Partner Key (secreto)">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                type={mostrarPartnerKey ? "text" : "password"}
                value={partnerKey}
                onChange={(e) => handlePartnerKeyChange(e.target.value)}
                placeholder={configsIniciais.SHOPEE_PARTNER_KEY?.mascarado && configsIniciais.SHOPEE_PARTNER_KEY?.valor ? "Já configurado · clique pra alterar" : "ex: JFT2L...XNRL7"}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 pl-9 text-sm font-mono outline-none focus:border-shopee/50"
              />
            </div>
            <button
              type="button"
              onClick={() => setMostrarPartnerKey(!mostrarPartnerKey)}
              className="flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 hover:bg-white/10"
              title="Mostrar/ocultar"
            >
              {mostrarPartnerKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            {partnerKey && (
              <button
                type="button"
                onClick={limparPartnerKey}
                className="flex items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 text-rose-300 hover:bg-rose-500/20"
                title="Limpar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </Campo>

        <Campo label="API URL (deixe padrão se não souber)">
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-xs font-mono outline-none focus:border-shopee/50"
          />
        </Campo>

        <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3">
          <div>
            <div className="text-sm font-semibold">Modo demonstração (mock)</div>
            <div className="text-xs text-zinc-500">Usa dados fictícios em vez da API real. Útil pra testar sem consumir cota.</div>
          </div>
          <Toggle ativo={useMock} onClick={() => setUseMock(!useMock)} />
        </div>

        {mensagem?.secao === "shopee" && <Banner tipo={mensagem.tipo} texto={mensagem.texto} />}

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => testar("shopee")}
            disabled={testando !== null || !appId || (!partnerKey && !configsIniciais.SHOPEE_PARTNER_KEY?.valor)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-shopee/30 bg-shopee/10 px-4 py-2.5 text-sm font-bold text-shopee transition-all hover:bg-shopee/20 disabled:opacity-50"
          >
            {testando === "shopee" ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
            Testar conexão Shopee
          </button>
        </div>
      </Secao>

      {/* META ADS */}
      <Secao
        titulo="Meta Ads (Facebook / Instagram)"
        descricao="Marketing API pra puxar gasto, cliques e ROAS por anúncio. Tokens curtos expiram em ~2h, gere um Long-Lived (60 dias)."
        icon={Rocket}
        cor="rose"
        status={status.meta || "vazio"}
      >
        <Campo label="Access Token (secreto)">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                type={mostrarMetaToken ? "text" : "password"}
                value={metaToken}
                onChange={(e) => { setMetaToken(e.target.value); setMetaTokenTouched(true); }}
                placeholder={configsIniciais.META_ACCESS_TOKEN?.mascarado && configsIniciais.META_ACCESS_TOKEN?.valor ? "Já configurado · cole novo pra trocar" : "EAAB..."}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 pl-9 text-xs font-mono outline-none focus:border-rose-500/50"
              />
            </div>
            <button
              type="button"
              onClick={() => setMostrarMetaToken(!mostrarMetaToken)}
              className="flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 hover:bg-white/10"
              title="Mostrar/ocultar"
            >
              {mostrarMetaToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            {metaToken && (
              <button
                type="button"
                onClick={() => { setMetaToken(""); setMetaTokenTouched(true); setTokenInfo(null); }}
                className="flex items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 text-rose-300 hover:bg-rose-500/20"
                title="Limpar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-zinc-500">
            <a href="https://developers.facebook.com/tools/accesstoken/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline hover:text-rose-400">
              Pegar/renovar token <ExternalLink className="h-3 w-3" />
            </a>
            <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline hover:text-rose-400">
              Graph Explorer <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </Campo>

        {tokenInfo && (
          <div className={cn(
            "rounded-lg border px-3 py-2 text-[11px]",
            tokenInfo.vitalicio
              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
              : tokenInfo.valido && (tokenInfo.expiraEmHoras ?? 0) > 24
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : tokenInfo.valido && (tokenInfo.expiraEmHoras ?? 0) > 0
              ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
              : "border-rose-500/30 bg-rose-500/10 text-rose-200"
          )}>
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <strong>Status do token:</strong>
              {tokenInfo.user && <span>conectado como <strong>{tokenInfo.user}</strong></span>}
              {tokenInfo.vitalicio ? (
                <span>· <strong>token vitalício</strong> 🟢 nunca expira</span>
              ) : tokenInfo.expiraEmHoras !== null && tokenInfo.expiraEmHoras !== undefined ? (
                <span>· expira em <strong>{tokenInfo.expiraEmHoras < 24 ? `${tokenInfo.expiraEmHoras}h` : `${Math.floor(tokenInfo.expiraEmHoras / 24)} dia(s)`}</strong></span>
              ) : null}
            </div>
            {!tokenInfo.vitalicio && (tokenInfo.expiraEmHoras ?? 0) < 24 && (
              <div className="mt-1">⚠️ Token vai expirar em breve. Gere um Long-Lived Token (60 dias) no Graph Explorer.</div>
            )}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Ad Account ID (act_XXXX)">
            <input
              type="text"
              value={metaAdAccount}
              onChange={(e) => setMetaAdAccount(e.target.value)}
              placeholder="act_1233477782300312"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-xs font-mono outline-none focus:border-rose-500/50"
            />
          </Campo>
          <Campo label="Pixel ID">
            <input
              type="text"
              value={metaPixel}
              onChange={(e) => setMetaPixel(e.target.value)}
              placeholder="812676358230729"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-xs font-mono outline-none focus:border-rose-500/50"
            />
          </Campo>
          <Campo label="Page ID (Facebook)">
            <input
              type="text"
              value={metaPage}
              onChange={(e) => setMetaPage(e.target.value)}
              placeholder="1090331007502334"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-xs font-mono outline-none focus:border-rose-500/50"
            />
          </Campo>
          <Campo label="Instagram ID">
            <input
              type="text"
              value={metaIg}
              onChange={(e) => setMetaIg(e.target.value)}
              placeholder="17841426452640536"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-xs font-mono outline-none focus:border-rose-500/50"
            />
          </Campo>
        </div>

        <Campo label="API Version">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {[
              { v: "v25.0", label: "v25.0", tag: "ATUAL" },
              { v: "v24.0", label: "v24.0", tag: "ESTÁVEL" },
              { v: "v23.0", label: "v23.0", tag: "ESTÁVEL" },
              { v: "v22.0", label: "v22.0", tag: "LEGACY" },
              { v: "v21.0", label: "v21.0", tag: "LEGACY" }
            ].map((o) => {
              const ativo = metaApiVersion === o.v;
              return (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setMetaApiVersion(o.v)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-lg border p-2 transition-all",
                    ativo ? "border-rose-500/50 bg-rose-500/15" : "border-white/10 bg-white/5 hover:bg-white/10"
                  )}
                >
                  <span className="font-mono text-sm font-bold text-zinc-100">{o.label}</span>
                  <span className={cn(
                    "rounded-md px-1 py-0.5 text-[8px] font-black uppercase",
                    o.tag === "ATUAL" ? "bg-emerald-500/15 text-emerald-300"
                      : o.tag === "ESTÁVEL" ? "bg-blue-500/15 text-blue-300"
                      : "bg-zinc-500/15 text-zinc-400"
                  )}>
                    {o.tag}
                  </span>
                </button>
              );
            })}
          </div>
        </Campo>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-emerald-300">
            <Lock className="h-4 w-4" /> Pixel + Conversions API para grupos WhatsApp
          </div>
          <p className="mb-4 text-[11px] leading-relaxed text-zinc-400">
            O navegador e o servidor enviam o mesmo <code className="rounded bg-black/30 px-1">eventID</code>, evitando os eventos duplicados vistos no Pixel Helper.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Token da Conversions API (secreto)">
              <input
                type="password"
                value={metaCapiToken}
                onChange={(e) => { setMetaCapiToken(e.target.value); setMetaCapiTokenTouched(true); }}
                placeholder={configsIniciais.META_CAPI_TOKEN?.valor ? "Já configurado · cole para trocar" : "Token do conjunto de dados"}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-xs font-mono outline-none focus:border-emerald-500/50"
              />
            </Campo>
            <Campo label="Código de evento de teste (opcional)">
              <input
                type="text"
                value={metaCapiTestCode}
                onChange={(e) => setMetaCapiTestCode(e.target.value)}
                placeholder="TEST12345"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-xs font-mono outline-none focus:border-emerald-500/50"
              />
            </Campo>
            <Campo label="Token de verificação do webhook">
              <input
                type="password"
                value={whatsappVerifyToken}
                onChange={(e) => { setWhatsappVerifyToken(e.target.value); setWhatsappVerifyTokenTouched(true); }}
                placeholder={configsIniciais.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.valor ? "Já configurado · cole para trocar" : "Crie uma frase secreta forte"}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-xs font-mono outline-none focus:border-emerald-500/50"
              />
            </Campo>
            <Campo label="Meta App Secret (webhook)">
              <input
                type="password"
                value={whatsappAppSecret}
                onChange={(e) => { setWhatsappAppSecret(e.target.value); setWhatsappAppSecretTouched(true); }}
                placeholder={configsIniciais.WHATSAPP_APP_SECRET?.valor ? "Já configurado · cole para trocar" : "App Secret do aplicativo Meta"}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-xs font-mono outline-none focus:border-emerald-500/50"
              />
            </Campo>
          </div>
        </div>

        {mensagem?.secao === "meta" && <Banner tipo={mensagem.tipo} texto={mensagem.texto} />}

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => testar("meta")}
            disabled={testando !== null || (!metaToken && !configsIniciais.META_ACCESS_TOKEN?.valor)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-bold text-rose-300 transition-all hover:bg-rose-500/20 disabled:opacity-50"
          >
            {testando === "meta" ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
            Testar conexão Meta + verificar expiração
          </button>
        </div>
      </Secao>

      {/* LLM */}
      <Secao
        titulo="LLM (IA pra roteiros)"
        descricao="Escolha um provider. Sem IA, o sistema usa templates locais (funciona, mas roteiros menos personalizados)."
        icon={Sparkles}
        cor="indigo"
        status={status.llm}
      >
        <Campo label="Provider">
          <div className="grid grid-cols-2 gap-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => selecionarProvider(p.id)}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-all",
                  provider === p.id
                    ? "border-indigo-500/50 bg-indigo-500/15"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                )}
              >
                <span className="text-sm font-semibold">{p.nome}</span>
                {p.modeloPadrao && <span className="text-[10px] font-mono text-zinc-500">{p.modeloPadrao}</span>}
              </button>
            ))}
          </div>
        </Campo>

        {provider !== "nenhum" && (
          <>
            <Campo label="API Key">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                  <input
                    type={mostrarLlmKey ? "text" : "password"}
                    value={llmKey}
                    onChange={(e) => handleLlmKeyChange(e.target.value)}
                    placeholder={
                      provider === "openai" ? "sk-..." :
                      provider === "anthropic" ? "sk-ant-..." :
                      provider === "gemini" ? "AIza..." : ""
                    }
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 pl-9 text-sm font-mono outline-none focus:border-indigo-500/50"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarLlmKey(!mostrarLlmKey)}
                  className="flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 hover:bg-white/10"
                >
                  {mostrarLlmKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                {llmKey && (
                  <button
                    type="button"
                    onClick={limparLlmKey}
                    className="flex items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 text-rose-300 hover:bg-rose-500/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="mt-1.5 text-[11px] text-zinc-500">
                {provider === "openai" && <>Pegue em platform.openai.com/api-keys</>}
                {provider === "anthropic" && <>Pegue em console.anthropic.com/settings/keys</>}
                {provider === "gemini" && <>Pegue em aistudio.google.com/app/apikey</>}
              </div>
            </Campo>

            <Campo label="Modelo">
              <div className="grid gap-2 sm:grid-cols-2">
                {(MODELOS_POR_PROVIDER[provider] || []).map((m) => {
                  const ativo = llmModel === m.id || (!llmModel && m.id === PROVIDERS.find((p) => p.id === provider)?.modeloPadrao);
                  const tag = m.tag ? TAG_STYLES[m.tag] : null;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setLlmModel(m.id)}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all",
                        ativo
                          ? "border-indigo-500/50 bg-indigo-500/15"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      )}
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="text-sm font-bold text-zinc-100">{m.nome}</span>
                        {tag && (
                          <span className={cn("rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider", tag.bg, tag.text)}>
                            {tag.label}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500">{m.descricao}</span>
                      <span className="font-mono text-[9px] text-zinc-600">{m.id}</span>
                    </button>
                  );
                })}
              </div>
              {(MODELOS_POR_PROVIDER[provider] || []).length === 0 && (
                <p className="text-xs text-zinc-500">Selecione um provider acima pra ver os modelos disponíveis.</p>
              )}
            </Campo>

            {mensagem?.secao === "llm" && <Banner tipo={mensagem.tipo} texto={mensagem.texto} />}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => testar("llm")}
                disabled={testando !== null || !provider || provider === "nenhum" || (!llmKey && !configsIniciais.LLM_API_KEY?.valor)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5 text-sm font-bold text-indigo-300 transition-all hover:bg-indigo-500/20 disabled:opacity-50"
              >
                {testando === "llm" ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                Testar LLM
              </button>
            </div>
          </>
        )}
      </Secao>

      {/* SAVE BAR */}
      <div className="sticky bottom-4 z-30">
        <div className="glass flex items-center justify-between gap-4 rounded-2xl p-4 shadow-2xl shadow-black/40">
          {mensagem?.secao === "geral" ? (
            <Banner tipo={mensagem.tipo} texto={mensagem.texto} />
          ) : (
            <div className="text-xs text-zinc-400">As alterações não são salvas até você clicar em "Salvar".</div>
          )}
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-2 rounded-xl shopee-gradient px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-shopee/30 transition-all hover:shadow-shopee/50 disabled:opacity-70"
          >
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {salvando ? "Salvando..." : "Salvar tudo"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Secao({
  titulo, descricao, icon: Icon, cor, status, children
}: {
  titulo: string;
  descricao: string;
  icon: typeof ShoppingBag;
  cor: "shopee" | "indigo" | "rose";
  status: "ok" | "incompleto" | "vazio";
  children: React.ReactNode;
}) {
  const corMap = {
    shopee: "bg-shopee/10 text-shopee ring-shopee/20",
    indigo: "bg-indigo-500/10 text-indigo-400 ring-indigo-500/20",
    rose: "bg-rose-500/10 text-rose-400 ring-rose-500/20"
  };
  const statusMap = {
    ok: { cor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300", label: "Configurado" },
    incompleto: { cor: "border-amber-500/30 bg-amber-500/10 text-amber-300", label: "Incompleto" },
    vazio: { cor: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400", label: "Vazio" }
  };
  const s = statusMap[status];

  return (
    <div className="glass space-y-4 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl ring-1", corMap[cor])}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold">{titulo}</h2>
            <p className="text-xs text-zinc-400">{descricao}</p>
          </div>
        </div>
        <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-bold", s.cor)}>
          {s.label}
        </span>
      </div>
      {children}
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ ativo, onClick }: { ativo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
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
    </button>
  );
}

function Banner({ tipo, texto }: { tipo: "ok" | "erro"; texto: string }) {
  return (
    <div className={cn(
      "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium animate-fade-in",
      tipo === "ok" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"
    )}>
      {tipo === "ok" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
      <span>{texto}</span>
    </div>
  );
}
