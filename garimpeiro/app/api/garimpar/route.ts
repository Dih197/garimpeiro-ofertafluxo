import { NextResponse } from "next/server";
import { listarNichosAtivos, salvarProdutos, salvarRoteiros, registrarExecucao, estatisticasHoje } from "@/lib/db";
import { adaptarProduto, buscarProdutosShopee, gerarLinkAfiliado, shopeeConfigurado } from "@/lib/shopee";
import { gerarRoteirosIA } from "@/lib/ai";
import { aplicarFiltros } from "@/lib/filters";
import { gerarProdutosMock } from "@/lib/mock";
import { FILTRO_PADRAO, type Produto, type Roteiro } from "@/lib/types";
import { lerConfig } from "@/lib/configs";
import { validarMesmaOrigem } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
let garimpoEmAndamento = false;

// Helper: limita concorrência
async function processarEmBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const resultados: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const r = await Promise.all(batch.map(fn));
    resultados.push(...r);
  }
  return resultados;
}

export async function POST(req: Request) {
  const origem = validarMesmaOrigem(req);
  if (origem) return origem;
  if (garimpoEmAndamento) {
    return NextResponse.json({ erro: "Já existe um garimpo em andamento. Aguarde a conclusão." }, { status: 409 });
  }
  garimpoEmAndamento = true;
  const inicio = Date.now();
  const url = new URL(req.url);
  // Default agora é SEM roteiros (gera sob demanda quando user clica em Roteiros)
  const gerarRoteiros = url.searchParams.get("roteiros") === "true";
  const usarMock = lerConfig("USE_MOCK_DATA") === "true" || !shopeeConfigurado();

  try {
    const nichosAtivos = listarNichosAtivos();
    if (!nichosAtivos.length) {
      return NextResponse.json({ erro: "Nenhum nicho ativo. Ative pelo menos um na pagina /nichos." }, { status: 400 });
    }

    // 1. Construir lista de tarefas (nicho + palavra-chave) — máx 3 por nicho
    const tarefas: Array<{ nicho: typeof nichosAtivos[0]; palavra: string }> = [];
    for (const nicho of nichosAtivos) {
      for (const palavra of nicho.palavrasChave.slice(0, 3)) {
        tarefas.push({ nicho, palavra });
      }
    }

    // 2. PARALELIZAR buscas (até 4 simultâneas pra não estourar rate limit Shopee)
    const erros: string[] = [];
    const resultadosBusca = await processarEmBatches(tarefas, 4, async ({ nicho, palavra }) => {
      try {
        let produtos: Produto[];
        if (usarMock) {
          produtos = gerarProdutosMock(nicho.id, 8);
        } else {
          const nodes = await buscarProdutosShopee(palavra, 20);
          produtos = nodes.map((n) => adaptarProduto(n, nicho.id));
        }
        return produtos;
      } catch (e) {
        erros.push(`${nicho.nome}/${palavra}: ${(e as Error).message}`);
        return [] as Produto[];
      }
    });
    const todosProdutos = resultadosBusca.flat();

    // 3. Aplicar filtros e ranquear ANTES de gerar links (economiza chamadas)
    const filtrados = aplicarFiltros(todosProdutos, FILTRO_PADRAO).slice(0, 60);

    // 4. PARALELIZAR geração de links de afiliado SÓ pros que passaram (top 60)
    if (!usarMock) {
      await processarEmBatches(filtrados, 6, async (p) => {
        if (!p.linkProduto) return;
        try {
          p.linkAfiliado = await gerarLinkAfiliado(p.linkProduto, `gar${p.nichoId.slice(0, 6)}`);
        } catch (e) {
          erros.push(`Link ${p.id}: ${(e as Error).message}`);
        }
      });
    }

    salvarProdutos(filtrados);

    // 5. Roteiros: SÓ se requisitado (default false agora)
    let roteirosTotal = 0;
    if (gerarRoteiros && filtrados.length) {
      const top = filtrados.slice(0, 10); // só 10, não 20
      const todosRoteiros: Roteiro[] = [];
      // Paralelizar até 3 simultâneos pra não estourar rate limit da LLM
      await processarEmBatches(top, 3, async (produto) => {
        try {
          const roteiros = await gerarRoteirosIA(produto, 3);
          todosRoteiros.push(...roteiros);
        } catch (e) {
          erros.push(`Roteiro ${produto.nome}: ${(e as Error).message}`);
        }
      });
      salvarRoteiros(todosRoteiros);
      roteirosTotal = todosRoteiros.length;
    }

    const duracao = Date.now() - inicio;
    registrarExecucao(filtrados.length, roteirosTotal, duracao);

    // Amostra dos primeiros 3 produtos para debug (campos que afetam o filtro)
    const debugAmostra = todosProdutos.slice(0, 3).map((p) => ({
      nome: p.nome,
      comissaoPct: p.comissaoPct,
      vendas: p.vendas,
      rating: p.rating,
      afiliados: p.afiliados,
      score: p.scoreOportunidade
    }));

    return NextResponse.json({
      ok: true,
      modo: usarMock ? "mock" : "api-real",
      totalGarimpado: todosProdutos.length,
      totalFiltrados: filtrados.length,
      totalRoteiros: roteirosTotal,
      duracaoMs: duracao,
      avisos: erros.slice(0, 5),
      stats: estatisticasHoje(),
      ...(process.env.NODE_ENV !== "production" ? { debugAmostra } : {})
    });
  } catch (e) {
    const msg = (e as Error).message;
    registrarExecucao(0, 0, Date.now() - inicio, msg);
    return NextResponse.json({ erro: msg }, { status: 500 });
  } finally {
    garimpoEmAndamento = false;
  }
}

export async function GET() {
  return NextResponse.json({ stats: estatisticasHoje() });
}
