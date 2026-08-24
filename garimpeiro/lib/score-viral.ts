import type { Produto } from "./types";

export type ScoreViral = {
  total: number; // 0-100
  fatores: Array<{ nome: string; pontos: number; max: number; cor: "emerald" | "amber" | "rose" }>;
  veredito: "explosivo" | "promissor" | "moderado" | "fraco";
  observacoes: string[];
};

export function calcularScoreViral(p: Produto): ScoreViral {
  const fatores: ScoreViral["fatores"] = [];
  const obs: string[] = [];

  // 1. Comissão (max 25)
  const comissaoTotal = p.comissaoPct;
  let pontosComissao = 0;
  if (comissaoTotal >= 25) { pontosComissao = 25; obs.push("Comissão excepcional (>25%)"); }
  else if (comissaoTotal >= 15) pontosComissao = 18;
  else if (comissaoTotal >= 9) pontosComissao = 12;
  else pontosComissao = 5;
  fatores.push({ nome: "Comissão", pontos: pontosComissao, max: 25, cor: pontosComissao >= 18 ? "emerald" : pontosComissao >= 12 ? "amber" : "rose" });

  // 2. Vendas (prova social) (max 25)
  let pontosVendas = 0;
  if (p.vendas >= 10000) { pontosVendas = 25; obs.push("Prova social massiva (>10k vendas)"); }
  else if (p.vendas >= 5000) pontosVendas = 20;
  else if (p.vendas >= 1000) pontosVendas = 14;
  else if (p.vendas >= 500) pontosVendas = 8;
  else pontosVendas = 3;
  fatores.push({ nome: "Vendas", pontos: pontosVendas, max: 25, cor: pontosVendas >= 18 ? "emerald" : pontosVendas >= 12 ? "amber" : "rose" });

  // 3. Faixa de preço (impulso) (max 15)
  let pontosPreco = 0;
  if (p.preco > 0 && p.preco <= 30) { pontosPreco = 15; obs.push("Preço de impulso (≤R$30)"); }
  else if (p.preco <= 60) pontosPreco = 10;
  else if (p.preco <= 100) pontosPreco = 6;
  else pontosPreco = 2;
  fatores.push({ nome: "Preço impulso", pontos: pontosPreco, max: 15, cor: pontosPreco >= 10 ? "emerald" : pontosPreco >= 6 ? "amber" : "rose" });

  // 4. Rating (qualidade) (max 15)
  let pontosRating = 0;
  if (p.rating >= 4.8) pontosRating = 15;
  else if (p.rating >= 4.5) pontosRating = 12;
  else if (p.rating >= 4.0) pontosRating = 7;
  else pontosRating = 0;
  fatores.push({ nome: "Qualidade", pontos: pontosRating, max: 15, cor: pontosRating >= 12 ? "emerald" : pontosRating >= 7 ? "amber" : "rose" });

  // 5. Cupom (urgência) (max 10)
  const pontosCupom = p.cupomDisponivel ? 10 : 0;
  if (p.cupomDisponivel) obs.push("Cupom ativo aumenta conversão");
  fatores.push({ nome: "Cupom", pontos: pontosCupom, max: 10, cor: pontosCupom > 0 ? "emerald" : "rose" });

  // 6. Desconto visível (gancho) (max 10)
  const desconto = p.precoOriginal > p.preco ? Math.round(((p.precoOriginal - p.preco) / p.precoOriginal) * 100) : 0;
  let pontosDesconto = 0;
  if (desconto >= 30) { pontosDesconto = 10; obs.push(`Desconto chamativo (-${desconto}%)`); }
  else if (desconto >= 15) pontosDesconto = 6;
  else if (desconto >= 5) pontosDesconto = 3;
  fatores.push({ nome: "Desconto", pontos: pontosDesconto, max: 10, cor: pontosDesconto >= 6 ? "emerald" : pontosDesconto >= 3 ? "amber" : "rose" });

  const total = pontosComissao + pontosVendas + pontosPreco + pontosRating + pontosCupom + pontosDesconto;

  let veredito: ScoreViral["veredito"] = "fraco";
  if (total >= 80) veredito = "explosivo";
  else if (total >= 60) veredito = "promissor";
  else if (total >= 40) veredito = "moderado";

  return { total, fatores, veredito, observacoes: obs };
}

export function sugerirBundle(produtos: Produto[], produtoBase: Produto): Produto[] {
  // Sugere 2 produtos do mesmo nicho que tenham boa comissão e ticket complementar
  return produtos
    .filter((p) =>
      p.id !== produtoBase.id &&
      p.nichoId === produtoBase.nichoId &&
      p.comissaoPct >= 8 &&
      p.vendas >= 500
    )
    .sort((a, b) => calcularScoreViral(b).total - calcularScoreViral(a).total)
    .slice(0, 2);
}
