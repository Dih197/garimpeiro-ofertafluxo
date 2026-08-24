/** Câmbio automático com cache diário — AwesomeAPI (gratuita, sem key). */
import { lerConfig, escreverConfig } from "./configs";

const BASE = "https://economia.awesomeapi.com.br";

export type MoedaMeta = "BRL" | "USD" | "EUR" | string;

export type InfoMoeda = {
  moeda: MoedaMeta;
  cotacao: number;
  dataCotacao: string;
  impostoMeta: number;
  label: string;
};

const CHAVE_COTACAO = (moeda: string) => `COTACAO_${moeda.toUpperCase()}_BRL`;
const CHAVE_DATA = (moeda: string) => `COTACAO_DATA_${moeda.toUpperCase()}_BRL`;
const CHAVE_MOEDA_CONTA = "MOEDA_CONTA_META";
const CHAVE_IMPOSTO_META = "IMPOSTO_META_PCT";

export async function buscarCotacao(moeda: MoedaMeta): Promise<number | null> {
  if (moeda === "BRL") return 1;
  const hoje = new Date().toISOString().slice(0, 10);
  const dataCache = lerConfig(CHAVE_DATA(moeda) as any);
  if (dataCache === hoje) {
    const cache = parseFloat(lerConfig(CHAVE_COTACAO(moeda) as any));
    if (cache > 0) return cache;
  }
  try {
    const normalizado = moeda.toUpperCase();
    const r = await fetch(`${BASE}/json/last/${normalizado}-BRL`, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (!r.ok) return null;
    const data = (await r.json()) as Record<string, { bid: string }>;
    const key = `${normalizado}BRL`;
    const rate = parseFloat(data[key]?.bid || "0");
    if (rate > 0) {
      escreverConfig(CHAVE_COTACAO(moeda) as any, String(rate));
      escreverConfig(CHAVE_DATA(moeda) as any, hoje);
      return rate;
    }
    return null;
  } catch {
    const stale = parseFloat(lerConfig(CHAVE_COTACAO(moeda) as any));
    return stale > 0 ? stale : null;
  }
}

/** Resolve moeda da conta Meta, cotação e imposto. Cache de 24h da moeda detectada. */
export async function resolverInfoMoeda(adAccountId: string): Promise<InfoMoeda> {
  const token = lerConfig("META_ACCESS_TOKEN");
  const apiVersion = lerConfig("META_API_VERSION") || "v25.0";
  const moeda = await detectarMoedaConta(adAccountId, token, apiVersion);
  const cotacao = moeda === "BRL" ? 1 : (await buscarCotacao(moeda)) || 1;
  const impostoMeta = moeda === "BRL" ? 0.13 : 0;
  const dataCotacao = lerConfig(CHAVE_DATA(moeda) as any) || new Date().toISOString().slice(0, 10);
  const nomes: Record<string, string> = { BRL: "Real", USD: "Dólar", EUR: "Euro" };
  const label = moeda === "BRL"
    ? "Conta Brasil — imposto 13% incluso"
    : `Conta em ${nomes[moeda] || moeda} — sem imposto BR · cotação R$ ${cotacao.toFixed(2)}`;

  // Cache pra leitura síncrona depois
  escreverConfig(CHAVE_MOEDA_CONTA as any, moeda);
  escreverConfig(CHAVE_IMPOSTO_META as any, String(impostoMeta));

  return { moeda, cotacao, dataCotacao, impostoMeta, label };
}

/** Lê InfoMoeda do cache local (síncrono, pra usar em montarRelatorio). */
export function lerInfoMoeda(): InfoMoeda {
  const moeda = (lerConfig(CHAVE_MOEDA_CONTA as any) || "BRL") as MoedaMeta;
  const impostoMeta = parseFloat(lerConfig(CHAVE_IMPOSTO_META as any) || "0.13");
  const cotacao = moeda === "BRL" ? 1 : parseFloat(lerConfig(CHAVE_COTACAO(moeda) as any)) || 1;
  const dataCotacao = lerConfig(CHAVE_DATA(moeda) as any) || new Date().toISOString().slice(0, 10);
  const nomes: Record<string, string> = { BRL: "Real", USD: "Dólar", EUR: "Euro" };
  const label = moeda === "BRL"
    ? "Conta Brasil — imposto 13% incluso"
    : `Conta em ${nomes[moeda] || moeda} — sem imposto BR · cotação R$ ${cotacao.toFixed(2)}`;

  return { moeda, cotacao, dataCotacao, impostoMeta, label };
}

async function detectarMoedaConta(adAccountId: string, token: string, apiVersion: string): Promise<MoedaMeta> {
  try {
    const url = `https://graph.facebook.com/${apiVersion}/${adAccountId}?fields=currency&access_token=${token}`;
    const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    const data = (await r.json()) as { currency?: string; error?: any };
    if (data.error) return "BRL";
    return (data.currency || "BRL").toUpperCase();
  } catch {
    return "BRL";
  }
}
