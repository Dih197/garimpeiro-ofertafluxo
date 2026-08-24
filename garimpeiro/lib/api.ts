import { NextResponse } from "next/server";

type JsonOk<T> = { ok: true; valor: T };
type JsonErro = { ok: false; resposta: NextResponse };

/** Lê JSON com limite de tamanho e devolve erro 400 em vez de explodir a rota. */
export async function lerJson<T>(req: Request, limiteBytes = 64_000): Promise<JsonOk<T> | JsonErro> {
  const tamanho = Number(req.headers.get("content-length") || 0);
  if (Number.isFinite(tamanho) && tamanho > limiteBytes) {
    return {
      ok: false,
      resposta: NextResponse.json({ ok: false, erro: "Requisição muito grande." }, { status: 413 })
    };
  }

  try {
    const texto = await req.text();
    if (!texto.trim()) {
      return {
        ok: false,
        resposta: NextResponse.json({ ok: false, erro: "Corpo JSON obrigatório." }, { status: 400 })
      };
    }
    if (new TextEncoder().encode(texto).byteLength > limiteBytes) {
      return {
        ok: false,
        resposta: NextResponse.json({ ok: false, erro: "Requisição muito grande." }, { status: 413 })
      };
    }
    return { ok: true, valor: JSON.parse(texto) as T };
  } catch {
    return {
      ok: false,
      resposta: NextResponse.json({ ok: false, erro: "JSON inválido." }, { status: 400 })
    };
  }
}

/** Impede páginas de outros sites de dispararem mutações no painel. */
export function validarMesmaOrigem(req: Request): NextResponse | null {
  const origin = req.headers.get("origin");
  if (!origin) return null;
  try {
    const origemUrl = new URL(origin);
    const hostRecebido = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").split(",")[0].trim();
    const mesmaOrigemDaUrl = origemUrl.origin === new URL(req.url).origin;
    const mesmoHostRecebido = Boolean(hostRecebido) && origemUrl.host.toLowerCase() === hostRecebido.toLowerCase();
    if (!mesmaOrigemDaUrl && !mesmoHostRecebido) {
      return NextResponse.json({ ok: false, erro: "Origem não autorizada." }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ ok: false, erro: "Origem inválida." }, { status: 403 });
  }
  return null;
}

export function numeroNoIntervalo(valor: unknown, minimo: number, maximo: number): number | null {
  const numero = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isFinite(numero) || numero < minimo || numero > maximo) return null;
  return numero;
}

export function textoSeguro(valor: unknown, maximo: number): string {
  return typeof valor === "string" ? valor.trim().slice(0, maximo) : "";
}

export function urlHttpsPublica(valor: string): boolean {
  try {
    const url = new URL(valor);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local")) return false;
    if (/^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return false;
    const match172 = host.match(/^172\.(\d+)\./);
    if (match172 && Number(match172[1]) >= 16 && Number(match172[1]) <= 31) return false;
    return true;
  } catch {
    return false;
  }
}

const janelas = new Map<string, { inicio: number; total: number }>();

/** Limitador simples por processo; reduz spam sem armazenar IP bruto. */
export function excedeuLimite(chave: string, limite: number, janelaMs: number): boolean {
  const agora = Date.now();
  const atual = janelas.get(chave);
  if (!atual || agora - atual.inicio >= janelaMs) {
    janelas.set(chave, { inicio: agora, total: 1 });
    return false;
  }
  atual.total += 1;
  return atual.total > limite;
}

export function ipDaRequisicao(req: Request): string {
  return (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "desconhecido")
    .split(",")[0]
    .trim()
    .slice(0, 80);
}
