import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "garimpeiro.db");

let _db: Database.Database | null = null;

function db(): Database.Database {
  if (_db) return _db;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const database = new Database(DB_PATH);
  database.pragma("journal_mode = WAL");
  database.pragma("busy_timeout = 5000");
  database.pragma("synchronous = NORMAL");
  database.exec(`CREATE TABLE IF NOT EXISTS configs (chave TEXT PRIMARY KEY, valor TEXT NOT NULL);`);
  _db = database;
  return database;
}

export const CHAVES_CONFIG = [
  "SHOPEE_APP_ID", "SHOPEE_PARTNER_KEY", "SHOPEE_AFFILIATE_API",
  "USE_MOCK_DATA", "LLM_PROVIDER", "LLM_API_KEY", "LLM_MODEL", "CRON_SECRET",
  "META_ACCESS_TOKEN", "META_AD_ACCOUNT_ID", "META_PIXEL_ID", "META_CAPI_TOKEN",
  "META_CAPI_TEST_CODE", "META_PAGE_ID", "META_INSTAGRAM_ID", "META_BUSINESS_ID",
  "META_API_VERSION", "WHATSAPP_WEBHOOK_VERIFY_TOKEN", "WHATSAPP_APP_SECRET",
  "EVOLUTION_API_URL", "EVOLUTION_API_KEY", "EVOLUTION_INSTANCE_NAME",
  "WHATSAPP_CLOUD_TOKEN", "WHATSAPP_CLOUD_PHONE_NUMBER_ID", "WHATSAPP_CLOUD_TEMPLATE", "WHATSAPP_CLOUD_TEMPLATE_LANGUAGE"
] as const;

export type ChaveConfig = (typeof CHAVES_CONFIG)[number];

export type LLMProvider = "openai" | "anthropic" | "gemini" | "nenhum";

export const MODELOS_PADRAO: Record<LLMProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-haiku-4-5-20251001",
  gemini: "gemini-2.5-flash",
  nenhum: ""
};

// Le config: prioridade DB > env. Retorna string vazia se nao encontrar.
export function lerConfig(chave: ChaveConfig): string {
  try {
    const row = db().prepare("SELECT valor FROM configs WHERE chave = ?").get(chave) as { valor: string } | undefined;
    if (row?.valor) return row.valor;
  } catch {}
  const env = process.env[chave];
  return env || "";
}

export function escreverConfig(chave: ChaveConfig, valor: string) {
  if (valor) {
    db().prepare(`
      INSERT INTO configs (chave, valor) VALUES (?, ?)
      ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor
    `).run(chave, valor);
  } else {
    db().prepare("DELETE FROM configs WHERE chave = ?").run(chave);
  }
}

export function listarConfigs(): Record<ChaveConfig, string> {
  const r: Partial<Record<ChaveConfig, string>> = {};
  for (const k of CHAVES_CONFIG) r[k] = lerConfig(k);
  return r as Record<ChaveConfig, string>;
}

export function mascarar(valor: string): string {
  if (!valor) return "";
  if (valor.length <= 6) return "***";
  return valor.slice(0, 4) + "•".repeat(Math.min(8, valor.length - 8)) + valor.slice(-4);
}

export function statusShopee(): "ok" | "incompleto" | "vazio" {
  const id = lerConfig("SHOPEE_APP_ID");
  const key = lerConfig("SHOPEE_PARTNER_KEY");
  if (!id && !key) return "vazio";
  if (id && key) return "ok";
  return "incompleto";
}

export function statusLLM(): "ok" | "vazio" {
  const provider = lerConfig("LLM_PROVIDER");
  const key = lerConfig("LLM_API_KEY");
  if (provider && provider !== "nenhum" && key) return "ok";
  return "vazio";
}

export function statusMeta(): "ok" | "incompleto" | "vazio" {
  const tok = lerConfig("META_ACCESS_TOKEN");
  if (!tok) return "vazio";
  return "ok";
}

export function modoMockAtivo(): boolean {
  return lerConfig("USE_MOCK_DATA") === "true";
}
