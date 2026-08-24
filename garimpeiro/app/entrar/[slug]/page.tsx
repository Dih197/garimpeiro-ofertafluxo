import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buscarCampanhaGrupoPorSlug } from "@/lib/campanhas-grupo";
import { lerConfig } from "@/lib/configs";
import { CapturaGrupoClient } from "./captura-grupo-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const campanha = buscarCampanhaGrupoPorSlug(slug);
  return campanha
    ? { title: campanha.titulo, description: campanha.descricao, robots: { index: false, follow: false } }
    : { title: "Grupo indisponível" };
}

export default async function EntrarGrupoPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const campanha = buscarCampanhaGrupoPorSlug(slug);
  if (!campanha) notFound();
  const query = await searchParams;
  const primeiro = (chave: string) => {
    const valor = query[chave];
    return (Array.isArray(valor) ? valor[0] : valor || "").slice(0, 300);
  };
  return (
    <CapturaGrupoClient
      campanha={{
        slug: campanha.slug,
        titulo: campanha.titulo,
        descricao: campanha.descricao,
        textoBotao: campanha.textoBotao,
        corDestaque: campanha.corDestaque
      }}
      pixelId={lerConfig("META_PIXEL_ID")}
      atribuicao={{
        utmSource: primeiro("utm_source"), utmMedium: primeiro("utm_medium"),
        utmCampaign: primeiro("utm_campaign"), utmContent: primeiro("utm_content"),
        utmTerm: primeiro("utm_term"), fbclid: primeiro("fbclid")
      }}
    />
  );
}
