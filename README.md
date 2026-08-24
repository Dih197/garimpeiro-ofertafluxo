# Garimpeiro + OfertaFluxo

Plataforma local de afiliados Shopee que reúne:

- **Garimpeiro**: descoberta de produtos, links com SubID, campanhas de grupos e painel de resultados.
- **OfertaFluxo**: central de ofertas, destinos próprios do WhatsApp, automação com limites de segurança e atividade operacional.

Os dois módulos compartilham dados operacionais sem expor credenciais: destinos autorizados, automação, proteções, integrações e atividade recente são sincronizados no Garimpeiro.

## Estrutura

- `garimpeiro/` — aplicação Next.js principal (porta 3000).
- `ofert/ofertafluxo-backup-main/` — módulo nativo de automação (porta 3001).

## Uso local

Cada módulo possui seu próprio `README.md` e arquivo `.env.example`. Copie os exemplos para arquivos `.env` locais e nunca envie credenciais, sessões ou bancos de dados ao repositório.

> Automação de WhatsApp deve ser usada exclusivamente em grupos próprios ou contatos com opt-in, respeitando as políticas aplicáveis das plataformas.
