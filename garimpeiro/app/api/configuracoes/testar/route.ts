import { NextResponse } from "next/server";
import crypto from "crypto";
import { lerConfig, type LLMProvider } from "@/lib/configs";
import { testarLLM } from "@/lib/ai";
import { lerJson, validarMesmaOrigem } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const origem = validarMesmaOrigem(req);
  if (origem) return origem;
  const json = await lerJson<{ tipo?: string }>(req);
  if (!json.ok) return json.resposta;
  const body = json.valor;
  if (!body.tipo || !["shopee", "llm", "meta"].includes(body.tipo)) {
    return NextResponse.json({ ok: false, mensagem: "Tipo de teste inválido." }, { status: 400 });
  }

  if (body.tipo === "shopee") {
    const appId = lerConfig("SHOPEE_APP_ID");
    const partnerKey = lerConfig("SHOPEE_PARTNER_KEY");
    const apiUrl = lerConfig("SHOPEE_AFFILIATE_API") || "https://open-api.affiliate.shopee.com.br/graphql";

    if (!appId || !partnerKey) {
      return NextResponse.json({ ok: false, mensagem: "AppID ou Partner Key vazios" });
    }

    const query = `query { productOfferV2(keyword:"shopee",limit:1){ nodes{itemId} } }`;
    const payload = JSON.stringify({ query });
    const ts = Math.floor(Date.now() / 1000);
    const sig = crypto.createHash("sha256").update(`${appId}${ts}${payload}${partnerKey}`).digest("hex");

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `SHA256 Credential=${appId}, Timestamp=${ts}, Signature=${sig}`
        },
        body: payload,
        signal: AbortSignal.timeout(20_000)
      });
      const data = await res.json() as { errors?: Array<{ message: string }>; data?: unknown };
      if (data.errors?.length) {
        return NextResponse.json({
          ok: false,
          mensagem: data.errors[0].message,
          detalhe: "Verifique AppID e Partner Key"
        });
      }
      if (res.ok && data.data) {
        return NextResponse.json({ ok: true, mensagem: "Conectado! API Shopee respondendo." });
      }
      return NextResponse.json({ ok: false, mensagem: `Status ${res.status}` });
    } catch (e) {
      return NextResponse.json({ ok: false, mensagem: (e as Error).message });
    }
  }

  if (body.tipo === "llm") {
    const provider = lerConfig("LLM_PROVIDER") as LLMProvider;
    const apiKey = lerConfig("LLM_API_KEY");
    const modelo = lerConfig("LLM_MODEL");

    if (!provider || provider === "nenhum") {
      return NextResponse.json({ ok: false, mensagem: "Selecione um provider" });
    }
    if (!apiKey) {
      return NextResponse.json({ ok: false, mensagem: "API key vazia" });
    }

    const r = await testarLLM(provider, apiKey, modelo);
    return NextResponse.json(r);
  }

  if (body.tipo === "meta") {
    const token = lerConfig("META_ACCESS_TOKEN");
    const apiVer = lerConfig("META_API_VERSION") || "v23.0";
    if (!token) {
      return NextResponse.json({ ok: false, mensagem: "META_ACCESS_TOKEN vazio" });
    }
    try {
      // 1. Valida token via /me
      const meRes = await fetch(`https://graph.facebook.com/${apiVer}/me?fields=id,name&access_token=${token}`, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
      const me = await meRes.json() as { id?: string; name?: string; error?: { message: string; code?: number } };
      if (me.error) {
        const expired = (me.error.message || "").toLowerCase().includes("expired");
        return NextResponse.json({
          ok: false,
          mensagem: me.error.message,
          dica: expired ? "Token EXPIRADO. Gere novo em developers.facebook.com/tools/accesstoken/" : "Token invalido ou sem permissoes"
        });
      }

      // 2. Lista ad accounts pra confirmar permissao ads_read
      const accountsRes = await fetch(`https://graph.facebook.com/${apiVer}/me/adaccounts?fields=id,name,account_status,currency,balance&limit=10&access_token=${token}`, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
      const accounts = await accountsRes.json() as { data?: Array<{ id: string; name: string; account_status: number; currency: string; balance?: string }>; error?: { message: string } };
      if (accounts.error) {
        return NextResponse.json({ ok: false, mensagem: accounts.error.message, dica: "Falta permissao ads_read no token" });
      }

      // 3. Validar expiracao via /debug_token
      const debugRes = await fetch(`https://graph.facebook.com/${apiVer}/debug_token?input_token=${token}&access_token=${token}`, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
      const debug = await debugRes.json() as { data?: { is_valid?: boolean; expires_at?: number; data_access_expires_at?: number; scopes?: string[] } };
      const expiresAt = debug.data?.expires_at;
      const vitalicio = expiresAt === 0;
      const expiresIn = expiresAt && expiresAt > 0 ? Math.max(0, expiresAt - Math.floor(Date.now() / 1000)) : null;
      const expiresInHours = expiresIn !== null ? Math.floor(expiresIn / 3600) : null;

      const totalAccounts = accounts.data?.length || 0;
      const acsAtivas = accounts.data?.filter((a) => a.account_status === 1).length || 0;
      const sufixoExp = vitalicio
        ? " · token vitalício 🟢"
        : expiresInHours !== null
        ? ` · token expira em ~${expiresInHours}h`
        : "";
      return NextResponse.json({
        ok: true,
        mensagem: `Conectado como ${me.name} · ${totalAccounts} conta(s) de anúncio · ${acsAtivas} ativa(s)${sufixoExp}`,
        user: me,
        adAccounts: accounts.data || [],
        token: {
          valido: debug.data?.is_valid !== false,
          vitalicio,
          expiraEm: expiresAt || null,
          expiraEmHoras: expiresInHours,
          scopes: debug.data?.scopes || []
        }
      });
    } catch (e) {
      return NextResponse.json({ ok: false, mensagem: (e as Error).message });
    }
  }

  return NextResponse.json({ erro: "tipo invalido" }, { status: 400 });
}
