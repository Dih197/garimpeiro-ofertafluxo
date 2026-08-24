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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const pageId = url.searchParams.get("page") || lerConfig("META_PAGE_ID");
  const token = lerConfig("META_ACCESS_TOKEN");

  if (!token || !pageId) {
    return NextResponse.json({ erro: "META_ACCESS_TOKEN ou page_id ausente" });
  }

  // Detalhes completos da página
  const pagina = await chamarMeta(
    `/${pageId}?fields=id,name,username,category,about,description,website,fan_count,followers_count,verification_status,link,picture{url},instagram_business_account{id,username,name,profile_picture_url,followers_count}`,
    token
  );

  // Page access token (necessário pra postar)
  const pageToken = await chamarMeta<{ access_token: string }>(`/${pageId}?fields=access_token`, token);

  // Catálogos do Business Manager (necessário pra IG Shopping)
  const businessId = lerConfig("META_BUSINESS_ID");
  const catalogos = businessId
    ? await chamarMeta(`/${businessId}/owned_product_catalogs?fields=id,name,product_count`, token)
    : null;

  return NextResponse.json({
    pagina,
    tem_page_token: !("error" in pageToken),
    catalogos
  });
}
