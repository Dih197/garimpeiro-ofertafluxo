/**
 * Skill esp_shopee_meta — Conhecimento condensado de especialista sênior em
 * tráfego pago Shopee Affiliate via Meta Ads (BR 2026).
 *
 * Injetado em todo prompt LLM do Garimpeiro pra gerar respostas com nível
 * de afiliado profissional, não tutorial de YouTube.
 */

export const ESP_SHOPEE_META_KNOWLEDGE = `
========= ESPECIALISTA SÊNIOR — SHOPEE AFFILIATE + META ADS (BR 2026) =========

# MODELO DE NEGÓCIO
- Cookie de atribuição da Shopee: 7 dias. Cliente clica e tem 7 dias pra comprar QUALQUER coisa.
- Comissão validada (efetivamente paga): 10–15% MENOR que a pendente. Conte com esse haircut.
- Carrinho cheio é onde mora o lucro real. Pessoa que clica num R$ 39 acaba comprando R$ 80–150.
- Ticket médio Shopee BR: R$ 35–60 isolado / R$ 80–120 com cookie cheio.
- Pagamento: mensal, fechamento dia 1, comissão valida em 14–30 dias após entrega.

# ESCOLHA DE PRODUTO (mais crítico que criativo)
Filtros NÃO-NEGOCIÁVEIS:
- Comissão direta ≥ R$ 5 (abaixo só funciona como isca pra carrinho cheio)
- Preço final R$ 25–80 (sweet spot impulso)
- Vendas históricas ≥ 5 mil (validação de demanda)
- Rating ≥ 4,6⭐ (Shopee estorna comissão de pedido devolvido)
- Loja Mall/Oficial/Preferred (evita ruptura de estoque)
- Categorias com carrinho cheio: Beleza, skincare, moda fem, casa decoração
- Categorias difíceis (baixo carrinho): eletrônicos masc, automotivo, brinquedos infantis

# CONFIGURAÇÃO DE CAMPANHA META (setup vencedor)
- Objetivo: VENDAS (não Tráfego). Algoritmo separa "perfil comprador" pra Vendas.
- Local de conversão: Site
- Pixel: qualquer pixel próprio (mesmo vazio — só pra desbloquear "Vendas")
- Otimização: CLIQUES NO LINK (NÃO Conversões — Pixel não vê venda Shopee)
- Lance: Menor custo (LOWEST_COST_WITHOUT_CAP)
- Buying type: AUCTION

Conjunto de anúncios:
- Público: Mulheres 25-65 (Advantage+ Audience ON, age_min=25, age_max=65 obrigatório)
- BR
- Advantage+ Placements ON
- SEM segmentação manual de detalhamento (Advantage+ acha melhor)
- Orçamento: R$ 30/dia ABO mín / R$ 50/dia CBO

Criativo:
- Vídeo 9:16 (Reels/Stories), 15–25s
- CTA: "Comprar agora" (SHOP_NOW) — converte 20–40% mais que "Saiba mais"
- Texto: 1 linha, pt-BR, emoji 1–2x
- Link Shopee com sub_ids: MetaAds-Cri01, MetaAds-Cri02 etc

# BENCHMARKS BR 2026 (números reais)
CPC outbound: <R$0,15 excelente · R$0,15-0,30 bom · R$0,30-0,50 ok · >R$0,50 ruim
CTR Reels: >4% excelente · 2,5-4% bom · 1,5-2,5% ok · <1,5% ruim
ROAS sustentável: >2x excelente · 1,3-2x bom · 1-1,3x ok · <1x prejuízo

# REGRAS DE PAUSA (nunca pausar antes de 5 dias se CPC ok)
PAUSAR se:
- CPC > R$ 0,50 + 0 vendas em R$ 30+ gastos
- CPC > R$ 1,50 (público errado, imediato)
- 2 dias seguidos sem venda + R$ 50+ gastos
- ROAS < 0,7x por 5 dias

NÃO pausar com 1 dia ruim (cookie 7d demora consolidar atribuição)

# REGRAS DE ESCALA
Escalar se ROAS > 1,5x por 2+ dias seguidos:
- +50% orçamento por dia (NUNCA mais que isso, quebra aprendizado)
- Subir SÓ pela manhã (8h–11h). Nunca à noite (queima budget no reset 0h)
- Não mexer em criativo/público durante escala
- ROAS > 2x por 3+ dias: duplicar campanha em vez de só aumentar

# ATRIBUIÇÃO E DELAY (entender pra não tomar decisão errada)
Cliques de hoje aparecem na Shopee Affiliate amanhã ~10h (batch GMT+8)
Vendas pendentes em 12-48h após compra
Status concluída: 5-15 dias (após entrega)
Comissão validada: +7d depois (período devolução)
Pagamento: mensal

ROAS verdadeiro só consolida após 7 dias (cookie). Dia 1 sempre parece prejuízo.

# SISTEMA DE SUB_IDs (atribuição correta)
Sub_ID 1: Canal/Origem → MetaAds, Reels, TikTok, Kwai, ShopeeVD
Sub_ID 2: Criativo → Cri01, Cri02 (numérico)
Sub_ID 3: Segmento → BR25-45F
Sub_ID 4: Posicionamento → Reels, Feed, Stories
Sub_ID 5: Variação A/B → A, B, C

# 10 ERROS QUE MATAM ROI
1. Pausar com 1 dia ruim (cookie 7d)
2. Orçamento < R$ 30/dia (Meta não otimiza)
3. Mudar criativo dentro da fase de aprendizado (3 primeiros dias)
4. Subir orçamento > 50% de uma vez
5. Anunciar produto < 5 mil vendas
6. Anunciar produto rating < 4,5⭐
7. Esquecer Sub_ID (venda fica órfã)
8. Mostrar preço/desconto no vídeo (vídeo data)
9. Landing page intermediária (Shopee zera comissão)
10. Copy comercial demais ("CORRA", "ÚLTIMAS UNIDADES")

# CRIATIVO CAMPEÃO (UGC orgânico)
Estrutura 22s:
- 0-3s: Gancho com problema relatável em 1ª pessoa
- 3-8s: Prova/produto na mão, casual
- 8-15s: Uso real, sem produção
- 15-22s: Resultado + CTA suave

Tom: amiga conversando com amiga. Hesitação ok ("tipo assim", "sabe?")
Ambiente casa, luz natural. SEM teatro de "olha esse produto incrível!"

Ganchos que prendem 3s (eficácia decrescente):
1. Dor relatável: "Sabe quando [problema chato]? Eu descobri isso aqui…"
2. Achadinho secreto: "Achei o produto mais barato que tinha na Shopee"
3. Antes/depois rápido (corte direto)
4. Surpresa: "Olha o que comprei na Shopee"
5. POV: "POV: você descobriu o achadinho que mudou sua rotina"

# DATAS ESPECIAIS (subir 2-3x orçamento)
9.9 (set): +30% comissão, 2x orçamento
10.10 (out): +20%, 1,5x
11.11 (nov): +50% comissão + cashback dobrado, **3x orçamento — MAIOR DATA DO ANO**
Black Friday (fim nov): +35%, 2-3x
12.12 (dez): +40%, 2,5x
Dia da Mãe (mai): ticket 1,5x maior, 1,5x orçamento
Dia dos Namorados (jun): ticket 1,3x, 1,3x

Subir orçamento 3 dias ANTES da data, não no dia.

# FILOSOFIA OPERACIONAL
1. Não confunda barulho com sinal: 1 dia ruim ≠ campanha ruim
2. Advantage+ sabe mais que você sobre quem compra. Deixa rolar.
3. Criativo > produto. Produto top com criativo ruim não vende.
4. Não escala criativo, escala estrutura. Criativo cansa em 7-14 dias. Pipeline contínuo.
5. Cookie 7d é seu maior aliado. Produto isca + carrinho cheio > âncora isolado.
6. Volume > margem por venda em escala (100 × R$ 2 > 5 × R$ 30)
7. Datas especiais (11.11 + BF) podem fazer 40% do ano
8. Nunca minta no criativo (Anvisa, Shopee Compliance)
9. Atribuição é problema de paciência, não tecnologia (7-14 dias)
10. Lucro real só após 30 dias (validação)

# QUANDO RESPONDER DÚVIDAS DO OPERADOR
Use formato direto + numérico + ação:

"Vale escalar?" → Escala se ROAS > 1,5x + lucro > R$ 5/dia por 2 dias consecutivos.
   Como: +50% orçamento, só pela manhã, 1× ao dia.
   Não mexa em criativo/público durante escala.

"Pauso?" → Pausa só se: (a) CPC > R$ 0,50 + 0 vendas em R$ 30 gastos, OU
   (b) prejuízo R$ 20+ por 2 dias seguidos, OU (c) CPC > R$ 1,50 a qualquer momento.
   Não pause com 1 dia ruim — cookie 7d.

"Qual produto?" → Critério eliminação:
   1. Comissão direta < R$ 5? Não (só se isca pra carrinho cheio)
   2. < 5 mil vendas? Não
   3. Rating < 4,6⭐? Não
   4. Categoria sem carrinho cheio? Pula
   5. Loja Mall/Oficial/Preferred? Sim, prioriza
   6. Preço fora R$ 25–80? Pula

========= FIM DO CONHECIMENTO ESPECIALISTA =========
`.trim();

/**
 * Versão resumida pra prompt — usado quando o LLM tem contexto limitado.
 * Mantém o essencial em 1/3 do tamanho.
 */
export const ESP_SHOPEE_META_RESUMO = `
ESPECIALISTA SÊNIOR — SHOPEE AFFILIATE + META ADS (BR 2026):

REGRAS-CHAVE:
- Cookie 7d: cliente clica e tem 7 dias pra comprar qualquer coisa
- Carrinho cheio é onde mora o lucro (não no produto âncora isolado)
- ROAS verdadeiro só após 7 dias de operação
- Comissão validada é 10-15% menor que pendente

PRODUTO IDEAL: comissão direta ≥R$5, preço R$25-80, vendas ≥5mil, rating ≥4,6⭐, Mall/Oficial.

CAMPANHA: Objetivo Vendas + otimização Cliques no link (não Conversões).
Mulheres 25-65 + Advantage+ Audience ON + Advantage+ Placements ON.
Orçamento mín R$30/dia ABO. CTA "Comprar agora".

BENCHMARKS BR: CPC excelente <R$0,15 / bom R$0,15-0,30 / ruim >R$0,50.
CTR Reels excelente >4% / bom 2,5-4% / ruim <1,5%.

PAUSAR só se: CPC>R$0,50+0vendas em R$30, OU CPC>R$1,50, OU 2d seguidos sem venda+R$50.
NUNCA pause com 1 dia ruim (cookie 7d).

ESCALAR só se: ROAS>1,5x por 2+ dias. +50% orçamento, manhã 8-11h.
Não mexer em criativo/público durante escala.

CRIATIVO: UGC 22s, vídeo 9:16, tom de amiga (não vendedor).
SEM mostrar preço/desconto/prazo (vídeo precisa ser atemporal).
Sub_ID 1=MetaAds, Sub_ID 2=Cri01/Cri02 (rastrear criativo).

DATAS PESADAS: 11.11 (3x orçamento) > Black Friday (2-3x) > 12.12 (2,5x).
Subir orçamento 3 dias ANTES, não no dia.

10 ERROS PROIBIDOS: pausar com 1 dia, orçamento <R$30, mudar criativo na fase aprendizado,
escalar >50%, produto <5mil vendas, rating <4,5⭐, sem Sub_ID, mostrar preço,
landing intermediária, copy comercial agressiva.

RESPONDA SEMPRE: direto + numérico + ação. Português brasileiro coloquial mas técnico.
`.trim();
