# Garimpeiro · Shopee Affiliate AI

> Esteira inteligente de produtos + roteiros pra escalar como afiliado Shopee Vídeo.
> Roda 100% local, com fallback de mock e IA opcional.

App web completo que **toda manhã** garimpa os melhores produtos da Shopee, aplica filtros estratégicos (comissão > 9%, afiliados < 300, vendas > 1k), gera **3 roteiros prontos com IA** pra cada produto e te entrega tudo num painel premium pronto pra você gravar e postar.

---

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19**
- **TypeScript** estrito + **Tailwind CSS**
- **Lucide React** (sem emojis na UI — só nichos têm emoji decorativo)
- **better-sqlite3** local (sem dependência externa de DB)
- **OpenAI** opcional pra roteiros (cai em template inteligente se sem chave)
- **Shopee Open Platform** Affiliate GraphQL (assinatura SHA256 HMAC implementada)

---

## Setup rápido (3 min)

```bash
# 1. instale deps
cd garimpeiro
npm install

# 2. crie seu .env.local a partir do template
cp .env.local.example .env.local

# 3. (opcional) edite .env.local com suas chaves reais
# - SHOPEE_APP_ID e SHOPEE_PARTNER_KEY (Open Platform)
# - OPENAI_API_KEY (opcional, gera roteiros melhores)
# - USE_MOCK_DATA=true mantém funcionando sem API liberada

# 4. rode em dev
npm run dev
# abra http://localhost:3000
```

Build de produção:

```bash
npm run build && npm start
```

---

## Como usar

1. **Configure nichos**: abra `/nichos`, ative os que vai rastrear (recomendado: 3 no máximo no início)
2. **Clique em "Garimpar agora"** no dashboard. Em segundos:
   - Sistema bate na API Shopee (ou mock se não configurada)
   - Aplica filtros estratégicos
   - Gera 3 roteiros IA por produto top
   - Salva tudo no SQLite local
3. **Use os cards**: clique em "Roteiros" pra ver/copiar, "Link" pra copiar link de afiliado
4. **Histórico** em `/historico` mostra tudo que já garimpou (evita repetir)

---

## Cron diário às 7h (Windows Task Scheduler)

O endpoint `GET /api/cron` dispara o garimpo. Pra automatizar:

```powershell
# Crie uma tarefa que executa diariamente às 7h:
schtasks /create /tn "GarimpeiroShopee" /tr "curl -X GET -H \"Authorization: Bearer SEU_CRON_SECRET\" http://localhost:3000/api/cron" /sc daily /st 07:00
```

(certifique-se que o app esteja rodando — ou use `pm2`/`forever` pra mantê-lo up)

---

## Estrutura

```
garimpeiro/
├── app/
│   ├── page.tsx              ← Dashboard (top 60 produtos do dia)
│   ├── historico/            ← Histórico completo
│   ├── nichos/               ← Toggle e edição de palavras-chave
│   ├── intel/                ← Inteligência (em construção: roadmap)
│   ├── esteira/              ← Esteira de produção IA (roadmap)
│   ├── distribuicao/         ← Cross-posting multicanal (roadmap)
│   ├── analytics/            ← ROI e attribution (roadmap)
│   └── api/
│       ├── garimpar/         ← POST: roda garimpo + IA
│       ├── produtos/         ← GET: lista produtos
│       ├── roteiros/         ← GET/POST: roteiros por produto
│       ├── nichos/           ← GET/PATCH: gerenciar nichos
│       ├── historico/        ← GET: histórico + stats
│       └── cron/             ← GET (com Bearer): trigger diário
├── components/
│   ├── sidebar.tsx           ← Nav lateral
│   ├── stat-card.tsx         ← Cards de métrica
│   ├── produto-card.tsx      ← Card de produto premium
│   ├── produtos-grid.tsx     ← Grid + dialog
│   ├── roteiros-dialog.tsx   ← Modal de roteiros IA
│   ├── garimpar-button.tsx   ← Botão CTA principal
│   ├── filtros-bar.tsx       ← Filtros por nicho
│   └── em-breve.tsx          ← Placeholder dos módulos roadmap
├── lib/
│   ├── shopee.ts             ← Cliente Shopee + assinatura HMAC
│   ├── ai.ts                 ← OpenAI + fallback de templates
│   ├── db.ts                 ← SQLite (better-sqlite3)
│   ├── filters.ts            ← Score de oportunidade
│   ├── mock.ts               ← Dataset realista pra modo demo
│   ├── nichos.ts             ← 10 nichos pré-configurados
│   ├── types.ts              ← Tipos compartilhados
│   └── utils.ts              ← cn(), formatadores BRL/pct
└── data/                     ← SQLite mora aqui (gitignored)
```

---

## Estratégia aplicada

Filtros padrão (em `lib/types.ts > FILTRO_PADRAO`):

| Critério | Default | Por quê |
|---|---|---|
| Comissão mínima | 9% | Vácuo entre os 3% padrão e os 24%+ premium |
| Afiliados máximos | 300 | Foge da disputa do top 3 anúncios |
| Vendas mínimas | 1.000 | Garante demanda real |
| Rating mínimo | 4.5 | Qualidade pra não queimar reputação |

Score (0-100) considera: comissão, afiliados, vendas, rating, cupom, faixa de preço.

---

## Modos de operação

| Modo | Quando | Como ativar |
|---|---|---|
| **Mock** | API Shopee não liberada ainda | `USE_MOCK_DATA=true` no `.env.local` |
| **API Real** | Open Platform liberou Affiliate API | `USE_MOCK_DATA=false` + chaves preenchidas |
| **IA OpenAI** | Roteiros premium personalizados | Preencher `OPENAI_API_KEY` |
| **Templates** | Sem chave OpenAI | Funciona automaticamente — usa banco de ganchos validados |

---

## ⚠️ Segurança

- `.env.local` é gitignored — **nunca comite**.
- Se você expôs as chaves Shopee em qualquer canto público (chat, screenshot, repo), **gere novas no painel Open Platform**.
- Use `CRON_SECRET` forte se rodar exposto fora do localhost.

---

## Roadmap (módulos em construção)

Visíveis na sidebar como "em breve":

- 🕵️ **Inteligência** — Spy de concorrentes, trend predictor, reverse-search TikTok→Shopee, sazonalidade radar, detector de nicho virgem
- 🏭 **Esteira IA** — Avatar com seu rosto, voz clonada, ASMR generator, capa AI, A/B de gancho, editor automático
- 📡 **Distribuição** — Cross-poster (Shopee + Reels + TikTok + Kwai + Shorts + Face), Bot Telegram/WhatsApp, multi-conta
- 📊 **Analytics** — Sales attribution real, dashboard de faturamento, forecast, ROI por nicho, heatmap de retenção

---

## Comandos úteis

```bash
npm run dev           # dev server (localhost:3000)
npm run build         # build de produção
npm start             # roda build em produção
npm run lint          # ESLint
```

---

## Licença

Uso pessoal. Caso queira escalar como SaaS pra outros afiliados, é totalmente possível — é só adicionar auth + multi-tenant. Bons vídeos.
