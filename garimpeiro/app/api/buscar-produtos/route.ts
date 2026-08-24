import { NextRequest, NextResponse } from "next/server";
import { buscarProdutosShopee, adaptarProduto, shopeeConfigurado } from "@/lib/shopee";
import { numeroNoIntervalo } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().slice(0, 100);
  const limit = numeroNoIntervalo(url.searchParams.get("limit") || "50", 1, 100);
  const sortType = numeroNoIntervalo(url.searchParams.get("sort") || "1", 0, 5);
  const minPrice = numeroNoIntervalo(url.searchParams.get("minPrice") || "0", 0, 10_000_000);
  const maxPrice = numeroNoIntervalo(url.searchParams.get("maxPrice") || "0", 0, 10_000_000);

  if (!q || q.length < 2) {
    return NextResponse.json({ erro: "Busca precisa de pelo menos 2 caracteres." }, { status: 400 });
  }
  if (limit === null || sortType === null || minPrice === null || maxPrice === null || (maxPrice > 0 && maxPrice < minPrice)) {
    return NextResponse.json({ erro: "Filtros de busca inválidos." }, { status: 400 });
  }

  if (!shopeeConfigurado()) {
    return NextResponse.json({ erro: "API Shopee não configurada. Vá em /configuracoes." }, { status: 400 });
  }

  try {
    // Buscar 100 itens na Shopee (2 requisições de 50 em paralelo) para contornar o limite máximo de 50 por página
    const porPagina = Math.min(limit, 50);
    // A API da Shopee não aceita sortType=0 (responde "System Error").
    // Mantemos a compatibilidade com URLs antigas e usamos 1 como relevância padrão;
    // a ordenação por score continua sendo feita localmente abaixo.
    const sortShopee = Math.max(1, Math.floor(sortType));
    const consultas = [buscarProdutosShopee(q, porPagina, 1, sortShopee)];
    if (limit > 50) consultas.push(buscarProdutosShopee(q, limit - 50, 2, sortShopee));
    const paginas = await Promise.all(consultas);
    const [nodes1, nodes2 = []] = paginas;
    const nodes = [...nodes1, ...nodes2];
    // Deduplicar por id (shopId-itemId) — o mesmo produto pode aparecer nas duas páginas
    const seenIds = new Set<string>();
    const uniqueNodes = nodes.filter((n) => {
      const id = `${n.shopId}-${n.itemId}`;
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });
    let produtos = uniqueNodes.map((n) => adaptarProduto(n, "busca"));

    // Filtragem estrita de preço (crucial para remover acessórios baratos de buscas de itens caros)
    if (minPrice > 0) produtos = produtos.filter(p => p.preco >= minPrice);
    if (maxPrice > 0) produtos = produtos.filter(p => p.preco <= maxPrice);

    const qLower = q.toLowerCase();
    // Palavras com mais de 2 letras para pontuação individual
    const palavrasPesquisa = qLower.split(/\s+/).filter(w => w.length > 2); 
    const termoEscapado = qLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regexBuscaExata = new RegExp(`\\b${termoEscapado}\\b`, "i");

    // Re-ordenar por score composto inteligente (Relevância + Financeiro + Vendas)
    const rankeados = produtos
      .map((p) => {
        const nome = p.nome.toLowerCase();
        let relevanceScore = 0;

        // 1. Relevância de correspondência exata
        if (nome.includes(qLower)) relevanceScore += 50;
        if (regexBuscaExata.test(nome)) relevanceScore += 50; 
        if (nome.startsWith(qLower)) relevanceScore += 50; 
        
        // 2. Relevância por palavras individuais da pesquisa
        let palavrasEncontradas = 0;
        for (const palavra of palavrasPesquisa) {
          if (nome.includes(palavra)) {
            relevanceScore += 15;
            palavrasEncontradas++;
          }
        }
        
        // Bônus massivo se contiver TODAS as palavras da busca (ex: "Geladeira Brastemp")
        if (palavrasEncontradas === palavrasPesquisa.length && palavrasPesquisa.length > 1) {
          relevanceScore += 50;
        }

        // 3. Penalidades extremas para acessórios e peças (se a busca original NÃO for por acessório)
        const buscaAcessorio = /adesivo|capa|case|película|suporte|cabo|peça|carregador/.test(qLower);
        let penalidade = 0;
        if (!buscaAcessorio) {
            const temPalavraNegativa = /adesivo|capa|organizador|película|case|suporte|protetor|cabo|acessório|acessorio|peça|reposição|miniatura|brinquedo|manual|caixa|embalagem|tampa/.test(nome);
            penalidade = temPalavraNegativa ? -300 : 0; // -300 destrói a chance de aparecer no topo
        }

        // 4. Score de Conversão e Lucro
        // comissaoValor (R$) tem um peso muito alto. Cada R$ 1 de comissão dá 10 pontos.
        const ganhoFinanceiro = p.comissaoValor * 10; 
        
        // Vendas em escala logarítmica (ex: 10 vendas = 1 * 50 = 50 pts, 1000 vendas = 3 * 50 = 150 pts, 10000 = 200 pts)
        const pesoVendas = Math.log10(Math.max(p.vendas, 1)) * 50;
        
        const pesoRating = p.rating * 5;

        return {
          ...p,
          scoreBusca: ganhoFinanceiro + pesoVendas + pesoRating + relevanceScore + penalidade
        };
      })
      .sort((a, b) => b.scoreBusca - a.scoreBusca)
      .slice(0, limit); // O frontend re-ordena conforme a seleção do usuário.


    return NextResponse.json({
      ok: true,
      query: q,
      total: rankeados.length,
      produtos: rankeados
    });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
