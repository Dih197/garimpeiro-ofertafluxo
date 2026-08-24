import { listarCampanhasGrupo } from "@/lib/campanhas-grupo";
import { CampanhasGrupoClient } from "./campanhas-grupo-client";

export const dynamic = "force-dynamic";

export default function CampanhasGrupoPage() {
  return <CampanhasGrupoClient iniciais={listarCampanhasGrupo()} />;
}
