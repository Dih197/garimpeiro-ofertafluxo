export type Nicho = {
  id: string;
  nome: string;
  emoji: string;
  palavrasChave: string[];
  ativo: boolean;
};

export type Produto = {
  id: string;
  itemId: number;
  shopId: number;
  nome: string;
  imagem: string;
  preco: number;
  precoOriginal: number;
  comissaoPct: number;
  comissaoExtraPct: number;
  comissaoValor: number; // valor R$ da comissão por venda
  comissaoNovoUsuarioPct: number; // taxa pra usuario novo (geralmente maior)
  vendas: number;
  rating: number;
  afiliados: number;
  estoque: number;
  loja: string;
  lojaOficial: boolean; // OFICIAL/MALL
  lojaPreferred: boolean; // KEY_SELLER/PREFERRED
  shopType: string[]; // tipos brutos da API
  categoria: string;
  nichoId: string;
  linkAfiliado: string;
  linkProduto: string;
  videosAprenderCriadores: number;
  cupomDisponivel: boolean;
  cupomValor?: string;
  inicioOferta: number; // timestamp Unix em segundos
  fimOferta: number; // timestamp Unix em segundos
  scoreOportunidade: number;
  garimpadoEm: string;
};

export type Roteiro = {
  id: string;
  produtoId: string;
  estilo: "dor" | "descoberta" | "curiosidade" | "comparacao" | "prova-social" | "asmr" | "ugc" | "unboxing";
  gancho: string;
  beneficio: string;
  demonstracao: string;
  cta: string;
  duracaoEstimada: number;
  hashtags: string[];
  criadoEm: string;
};

export type FiltroEstrategia = {
  comissaoMinima: number;
  afiliadosMaximos: number;
  vendasMinimas: number;
  ratingMinimo: number;
};

export const FILTRO_PADRAO: FiltroEstrategia = {
  comissaoMinima: 9,
  afiliadosMaximos: 300,
  vendasMinimas: 1000,
  ratingMinimo: 4.5
};

export type StatusGarimpo = {
  rodando: boolean;
  ultimaExecucao: string | null;
  totalProdutosHoje: number;
  totalRoteirosHoje: number;
  ultimoErro?: string;
};
