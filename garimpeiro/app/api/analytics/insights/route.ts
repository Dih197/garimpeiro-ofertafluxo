import { NextResponse } from "next/server";
import { gerarResumoDiario, detectarFadiga } from "@/lib/insights";
import { metaConfigurado, resolverAdAccountId, buscarSaudeConta } from "@/lib/meta";
import { gerarSaudeMock } from "@/lib/mock";
import { modoMockAtivo } from "@/lib/configs";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  if (modoMockAtivo()) {
    // Gera resumo + fadiga + saúde tudo em modo mock
    return NextResponse.json({
      ok: true,
      mock: true,
      resumo: {
        textoNarrativo: "🎭 [DEMO] Hoje você gastou R$ 24,18 no Meta e gerou 188 cliques. A Shopee atribuiu 4 vendas ao tráfego Meta, somando R$ 38,40 de comissão. Resultado parcial: lucro de R$ 11,08 🎉",
        comparativo: [
          { campo: "Gasto Meta", hoje: 24.18, ontem: 19.5, variacao: 24 },
          { campo: "Cliques", hoje: 188, ontem: 142, variacao: 32 },
          { campo: "Vendas", hoje: 4, ontem: 2, variacao: 100 },
          { campo: "Comissão", hoje: 38.4, ontem: 18.5, variacao: 108 },
          { campo: "Lucro", hoje: 11.08, ontem: -3.5, variacao: 416 }
        ],
        acoes: [
          { prioridade: "alta", tipo: "escalar", texto: "Escalar Anúncio 02 — ROAS 1.85x. Aumentar +50% de orçamento.", alvo: "6988712776287", impactoEstimado: "+R$ 22/dia projetado" },
          { prioridade: "media", tipo: "renovar_criativo", texto: "Anúncio 02 mostra leve fadiga (CTR caindo). Prepare variação nos próximos 3 dias.", alvo: "6988712776287", impactoEstimado: "Performance vai degradar em 3-5 dias" },
          { prioridade: "baixa", tipo: "celebrar", texto: "Conta lucrativa pelo segundo dia consecutivo — manter operação.", impactoEstimado: "" }
        ]
      },
      fadigas: [
        { adId: "6988712776287", adName: "Anuncio 02 - Shopee MetaAds", ctrInicio: 6.85, ctrAgora: 4.92, quedaPct: 28, diasAteParar: 4 }
      ],
      saude: gerarSaudeMock()
    });
  }

  const resumo = gerarResumoDiario();
  const fadigas = detectarFadiga();

  let saude = null;
  if (metaConfigurado()) {
    const adAccountId = await resolverAdAccountId();
    if (adAccountId) {
      saude = await buscarSaudeConta(adAccountId);
    }
  }

  return NextResponse.json({ ok: true, resumo, fadigas, saude });
}
