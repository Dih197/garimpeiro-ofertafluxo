import { NextResponse } from "next/server";
import {
  listarCliquesShopee,
  listarMetricasShopee,
  salvarCliquesShopeeDia,
  salvarMetricasShopeeDia
} from "@/lib/db";
import { lerJson, numeroNoIntervalo, textoSeguro, validarMesmaOrigem } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const dias = numeroNoIntervalo(url.searchParams.get("dias") || "30", 1, 730) || 30;
  const cliques = listarCliquesShopee(dias);
  const metricas = listarMetricasShopee(dias);
  const totalCliques = cliques.reduce((s, c) => s + c.cliques, 0);
  return NextResponse.json({ ok: true, cliques, metricas, totalCliques });
}

export async function POST(req: Request) {
  const bloqueio = validarMesmaOrigem(req);
  if (bloqueio) return bloqueio;
  const json = await lerJson<{
    data?: unknown;
    cliques?: unknown;
    cliquesRedesSociais?: unknown;
    cliquesShopeeVideo?: unknown;
    origem?: unknown;
  }>(req);
  if (!json.ok) return json.resposta;
  const data = textoSeguro(json.valor.data, 10);
  const cliques = numeroNoIntervalo(json.valor.cliques, 0, 100_000_000);
  const cliquesRedesSociais = numeroNoIntervalo(json.valor.cliquesRedesSociais, 0, 100_000_000);
  const cliquesShopeeVideo = numeroNoIntervalo(json.valor.cliquesShopeeVideo, 0, 100_000_000);
  const origem = textoSeguro(json.valor.origem, 80);
  if (!data || !data.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return NextResponse.json({ ok: false, erro: "data inválida (use YYYY-MM-DD)" }, { status: 400 });
  }
  const temDetalhamento = cliquesRedesSociais !== null || cliquesShopeeVideo !== null;
  if (!temDetalhamento && cliques === null) {
    return NextResponse.json({ ok: false, erro: "informe os cliques da Shopee" }, { status: 400 });
  }

  const redesSociais = Math.floor(cliquesRedesSociais ?? cliques ?? 0);
  const shopeeVideo = Math.floor(cliquesShopeeVideo ?? 0);
  const total = temDetalhamento ? redesSociais + shopeeVideo : Math.floor(cliques || 0);

  // Para o diagnóstico Meta → Shopee entram apenas os cliques de redes sociais.
  salvarCliquesShopeeDia(data, redesSociais, origem || "redes_sociais");
  salvarMetricasShopeeDia({
    data,
    cliquesTotal: total,
    cliquesRedesSociais: redesSociais,
    cliquesShopeeVideo: shopeeVideo,
    fonte: "painel_shopee"
  });
  return NextResponse.json({ ok: true, metricas: { cliquesTotal: total, cliquesRedesSociais: redesSociais, cliquesShopeeVideo: shopeeVideo } });
}
