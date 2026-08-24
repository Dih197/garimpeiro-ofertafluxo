import { NextResponse } from "next/server";
import { eventosProximos, CALENDARIO } from "@/lib/sazonalidade";
import { adaptarProduto, buscarProdutosShopee, gerarLinkAfiliado, shopeeConfigurado } from "@/lib/shopee";
import { gerarProdutosMock } from "@/lib/mock";
import type { Produto } from "@/lib/types";
import { lerJson, textoSeguro, validarMesmaOrigem } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  const eventos = eventosProximos(120);
  return NextResponse.json({ eventos });
}

export async function POST(req: Request) {
  const origem = validarMesmaOrigem(req);
  if (origem) return origem;
  const json = await lerJson<{ eventoId?: unknown }>(req);
  if (!json.ok) return json.resposta;
  const evento = CALENDARIO.find((e) => e.id === textoSeguro(json.valor.eventoId, 100));
  if (!evento) return NextResponse.json({ erro: "Evento nao encontrado" }, { status: 404 });

  const { lerConfig } = await import("@/lib/configs");
  const usarMock = lerConfig("USE_MOCK_DATA") === "true" || !shopeeConfigurado();
  const produtos: Produto[] = [];

  for (const palavra of evento.produtosFoco.slice(0, 4)) {
    try {
      if (usarMock) {
        produtos.push(...gerarProdutosMock("beleza", 4));
      } else {
        const nodes = await buscarProdutosShopee(palavra, 8);
        produtos.push(...nodes.map((n) => adaptarProduto(n, evento.id)));
      }
    } catch {}
  }

  // Filtra e gera links
  const filtrados = produtos
    .filter((p) => p.vendas >= 200 && p.comissaoPct >= 5)
    .sort((a, b) => b.comissaoPct - a.comissaoPct)
    .slice(0, 20);

  if (!usarMock) {
    for (const p of filtrados) {
      if (p.linkProduto) {
        p.linkAfiliado = await gerarLinkAfiliado(p.linkProduto, `${evento.id.slice(0, 8)}`);
      }
    }
  }

  return NextResponse.json({ evento, produtos: filtrados });
}
