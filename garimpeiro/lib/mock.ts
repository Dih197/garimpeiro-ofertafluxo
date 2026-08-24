import type { Produto } from "./types";
import type { ConversaoLocal, MetaInsightLocal } from "./db";

/* =============== MOCK PRA PAINEL ROI =============== */
// Gera dados realistas pra testar Painel ROI sem depender da API real
// Cenários: 2 criativos (Cri01 lucrativo / Cri02 prejuízo) + carrinho cheio + histórico

const NOMES_PRODUTOS_MOCK = [
  "Kit Dupla Renovadores Faciais Kokeshi Pele Porcelana Olhos Gueixa",
  "JBSARA Soro Renovador de Retinol 1ml Envio da Coreia 1 peça",
  "Carregador Portátil Indução Magsafe Sem fio 10000mAh",
  "Kit Limpador Pastilha de máquina de lavar roupa",
  "1/2/5 Suporte De Parede Multifuncional Caixa De Armazenamento",
  "Hidratante Facial Anti-idade Retinol",
  "Mascara Cilios Volumao Waterproof",
  "Iluminador Pele 3 Cores Holografico"
];

// Cache em memória pra mock ficar consistente entre rotas no mesmo servidor.
// Sem cache, cada chamada usa Math.random() e os números não batem entre as rotas.
let _convMockCache: ConversaoLocal[] | null = null;
let _insightsMockCache: MetaInsightLocal[] | null = null;

/** Limpa cache do mock (útil pra testes ou regeração explícita) */
export function limparMockCache() {
  _convMockCache = null;
  _insightsMockCache = null;
}

type DistribuicaoMock = {
  sub2: string;
  peso: number;
  comissaoBase: number;
  /** Origem usada pra classificarCanal — Meta Ads (campanha) ou Shopee Vídeo (orgânico) etc. */
  origem: "meta_ads" | "shopee_video" | "shopee_live" | "tiktok" | "direto";
};

/** Gera vendas Shopee mockadas representando mix realista campanha + orgânico.
 * Cenário:
 *  - 35% Meta Ads sub_id_2=Cri02 (vencedor pago)
 *  - 15% Meta Ads sub_id_2=Cri01 (pago em teste)
 *  - 25% Shopee Vídeo orgânico
 *  - 15% Shopee Live orgânico
 *  - 5% TikTok orgânico
 *  - 5% direto/sem rastreio
 *
 * Resultado é cacheado em memória pra ficar consistente entre /api/analytics/roas e /api/analytics/sincronizar.
 */
export function gerarConversoesMock(): ConversaoLocal[] {
  if (_convMockCache) return _convMockCache;
  const conv: ConversaoLocal[] = [];
  const agora = Math.floor(Date.now() / 1000);
  const distribuicao: DistribuicaoMock[] = [
    { sub2: "Cri02", peso: 0.35, comissaoBase: 10.17, origem: "meta_ads" },
    { sub2: "Cri01", peso: 0.15, comissaoBase: 6.5, origem: "meta_ads" },
    { sub2: "", peso: 0.25, comissaoBase: 4.05, origem: "shopee_video" },
    { sub2: "", peso: 0.15, comissaoBase: 6.2, origem: "shopee_live" },
    { sub2: "", peso: 0.05, comissaoBase: 5.5, origem: "tiktok" },
    { sub2: "", peso: 0.05, comissaoBase: 3.0, origem: "direto" }
  ];

  // 30 vendas distribuídas nos últimos 7 dias (mais robusto pra ver o mix)
  for (let i = 0; i < 30; i++) {
    // Garante pelo menos uma venda Live no dataset de demonstração.
    const r = i === 0 ? 0.86 : Math.random();
    let acc = 0;
    let escolha = distribuicao[0];
    for (const d of distribuicao) {
      acc += d.peso;
      if (r <= acc) { escolha = d; break; }
    }
    const diasAtras = Math.floor(Math.random() * 7);
    const horasAtras = Math.floor(Math.random() * 24);
    const purchaseTime = agora - (diasAtras * 86400 + horasAtras * 3600);
    const direta = escolha.origem === "meta_ads" && Math.random() < 0.6;
    const comissao = escolha.comissaoBase + (Math.random() * 4 - 2);
    const valor = comissao * (direta ? 4 : 8);

    // Mapeia origem → sinais
    const sinais = sinaisPorOrigem(escolha.origem);

    conv.push({
      orderId: `MOCK-${i}-${Date.now()}`,
      itemId: 23994387054 + i,
      shopId: 395166866,
      produtoNome: NOMES_PRODUTOS_MOCK[i % NOMES_PRODUTOS_MOCK.length],
      shopName: i % 3 === 0 ? "KOKESHI OFICIAL" : "Loja Mock Shopee",
      purchaseTime,
      completeTime: purchaseTime + 3600,
      clickTime: purchaseTime - Math.floor(Math.random() * 5 * 86400),
      totalCommission: parseFloat(comissao.toFixed(2)),
      sellerCommission: direta ? parseFloat((comissao * 0.4).toFixed(2)) : 0,
      shopeeCommission: parseFloat((comissao * 0.6).toFixed(2)),
      amount: parseFloat(valor.toFixed(2)),
      payoutAmount: parseFloat(comissao.toFixed(2)),
      status: Math.random() < 0.85 ? "COMPLETED" : "PENDING",
      subId: sinais.subId,
      subId2: sinais.subId === "MetaAds" ? escolha.sub2 : "",
      subId3: "",
      subId4: "",
      subId5: "",
      referrer: sinais.referrer,
      channelType: sinais.channelType,
      campaignType: escolha.origem === "meta_ads" ? "SELLER_OPEN_CAMPAIGN" : "NON_SELLER_CAMPAIGN",
      attributionType: "ORDERED_IN_SAME_SHOP",
      buyerType: Math.random() < 0.7 ? "EXISTING" : "NEW",
      device: "APP"
    });
  }
  _convMockCache = conv;
  return conv;
}

function sinaisPorOrigem(origem: DistribuicaoMock["origem"]): { subId: string; referrer: string; channelType: string } {
  switch (origem) {
    case "meta_ads":      return { subId: "MetaAds", referrer: "Facebook", channelType: "Social Medias" };
    case "shopee_video":  return { subId: "", referrer: "Shopeevideo-Shopee", channelType: "Shopee Video" };
    case "shopee_live":   return { subId: "", referrer: "Shopeelive-Shopee", channelType: "Shopee Live" };
    case "tiktok":        return { subId: "", referrer: "TikTok", channelType: "Social Medias" };
    case "direto":        return { subId: "", referrer: "", channelType: "" };
  }
}

/** Gera insights Meta mockados pros últimos 7 dias por anúncio.
 * Cenário:
 * - Anúncio 02 (Cri02): vencedor — bom CTR, gerando vendas
 * - Anúncio 01 (Cri01): médio — gasto + alguns cliques, poucas vendas
 *
 * Cacheado em memória pra ficar consistente entre rotas.
 */
export function gerarInsightsMock(): MetaInsightLocal[] {
  if (_insightsMockCache) return _insightsMockCache;
  const insights: MetaInsightLocal[] = [];
  const hoje = new Date();

  for (let dia = 6; dia >= 0; dia--) {
    const data = new Date(hoje.getTime() - dia * 86400 * 1000).toISOString().slice(0, 10);

    // Anúncio 02 (Cri02) — performance alta, com leve fadiga ao longo dos dias
    const fadiga02 = 1 - (6 - dia) * 0.08; // CTR vai caindo
    const spend02 = 22 + Math.random() * 6;
    const impr02 = Math.floor(3500 + Math.random() * 800);
    const ctr02 = (6.5 * fadiga02) + (Math.random() * 0.4 - 0.2);
    const clicks02 = Math.floor((impr02 * ctr02) / 100);
    insights.push({
      adId: "6988712776287",
      data,
      adName: "Anuncio 02 - Shopee MetaAds",
      adsetId: "6988711032487",
      adsetName: "Conj 2 - Mulheres 25-60",
      campaignId: "6988710506287",
      campaignName: "Vendas - Shopee Afiliado - MetaAds",
      spend: parseFloat(spend02.toFixed(2)),
      impressions: impr02,
      clicks: clicks02,
      inlineLinkClicks: Math.floor(clicks02 * 0.85),
      outboundClicks: Math.floor(clicks02 * 0.78),
      cpc: parseFloat((spend02 / Math.max(1, Math.floor(clicks02 * 0.78))).toFixed(3)),
      ctr: parseFloat(ctr02.toFixed(2)),
      cpm: parseFloat((spend02 / impr02 * 1000).toFixed(2)),
      reach: Math.floor(impr02 * 0.92),
      subId1: "MetaAds",
      subId2: "Cri02",
      linkDestino: "https://s.shopee.com.br/4qCDSJmAqB",
      status: "ACTIVE"
    });

    // Anúncio 01 (Cri01) — performance média, alguns dias sem entrega
    if (dia <= 5 && Math.random() > 0.3) {
      const spend01 = 8 + Math.random() * 4;
      const impr01 = Math.floor(800 + Math.random() * 400);
      const ctr01 = 2.5 + Math.random();
      const clicks01 = Math.floor((impr01 * ctr01) / 100);
      insights.push({
        adId: "6988712732487",
        data,
        adName: "Anuncio 01 - Shopee MetaAds",
        adsetId: "6988710899487",
        adsetName: "Conj 1 - Mulheres 25-60",
        campaignId: "6988710506287",
        campaignName: "Vendas - Shopee Afiliado - MetaAds",
        spend: parseFloat(spend01.toFixed(2)),
        impressions: impr01,
        clicks: clicks01,
        inlineLinkClicks: Math.floor(clicks01 * 0.8),
        outboundClicks: Math.floor(clicks01 * 0.7),
        cpc: parseFloat((spend01 / Math.max(1, Math.floor(clicks01 * 0.7))).toFixed(3)),
        ctr: parseFloat(ctr01.toFixed(2)),
        cpm: parseFloat((spend01 / impr01 * 1000).toFixed(2)),
        reach: Math.floor(impr01 * 0.92),
        subId1: "MetaAds",
        subId2: "Cri01",
        linkDestino: "https://s.shopee.com.br/2g7isJYHFy",
        status: "ACTIVE"
      });
    }
  }
  _insightsMockCache = insights;
  return insights;
}

/** Saúde da conta mockada */
export function gerarSaudeMock() {
  return {
    ok: true,
    contaNome: "App Insta (MOCK)",
    contaStatus: 1,
    saldo: 87.50,
    saldoMoeda: "BRL",
    spendCap: 0,
    anunciosEmRevisao: 0,
    anunciosRejeitados: 0,
    anunciosAtivos: 2,
    token: { vitalicio: true, expiraEmHoras: null as number | null },
    alertas: [] as string[]
  };
}


const MOCK_PRODUTOS: Record<string, Partial<Produto>[]> = {
  beleza: [
    { nome: "Prime Facial Pro Make Segura por 12h", preco: 19.9, comissaoPct: 24, vendas: 6420, rating: 4.8, afiliados: 187, loja: "BellaGlow Oficial", cupomDisponivel: true, cupomValor: "R$5 OFF" },
    { nome: "Acido Hialuronico Vitamina C 30ml", preco: 27.5, comissaoPct: 18, vendas: 4210, rating: 4.7, afiliados: 233, loja: "SkinCare BR" },
    { nome: "Base Liquida HD Cobertura Total", preco: 32.0, comissaoPct: 15, vendas: 3580, rating: 4.6, afiliados: 156, loja: "MakeUp Pro", cupomDisponivel: true, cupomValor: "10%" },
    { nome: "Kit Pinceis Maquiagem 12 pecas", preco: 24.9, comissaoPct: 12, vendas: 2890, rating: 4.5, afiliados: 98, loja: "Beauty Tools" },
    { nome: "Mascara Cilios Volumao Waterproof", preco: 14.9, comissaoPct: 22, vendas: 5120, rating: 4.8, afiliados: 245, loja: "Cilios Perfeitos" },
    { nome: "Hidratante Facial Anti-idade Retinol", preco: 38.0, comissaoPct: 28, vendas: 1890, rating: 4.9, afiliados: 76, loja: "DermaPro" },
    { nome: "Batom Liquido Matte Longa Duracao", preco: 9.9, comissaoPct: 16, vendas: 8540, rating: 4.6, afiliados: 289, loja: "Lips Brasil" },
    { nome: "Iluminador Pele 3 Cores Holografico", preco: 16.5, comissaoPct: 20, vendas: 3210, rating: 4.7, afiliados: 134, loja: "Glow Cosmetics", cupomDisponivel: true, cupomValor: "R$3 OFF" }
  ],
  cozinha: [
    { nome: "Organizador Geladeira 6 pecas Empilhavel", preco: 34.9, comissaoPct: 18, vendas: 4120, rating: 4.8, afiliados: 167, loja: "Casa Pratica" },
    { nome: "Descascador Multifuncional 3 em 1", preco: 12.9, comissaoPct: 25, vendas: 6780, rating: 4.7, afiliados: 219, loja: "Cozinha Smart", cupomDisponivel: true, cupomValor: "15%" },
    { nome: "Fatiador de Legumes Manual Profissional", preco: 28.9, comissaoPct: 22, vendas: 3450, rating: 4.6, afiliados: 142, loja: "Kitchen Pro" },
    { nome: "Pote Hermetico Vidro Tampa Bambu Kit 5", preco: 45.0, comissaoPct: 14, vendas: 2310, rating: 4.9, afiliados: 87, loja: "Eco Casa" },
    { nome: "Tabua Bambu Antiderrapante Premium", preco: 19.9, comissaoPct: 16, vendas: 5670, rating: 4.7, afiliados: 198, loja: "Bambu Brasil" },
    { nome: "Escorredor Pia Aco Inox Dobravel", preco: 24.5, comissaoPct: 20, vendas: 4890, rating: 4.8, afiliados: 174, loja: "Inox Master", cupomDisponivel: true, cupomValor: "R$5" },
    { nome: "Espremedor Eletrico Frutas USB", preco: 39.9, comissaoPct: 28, vendas: 1980, rating: 4.5, afiliados: 65, loja: "Tech Kitchen" }
  ],
  casa: [
    { nome: "Organizador Sapateira 24 pares Tecido", preco: 29.9, comissaoPct: 17, vendas: 3890, rating: 4.6, afiliados: 156, loja: "Organiza Tudo" },
    { nome: "Cabide Antideslizante Veludo Kit 50", preco: 32.0, comissaoPct: 14, vendas: 4520, rating: 4.7, afiliados: 187, loja: "Closet Pro" },
    { nome: "Luminaria LED Quarto Controle Remoto", preco: 56.0, comissaoPct: 19, vendas: 2340, rating: 4.8, afiliados: 98, loja: "Light Home", cupomDisponivel: true, cupomValor: "10%" },
    { nome: "Tapete Sala Antiderrapante 200x140", preco: 89.9, comissaoPct: 12, vendas: 1670, rating: 4.5, afiliados: 134, loja: "Decor Casa" },
    { nome: "Cortina Black Out 280x200 Termica", preco: 79.9, comissaoPct: 16, vendas: 1890, rating: 4.6, afiliados: 112, loja: "Cortinas BR" }
  ],
  tech: [
    { nome: "Fone Bluetooth Sem Fio Cancelamento Ruido", preco: 49.9, comissaoPct: 13, vendas: 5230, rating: 4.6, afiliados: 287, loja: "Tech Audio" },
    { nome: "Mouse Gamer RGB 6 Botoes 7200dpi", preco: 39.9, comissaoPct: 18, vendas: 4890, rating: 4.8, afiliados: 165, loja: "Gamer Pro", cupomDisponivel: true, cupomValor: "R$10" },
    { nome: "Suporte Celular Mesa Articulado Aluminio", preco: 22.9, comissaoPct: 21, vendas: 3450, rating: 4.7, afiliados: 134, loja: "Mobile Smart" },
    { nome: "Carregador Veicular USB-C 65W Turbo", preco: 32.0, comissaoPct: 16, vendas: 2890, rating: 4.6, afiliados: 156, loja: "Power Tech" },
    { nome: "Iluminacao LED Anel Ringlight 26cm Tripe", preco: 54.9, comissaoPct: 24, vendas: 2120, rating: 4.7, afiliados: 89, loja: "Creator Tools" }
  ],
  pet: [
    { nome: "Caminha Pet Antiderrapante Felpuda M", preco: 49.9, comissaoPct: 22, vendas: 3450, rating: 4.8, afiliados: 145, loja: "Pet Confort", cupomDisponivel: true, cupomValor: "15%" },
    { nome: "Comedouro Automatico 4 Refeicoes Timer", preco: 89.0, comissaoPct: 26, vendas: 1890, rating: 4.7, afiliados: 76, loja: "Smart Pet" },
    { nome: "Brinquedo Mordedor Resistente Cao Grande", preco: 18.9, comissaoPct: 19, vendas: 4230, rating: 4.6, afiliados: 198, loja: "Pet Play" },
    { nome: "Coleira Anti Puxao Peitoral Reflexivo", preco: 34.9, comissaoPct: 17, vendas: 2890, rating: 4.7, afiliados: 134, loja: "Walk Pet" }
  ],
  fitness: [
    { nome: "Faixa Elastica Resistencia Kit 5 Niveis", preco: 39.9, comissaoPct: 24, vendas: 4120, rating: 4.7, afiliados: 156, loja: "Fit Brasil" },
    { nome: "Garrafa Termica Inox 1 Litro Motivacional", preco: 49.9, comissaoPct: 18, vendas: 3450, rating: 4.8, afiliados: 134, loja: "Hidrate Fit", cupomDisponivel: true, cupomValor: "10%" },
    { nome: "Corda Pular Crossfit Rolamento Aco", preco: 22.9, comissaoPct: 21, vendas: 2890, rating: 4.6, afiliados: 98, loja: "Cross Pro" },
    { nome: "Tapete Yoga Antiderrapante 6mm TPE", preco: 65.0, comissaoPct: 16, vendas: 1890, rating: 4.7, afiliados: 87, loja: "Yoga Life" }
  ],
  moda: [
    { nome: "Bolsa Feminina Tiracolo Couro Sintetico", preco: 79.9, comissaoPct: 14, vendas: 2340, rating: 4.6, afiliados: 167, loja: "Fashion Bag" },
    { nome: "Tenis Feminino Casual Plataforma Branco", preco: 119.9, comissaoPct: 12, vendas: 1670, rating: 4.5, afiliados: 198, loja: "Trendy Shoes" },
    { nome: "Oculos Sol Feminino Polarizado UV400", preco: 39.9, comissaoPct: 18, vendas: 3890, rating: 4.7, afiliados: 145, loja: "Eyewear BR", cupomDisponivel: true, cupomValor: "20%" }
  ],
  papelaria: [
    { nome: "Planner Permanente Capa Dura A5 Daily", preco: 39.9, comissaoPct: 16, vendas: 2890, rating: 4.8, afiliados: 134, loja: "Plan Easy" },
    { nome: "Kit Marca Texto Pastel 6 Cores Brush", preco: 19.9, comissaoPct: 19, vendas: 4520, rating: 4.7, afiliados: 187, loja: "Color Pen" }
  ],
  infantil: [
    { nome: "Brinquedo Educativo Encaixe Madeira Logica", preco: 49.9, comissaoPct: 17, vendas: 2340, rating: 4.8, afiliados: 112, loja: "Educa Toys" },
    { nome: "Pelucia Gigante Urso 60cm Macia", preco: 89.9, comissaoPct: 14, vendas: 1890, rating: 4.7, afiliados: 156, loja: "Fofura Kids" }
  ],
  automotivo: [
    { nome: "Aspirador Automotivo Portatil 12V 6000pa", preco: 89.9, comissaoPct: 22, vendas: 2890, rating: 4.6, afiliados: 134, loja: "Auto Clean" },
    { nome: "Suporte Celular Carro Magnetico Saida Ar", preco: 24.9, comissaoPct: 26, vendas: 4520, rating: 4.7, afiliados: 198, loja: "Drive Smart" }
  ]
};

let mockCounter = 0;

export function gerarProdutosMock(nichoId: string, quantidade = 8): Produto[] {
  const base = MOCK_PRODUTOS[nichoId] || MOCK_PRODUTOS.beleza;
  const agora = new Date().toISOString();
  const agoraSec = Math.floor(Date.now() / 1000);
  return base.slice(0, quantidade).map((p, i) => {
    mockCounter++;
    const precoOriginal = (p.preco || 0) * 1.4;
    const cmsPct = p.comissaoPct || 5;
    return {
      id: `${nichoId}-mock-${mockCounter}`,
      itemId: 100000 + mockCounter,
      shopId: 99000 + (i % 5),
      nome: p.nome || "Produto",
      imagem: `https://picsum.photos/seed/${nichoId}${i}/400/400`,
      preco: p.preco || 0,
      precoOriginal,
      comissaoPct: cmsPct,
      comissaoExtraPct: 0,
      comissaoValor: ((p.preco || 0) * cmsPct) / 100,
      comissaoNovoUsuarioPct: cmsPct + 5,
      vendas: p.vendas || 0,
      rating: p.rating || 4.5,
      afiliados: p.afiliados || 0,
      estoque: 1000 - (p.vendas || 0) % 800,
      loja: p.loja || "Loja Shopee",
      lojaOficial: i % 3 === 0,
      lojaPreferred: i % 4 === 0,
      shopType: i % 3 === 0 ? ["3"] : (i % 4 === 0 ? ["1"] : []),
      categoria: nichoId,
      nichoId,
      linkAfiliado: `https://s.shopee.com.br/mock-${nichoId}-${mockCounter}`,
      linkProduto: `https://shopee.com.br/product/${99000 + i}/${100000 + mockCounter}`,
      videosAprenderCriadores: Math.floor(Math.random() * 50) + 10,
      cupomDisponivel: p.cupomDisponivel || false,
      cupomValor: p.cupomValor,
      inicioOferta: agoraSec - (i * 86400),
      fimOferta: agoraSec + (15 * 86400),
      scoreOportunidade: 0,
      garimpadoEm: agora
    };
  });
}
