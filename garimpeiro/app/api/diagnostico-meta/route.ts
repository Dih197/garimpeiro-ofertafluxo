import { NextResponse } from "next/server";
import { lerConfig } from "@/lib/configs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const baseMeta = () => `https://graph.facebook.com/${lerConfig("META_API_VERSION") || "v23.0"}`;

async function chamarMeta<T>(endpoint: string, token: string): Promise<T | { error: string }> {
  try {
    const url = `${baseMeta()}${endpoint}${endpoint.includes("?") ? "&" : "?"}access_token=${token}`;
    const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
    const data = await r.json();
    if (!r.ok || data.error) {
      return { error: data.error?.message || `HTTP ${r.status}` };
    }
    return data as T;
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function GET() {
  const token = lerConfig("META_ACCESS_TOKEN");
  const adAccountId = lerConfig("META_AD_ACCOUNT_ID");

  if (!token) {
    return NextResponse.json({ ok: false, erro: "META_ACCESS_TOKEN nao configurado em .env.local" });
  }

  // 1. Token info: GET /me
  const me = await chamarMeta<{ id: string; name: string }>("/me?fields=id,name", token);
  if ("error" in me) {
    return NextResponse.json({
      ok: false,
      etapa: "token-invalido",
      erro: me.error,
      diagnostico: "Token Meta invalido, expirado ou sem permissoes basicas. Gere novo em developers.facebook.com/tools/accesstoken/"
    });
  }

  // 2. Token permissions
  const perms = await chamarMeta<{ data: Array<{ permission: string; status: string }> }>("/me/permissions", token);
  const permissoesAtivas = "error" in perms ? [] : perms.data.filter((p) => p.status === "granted").map((p) => p.permission);

  // 3. Lista paginas que o user tem
  const paginas = await chamarMeta<{ data: Array<{ id: string; name: string; category: string; access_token?: string; instagram_business_account?: { id: string; username?: string } }> }>(
    "/me/accounts?fields=id,name,category,access_token,instagram_business_account{id,username}",
    token
  );

  // 4. Ad accounts
  const adAccounts = await chamarMeta<{ data: Array<{ id: string; name: string; account_status: number; currency: string; balance?: string }> }>(
    "/me/adaccounts?fields=id,name,account_status,currency,balance",
    token
  );

  // 5. Tenta acessar a Ad Account configurada
  let adAccountInfo: unknown = null;
  if (adAccountId) {
    adAccountInfo = await chamarMeta(`/${adAccountId}?fields=id,name,account_status,currency,balance,business{id,name}`, token);
  }

  // 6. Business Managers
  const businesses = await chamarMeta<{ data: Array<{ id: string; name: string }> }>(
    "/me/businesses?fields=id,name",
    token
  );

  // ===== Detecta se "achadinhos_pro_ofertas" existe =====
  const NOME_BUSCADO = "achadinhos_pro_ofertas";
  const paginasArr = "error" in paginas ? [] : paginas.data;
  const paginaJaExiste = paginasArr.find((p) =>
    p.name.toLowerCase().replace(/\s+/g, "_") === NOME_BUSCADO ||
    p.name.toLowerCase().includes("achadinhos")
  );
  const igVinculados = paginasArr
    .filter((p) => p.instagram_business_account)
    .map((p) => ({ paginaNome: p.name, igId: p.instagram_business_account!.id, igUsername: p.instagram_business_account!.username }));
  const igJaExiste = igVinculados.find((i) => i.igUsername?.toLowerCase().includes("achadinhos"));

  return NextResponse.json({
    ok: true,
    user: {
      id: me.id,
      nome: me.name
    },
    permissoes: {
      ativas: permissoesAtivas,
      tem_pages_management: permissoesAtivas.includes("pages_show_list") || permissoesAtivas.includes("pages_manage_metadata"),
      tem_ads_management: permissoesAtivas.includes("ads_management") || permissoesAtivas.includes("ads_read"),
      tem_instagram_basic: permissoesAtivas.includes("instagram_basic"),
      tem_business_management: permissoesAtivas.includes("business_management")
    },
    paginas: {
      total: paginasArr.length,
      lista: paginasArr.map((p) => ({ id: p.id, nome: p.name, categoria: p.category, tem_ig: !!p.instagram_business_account, ig_username: p.instagram_business_account?.username })),
      achadinhos_existe: !!paginaJaExiste,
      pagina_achadinhos: paginaJaExiste ? { id: paginaJaExiste.id, nome: paginaJaExiste.name } : null
    },
    instagram: {
      total_vinculados: igVinculados.length,
      lista: igVinculados,
      achadinhos_existe: !!igJaExiste,
      ig_achadinhos: igJaExiste || null
    },
    ad_accounts: {
      total: "error" in adAccounts ? 0 : adAccounts.data.length,
      lista: "error" in adAccounts ? [] : adAccounts.data,
      configurada: adAccountId,
      configurada_acessivel: adAccountInfo && !("error" in (adAccountInfo as object)),
      configurada_info: adAccountInfo
    },
    businesses: "error" in businesses ? [] : businesses.data,
    proximos_passos: {
      criar_pagina: !paginaJaExiste
        ? "VOCÊ precisa criar a pagina manualmente em https://www.facebook.com/pages/create — escolha categoria 'Compras e varejo' e nome 'Achadinhos Pro Ofertas'. NÃO existe API pra criar página."
        : `✅ Pagina ja existe (id ${paginaJaExiste.id})`,
      criar_instagram: !igJaExiste
        ? "VOCÊ precisa criar a conta Instagram manualmente no app. Depois converta pra Business e vincule à pagina Facebook em facebook.com/business/instagram"
        : `✅ Instagram ja vinculado (@${igJaExiste.igUsername})`,
      vincular_shopee: "MANUAL: vai no app Shopee Afiliado > Conta > Vinculação Redes Sociais > conecta a página Facebook + IG. Não tem API."
    }
  });
}
