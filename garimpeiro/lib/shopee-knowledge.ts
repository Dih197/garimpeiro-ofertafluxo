// =====================================================================
// BASE DE CONHECIMENTO SHOPEE VIDEO - Copy & Algoritmo (treinada 2026)
// Compilado das diretrizes oficiais da Shopee + best practices de top creators
// =====================================================================

// ---------------------------------------------------------------------
// SINAIS DO ALGORITMO (em ordem de peso)
// ---------------------------------------------------------------------
export const SINAIS_ALGORITMO = {
  retencao_3s: {
    peso: 10,
    meta: ">70% das pessoas continuam após 3s",
    como: "Gancho forte com promessa, dor ou número surpreendente"
  },
  click_carrinho: {
    peso: 10,
    meta: "Taxa alta de clique no ícone do produto",
    como: "CTA claro mencionando 'carrinho amarelinho' + urgência"
  },
  watch_time_completo: {
    peso: 8,
    meta: ">60% assistem até o fim",
    como: "Vídeo curto (15-25s) e com clímax no final"
  },
  engajamento: {
    peso: 6,
    meta: "Likes, comentários, saves, compartilhamentos",
    como: "Pergunta no final ou afirmação polêmica que gera comentário"
  },
  consistencia_nicho: {
    peso: 7,
    meta: "Algoritmo etiqueta perfis por tema",
    como: "Postar SEMPRE do mesmo nicho até o algoritmo classificar"
  },
  uso_recursos_nativos: {
    peso: 4,
    meta: "Música nativa Shopee + cupom ativo",
    como: "Adicionar música DENTRO do app, não no editor"
  }
} as const;

// ---------------------------------------------------------------------
// ESTRUTURA OFICIAL DO VÍDEO (15-20s - atemporal, sem preço)
// ---------------------------------------------------------------------
export const ESTRUTURA_VIDEO = {
  gancho: { inicio: 0, fim: 3, papel: "Capturar atenção - tom natural" },
  beneficio: { inicio: 3, fim: 8, papel: "Por que vale a pena (sem mencionar preço)" },
  demonstracao: { inicio: 8, fim: 15, papel: "Mostrar produto em uso real" },
  cta: { inicio: 15, fim: 20, papel: "Chamada suave: link no carrinho" }
} as const;

// ---------------------------------------------------------------------
// 6 ESTILOS DE ROTEIRO (treinados pra Shopee BR)
// ---------------------------------------------------------------------
export type EstiloRoteiro = "dor" | "descoberta" | "curiosidade" | "comparacao" | "prova-social" | "asmr" | "ugc" | "unboxing";

export const ESTILOS_ROTEIRO: Record<EstiloRoteiro, {
  nome: string;
  quando_usar: string;
  exemplos_gancho: string[];
  estrutura: string;
}> = {
  dor: {
    nome: "Dor → Solução (PAS)",
    quando_usar: "Produto resolve problema visível e recorrente",
    exemplos_gancho: [
      "Cansada de [PROBLEMA] toda semana?",
      "Eu vivia com [PROBLEMA] até descobrir isso.",
      "[PROBLEMA] te incomoda? Eu achei a solução.",
      "POV: você tinha [PROBLEMA] e agora resolveu.",
      "Tô fazendo isso há anos errado…"
    ],
    estrutura: "Problema → Agitação (frustração) → Solução (produto) → Resultado → CTA"
  },
  descoberta: {
    nome: "Descoberta / Achadinho",
    quando_usar: "Produto pouco conhecido, achadinho",
    exemplos_gancho: [
      "Olha esse achadinho que eu garimpei:",
      "Achei o segredo das blogueiras na Shopee.",
      "Esse aqui ninguém tá falando ainda…",
      "Garimpei e tô viciada nisso:",
      "Acho que descobri um achado:"
    ],
    estrutura: "Tom de descoberta → Mostra produto → Por que gosto → CTA suave"
  },
  curiosidade: {
    nome: "Curiosidade / Quebra de padrão",
    quando_usar: "Produto inusitado, diferente, conceito novo",
    exemplos_gancho: [
      "Descobri por que [VENDAS] pessoas pararam de comprar [ALTERNATIVA].",
      "POV: você descobriu o que mudou minha rotina.",
      "Olha o que eu testei e mudou tudo.",
      "Eu não esperava que isso funcionasse.",
      "Tá rolando uma coisa nova na Shopee…"
    ],
    estrutura: "Pergunta intrigante → Revelação progressiva → Aha moment → CTA"
  },
  comparacao: {
    nome: "Antes / Depois (Comparação)",
    quando_usar: "Transformação visual evidente (organização, beleza, casa)",
    exemplos_gancho: [
      "Antes vs depois usando esse produto:",
      "Olha minha cozinha ANTES… e DEPOIS:",
      "Mesmo lugar, 2 minutos de diferença.",
      "Comprei e mudou tudo. Compara aí:"
    ],
    estrutura: "Cena ANTES (caos) → corte → Cena DEPOIS (transformação) → CTA"
  },
  "prova-social": {
    nome: "Prova social / Validação",
    quando_usar: "Produto com 5k+ vendas e nota >4.7",
    exemplos_gancho: [
      "[VENDAS] pessoas já compraram. Agora eu entendi.",
      "Top 1 mais vendido da Shopee: testei e olha:",
      "Mais de [VENDAS] vendas só esse mês.",
      "Eu duvidei mas a galera tava certa…"
    ],
    estrutura: "Número impactante → Validação pessoal → Demonstração → CTA"
  },
  asmr: {
    nome: "ASMR / Satisfação visual",
    quando_usar: "Cozinha, organização, beleza, gadgets satisfatórios",
    exemplos_gancho: [
      "Esse som é viciante:",
      "Olha que satisfação:",
      "Eu poderia ficar olhando isso por horas.",
      "Sinto paz só de assistir."
    ],
    estrutura: "Visual satisfatório imediato → Som do produto → Repetição → CTA discreto"
  },
  ugc: {
    nome: "UGC / Recomendação de amigo",
    quando_usar: "Qualquer produto - converte muito por parecer autêntico, não anúncio",
    exemplos_gancho: [
      "Minha amiga me indicou e olha:",
      "Tô usando há [X] dias e preciso te contar:",
      "Comprei sem esperar nada e me surpreendi.",
      "Gente, vocês me pediram pra mostrar:",
      "Eu não acreditei até testar:",
      "Tô vivendo de comprar isso:",
      "Aceita um spoiler? Eu virei fã:",
      "Vou ser sincera com vocês:"
    ],
    estrutura: "Confissão pessoal autêntica → Contexto de uso real → Mostrar produto natural → Recomendação genuína (sem CTA agressivo)"
  },
  unboxing: {
    nome: "Unboxing / Produto na mão",
    quando_usar: "Qualquer produto físico - alta retenção pelo aspecto satisfatório de desempacotar",
    exemplos_gancho: [
      "Acabou de chegar, vou abrir aqui com vocês:",
      "Pedi na Shopee e olha o que veio:",
      "Adivinha o que eu acabei de receber:",
      "Tirando da caixa pela primeira vez:",
      "Spoiler: chegou e é maior do que imaginei.",
      "Olha esse pacotinho da Shopee, abrindo agora:",
      "Recebi hoje, vou abrir aqui:"
    ],
    estrutura: "Pacote/embalagem → Tira lentamente → Mostra produto na mão (close, gira) → Toca textura/peso → Demonstração rápida de uso → CTA"
  }
};

// ---------------------------------------------------------------------
// CTAs validados pra Shopee Vídeo
// ---------------------------------------------------------------------
export const CTAS_VALIDADOS = [
  "Clica no carrinho amarelinho aqui embaixo",
  "Eu deixei o cupom ativo, corre lá",
  "Tá saindo muito, garante o seu",
  "Coloquei 3 opções pra você escolher",
  "Link tá no produto fixado",
  "Toca no carrinho e olha o preço",
  "Aproveita que tá com cupom",
  "Marca alguém que precisa disso"
];

// ---------------------------------------------------------------------
// HASHTAGS POR NICHO (sempre + base shopee + nicho específico)
// ---------------------------------------------------------------------
export const HASHTAGS_BASE = ["#achadinhoshopee", "#shopeebrasil", "#shopeevideo", "#achadinhos2026"];

export const HASHTAGS_NICHO: Record<string, string[]> = {
  beleza: ["#maquiagem", "#skincare", "#beleza", "#makeup", "#rotinaskincare"],
  cozinha: ["#cozinha", "#donadecasa", "#receitasfaceis", "#organizacaocozinha"],
  casa: ["#decoracao", "#organizacao", "#casadecorada", "#casamoderna"],
  tech: ["#tecnologia", "#gadgets", "#celular", "#techbrasil"],
  pet: ["#petbrasil", "#cachorro", "#gato", "#vidadepet"],
  fitness: ["#fitness", "#treino", "#vidasaudavel", "#vidafit"],
  moda: ["#moda", "#look", "#fashion", "#lookdodia"],
  papelaria: ["#papelaria", "#planner", "#papelariaestetica"],
  infantil: ["#brinquedo", "#crianca", "#kids", "#presenteinfantil"],
  automotivo: ["#carrosbr", "#automotivo", "#carbr"]
};

// ---------------------------------------------------------------------
// PALAVRAS BANIDAS (Shopee + Anvisa) - NUNCA usar
// ---------------------------------------------------------------------
export const PALAVRAS_BANIDAS = [
  // Saúde / claims médicas (Anvisa proíbe pra cosméticos/alimentos/suplementos)
  "cura", "trata", "previne doença", "remédio", "medicamento",
  "emagrece sem esforço", "queima gordura", "antes e depois extremo",
  "100% garantia de resultado", "FDA aprovado", "milagroso", "milagre",
  "tratamento de", "elimina de vez",
  // Promessas exageradas
  "garantido", "infalível", "sem efeito colateral", "comprovado cientificamente",
  // Termos sensíveis
  "viciante", "dependência", "vício"
];

// ---------------------------------------------------------------------
// PROBLEMAS COMUNS POR NICHO (pra preencher [PROBLEMA] em ganchos)
// ---------------------------------------------------------------------
export const PROBLEMAS_NICHO: Record<string, string[]> = {
  beleza: ["maquiagem que derrete", "pele oleosa", "olheira escura", "cabelo ressecado", "unha quebradiça"],
  cozinha: ["bagunça na cozinha", "pia entupida", "geladeira desorganizada", "perder espaço de armazenamento"],
  casa: ["casa desorganizada", "móveis sem espaço", "guarda-roupa caótico", "sapatos espalhados"],
  tech: ["celular descarregando rápido", "fone com fio enrolado", "carregador que não funciona", "celular caindo da mesa"],
  pet: ["pelo do pet espalhado", "tigela vazia toda hora", "pet chorando sozinho", "coleira que machuca"],
  fitness: ["preguiça de academia", "garrafa esquecida", "calçado que dói", "treino sem resultado"],
  moda: ["look sem graça", "guarda-roupa repetitivo", "calçado apertado", "sapato que machuca"],
  papelaria: ["agenda bagunçada", "anotação perdida", "rotina desorganizada"],
  infantil: ["criança enjoada", "brinquedo que não dura", "presente sem ideia"],
  automotivo: ["carro sujo por dentro", "ar do carro com cheiro ruim", "porta-treco quebrado"]
};

// ---------------------------------------------------------------------
// REGRAS CRÍTICAS PRA EVITAR PUNIÇÃO
// ---------------------------------------------------------------------
export const REGRAS_CRITICAS = [
  "Roteiro DEVE descrever o produto EXATO linkado (Política de Relevância de Produto)",
  "NÃO prometer cura, tratamento, prevenção de doença pra cosméticos/suplementos",
  "NÃO usar marcas d'água ou logos de concorrentes",
  "NÃO copiar roteiros de outros creators integralmente",
  "Tom natural brasileiro - sem 'olá pessoal' nem teatralidade",
  "Frases curtas (máx 10 palavras por linha no gancho)",
  "1ª pessoa: 'eu testei', 'eu comprei', 'eu uso'",
  "Sempre validar com prova: vendas, nota, ou experiência pessoal",
  "Vídeo de 15-25 segundos máximo (algoritmo Shopee 2026)"
];
