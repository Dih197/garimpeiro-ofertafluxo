import OpenAI from "openai";
import type { Produto, Roteiro } from "./types";
import { lerConfig, MODELOS_PADRAO, type LLMProvider } from "./configs";
import {
  ESTILOS_ROTEIRO,
  HASHTAGS_BASE,
  HASHTAGS_NICHO,
  PROBLEMAS_NICHO,
  CTAS_VALIDADOS,
  PALAVRAS_BANIDAS,
  type EstiloRoteiro
} from "./shopee-knowledge";
import { ESP_SHOPEE_META_KNOWLEDGE, ESP_SHOPEE_META_RESUMO } from "./esp-shopee-meta";

// Pra cada chamada, escolher 3 estilos diferentes pra dar variedade
const ESTILOS_PADRAO: EstiloRoteiro[] = ["dor", "descoberta", "curiosidade"];

// =====================================================================
// SYSTEM PROMPT MASTER (treinado com docs Shopee + best practices)
// =====================================================================
const SYSTEM_PROMPT_MASTER = `Você é Roteirista Shopee Vídeo BR especialista em copywriting de afiliado de alta conversão.

CONHECIMENTO TREINADO DAS DIRETRIZES OFICIAIS SHOPEE:

ALGORITMO (sinais que ranqueiam, em ordem de peso):
1. Retenção 3s: >70% das pessoas continuam após 3s. Esse é o sinal MAIS importante.
2. Click no carrinho: o algoritmo Shopee mede taxa de clique no ícone do produto. Distribui muito mais quem gera intenção comercial.
3. Watch time: >60% completion rate.
4. Engajamento: likes, comentários, saves, shares.
5. Consistência de nicho: o algoritmo etiqueta perfis por tema.

ESTRUTURA DO VÍDEO (15-20s no total - CURTO E ATEMPORAL):
- 0-3s: GANCHO (capturar atenção, tom natural)
- 3-8s: BENEFÍCIO (por que vale a pena - sem mencionar preço)
- 8-15s: DEMONSTRAÇÃO (mostrar produto em uso real)
- 15-20s: CTA (chamada suave: "link no carrinho")

REGRAS DE COPY (SEMPRE seguir):
- Tom: português brasileiro coloquial, ORGÂNICO, conversa de amiga, NÃO COMERCIAL
- Som ATEMPORAL — vídeo precisa funcionar daqui 6 meses (não datar)
- 1ª pessoa: "eu testei", "eu comprei", "eu uso"
- Frases curtas, naturais (máx 10 palavras no gancho)
- Verbos no presente, ativos
- Começar DIRETO pelo gancho. NUNCA "olá pessoal", "oi gente", "hoje eu vou"
- Política de Relevância: o roteiro DEVE descrever exatamente o produto linkado, sem dispersão

🚫 PROIBIDO ABSOLUTAMENTE (vai datar o vídeo):
- ❌ NUNCA mencionar preço: "R$X", "X reais", "X conto", "tá custando X"
- ❌ NUNCA mencionar promoção/desconto numérico: "X% off", "metade do preço"
- ❌ NUNCA mencionar valor da compra ou comissão
- ❌ NUNCA mencionar prazo da oferta: "X dias restantes", "amanhã acaba"
- ❌ NUNCA mencionar número de vendas exato: "13 mil vendas" (data o vídeo)
- ✅ Pode dizer: "achadinho", "barato", "vale demais", "achei na promo"
- ✅ Pode dizer: "muita gente comprou", "tá viralizando", "tô vendo todo mundo usando"

Lembre: o objetivo é vídeo ATEMPORAL que funcione em qualquer mês. O preço, comissão, prazo e contagem de vendas mudam o tempo todo.

CTA — sempre suave e natural (nunca "corre pra comprar agora"):
- "Link tá no carrinho amarelinho aqui embaixo"
- "Deixei o link aí, dá uma olhada"
- "Tá no produto fixado, é só clicar"
- "Coloquei o link pra você ver"
- "Quer testar? Tá no carrinho"

PALAVRAS BANIDAS (Anvisa + Shopee policy - NUNCA usar):
${PALAVRAS_BANIDAS.map(p => `  - "${p}"`).join("\n")}

CLAIMS PROIBIDAS pra cosméticos, alimentos, suplementos:
- Não prometer cura, tratamento, prevenção de doença
- Não usar "milagroso", "garantido 100%", "infalível"
- Substituir por linguagem real: "eu uso", "minha pele ficou assim", "senti diferença"

ESTILOS DE ROTEIRO (treinados, escolha conforme contexto):
${Object.entries(ESTILOS_ROTEIRO).map(([k, v]) =>
  `- ${k}: ${v.nome}\n  Quando: ${v.quando_usar}\n  Estrutura: ${v.estrutura}`
).join("\n")}

CTAs validados pra Shopee Vídeo (use variações destes):
${CTAS_VALIDADOS.map(c => `  - "${c}"`).join("\n")}

ESTILO UGC (User Generated Content) — REGRAS ESPECIAIS:
- Tom super natural, casual, "amiga conversando com amiga"
- Permite hesitação, "tipo assim", "sabe?", "olha só"
- Sem produção comercial. Sem teatralidade. Sem "olha esse produto incrível!"
- Storytelling de uso real: "Tô usando há 5 dias", "minha amiga indicou", "comprei e tava com receio"
- CTA suave, sem urgência forçada: "Se vocês quiserem testar também, deixei o link"
- Pode incluir mini imperfeições: "ainda não terminei o frasco", "uso de manhã e à noite"
- Foco na EXPERIÊNCIA pessoal, não no produto

ESTILO UNBOXING (Produto na mão) — REGRAS ESPECIAIS:
- Foco em mostrar o produto FÍSICO ao vivo, na mão
- Storytelling do desempacotamento: "tirando da caixa", "primeira vez vendo"
- Detalhes táteis: "veio bem embalado", "olha o peso", "qualidade do acabamento"
- Reações reais e espontâneas: "nossa, é maior do que imaginei"
- Câmera close no produto (mãos > rosto)
- Verbos sensoriais: "toca", "gira", "vê o tamanho"
- CTA mostrando que acabou de receber: "comprei aqui, link na descrição"
- Indicado pra produtos que valorizam o "ver pra crer"

OBJETIVO: roteiros que prendem 3s, geram cliques no produto, e convertem em vendas reais. Roteiro que não vende é roteiro descartável.

${ESP_SHOPEE_META_RESUMO}`;

// =====================================================================
// FALLBACK INTELIGENTE (quando IA não disponível)
// =====================================================================
function gerarRoteiroFallback(produto: Produto, estilo: EstiloRoteiro): Roteiro {
  const styleData = ESTILOS_ROTEIRO[estilo];
  const ganchos = styleData.exemplos_gancho;
  const ganchoTpl = ganchos[Math.floor(Math.random() * ganchos.length)];

  const problemas = PROBLEMAS_NICHO[produto.nichoId] || ["essa coisa chata"];
  const problema = problemas[Math.floor(Math.random() * problemas.length)];

  // Popularidade ATEMPORAL (sem número exato)
  const popularidade = produto.vendas >= 10000
    ? "muita gente tá comprando"
    : produto.vendas >= 5000
    ? "tá viralizando"
    : produto.vendas >= 1000
    ? "tem bastante gente comprando"
    : "ainda pouca gente conhece";

  const gancho = ganchoTpl
    .replace("[PROBLEMA]", problema)
    .replace("[PRECO]", "barato") // substitui preço por palavra atemporal
    .replace(/só R\$\[PRECO\]/g, "muito barato")
    .replace("[VENDAS]", popularidade)
    .replace("[ALTERNATIVA]", "o de antes");

  const nomeCorto = produto.nome.split(" ").slice(0, 5).join(" ");
  const ehBemAvaliado = produto.rating >= 4.7;

  // Benefícios curtos (12-18 palavras, atemporais, sem preço/vendas exatas)
  const beneficios: Record<string, string> = {
    dor: `Eu vivia com ${problema} e descobri esse ${nomeCorto}. ${ehBemAvaliado ? "As avaliações são incríveis" : "É bem avaliado"} e mudou minha rotina.`,
    descoberta: `Esse ${nomeCorto} é um achadinho. ${popularidade.charAt(0).toUpperCase() + popularidade.slice(1)} e a qualidade vale demais.`,
    curiosidade: `Sabe quando você acha algo que ninguém comenta? Esse ${nomeCorto} ${popularidade}, e a galera tá amando.`,
    comparacao: `Antes lutava com ${problema}. Agora uso esse ${nomeCorto} e dá pra ver a diferença na hora.`,
    "prova-social": `Esse ${nomeCorto} ${popularidade}. ${ehBemAvaliado ? "Avaliações ótimas" : "Bem avaliado"}. Eu também caí na onda e tô feliz.`,
    asmr: `Esse ${nomeCorto} é tão satisfatório. O som, a textura, o resultado — vicia mesmo.`,
    ugc: `Gente, comprei esse ${nomeCorto} faz uns dias e tô achando incrível. ${ehBemAvaliado ? "As avaliações fazem sentido" : "Recomendo"}.`,
    unboxing: `Acabou de chegar o ${nomeCorto}. ${popularidade.charAt(0).toUpperCase() + popularidade.slice(1)}. Veio bem embalado, vou abrir aqui.`
  };
  const beneficio = beneficios[estilo] || beneficios.descoberta;

  // Demonstrações curtas (15-25 palavras, sem preço/datado)
  const demonstracoes: Record<string, string> = {
    dor: `Olha como resolve: vou mostrar. É simples de usar, não dá trabalho. Tô usando todo dia e amo.`,
    descoberta: `Vou mostrar de pertinho. Repara no acabamento, no tamanho. Tô usando direto e gostando muito.`,
    curiosidade: `Olha como funciona. Você usa assim. Testei alguns dias e o resultado me surpreendeu.`,
    comparacao: `Olha o antes… e agora o depois. Mesma situação, com esse ${nomeCorto}. Diferença na hora.`,
    "prova-social": `Vou mostrar como uso. Aplico assim, da forma natural. O resultado vem rápido, é por isso que viraliza.`,
    asmr: `Olha esse som, essa textura. Vou repetir pra você sentir. É terapêutico de assistir.`,
    ugc: `Tô usando assim, de manhã e à noite. Sinceramente? Não esperava, mas tô surpresa. Recomendo demais.`,
    unboxing: `Tirando da embalagem. Olha o tamanho, toca a textura. Acabamento bom. Vou testar rapidinho.`
  };
  const demonstracao = demonstracoes[estilo] || demonstracoes.descoberta;

  // CTA suave e atemporal (sem urgência forçada, sem mencionar valor)
  const ctasSuaves = [
    "Link tá no carrinho amarelinho aqui embaixo, dá uma olhada.",
    "Deixei o link no produto fixado, é só clicar.",
    "Tá no carrinho amarelinho, quer testar?",
    "Coloquei o link aqui pra você ver de perto.",
    "Link tá fixado no produto, dá uma conferida."
  ];
  const ctaBase = ctasSuaves[Math.floor(Math.random() * ctasSuaves.length)];
  const cta = produto.cupomDisponivel
    ? `${ctaBase} Tem cupom ativo, aproveita.`
    : ctaBase;

  return {
    id: `${produto.id}-${estilo}-${Date.now()}`,
    produtoId: produto.id,
    estilo,
    gancho,
    beneficio,
    demonstracao,
    cta,
    duracaoEstimada: 18, // 15-20s alvo
    hashtags: hashtagsPorNicho(produto.nichoId),
    criadoEm: new Date().toISOString()
  };
}

function hashtagsPorNicho(nicho: string): string[] {
  return [...HASHTAGS_BASE, ...(HASHTAGS_NICHO[nicho] || [])];
}

// =====================================================================
// PROMPT DO USUÁRIO (passa o produto + contexto)
// =====================================================================
function montarPromptUser(produto: Produto, quantidade: number, estilos: EstiloRoteiro[]): string {
  // Categoria simbólica de popularidade (sem dar número exato — atemporal)
  const popularidade = produto.vendas >= 10000
    ? "muito popular (milhares já compraram)"
    : produto.vendas >= 5000
    ? "viralizando (bastante gente comprando)"
    : produto.vendas >= 1000
    ? "ganhando tração (já tem público fiel)"
    : "achadinho (pouca gente conhece ainda)";

  const lojaInfo = produto.lojaOficial
    ? "Loja oficial (Shopee Mall) - tem credibilidade"
    : produto.lojaPreferred
    ? "Loja preferida com boa reputação"
    : "Loja regular";

  return `Crie ${quantidade} roteiros DIFERENTES (cada um em um estilo distinto) pra esse produto.

PRODUTO:
- Nome: ${produto.nome}
- Popularidade: ${popularidade}
- Avaliação: ${produto.rating.toFixed(1)} estrelas (em escala simbólica: ${produto.rating >= 4.7 ? "muito bem avaliado" : "bem avaliado"})
- Tipo de loja: ${lojaInfo}
- Nicho: ${produto.nichoId}
${produto.cupomDisponivel ? `- Tem cupom ativo (você pode dizer "tem cupom" sem mencionar valor)` : ""}

ESTILOS OBRIGATÓRIOS (1 roteiro de cada):
${estilos.map((e, i) => `${i + 1}. ${e}: ${ESTILOS_ROTEIRO[e].nome} - ${ESTILOS_ROTEIRO[e].quando_usar}`).join("\n")}

🎯 META: vídeos de 15-20 segundos, NATURAL e ATEMPORAL.

TAMANHOS (palavras aproximadas, soma deve dar ~50-65 palavras totais):
- gancho: 6-10 palavras, primeiros 3s, hook natural (não comercial)
- beneficio: 12-18 palavras, por que vale (sem números exatos), 1ª pessoa real
- demonstracao: 15-25 palavras, mostrar uso real, sensação, contexto do dia a dia
- cta: 8-12 palavras, suave e direto: "link tá no carrinho amarelinho"
- hashtags: 5-7 hashtags brasileiras (incluir #achadinhoshopee, #shopeebrasil, #shopeevideo + 2-3 do nicho)

🚫 PROIBIDO ABSOLUTAMENTE (datam o vídeo):
- NÃO MENCIONE PREÇO: "R$X", "X reais", "X conto", "barato por X"
- NÃO MENCIONE % DE DESCONTO: "30% off", "metade do preço"
- NÃO MENCIONE NÚMERO EXATO DE VENDAS: "13 mil pessoas compraram"
- NÃO MENCIONE PRAZO DE OFERTA: "acaba em X dias", "última semana"
- NÃO MENCIONE COMISSÃO DE AFILIADO

✅ PODE DIZER (atemporal):
- "barato", "vale demais", "achadinho"
- "muita gente tá comprando", "tá bombando", "tô vendo todo mundo usando"
- "muito bem avaliado", "as avaliações são incríveis"
- "tem cupom" (sem dizer o valor)

🌿 TOM ORGÂNICO E NATURAL (super importante):
- Sem teatralidade. Sem "olha esse produto INCRÍVEL!"
- Como se estivesse contando pra uma amiga, sem pressa
- Pode usar "tipo", "sabe", "olha", "gente" pra ficar natural
- Evite superlativos exagerados ("o melhor do mundo", "milagroso")
- Use linguagem REAL: "tô curtindo", "comprei e gostei", "tá indo bem"

Retorne APENAS JSON válido nesse formato:
{"roteiros":[
  {"estilo":"${estilos[0]}","gancho":"...","beneficio":"...","demonstracao":"...","cta":"...","hashtags":["#tag1","#tag2"]}
]}`;
}

// =====================================================================
// VALIDAÇÃO DO RESULTADO IA (filtra palavras banidas)
// =====================================================================
function contemPalavraBanida(texto: string): string | null {
  const lower = texto.toLowerCase();
  for (const p of PALAVRAS_BANIDAS) {
    if (lower.includes(p.toLowerCase())) return p;
  }
  return null;
}

// Detecta menções de preço/valor que datam o vídeo
function contemPrecoOuValor(texto: string): string | null {
  const lower = texto.toLowerCase();
  const padroes: Array<{ regex: RegExp; o_que: string }> = [
    // VALORES MONETÁRIOS
    { regex: /r\$\s*\d/i, o_que: "valor R$" },
    { regex: /\b\d{1,4}([.,]\d{2})?\s*reais?\b/i, o_que: "X reais" },
    { regex: /\b\d{1,3}\s*conto/i, o_que: "X conto" },
    { regex: /\b\d{1,2}\s*pila/i, o_que: "X pila" },
    // DESCONTOS
    { regex: /\b\d{1,3}\s*%/, o_que: "X%" },
    { regex: /metade\s+do\s+pre/i, o_que: "metade do preço" },
    // EXPRESSÕES DE COMPRA COM VALOR
    { regex: /custa\s+(s[óo]\s+)?\d/i, o_que: "custa X" },
    { regex: /paguei\s+(s[óo]\s+)?\d/i, o_que: "paguei X" },
    { regex: /apenas\s+r?\$?\s*\d/i, o_que: "apenas X" },
    { regex: /\b(de|por)\s+r\$/i, o_que: "de R$ / por R$" },
    // PRAZOS DA OFERTA
    { regex: /\bacaba\s+em\s+\d+\s*dia/i, o_que: "acaba em X dias" },
    { regex: /\b(amanh[ãa]|hoje)\s+acaba/i, o_que: "prazo de oferta" },
    { regex: /\b\d+\s*dias?\s+restantes?/i, o_que: "X dias restantes" },
    // NÚMEROS EXATOS DE VENDAS/AVALIAÇÕES (datam o vídeo)
    { regex: /\b\d{1,3}([.,]\d{3})*\s*(vendas|pessoas\s+compraram|compradores|unidades?\s+vendidas?)/i, o_que: "número exato de vendas" },
    { regex: /\b\d{1,4}\s*mil\s+(vendas|pessoas|unidades|compradores)/i, o_que: "número exato de vendas" },
    { regex: /\bmais\s+de\s+\d+\s*(mil|vendas|unidades|pessoas)/i, o_que: "mais de X vendas" },
    { regex: /\b\d{1,3}([.,]\d{3})+(?:\s*(vendas|unidades|pessoas))?/i, o_que: "número grande exato" },
    { regex: /\bnota\s+\d[.,]\d/i, o_que: "nota X.Y exata" }
  ];
  for (const p of padroes) {
    if (p.regex.test(lower)) return p.o_que;
  }
  return null;
}

function validarRoteiro(r: { gancho: string; beneficio: string; demonstracao: string; cta: string }): { ok: boolean; motivo?: string } {
  const todoTexto = `${r.gancho} ${r.beneficio} ${r.demonstracao} ${r.cta}`;
  const banida = contemPalavraBanida(todoTexto);
  if (banida) return { ok: false, motivo: `Contém palavra banida: "${banida}"` };
  const valor = contemPrecoOuValor(todoTexto);
  if (valor) return { ok: false, motivo: `Menciona ${valor} (data o vídeo)` };
  if (r.gancho.split(/\s+/).length > 15) return { ok: false, motivo: "Gancho muito longo (>15 palavras)" };
  // Tamanho total: 50-80 palavras pra 15-20s de fala
  const totalPalavras = todoTexto.split(/\s+/).length;
  if (totalPalavras > 90) return { ok: false, motivo: `Roteiro muito longo (${totalPalavras} palavras > 90)` };
  if (!r.cta.toLowerCase().match(/carrinho|cupom|link|clica|toca|garante|conferida|olhada|fixado/i)) {
    return { ok: false, motivo: "CTA fraca, sem chamada de ação" };
  }
  return { ok: true };
}

// =====================================================================
// PROVEDORES LLM
// =====================================================================
type RoteiroIA = {
  estilo: string;
  gancho: string;
  beneficio: string;
  demonstracao: string;
  cta: string;
  hashtags?: string[];
};

function parseJsonRoteiros(texto: string): RoteiroIA[] {
  const match = texto.match(/\{[\s\S]*\}/);
  const json = match ? match[0] : texto;
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed.roteiros) ? parsed.roteiros : [];
  } catch {
    return [];
  }
}

async function chamarOpenAI(apiKey: string, modelo: string, prompt: string): Promise<RoteiroIA[]> {
  const client = new OpenAI({ apiKey, timeout: 30_000 });
  const completion = await client.chat.completions.create({
    model: modelo || MODELOS_PADRAO.openai,
    messages: [
      { role: "system", content: SYSTEM_PROMPT_MASTER },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.85,
    max_tokens: 1800
  });
  const conteudo = completion.choices[0]?.message?.content;
  if (!conteudo) return [];
  return parseJsonRoteiros(conteudo);
}

async function chamarAnthropic(apiKey: string, modelo: string, prompt: string): Promise<RoteiroIA[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: modelo || MODELOS_PADRAO.anthropic,
      max_tokens: 1800,
      system: SYSTEM_PROMPT_MASTER,
      messages: [{ role: "user", content: prompt }]
    }),
    signal: AbortSignal.timeout(30_000)
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = await res.json() as { content?: Array<{ text?: string }> };
  return parseJsonRoteiros(data.content?.[0]?.text || "");
}

async function chamarGemini(apiKey: string, modelo: string, prompt: string): Promise<RoteiroIA[]> {
  const m = modelo || MODELOS_PADRAO.gemini;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${SYSTEM_PROMPT_MASTER}\n\n${prompt}` }] }],
      generationConfig: { temperature: 0.85, responseMimeType: "application/json", maxOutputTokens: 1800 }
    }),
    signal: AbortSignal.timeout(30_000)
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return parseJsonRoteiros(data.candidates?.[0]?.content?.parts?.[0]?.text || "");
}

// =====================================================================
// API PUBLICA
// =====================================================================
function escolherEstilos(produto: Produto, quantidade: number): EstiloRoteiro[] {
  // Escolhe estilos baseado no perfil do produto
  // SEMPRE inclui UGC (converte mais por parecer autêntico)
  // E SEMPRE inclui UNBOXING (alta retenção visual)
  const estilos: EstiloRoteiro[] = ["ugc", "unboxing"];

  // Se preço baixo (<R$50): adiciona "descoberta"
  if (produto.preco > 0 && produto.preco <= 50) estilos.push("descoberta");
  // Se vendas altas (>5k): adiciona "prova-social"
  if (produto.vendas >= 5000 && !estilos.includes("prova-social")) estilos.push("prova-social");
  // Sempre tem "dor" se nicho relacionado a problema
  if (PROBLEMAS_NICHO[produto.nichoId] && !estilos.includes("dor")) estilos.push("dor");
  // Adiciona curiosidade como variação
  if (estilos.length < quantidade) estilos.push("curiosidade");
  // Cozinha/casa/organização → ASMR
  if (["cozinha", "casa"].includes(produto.nichoId) && !estilos.includes("asmr") && estilos.length < quantidade) {
    estilos.push("asmr");
  }
  // Beleza → comparacao (antes/depois)
  if (produto.nichoId === "beleza" && !estilos.includes("comparacao") && estilos.length < quantidade) {
    estilos.push("comparacao");
  }

  // Garante quantidade exata
  while (estilos.length < quantidade) {
    const fallback = ESTILOS_PADRAO.find(e => !estilos.includes(e));
    if (fallback) estilos.push(fallback);
    else break;
  }
  return estilos.slice(0, quantidade);
}

export async function gerarRoteirosIA(produto: Produto, quantidade = 3): Promise<Roteiro[]> {
  const provider = (lerConfig("LLM_PROVIDER") as LLMProvider) || "nenhum";
  const apiKey = lerConfig("LLM_API_KEY");
  const modelo = lerConfig("LLM_MODEL") || MODELOS_PADRAO[provider];

  const estilosEscolhidos = escolherEstilos(produto, quantidade);

  if (provider === "nenhum" || !apiKey) {
    return estilosEscolhidos.map((e) => gerarRoteiroFallback(produto, e));
  }

  const prompt = montarPromptUser(produto, quantidade, estilosEscolhidos);
  let roteiros: RoteiroIA[] = [];

  try {
    if (provider === "openai") roteiros = await chamarOpenAI(apiKey, modelo, prompt);
    else if (provider === "anthropic") roteiros = await chamarAnthropic(apiKey, modelo, prompt);
    else if (provider === "gemini") roteiros = await chamarGemini(apiKey, modelo, prompt);
  } catch (err) {
    console.error(`[IA ${provider}] falhou:`, (err as Error).message);
  }

  // Validar e filtrar palavras banidas
  const validos: RoteiroIA[] = [];
  for (const r of roteiros) {
    const v = validarRoteiro(r);
    if (v.ok) validos.push(r);
    else console.warn(`[IA] roteiro descartado: ${v.motivo}`);
  }

  if (!validos.length) {
    console.warn("[IA] todos roteiros invalidos, usando fallback");
    return estilosEscolhidos.map((e) => gerarRoteiroFallback(produto, e));
  }

  return validos.slice(0, quantidade).map((r, i): Roteiro => {
    const estiloRaw = (r.estilo as Roteiro["estilo"]) || "descoberta";
    return {
      id: `${produto.id}-${provider}-${Date.now()}-${i}`,
      produtoId: produto.id,
      estilo: estiloRaw,
      gancho: r.gancho,
      beneficio: r.beneficio,
      demonstracao: r.demonstracao,
      cta: r.cta,
      duracaoEstimada: 22,
      hashtags: r.hashtags && r.hashtags.length ? r.hashtags : hashtagsPorNicho(produto.nichoId),
      criadoEm: new Date().toISOString()
    };
  });
}

export function temIA(): boolean {
  const provider = lerConfig("LLM_PROVIDER");
  const key = lerConfig("LLM_API_KEY");
  return Boolean(provider && provider !== "nenhum" && key);
}

export async function testarLLM(provider: LLMProvider, apiKey: string, modelo?: string): Promise<{ ok: boolean; mensagem: string; amostra?: string }> {
  if (!apiKey) return { ok: false, mensagem: "API key vazia" };
  const promptTeste = `Responda apenas com este JSON valido: {"ok":true,"saudacao":"oi"}`;
  try {
    let resposta: string = "";
    if (provider === "openai") {
      const c = new OpenAI({ apiKey, timeout: 30_000 });
      const r = await c.chat.completions.create({
        model: modelo || MODELOS_PADRAO.openai,
        messages: [{ role: "user", content: promptTeste }],
        max_tokens: 50,
        response_format: { type: "json_object" }
      });
      resposta = r.choices[0]?.message?.content || "";
    } else if (provider === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: modelo || MODELOS_PADRAO.anthropic,
          max_tokens: 50,
          messages: [{ role: "user", content: promptTeste }]
        }),
        signal: AbortSignal.timeout(30_000)
      });
      if (!r.ok) {
        const txt = await r.text();
        return { ok: false, mensagem: `Anthropic ${r.status}: ${txt.slice(0, 150)}` };
      }
      const d = await r.json() as { content?: Array<{ text?: string }> };
      resposta = d.content?.[0]?.text || "";
    } else if (provider === "gemini") {
      const m = modelo || MODELOS_PADRAO.gemini;
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: promptTeste }] }] }),
        signal: AbortSignal.timeout(30_000)
      });
      if (!r.ok) {
        const txt = await r.text();
        return { ok: false, mensagem: `Gemini ${r.status}: ${txt.slice(0, 150)}` };
      }
      const d = await r.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      resposta = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }
    return { ok: Boolean(resposta), mensagem: "Conectado!", amostra: resposta.slice(0, 100) };
  } catch (e) {
    return { ok: false, mensagem: (e as Error).message };
  }
}

// =====================================================================
// CONSULTA ESPECIALISTA — Skill esp_shopee_meta + Tool Use Nível 2
// =====================================================================
// Permite o user fazer perguntas livres ao especialista sênior em afiliação
// Shopee + Meta Ads, recebendo resposta direta, numérica e acionável.
// O LLM pode propor uma AÇÃO executável (pausar/ativar/escalar/gerar_link)
// que o user aprova com 1 clique pra rodar via API.
const SYSTEM_PROMPT_ESPECIALISTA = `Você é um especialista sênior em afiliação Shopee + Meta Ads no Brasil em 2026, com 5+ anos rodando campanhas próprias e consultando para outros afiliados de alta performance.

${ESP_SHOPEE_META_KNOWLEDGE}

REGRAS DE RESPOSTA (segue à risca):
1. Português brasileiro coloquial mas técnico, direto ao ponto
2. SEMPRE numérico (CPC R$ 0,15, não "CPC baixo"; 5 dias, não "alguns dias")
3. SEMPRE traz uma AÇÃO concreta no fim ("amanhã 9h, suba +50%")
4. Cite o "porquê" técnico sempre (cookie 7d, atribuição, fase aprendizado, etc.)
5. NÃO use jargão sem explicar (ABO, CBO, CTR, CPM, CPA — explica na 1ª vez)
6. Resposta MÁX 200 palavras, formato direto, sem introdução desnecessária
7. NÃO fale "espero ter ajudado", "qualquer dúvida pergunte" — é direto e profissional
8. Se a pergunta for vaga, peça UM dado específico (não 5 perguntas)
9. NUNCA invente número — se não souber benchmark, diga "depende, mas pra X situação..."
10. Tom: amigo experiente que respeita o tempo do user

FORMATO DE RESPOSTA — RETORNE SEMPRE JSON com 2 campos:
{
  "resposta": "texto explicativo em pt-BR (segue regras acima)",
  "acao": null OU { "tipo": ..., "alvoId": ..., "alvoTipo": ..., "percentual": ..., "produtoUrl": ..., "subIds": [...], "descricao": "..." }
}

QUANDO PROPOR AÇÃO (campo "acao"):
- Só proponha 1 ação concreta. Se a recomendação tiver várias etapas, escolha a MAIS importante AGORA.
- "tipo" deve ser um destes:
  • "pausar_ad" → pausar anúncio com prejuízo. Requer { adId }
  • "ativar_ad" → reativar anúncio pausado. Requer { adId }
  • "escalar_orcamento" → subir/descer orçamento. Requer { alvoId (campaign_id ou adset_id), alvoTipo: "campaign"|"adset", percentual (de -100 a +100, recomendado +50 ou -25) }
  • "gerar_link_shopee" → gerar link com sub_ids. Requer { produtoUrl, subIds: [sub_id_1, sub_id_2, ...] }
- Use os IDs reais do contexto da campanha (adId, alvoId vêm dos dados que você recebe)
- "descricao" deve ser uma frase curta em pt-BR pro user entender o que vai acontecer (ex: "Pausar Anuncio 02 - CPC R$ 0,80 + 0 vendas")
- NUNCA proponha ação se a pergunta for de informação geral ("o que é cookie 7d?") — só se houver decisão concreta sobre uma campanha específica
- NUNCA proponha escalar > +50% nem reduzir > -25% (regra que mata aprendizado)
- NUNCA proponha pausar com 1 dia ruim (cookie 7d demora consolidar)

Se NÃO houver ação clara: "acao": null`;

export type AcaoSugeridaIA =
  | { tipo: "pausar_ad"; adId: string; descricao: string }
  | { tipo: "ativar_ad"; adId: string; descricao: string }
  | { tipo: "escalar_orcamento"; alvoId: string; alvoTipo: "campaign" | "adset"; percentual: number; descricao: string }
  | { tipo: "gerar_link_shopee"; produtoUrl: string; subIds: string[]; descricao: string };

export type ConsultaEspecialistaResposta = {
  ok: boolean;
  resposta?: string;
  acao?: AcaoSugeridaIA | null;
  erro?: string;
};

function parseConsultaJson(texto: string): { resposta: string; acao: AcaoSugeridaIA | null } {
  // Tenta extrair JSON
  const match = texto.match(/\{[\s\S]*\}/);
  const json = match ? match[0] : texto;
  try {
    const parsed = JSON.parse(json) as { resposta?: string; acao?: AcaoSugeridaIA | null };
    return {
      resposta: parsed.resposta || texto,
      acao: parsed.acao || null
    };
  } catch {
    return { resposta: texto, acao: null };
  }
}

export async function consultarEspecialista(
  pergunta: string,
  contextoExtra?: string
): Promise<ConsultaEspecialistaResposta> {
  const provider = lerConfig("LLM_PROVIDER") as LLMProvider;
  const apiKey = lerConfig("LLM_API_KEY");
  const modelo = lerConfig("LLM_MODEL");

  if (!provider || provider === "nenhum" || !apiKey) {
    return {
      ok: false,
      erro: "Configure um LLM em /configuracoes (OpenAI, Claude ou Gemini) pra consultar o especialista"
    };
  }

  const userMessage = contextoExtra
    ? `CONTEXTO ATUAL DA CAMPANHA:\n${contextoExtra}\n\nPERGUNTA:\n${pergunta}`
    : pergunta;

  try {
    let texto = "";
    if (provider === "openai") {
      const client = new OpenAI({ apiKey, timeout: 30_000 });
      const r = await client.chat.completions.create({
        model: modelo || MODELOS_PADRAO.openai,
        messages: [
          { role: "system", content: SYSTEM_PROMPT_ESPECIALISTA },
          { role: "user", content: userMessage }
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
        max_tokens: 800
      });
      texto = r.choices[0]?.message?.content || "";
    } else if (provider === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: modelo || MODELOS_PADRAO.anthropic,
          max_tokens: 800,
          system: SYSTEM_PROMPT_ESPECIALISTA,
          messages: [{ role: "user", content: userMessage }]
        }),
        signal: AbortSignal.timeout(30_000)
      });
      if (!r.ok) return { ok: false, erro: `Anthropic ${r.status}: ${(await r.text()).slice(0, 200)}` };
      const d = await r.json() as { content?: Array<{ text?: string }> };
      texto = d.content?.[0]?.text || "";
    } else if (provider === "gemini") {
      const m = modelo || MODELOS_PADRAO.gemini;
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${SYSTEM_PROMPT_ESPECIALISTA}\n\n${userMessage}` }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 800, responseMimeType: "application/json" }
        }),
        signal: AbortSignal.timeout(30_000)
      });
      if (!r.ok) return { ok: false, erro: `Gemini ${r.status}: ${(await r.text()).slice(0, 200)}` };
      const d = await r.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      texto = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    if (!texto) return { ok: false, erro: "LLM não retornou resposta" };
    const { resposta, acao } = parseConsultaJson(texto);
    return { ok: true, resposta, acao };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}
