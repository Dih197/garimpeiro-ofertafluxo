import { NextResponse } from "next/server";
import { adaptarProduto, buscarProdutosShopee, gerarLinkAfiliado, shopeeConfigurado } from "@/lib/shopee";
import { gerarProdutosMock } from "@/lib/mock";
import type { Produto } from "@/lib/types";
import { lerJson, textoSeguro, validarMesmaOrigem } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Detecta nicho virgem buscando varias palavras-chave e ranqueando por:
// - alta comissao + alto numero de vendas + baixa concorrencia (rating alto = produtos consolidados)
export async function POST(req: Request) {
  const origem = validarMesmaOrigem(req);
  if (origem) return origem;
  const json = await lerJson<{ palavras?: unknown; nichoId?: unknown }>(req);
  if (!json.ok) return json.resposta;
  const palavras = Array.isArray(json.valor.palavras)
    ? [...new Set(json.valor.palavras.map((p) => textoSeguro(p, 80)).filter((p) => p.length >= 2))].slice(0, 8)
    : [];
  const nichoId = textoSeguro(json.valor.nichoId, 80) || "custom";
  if (!palavras.length) {
    return NextResponse.json({ erro: "Forneca pelo menos 1 palavra-chave" }, { status: 400 });
  }
  const { lerConfig } = await import("@/lib/configs");
  const usarMock = lerConfig("USE_MOCK_DATA") === "true" || !shopeeConfigurado();

  const candidatos: Array<Produto & { palavraChave: string }> = [];
  const erros: string[] = [];

  for (const palavra of palavras) {
    try {
      let produtos: Produto[];
      if (usarMock) {
        produtos = gerarProdutosMock(nichoId, 5);
      } else {
        const nodes = await buscarProdutosShopee(palavra, 10);
        produtos = nodes.map((n) => adaptarProduto(n, nichoId));
      }
      for (const p of produtos) {
        candidatos.push({ ...p, palavraChave: palavra });
      }
    } catch (e) {
      erros.push(`${palavra}: ${(e as Error).message}`);
    }
  }

  // Score de "virgindade": alta comissao + alta vendas + alta nota
  const ranqueados = candidatos
    .map((p) => {
      const comissaoTotal = p.comissaoPct;
      const score =
        Math.min(40, comissaoTotal * 1.5) +
        Math.min(30, Math.log10(p.vendas + 1) * 8) +
        Math.min(20, p.rating * 4) +
        (p.cupomDisponivel ? 10 : 0);
      return { ...p, scoreOportunidade: Math.round(score) };
    })
    .filter((p) => p.vendas >= 100 && p.comissaoPct >= 5)
    .sort((a, b) => b.scoreOportunidade - a.scoreOportunidade)
    .slice(0, 30);

  // Gera link de afiliado pra cada um
  if (!usarMock) {
    for (const p of ranqueados) {
      if (p.linkProduto) {
        p.linkAfiliado = await gerarLinkAfiliado(p.linkProduto, `intel${nichoId.slice(0, 6)}`);
      }
    }
  }

  return NextResponse.json({
    total: ranqueados.length,
    palavras,
    produtos: ranqueados,
    erros
  });
}
