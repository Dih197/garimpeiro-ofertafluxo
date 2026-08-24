import { NextResponse } from "next/server";
import {
  metaConfigurado,
  resolverAdAccountId,
  listarAdsComCreative,
  buscarInsightsPorAd,
  extrairLinkDoCreative,
  inferirSubIdsDoAdName,
  ultimoErroMeta
} from "@/lib/meta";
import { salvarMetaInsights, listarMetaInsights, type MetaInsightLocal } from "@/lib/db";
import { numeroNoIntervalo, validarMesmaOrigem } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PRESETS_VALIDOS = ["today", "yesterday", "last_3d", "last_7d", "last_14d", "last_30d", "maximum"];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const dias = numeroNoIntervalo(url.searchParams.get("dias") || "30", 1, 730) || 30;
  const cache = url.searchParams.get("cache") !== "false";

  // Se cache solicitado e não vazio, retorna do DB
  if (cache) {
    const local = listarMetaInsights(dias);
    if (local.length > 0) {
      return NextResponse.json({ ok: true, fonte: "cache", insights: local, total: local.length });
    }
  }
  return await sincronizar(dias);
}

export async function POST(req: Request) {
  const origem = validarMesmaOrigem(req);
  if (origem) return origem;
  const url = new URL(req.url);
  const dias = numeroNoIntervalo(url.searchParams.get("dias") || "30", 1, 730) || 30;
  return await sincronizar(dias);
}

async function sincronizar(dias: number) {
  if (!metaConfigurado()) {
    return NextResponse.json({
      ok: false,
      erro: "META_ACCESS_TOKEN nao configurado em .env.local"
    });
  }

  const adAccountId = await resolverAdAccountId();
  if (!adAccountId) {
    return NextResponse.json({
      ok: false,
      erro: "Nao consegui descobrir Ad Account ID. Adicione META_AD_ACCOUNT_ID=act_XXXXX no .env.local"
    });
  }

  const queryArg: string | number = dias === 1 ? "today" : dias === 2 ? "yesterday" : dias;

  // 1. Pega TODOS anúncios da conta com creative
  const ads = await listarAdsComCreative(adAccountId);
  const erroAds = ultimoErroMeta();
  if (ads.length === 0 && erroAds) {
    return NextResponse.json({
      ok: false,
      adAccountId,
      erro: `Falha Meta API: ${erroAds}`,
      dica: erroAds.includes("expired") ? "Token expirou. Gere novo em developers.facebook.com/tools/accesstoken/ e atualize META_ACCESS_TOKEN no .env.local" : "Verifique permissoes ads_read/ads_management"
    });
  }
  const mapaAds = new Map(ads.map((a) => [a.id, a]));

  // 2. Pega insights por ad x dia
  const insights = await buscarInsightsPorAd(adAccountId, queryArg);

  // 3. Mescla insight + ad info + sub_id inferido
  // NÃO filtra insights órfãos — ads arquivados/deletados ainda têm gastos válidos
  const localItems: MetaInsightLocal[] = insights.map((i) => {
    const ad = mapaAds.get(i.ad_id);
    const linkDestino = ad ? extrairLinkDoCreative(ad) : "";
    const { subId1, subId2 } = inferirSubIdsDoAdName(
      ad?.name || i.ad_name || "",
      i.campaign_name,
      i.adset_name
    );
    const outbound = i.outbound_clicks?.find((o) => o.action_type === "outbound_click")?.value || "0";
    return {
      adId: i.ad_id,
      data: i.date_start || new Date().toISOString().slice(0, 10),
      adName: ad?.name || i.ad_name || "",
      adsetId: i.adset_id || "",
      adsetName: i.adset_name || "",
      campaignId: i.campaign_id || "",
      campaignName: i.campaign_name || "",
      spend: parseFloat(i.spend || "0"),
      impressions: parseInt(i.impressions || "0", 10),
      clicks: parseInt(i.clicks || "0", 10),
      inlineLinkClicks: parseInt(i.inline_link_clicks || "0", 10),
      outboundClicks: parseInt(outbound, 10),
      cpc: parseFloat(i.cpc || "0"),
      ctr: parseFloat(i.ctr || "0"),
      cpm: parseFloat(i.cpm || "0"),
      reach: parseInt(i.reach || "0", 10),
      subId1,
      subId2,
      linkDestino,
      status: ad?.effective_status || ad?.status || ""
    };
  });

  salvarMetaInsights(localItems);

  return NextResponse.json({
    ok: true,
    fonte: "live",
    adAccountId,
    sincronizados: localItems.length,
    insights: localItems,
    ads: ads.length,
    total: localItems.length
  });
}
