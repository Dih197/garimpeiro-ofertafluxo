import { NextResponse } from "next/server";
import {
  listarConfigs,
  escreverConfig,
  mascarar,
  statusShopee,
  statusLLM,
  statusMeta,
  CHAVES_CONFIG,
  type ChaveConfig
} from "@/lib/configs";
import { limparMockCache } from "@/lib/mock";
import { lerJson, urlHttpsPublica, validarMesmaOrigem } from "@/lib/api";

export const dynamic = "force-dynamic";

const CHAVES_SECRETAS: ChaveConfig[] = [
  "SHOPEE_PARTNER_KEY", "LLM_API_KEY", "CRON_SECRET", "META_ACCESS_TOKEN",
  "META_CAPI_TOKEN", "WHATSAPP_WEBHOOK_VERIFY_TOKEN", "WHATSAPP_APP_SECRET",
  "EVOLUTION_API_KEY", "WHATSAPP_CLOUD_TOKEN"
];

export async function GET() {
  const todas = listarConfigs();
  // Mascara chaves secretas
  const expostas: Record<string, { valor: string; mascarado: boolean }> = {};
  for (const [k, v] of Object.entries(todas)) {
    if (CHAVES_SECRETAS.includes(k as ChaveConfig)) {
      expostas[k] = { valor: v ? mascarar(v) : "", mascarado: true };
    } else {
      expostas[k] = { valor: v, mascarado: false };
    }
  }
  return NextResponse.json({
    configs: expostas,
    status: {
      shopee: statusShopee(),
      llm: statusLLM(),
      meta: statusMeta()
    }
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const origem = validarMesmaOrigem(req);
  if (origem) return origem;
  const json = await lerJson<Record<string, unknown>>(req, 128_000);
  if (!json.ok) return json.resposta;
  const body = json.valor;
  const permitidas = new Set<string>(CHAVES_CONFIG);
  for (const chave of Object.keys(body)) {
    if (!permitidas.has(chave)) return NextResponse.json({ ok: false, erro: `Configuração não permitida: ${chave}` }, { status: 400 });
  }
  if (body.USE_MOCK_DATA !== undefined && !["true", "false"].includes(String(body.USE_MOCK_DATA))) {
    return NextResponse.json({ ok: false, erro: "USE_MOCK_DATA deve ser true ou false." }, { status: 400 });
  }
  if (body.LLM_PROVIDER !== undefined && !["openai", "anthropic", "gemini", "nenhum", ""].includes(String(body.LLM_PROVIDER))) {
    return NextResponse.json({ ok: false, erro: "Provider de IA inválido." }, { status: 400 });
  }
  if (body.META_API_VERSION && !/^v\d{1,2}\.\d+$/.test(String(body.META_API_VERSION))) {
    return NextResponse.json({ ok: false, erro: "Versão da API Meta inválida." }, { status: 400 });
  }
  if (body.SHOPEE_AFFILIATE_API && !urlHttpsPublica(String(body.SHOPEE_AFFILIATE_API))) {
    return NextResponse.json({ ok: false, erro: "A API Shopee deve ser uma URL HTTPS pública." }, { status: 400 });
  }
  if (body.EVOLUTION_API_URL !== undefined) {
    try {
      const url = new URL(String(body.EVOLUTION_API_URL));
      if (!/^https?:$/.test(url.protocol) || url.username || url.password) throw new Error("invalid");
    } catch {
      return NextResponse.json({ ok: false, erro: "A URL da Evolution API deve usar http:// ou https://." }, { status: 400 });
    }
  }
  let mockToggled = false;
  for (const [chave, valor] of Object.entries(body)) {
    if (typeof valor === "string") {
      // Se for "***" ou mascarado, ignora (usuario nao mudou)
      if (valor.includes("•")) continue;
      if (chave === "USE_MOCK_DATA") mockToggled = true;
      if (valor.length > 20_000) return NextResponse.json({ ok: false, erro: `${chave} excede o limite permitido.` }, { status: 413 });
      escreverConfig(chave as ChaveConfig, valor.trim());
    }
  }
  // Quando user toca em "Modo demonstração", limpa cache do mock pra evitar
  // que dados antigos fiquem em memória contaminando dados reais (e vice-versa).
  if (mockToggled) {
    try { limparMockCache(); } catch {}
  }
  return NextResponse.json({
    ok: true,
    status: {
      shopee: statusShopee(),
      llm: statusLLM(),
      meta: statusMeta()
    }
  });
}
