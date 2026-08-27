import Database from "better-sqlite3";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import type { Nicho, Produto, Roteiro } from "./types";
import { NICHOS_PADRAO } from "./nichos";
import { classificarCanal, type CategoriaCanal, type TipoTrafego } from "./canais";
import { lerConfig } from "./configs";
import { dataHojeBR, dataUltimoFechamentoShopeeBR, timestampInicioDiaBR, timestampFimDiaBR } from "./datas";

/**
 * Retorna o app_id Shopee atualmente configurado. Usado pra isolar conversões por conta:
 * cada chave/app_id conectado vê apenas as vendas que ele próprio sincronizou.
 * Se não houver configuração, retorna string vazia (modo "ver tudo").
 */
function appIdShopeeAtual(): string {
  return lerConfig("SHOPEE_APP_ID") || "";
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "garimpeiro.db");

let _db: Database.Database | null = null;

function db(): Database.Database {
  if (_db) return _db;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const database = new Database(DB_PATH);
  database.pragma("journal_mode = WAL");
  database.pragma("busy_timeout = 5000");
  database.pragma("synchronous = NORMAL");
  database.pragma("foreign_keys = ON");
  inicializarSchema(database);
  _db = database;
  return database;
}

function inicializarSchema(d: Database.Database) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS nichos (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      emoji TEXT NOT NULL,
      palavras_chave TEXT NOT NULL,
      ativo INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS produtos (
      id TEXT PRIMARY KEY,
      item_id INTEGER,
      shop_id INTEGER,
      nome TEXT NOT NULL,
      imagem TEXT,
      preco REAL,
      preco_original REAL,
      comissao_pct REAL,
      comissao_extra_pct REAL,
      comissao_valor REAL DEFAULT 0,
      comissao_novo_usuario_pct REAL DEFAULT 0,
      vendas INTEGER,
      rating REAL,
      afiliados INTEGER,
      estoque INTEGER,
      loja TEXT,
      loja_oficial INTEGER DEFAULT 0,
      loja_preferred INTEGER DEFAULT 0,
      shop_type TEXT,
      categoria TEXT,
      nicho_id TEXT,
      link_afiliado TEXT,
      link_produto TEXT,
      videos_aprender INTEGER,
      cupom_disponivel INTEGER,
      cupom_valor TEXT,
      inicio_oferta INTEGER DEFAULT 0,
      fim_oferta INTEGER DEFAULT 0,
      score_oportunidade INTEGER,
      garimpado_em TEXT NOT NULL,
      usado_em TEXT
    );

    -- Migracoes: adicionar colunas se DB antigo
    -- (sqlite ignora se ja existe via PRAGMA + ALTER TABLE wrapped)
    ;

    CREATE INDEX IF NOT EXISTS idx_produtos_garimpado ON produtos(garimpado_em);
    CREATE INDEX IF NOT EXISTS idx_produtos_nicho ON produtos(nicho_id);
    CREATE INDEX IF NOT EXISTS idx_produtos_score ON produtos(score_oportunidade DESC);

    CREATE TABLE IF NOT EXISTS roteiros (
      id TEXT PRIMARY KEY,
      produto_id TEXT NOT NULL,
      estilo TEXT NOT NULL,
      gancho TEXT NOT NULL,
      beneficio TEXT NOT NULL,
      demonstracao TEXT NOT NULL,
      cta TEXT NOT NULL,
      duracao INTEGER,
      hashtags TEXT,
      criado_em TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_roteiros_produto ON roteiros(produto_id);

    CREATE TABLE IF NOT EXISTS execucoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      executado_em TEXT NOT NULL,
      total_produtos INTEGER,
      total_roteiros INTEGER,
      duracao_ms INTEGER,
      erro TEXT
    );

    CREATE TABLE IF NOT EXISTS configs (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pipeline (
      produto_id TEXT PRIMARY KEY,
      estagio TEXT NOT NULL DEFAULT 'garimpado',
      atualizado_em TEXT NOT NULL,
      observacao TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_pipeline_estagio ON pipeline(estagio);

    CREATE TABLE IF NOT EXISTS links_canal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id TEXT NOT NULL,
      canal TEXT NOT NULL,
      link TEXT NOT NULL,
      criado_em TEXT NOT NULL,
      UNIQUE(produto_id, canal)
    );
    CREATE INDEX IF NOT EXISTS idx_links_produto ON links_canal(produto_id);

    -- Links públicos do sistema: registram o clique antes de abrir a oferta Shopee.
    CREATE TABLE IF NOT EXISTS links_rastreados (
      token TEXT PRIMARY KEY,
      produto_id TEXT NOT NULL,
      destino_id TEXT DEFAULT '',
      shopee_app_id TEXT NOT NULL DEFAULT '',
      canal TEXT NOT NULL,
      url_destino TEXT NOT NULL,
      criado_em TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_links_rastreados_produto ON links_rastreados(produto_id, canal);
    CREATE TABLE IF NOT EXISTS eventos_clique_rastreado (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL,
      referer TEXT DEFAULT '',
      criado_em TEXT NOT NULL,
      FOREIGN KEY(token) REFERENCES links_rastreados(token) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_eventos_clique_rastreado_data ON eventos_clique_rastreado(criado_em DESC);

    -- Destinos próprios que receberam autorização para distribuição via API.
    CREATE TABLE IF NOT EXISTS destinos_distribuicao (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      destino TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'grupo',
      confirmado INTEGER NOT NULL DEFAULT 0,
      ativo INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_destinos_distribuicao_ativo ON destinos_distribuicao(ativo, confirmado);

    CREATE TABLE IF NOT EXISTS envios_distribuicao (
      id TEXT PRIMARY KEY,
      produto_id TEXT NOT NULL,
      destino_id TEXT NOT NULL,
      canal TEXT NOT NULL DEFAULT 'wpp',
      status TEXT NOT NULL,
      mensagem TEXT NOT NULL DEFAULT '',
      erro TEXT DEFAULT '',
      criado_em TEXT NOT NULL,
      concluido_em TEXT,
      FOREIGN KEY(destino_id) REFERENCES destinos_distribuicao(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_envios_distribuicao_data ON envios_distribuicao(criado_em DESC);
    CREATE INDEX IF NOT EXISTS idx_envios_distribuicao_destino ON envios_distribuicao(destino_id, criado_em DESC);

    CREATE TABLE IF NOT EXISTS automacao_distribuicao (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      ativa INTEGER NOT NULL DEFAULT 0,
      intervalo_minutos INTEGER NOT NULL DEFAULT 60,
      proxima_execucao TEXT,
      atualizada_em TEXT NOT NULL
    );
    INSERT OR IGNORE INTO automacao_distribuicao (id, ativa, intervalo_minutos, proxima_execucao, atualizada_em)
      VALUES (1, 0, 60, NULL, CURRENT_TIMESTAMP);

    CREATE TABLE IF NOT EXISTS seguranca_distribuicao (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      max_por_hora INTEGER NOT NULL DEFAULT 12,
      max_por_dia INTEGER NOT NULL DEFAULT 48,
      intervalo_destino_minutos INTEGER NOT NULL DEFAULT 45,
      descanso_inicio INTEGER NOT NULL DEFAULT 22,
      descanso_fim INTEGER NOT NULL DEFAULT 8,
      atualizada_em TEXT NOT NULL
    );
    INSERT OR IGNORE INTO seguranca_distribuicao (id, max_por_hora, max_por_dia, intervalo_destino_minutos, descanso_inicio, descanso_fim, atualizada_em)
      VALUES (1, 12, 48, 45, 22, 8, CURRENT_TIMESTAMP);

    CREATE TABLE IF NOT EXISTS conversoes (
      order_id TEXT PRIMARY KEY,
      item_id INTEGER,
      shop_id INTEGER,
      produto_nome TEXT,
      shop_name TEXT,
      purchase_time INTEGER,
      complete_time INTEGER,
      total_commission REAL,
      amount REAL,
      payout_amount REAL,
      status TEXT,
      sub_id TEXT,
      sincronizado_em TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_conversoes_purchase ON conversoes(purchase_time DESC);
    CREATE INDEX IF NOT EXISTS idx_conversoes_status ON conversoes(status);
    CREATE INDEX IF NOT EXISTS idx_conversoes_sub_id ON conversoes(sub_id);

    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id TEXT NOT NULL,
      preco REAL,
      vendas INTEGER,
      comissao_pct REAL,
      capturado_em TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_snapshots_produto ON snapshots(produto_id);
    CREATE INDEX IF NOT EXISTS idx_snapshots_data ON snapshots(capturado_em DESC);

    CREATE TABLE IF NOT EXISTS favoritos (
      produto_id TEXT PRIMARY KEY,
      favoritado_em TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_favoritos_data ON favoritos(favoritado_em DESC);

    CREATE TABLE IF NOT EXISTS campanhas_grupo (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      whatsapp_link TEXT NOT NULL,
      whatsapp_group_id TEXT DEFAULT '',
      meta_campaign_id TEXT DEFAULT '',
      titulo TEXT NOT NULL,
      descricao TEXT DEFAULT '',
      texto_botao TEXT DEFAULT 'Entrar no grupo grátis',
      cor_destaque TEXT DEFAULT '#22c55e',
      ativo INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_campanhas_grupo_slug ON campanhas_grupo(slug);

    CREATE TABLE IF NOT EXISTS leads_grupo (
      id TEXT PRIMARY KEY,
      campanha_id TEXT NOT NULL,
      visitante_id TEXT DEFAULT '',
      nome TEXT NOT NULL,
      telefone TEXT NOT NULL,
      telefone_hash TEXT NOT NULL,
      consentimento INTEGER NOT NULL DEFAULT 0,
      utm_source TEXT DEFAULT '',
      utm_medium TEXT DEFAULT '',
      utm_campaign TEXT DEFAULT '',
      utm_content TEXT DEFAULT '',
      utm_term TEXT DEFAULT '',
      fbclid TEXT DEFAULT '',
      fbp TEXT DEFAULT '',
      fbc TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'capturado',
      capturado_em TEXT NOT NULL,
      clicou_em TEXT,
      entrou_em TEXT,
      UNIQUE(campanha_id, telefone_hash),
      FOREIGN KEY(campanha_id) REFERENCES campanhas_grupo(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_leads_grupo_campanha ON leads_grupo(campanha_id, capturado_em DESC);
    CREATE INDEX IF NOT EXISTS idx_leads_grupo_telefone ON leads_grupo(telefone_hash);

    CREATE TABLE IF NOT EXISTS eventos_grupo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT NOT NULL UNIQUE,
      campanha_id TEXT NOT NULL,
      lead_id TEXT,
      visitante_id TEXT DEFAULT '',
      tipo TEXT NOT NULL,
      origem TEXT DEFAULT 'site',
      dados TEXT DEFAULT '{}',
      criado_em TEXT NOT NULL,
      FOREIGN KEY(campanha_id) REFERENCES campanhas_grupo(id) ON DELETE CASCADE,
      FOREIGN KEY(lead_id) REFERENCES leads_grupo(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_eventos_grupo_campanha ON eventos_grupo(campanha_id, criado_em DESC);
    CREATE INDEX IF NOT EXISTS idx_eventos_grupo_tipo ON eventos_grupo(tipo, criado_em DESC);
  `);
  const colunasLinksRastreados = (d.prepare("PRAGMA table_info(links_rastreados)").all() as Array<{ name: string }>).map(c => c.name);
  if (!colunasLinksRastreados.includes("shopee_app_id")) {
    try { d.exec("ALTER TABLE links_rastreados ADD COLUMN shopee_app_id TEXT NOT NULL DEFAULT ''"); } catch {}
  }

  // Migrações: adicionar colunas novas se DB antigo
  const colunasCampanhas = (d.prepare("PRAGMA table_info(campanhas_grupo)").all() as Array<{ name: string }>).map(c => c.name);
  if (!colunasCampanhas.includes("meta_campaign_id")) {
    try { d.exec(`ALTER TABLE campanhas_grupo ADD COLUMN meta_campaign_id TEXT DEFAULT ''`); } catch {}
  }

  const colunasProdutos = (d.prepare("PRAGMA table_info(produtos)").all() as Array<{ name: string }>).map(c => c.name);
  const novas: Array<[string, string]> = [
    ["comissao_valor", "REAL DEFAULT 0"],
    ["comissao_novo_usuario_pct", "REAL DEFAULT 0"],
    ["loja_oficial", "INTEGER DEFAULT 0"],
    ["loja_preferred", "INTEGER DEFAULT 0"],
    ["shop_type", "TEXT"],
    ["inicio_oferta", "INTEGER DEFAULT 0"],
    ["fim_oferta", "INTEGER DEFAULT 0"]
  ];
  for (const [col, tipo] of novas) {
    if (!colunasProdutos.includes(col)) {
      try { d.exec(`ALTER TABLE produtos ADD COLUMN ${col} ${tipo}`); } catch {}
    }
  }

  // Migração conversoes: sub_ids 2-5 + venda_direta + sinais de origem (referrer/channelType)
  // + isolamento multi-conta (shopee_app_id pra cada venda saber de qual conta veio)
  const colunasConv = (d.prepare("PRAGMA table_info(conversoes)").all() as Array<{ name: string }>).map(c => c.name);
  const novasConv: Array<[string, string]> = [
    ["sub_id_2", "TEXT DEFAULT ''"],
    ["sub_id_3", "TEXT DEFAULT ''"],
    ["sub_id_4", "TEXT DEFAULT ''"],
    ["sub_id_5", "TEXT DEFAULT ''"],
    ["click_time", "INTEGER DEFAULT 0"],
    ["seller_commission", "REAL DEFAULT 0"],
    ["shopee_commission", "REAL DEFAULT 0"],
    ["referrer", "TEXT DEFAULT ''"],
    ["channel_type", "TEXT DEFAULT ''"],
    ["campaign_type", "TEXT DEFAULT ''"],
    ["attribution_type", "TEXT DEFAULT ''"],
    ["buyer_type", "TEXT DEFAULT ''"],
    ["device", "TEXT DEFAULT ''"],
    /** ID do afiliado/conta Shopee (SHOPEE_APP_ID) que sincronizou essa venda — isolamento multi-tenant */
    ["shopee_app_id", "TEXT DEFAULT ''"],
    /** URL da imagem do item — vem direto da Shopee no relatório de conversões */
    ["produto_imagem", "TEXT DEFAULT ''"],
    /** Quantidade total de itens dentro da ordem achatada */
    ["quantidade", "INTEGER DEFAULT 1"]
  ];
  for (const [col, tipo] of novasConv) {
    if (!colunasConv.includes(col)) {
      try { d.exec(`ALTER TABLE conversoes ADD COLUMN ${col} ${tipo}`); } catch {}
    }
  }
  d.exec(`CREATE INDEX IF NOT EXISTS idx_conversoes_referrer ON conversoes(referrer);`);
  d.exec(`CREATE INDEX IF NOT EXISTS idx_conversoes_channel ON conversoes(channel_type);`);
  d.exec(`CREATE INDEX IF NOT EXISTS idx_conversoes_app_id ON conversoes(shopee_app_id);`);

  // Garante a tabela antes das migrações abaixo (instalação nova).
  d.exec(`
    CREATE TABLE IF NOT EXISTS meta_insights (
      ad_id TEXT NOT NULL,
      data TEXT NOT NULL,
      ad_name TEXT,
      adset_id TEXT,
      adset_name TEXT,
      campaign_id TEXT,
      campaign_name TEXT,
      spend REAL DEFAULT 0,
      impressions INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      inline_link_clicks INTEGER DEFAULT 0,
      outbound_clicks INTEGER DEFAULT 0,
      cpc REAL DEFAULT 0,
      ctr REAL DEFAULT 0,
      cpm REAL DEFAULT 0,
      reach INTEGER DEFAULT 0,
      sub_id_1 TEXT DEFAULT '',
      sub_id_2 TEXT DEFAULT '',
      link_destino TEXT DEFAULT '',
      status TEXT DEFAULT '',
      meta_account_id TEXT DEFAULT '',
      sincronizado_em TEXT NOT NULL,
      PRIMARY KEY (ad_id, data)
    );
  `);

  // Migração meta_insights: isolamento por conta Meta (ad account id)
  const colunasMeta = (d.prepare("PRAGMA table_info(meta_insights)").all() as Array<{ name: string }>).map(c => c.name);
  if (!colunasMeta.includes("meta_account_id")) {
    try { d.exec(`ALTER TABLE meta_insights ADD COLUMN meta_account_id TEXT DEFAULT ''`); } catch {}
  }
  d.exec(`CREATE INDEX IF NOT EXISTS idx_meta_account ON meta_insights(meta_account_id);`);

  // Cliques registrados manualmente do dashboard Shopee (a API não expõe).
  // Permite calcular drop-off Meta→Shopee e CPC Shopee real.
  d.exec(`
    CREATE TABLE IF NOT EXISTS cliques_shopee_diarios (
      data TEXT NOT NULL,
      shopee_app_id TEXT NOT NULL DEFAULT '',
      cliques INTEGER NOT NULL DEFAULT 0,
      origem TEXT DEFAULT 'redes_sociais',
      atualizado_em TEXT NOT NULL,
      PRIMARY KEY (data, shopee_app_id)
    );
    CREATE INDEX IF NOT EXISTS idx_cliques_data ON cliques_shopee_diarios(data DESC);

    CREATE TABLE IF NOT EXISTS metricas_shopee_diarias (
      data TEXT NOT NULL,
      shopee_app_id TEXT NOT NULL DEFAULT '',
      cliques_total INTEGER NOT NULL DEFAULT 0,
      cliques_redes_sociais INTEGER NOT NULL DEFAULT 0,
      cliques_shopee_video INTEGER NOT NULL DEFAULT 0,
      cliques_shopee_live INTEGER NOT NULL DEFAULT 0,
      fonte TEXT NOT NULL DEFAULT 'painel_shopee',
      atualizado_em TEXT NOT NULL,
      PRIMARY KEY (data, shopee_app_id)
    );
    CREATE INDEX IF NOT EXISTS idx_metricas_shopee_data ON metricas_shopee_diarias(data DESC);
  `);
  const colunasMetricasShopee = (d.prepare("PRAGMA table_info(metricas_shopee_diarias)").all() as Array<{ name: string }>).map(c => c.name);
  if (!colunasMetricasShopee.includes("cliques_shopee_live")) {
    try { d.exec("ALTER TABLE metricas_shopee_diarias ADD COLUMN cliques_shopee_live INTEGER NOT NULL DEFAULT 0"); } catch {}
  }

  // Índices do cache Meta (a tabela já foi criada antes das migrações).
  d.exec(`
    CREATE INDEX IF NOT EXISTS idx_meta_data ON meta_insights(data DESC);
    CREATE INDEX IF NOT EXISTS idx_meta_subid ON meta_insights(sub_id_1, sub_id_2);
  `);

  const count = (d.prepare("SELECT COUNT(*) as n FROM nichos").get() as { n: number }).n;
  if (count === 0) {
    const insert = d.prepare(
      "INSERT INTO nichos (id, nome, emoji, palavras_chave, ativo) VALUES (?, ?, ?, ?, ?)"
    );
    const tx = d.transaction((nichos: Nicho[]) => {
      for (const n of nichos) {
        insert.run(n.id, n.nome, n.emoji, JSON.stringify(n.palavrasChave), n.ativo ? 1 : 0);
      }
    });
    tx(NICHOS_PADRAO);
  }
}

export function getDatabase(): Database.Database {
  return db();
}

export function listarNichos(): Nicho[] {
  const rows = db().prepare("SELECT * FROM nichos ORDER BY ativo DESC, nome ASC").all() as Array<{
    id: string;
    nome: string;
    emoji: string;
    palavras_chave: string;
    ativo: number;
  }>;
  return rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    emoji: r.emoji,
    palavrasChave: JSON.parse(r.palavras_chave),
    ativo: r.ativo === 1
  }));
}

export function listarNichosAtivos(): Nicho[] {
  return listarNichos().filter((n) => n.ativo);
}

export function toggleNicho(id: string, ativo: boolean) {
  db().prepare("UPDATE nichos SET ativo = ? WHERE id = ?").run(ativo ? 1 : 0, id);
}

export function atualizarPalavrasChave(id: string, palavras: string[]) {
  db().prepare("UPDATE nichos SET palavras_chave = ? WHERE id = ?").run(JSON.stringify(palavras), id);
}

export function salvarProdutos(produtos: Produto[]) {
  const stmt = db().prepare(`
    INSERT OR REPLACE INTO produtos
    (id, item_id, shop_id, nome, imagem, preco, preco_original, comissao_pct, comissao_extra_pct,
     comissao_valor, comissao_novo_usuario_pct,
     vendas, rating, afiliados, estoque, loja, loja_oficial, loja_preferred, shop_type, categoria, nicho_id, link_afiliado, link_produto,
     videos_aprender, cupom_disponivel, cupom_valor, inicio_oferta, fim_oferta, score_oportunidade, garimpado_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db().transaction((arr: Produto[]) => {
    for (const p of arr) {
      stmt.run(
        p.id, p.itemId, p.shopId, p.nome, p.imagem, p.preco, p.precoOriginal,
        p.comissaoPct, p.comissaoExtraPct, p.comissaoValor || 0, p.comissaoNovoUsuarioPct || 0,
        p.vendas, p.rating, p.afiliados, p.estoque,
        p.loja, p.lojaOficial ? 1 : 0, p.lojaPreferred ? 1 : 0, JSON.stringify(p.shopType || []),
        p.categoria, p.nichoId, p.linkAfiliado, p.linkProduto,
        p.videosAprenderCriadores, p.cupomDisponivel ? 1 : 0, p.cupomValor || null,
        p.inicioOferta || 0, p.fimOferta || 0,
        p.scoreOportunidade, p.garimpadoEm
      );
    }
  });
  tx(produtos);
}

function rowParaProduto(r: Record<string, unknown>): Produto {
  let shopType: string[] = [];
  try { shopType = JSON.parse((r.shop_type as string) || "[]"); } catch {}
  return {
    id: r.id as string,
    itemId: r.item_id as number,
    shopId: r.shop_id as number,
    nome: r.nome as string,
    imagem: r.imagem as string,
    preco: r.preco as number,
    precoOriginal: r.preco_original as number,
    comissaoPct: r.comissao_pct as number,
    comissaoExtraPct: (r.comissao_extra_pct as number) || 0,
    comissaoValor: (r.comissao_valor as number) || 0,
    comissaoNovoUsuarioPct: (r.comissao_novo_usuario_pct as number) || 0,
    vendas: r.vendas as number,
    rating: r.rating as number,
    afiliados: (r.afiliados as number) || 0,
    estoque: (r.estoque as number) || 0,
    loja: (r.loja as string) || "",
    lojaOficial: r.loja_oficial === 1,
    lojaPreferred: r.loja_preferred === 1,
    shopType,
    categoria: (r.categoria as string) || "",
    nichoId: r.nicho_id as string,
    linkAfiliado: r.link_afiliado as string,
    linkProduto: r.link_produto as string,
    videosAprenderCriadores: (r.videos_aprender as number) || 0,
    cupomDisponivel: r.cupom_disponivel === 1,
    cupomValor: (r.cupom_valor as string) || undefined,
    inicioOferta: (r.inicio_oferta as number) || 0,
    fimOferta: (r.fim_oferta as number) || 0,
    scoreOportunidade: (r.score_oportunidade as number) || 0,
    garimpadoEm: r.garimpado_em as string
  };
}

export function listarProdutosHoje(limit = 50): Produto[] {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const rows = db()
    .prepare("SELECT * FROM produtos WHERE garimpado_em >= ? ORDER BY score_oportunidade DESC LIMIT ?")
    .all(hoje.toISOString(), limit) as Array<Record<string, unknown>>;
  return rows.map(rowParaProduto);
}

export function listarProdutosPorNicho(nichoId: string, limit = 50): Produto[] {
  const rows = db()
    .prepare("SELECT * FROM produtos WHERE nicho_id = ? ORDER BY garimpado_em DESC LIMIT ?")
    .all(nichoId, limit) as Array<Record<string, unknown>>;
  return rows.map(rowParaProduto);
}

export function listarProdutosHistorico(limit = 200): Produto[] {
  const rows = db()
    .prepare("SELECT * FROM produtos ORDER BY garimpado_em DESC LIMIT ?")
    .all(limit) as Array<Record<string, unknown>>;
  return rows.map(rowParaProduto);
}

export function buscarProduto(id: string): Produto | null {
  const r = db().prepare("SELECT * FROM produtos WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return r ? rowParaProduto(r) : null;
}

export function salvarRoteiros(roteiros: Roteiro[]) {
  const stmt = db().prepare(`
    INSERT OR REPLACE INTO roteiros
    (id, produto_id, estilo, gancho, beneficio, demonstracao, cta, duracao, hashtags, criado_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db().transaction((arr: Roteiro[]) => {
    for (const r of arr) {
      stmt.run(r.id, r.produtoId, r.estilo, r.gancho, r.beneficio, r.demonstracao,
        r.cta, r.duracaoEstimada, JSON.stringify(r.hashtags), r.criadoEm);
    }
  });
  tx(roteiros);
}

export function listarRoteirosPorProduto(produtoId: string): Roteiro[] {
  const rows = db()
    .prepare("SELECT * FROM roteiros WHERE produto_id = ? ORDER BY criado_em DESC")
    .all(produtoId) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: r.id as string,
    produtoId: r.produto_id as string,
    estilo: r.estilo as Roteiro["estilo"],
    gancho: r.gancho as string,
    beneficio: r.beneficio as string,
    demonstracao: r.demonstracao as string,
    cta: r.cta as string,
    duracaoEstimada: (r.duracao as number) || 22,
    hashtags: JSON.parse((r.hashtags as string) || "[]"),
    criadoEm: r.criado_em as string
  }));
}

export function marcarComoUsado(produtoId: string) {
  db().prepare("UPDATE produtos SET usado_em = ? WHERE id = ?").run(new Date().toISOString(), produtoId);
}

export function registrarExecucao(total: number, totalRoteiros: number, duracao: number, erro?: string) {
  db()
    .prepare("INSERT INTO execucoes (executado_em, total_produtos, total_roteiros, duracao_ms, erro) VALUES (?, ?, ?, ?, ?)")
    .run(new Date().toISOString(), total, totalRoteiros, duracao, erro || null);
}

export function ultimaExecucao(): { executadoEm: string; total: number; roteiros: number } | null {
  const r = db()
    .prepare("SELECT * FROM execucoes ORDER BY id DESC LIMIT 1")
    .get() as Record<string, unknown> | undefined;
  if (!r) return null;
  return {
    executadoEm: r.executado_em as string,
    total: (r.total_produtos as number) || 0,
    roteiros: (r.total_roteiros as number) || 0
  };
}

// ============ PIPELINE (esteira de produção) ============
export type EstagioPipeline = "garimpado" | "roteirizado" | "gravado" | "postado" | "convertido";

export const ESTAGIOS: EstagioPipeline[] = ["garimpado", "roteirizado", "gravado", "postado", "convertido"];

export function moverPipeline(produtoId: string, estagio: EstagioPipeline, observacao?: string) {
  db().prepare(`
    INSERT INTO pipeline (produto_id, estagio, atualizado_em, observacao)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(produto_id) DO UPDATE SET estagio = excluded.estagio, atualizado_em = excluded.atualizado_em, observacao = excluded.observacao
  `).run(produtoId, estagio, new Date().toISOString(), observacao || null);
}

export function listarPipeline(): Array<{ produtoId: string; estagio: EstagioPipeline; atualizadoEm: string; observacao: string | null }> {
  const rows = db().prepare("SELECT * FROM pipeline ORDER BY atualizado_em DESC").all() as Array<{
    produto_id: string; estagio: string; atualizado_em: string; observacao: string | null;
  }>;
  return rows.map((r) => ({
    produtoId: r.produto_id,
    estagio: r.estagio as EstagioPipeline,
    atualizadoEm: r.atualizado_em,
    observacao: r.observacao
  }));
}

export function pipelinePorEstagio(): Record<EstagioPipeline, Array<{ produtoId: string; atualizadoEm: string }>> {
  const all = listarPipeline();
  const result: Record<EstagioPipeline, Array<{ produtoId: string; atualizadoEm: string }>> = {
    garimpado: [], roteirizado: [], gravado: [], postado: [], convertido: []
  };
  for (const p of all) {
    result[p.estagio]?.push({ produtoId: p.produtoId, atualizadoEm: p.atualizadoEm });
  }
  return result;
}

// ============ LINKS POR CANAL ============
export function salvarLinkCanal(produtoId: string, canal: string, link: string) {
  db().prepare(`
    INSERT INTO links_canal (produto_id, canal, link, criado_em) VALUES (?, ?, ?, ?)
    ON CONFLICT(produto_id, canal) DO UPDATE SET link = excluded.link
  `).run(produtoId, canal, link, new Date().toISOString());
}

export function listarLinksDoProduto(produtoId: string): Array<{ canal: string; link: string; criadoEm: string }> {
  const rows = db().prepare("SELECT canal, link, criado_em FROM links_canal WHERE produto_id = ?").all(produtoId) as Array<{
    canal: string; link: string; criado_em: string;
  }>;
  return rows.map((r) => ({ canal: r.canal, link: r.link, criadoEm: r.criado_em }));
}

// ============ RASTREIO AUTOMÁTICO DE CLIQUES ============
export function criarLinkRastreado(input: { produtoId: string; destinoId?: string; canal: string; urlDestino: string; baseUrl: string }): string {
  const token = crypto.randomBytes(12).toString("base64url");
  db().prepare("INSERT INTO links_rastreados (token,produto_id,destino_id,shopee_app_id,canal,url_destino,criado_em) VALUES (?,?,?,?,?,?,?)")
    .run(token, input.produtoId, input.destinoId || "", appIdShopeeAtual(), input.canal.slice(0, 40), input.urlDestino, new Date().toISOString());
  return `${input.baseUrl.replace(/\/$/, "")}/c/${token}`;
}

export function resolverLinkRastreado(token: string): { urlDestino: string } | null {
  const row = db().prepare("SELECT url_destino FROM links_rastreados WHERE token=?").get(token) as { url_destino: string } | undefined;
  return row ? { urlDestino: row.url_destino } : null;
}

export function registrarCliqueRastreado(token: string, referer = ""): boolean {
  const existe = db().prepare("SELECT 1 FROM links_rastreados WHERE token=?").get(token);
  if (!existe) return false;
  db().prepare("INSERT INTO eventos_clique_rastreado (token,referer,criado_em) VALUES (?,?,?)")
    .run(token, referer.slice(0, 500), new Date().toISOString());
  return true;
}

export function resumoCliquesRastreados(dias = 30): { total: number; porCanal: Array<{ canal: string; cliques: number }> } {
  const inicio = new Date(Date.now() - Math.max(1, dias) * 86_400_000).toISOString();
  const appId = appIdShopeeAtual();
  const total = (db().prepare("SELECT COUNT(*) n FROM eventos_clique_rastreado e JOIN links_rastreados l ON l.token=e.token WHERE e.criado_em>=? AND l.shopee_app_id=?").get(inicio, appId) as { n: number }).n;
  const rows = db().prepare(`SELECT l.canal canal, COUNT(*) cliques FROM eventos_clique_rastreado e JOIN links_rastreados l ON l.token=e.token WHERE e.criado_em>=? AND l.shopee_app_id=? GROUP BY l.canal ORDER BY cliques DESC`).all(inicio, appId) as Array<{ canal: string; cliques: number }>;
  return { total, porCanal: rows };
}

/**
 * Agrega os cliques que atravessaram links criados pela própria plataforma.
 * É a fonte automática: não depende de digitação nem mistura contas Shopee.
 */
export function listarMetricasCliquesRastreados(diasAtras = 730): MetricasShopeeDia[] {
  const appId = appIdShopeeAtual();
  const inicio = new Date(Date.now() - Math.max(1, diasAtras) * 86_400_000).toISOString();
  const rows = db().prepare(`
    SELECT e.criado_em, lower(l.canal) AS canal
    FROM eventos_clique_rastreado e
    JOIN links_rastreados l ON l.token = e.token
    WHERE e.criado_em >= ? AND l.shopee_app_id = ?
    ORDER BY e.criado_em DESC
  `).all(inicio, appId) as Array<{ criado_em: string; canal: string }>;

  const porDia = new Map<string, MetricasShopeeDia>();
  const formatarDataBR = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  for (const row of rows) {
    const data = formatarDataBR.format(new Date(row.criado_em));
    const atual = porDia.get(data) || {
      data, cliquesTotal: 0, cliquesRedesSociais: 0, cliquesShopeeVideo: 0,
      cliquesShopeeLive: 0, fonte: "rastreador_proprio", atualizadoEm: new Date().toISOString()
    };
    atual.cliquesTotal += 1;
    if (["shopeevd", "shopee_video", "video"].includes(row.canal)) atual.cliquesShopeeVideo += 1;
    else if (["shopeelive", "shopee_live", "live"].includes(row.canal)) atual.cliquesShopeeLive += 1;
    else atual.cliquesRedesSociais += 1;
    porDia.set(data, atual);
  }
  return Array.from(porDia.values()).sort((a, b) => b.data.localeCompare(a.data));
}

// ============ DISTRIBUIÇÃO WHATSAPP ============
export type DestinoDistribuicao = {
  id: string;
  nome: string;
  destino: string;
  tipo: "grupo" | "contato";
  confirmado: boolean;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

type DestinoDistribuicaoRow = {
  id: string; nome: string; destino: string; tipo: string; confirmado: number; ativo: number; criado_em: string; atualizado_em: string;
};

function mapDestinoDistribuicao(row: DestinoDistribuicaoRow): DestinoDistribuicao {
  return {
    id: row.id, nome: row.nome, destino: row.destino,
    tipo: row.tipo === "contato" ? "contato" : "grupo",
    confirmado: row.confirmado === 1, ativo: row.ativo === 1,
    criadoEm: row.criado_em, atualizadoEm: row.atualizado_em
  };
}

export function listarDestinosDistribuicao(): DestinoDistribuicao[] {
  const rows = db().prepare("SELECT * FROM destinos_distribuicao ORDER BY ativo DESC, confirmado DESC, nome COLLATE NOCASE").all() as DestinoDistribuicaoRow[];
  return rows.map(mapDestinoDistribuicao);
}

export function buscarDestinoDistribuicao(id: string): DestinoDistribuicao | null {
  const row = db().prepare("SELECT * FROM destinos_distribuicao WHERE id=?").get(id) as DestinoDistribuicaoRow | undefined;
  return row ? mapDestinoDistribuicao(row) : null;
}

export function criarDestinoDistribuicao(dados: Omit<DestinoDistribuicao, "id" | "criadoEm" | "atualizadoEm">): DestinoDistribuicao {
  const agora = new Date().toISOString();
  const id = crypto.randomUUID();
  db().prepare("INSERT INTO destinos_distribuicao (id,nome,destino,tipo,confirmado,ativo,criado_em,atualizado_em) VALUES (?,?,?,?,?,?,?,?)")
    .run(id, dados.nome, dados.destino, dados.tipo, dados.confirmado ? 1 : 0, dados.ativo ? 1 : 0, agora, agora);
  return buscarDestinoDistribuicao(id)!;
}

export function atualizarDestinoDistribuicao(id: string, dados: Partial<Omit<DestinoDistribuicao, "id" | "criadoEm" | "atualizadoEm">>): DestinoDistribuicao | null {
  const atual = buscarDestinoDistribuicao(id);
  if (!atual) return null;
  const proximo = { ...atual, ...dados };
  db().prepare("UPDATE destinos_distribuicao SET nome=?, destino=?, tipo=?, confirmado=?, ativo=?, atualizado_em=? WHERE id=?")
    .run(proximo.nome, proximo.destino, proximo.tipo, proximo.confirmado ? 1 : 0, proximo.ativo ? 1 : 0, new Date().toISOString(), id);
  return buscarDestinoDistribuicao(id);
}

export function excluirDestinoDistribuicao(id: string): boolean {
  return db().prepare("DELETE FROM destinos_distribuicao WHERE id=?").run(id).changes > 0;
}

export type EnvioDistribuicao = { id: string; produtoId: string; destinoId: string; status: "pendente" | "enviado" | "falhou"; criadoEm: string; concluidoEm: string | null; erro: string };

export function registrarEnvioDistribuicao(produtoId: string, destinoId: string, mensagem: string): EnvioDistribuicao {
  const agora = new Date().toISOString(); const id = crypto.randomUUID();
  db().prepare("INSERT INTO envios_distribuicao (id,produto_id,destino_id,status,mensagem,criado_em) VALUES (?,?,?,'pendente',?,?)")
    .run(id, produtoId, destinoId, mensagem, agora);
  return { id, produtoId, destinoId, status: "pendente", criadoEm: agora, concluidoEm: null, erro: "" };
}

export function concluirEnvioDistribuicao(id: string, erro?: string) {
  const status = erro ? "falhou" : "enviado";
  db().prepare("UPDATE envios_distribuicao SET status=?, erro=?, concluido_em=? WHERE id=?")
    .run(status, (erro || "").slice(0, 500), new Date().toISOString(), id);
}

export function limitesEnvioDistribuicao(destinoId: string): { hora: number; dia: number; ultimoDestinoEm: string | null } {
  const agora = Date.now();
  const rows = db().prepare("SELECT criado_em FROM envios_distribuicao WHERE status IN ('pendente','enviado') ORDER BY criado_em DESC").all() as Array<{ criado_em: string }>;
  const hora = rows.filter(r => agora - new Date(r.criado_em).getTime() < 3_600_000).length;
  const inicioDia = new Date(); inicioDia.setHours(0, 0, 0, 0);
  const dia = rows.filter(r => new Date(r.criado_em).getTime() >= inicioDia.getTime()).length;
  const ultimo = db().prepare("SELECT criado_em FROM envios_distribuicao WHERE destino_id=? AND status IN ('pendente','enviado') ORDER BY criado_em DESC LIMIT 1").get(destinoId) as { criado_em: string } | undefined;
  return { hora, dia, ultimoDestinoEm: ultimo?.criado_em || null };
}

export type SegurancaDistribuicao = { maxPorHora: number; maxPorDia: number; intervaloDestinoMinutos: number; descansoInicio: number; descansoFim: number; atualizadaEm: string };
export function obterSegurancaDistribuicao(): SegurancaDistribuicao {
  const row = db().prepare("SELECT * FROM seguranca_distribuicao WHERE id=1").get() as { max_por_hora: number; max_por_dia: number; intervalo_destino_minutos: number; descanso_inicio: number; descanso_fim: number; atualizada_em: string };
  return { maxPorHora: row.max_por_hora, maxPorDia: row.max_por_dia, intervaloDestinoMinutos: row.intervalo_destino_minutos, descansoInicio: row.descanso_inicio, descansoFim: row.descanso_fim, atualizadaEm: row.atualizada_em };
}
export function salvarSegurancaDistribuicao(input: Omit<SegurancaDistribuicao, "atualizadaEm">): SegurancaDistribuicao {
  const limite = (valor: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(valor)));
  db().prepare("UPDATE seguranca_distribuicao SET max_por_hora=?,max_por_dia=?,intervalo_destino_minutos=?,descanso_inicio=?,descanso_fim=?,atualizada_em=? WHERE id=1")
    .run(limite(input.maxPorHora, 1, 100), limite(input.maxPorDia, 1, 500), limite(input.intervaloDestinoMinutos, 15, 360), limite(input.descansoInicio, 0, 23), limite(input.descansoFim, 0, 23), new Date().toISOString());
  return obterSegurancaDistribuicao();
}

export function listarEnviosDistribuicao(limite = 20): Array<EnvioDistribuicao & { destinoNome: string; produtoNome: string }> {
  const rows = db().prepare(`SELECT e.*, d.nome destino_nome, p.nome produto_nome FROM envios_distribuicao e JOIN destinos_distribuicao d ON d.id=e.destino_id LEFT JOIN produtos p ON p.id=e.produto_id ORDER BY e.criado_em DESC LIMIT ?`).all(limite) as Array<{ id: string; produto_id: string; destino_id: string; status: string; criado_em: string; concluido_em: string | null; erro: string; destino_nome: string; produto_nome: string | null }>;
  return rows.map(r => ({ id: r.id, produtoId: r.produto_id, destinoId: r.destino_id, status: r.status as EnvioDistribuicao["status"], criadoEm: r.criado_em, concluidoEm: r.concluido_em, erro: r.erro || "", destinoNome: r.destino_nome, produtoNome: r.produto_nome || "Produto removido" }));
}

export type AutomacaoDistribuicao = { ativa: boolean; intervaloMinutos: number; proximaExecucao: string | null; atualizadaEm: string };

export function obterAutomacaoDistribuicao(): AutomacaoDistribuicao {
  const row = db().prepare("SELECT * FROM automacao_distribuicao WHERE id=1").get() as { ativa: number; intervalo_minutos: number; proxima_execucao: string | null; atualizada_em: string };
  return { ativa: row.ativa === 1, intervaloMinutos: row.intervalo_minutos, proximaExecucao: row.proxima_execucao, atualizadaEm: row.atualizada_em };
}

export function salvarAutomacaoDistribuicao(dados: { ativa: boolean; intervaloMinutos: number }): AutomacaoDistribuicao {
  const agora = new Date();
  const intervalo = Math.max(15, Math.min(1_440, Math.round(dados.intervaloMinutos)));
  const proxima = dados.ativa ? new Date(agora.getTime() + intervalo * 60_000).toISOString() : null;
  db().prepare("UPDATE automacao_distribuicao SET ativa=?, intervalo_minutos=?, proxima_execucao=?, atualizada_em=? WHERE id=1")
    .run(dados.ativa ? 1 : 0, intervalo, proxima, agora.toISOString());
  return obterAutomacaoDistribuicao();
}

export function reagendarAutomacaoDistribuicao(): AutomacaoDistribuicao {
  const atual = obterAutomacaoDistribuicao();
  const proxima = new Date(Date.now() + atual.intervaloMinutos * 60_000).toISOString();
  db().prepare("UPDATE automacao_distribuicao SET proxima_execucao=?, atualizada_em=? WHERE id=1").run(proxima, new Date().toISOString());
  return obterAutomacaoDistribuicao();
}

// ============ CONVERSÕES (vendas reais) ============
export type ConversaoLocal = {
  orderId: string;
  itemId: number;
  shopId: number;
  produtoNome: string;
  produtoImagem?: string;
  shopName: string;
  purchaseTime: number;
  completeTime: number;
  clickTime?: number;
  totalCommission: number;
  sellerCommission?: number;
  shopeeCommission?: number;
  amount: number;
  payoutAmount: number;
  status: string;
  subId: string;
  subId2?: string;
  subId3?: string;
  subId4?: string;
  subId5?: string;
  /** Origem reportada pela Shopee (ex: "Facebook", "Shopeevideo-Shopee") */
  referrer?: string;
  /** channelType do item (ex: "Shopee Video", "Social Medias") — sinal forte de origem orgânica Shopee */
  channelType?: string;
  /** "SELLER_OPEN_CAMPAIGN" = boost de comissão do seller; "NON_SELLER_CAMPAIGN" = padrão */
  campaignType?: string;
  attributionType?: string;
  buyerType?: string;
  device?: string;
  quantidade?: number;
};

export function salvarConversoes(conv: ConversaoLocal[]) {
  if (!conv.length) return;
  const appId = appIdShopeeAtual();
  const stmt = db().prepare(`
    INSERT OR REPLACE INTO conversoes
    (order_id, item_id, shop_id, produto_nome, produto_imagem, shop_name, purchase_time, complete_time, click_time,
     total_commission, seller_commission, shopee_commission, amount, payout_amount, status,
     sub_id, sub_id_2, sub_id_3, sub_id_4, sub_id_5,
     referrer, channel_type, campaign_type, attribution_type, buyer_type, device,
     quantidade, shopee_app_id, sincronizado_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db().transaction((arr: ConversaoLocal[]) => {
    for (const c of arr) {
      stmt.run(
        c.orderId, c.itemId, c.shopId, c.produtoNome, c.produtoImagem || "", c.shopName,
        c.purchaseTime, c.completeTime, c.clickTime || 0,
        c.totalCommission, c.sellerCommission || 0, c.shopeeCommission || 0,
        c.amount, c.payoutAmount, c.status,
        c.subId, c.subId2 || "", c.subId3 || "", c.subId4 || "", c.subId5 || "",
        c.referrer || "", c.channelType || "", c.campaignType || "",
        c.attributionType || "", c.buyerType || "", c.device || "",
        Math.max(1, Math.floor(c.quantidade || 1)),
        appId,
        new Date().toISOString()
      );
    }
  });
  tx(conv);
}

export function listarConversoes(diasAtras = 30): ConversaoLocal[] {
  const cutoff = Math.floor(Date.now() / 1000) - diasAtras * 24 * 3600;
  const appId = appIdShopeeAtual();
  // Isolamento multi-tenant: cada conta Shopee só vê suas próprias vendas.
  // Se não houver app_id configurado, retorna tudo (fallback dev/sem login).
  const rows = (appId
    ? db().prepare("SELECT * FROM conversoes WHERE purchase_time >= ? AND shopee_app_id = ? ORDER BY purchase_time DESC").all(cutoff, appId)
    : db().prepare("SELECT * FROM conversoes WHERE purchase_time >= ? ORDER BY purchase_time DESC").all(cutoff)) as Array<{
    order_id: string; item_id: number; shop_id: number; produto_nome: string; produto_imagem?: string; shop_name: string;
    purchase_time: number; complete_time: number; click_time?: number; total_commission: number;
    seller_commission?: number; shopee_commission?: number;
    amount: number; payout_amount: number; status: string;
    sub_id: string; sub_id_2?: string; sub_id_3?: string; sub_id_4?: string; sub_id_5?: string;
    referrer?: string; channel_type?: string; campaign_type?: string; attribution_type?: string;
    buyer_type?: string; device?: string; quantidade?: number;
  }>;
  return rows.map((r) => ({
    orderId: r.order_id, itemId: r.item_id, shopId: r.shop_id, produtoNome: r.produto_nome,
    produtoImagem: r.produto_imagem || "",
    shopName: r.shop_name, purchaseTime: r.purchase_time, completeTime: r.complete_time,
    clickTime: r.click_time || 0,
    totalCommission: r.total_commission,
    sellerCommission: r.seller_commission || 0,
    shopeeCommission: r.shopee_commission || 0,
    amount: r.amount, payoutAmount: r.payout_amount,
    status: r.status,
    subId: r.sub_id, subId2: r.sub_id_2 || "", subId3: r.sub_id_3 || "", subId4: r.sub_id_4 || "", subId5: r.sub_id_5 || "",
    referrer: r.referrer || "", channelType: r.channel_type || "",
    campaignType: r.campaign_type || "", attributionType: r.attribution_type || "",
    buyerType: r.buyer_type || "", device: r.device || "",
    quantidade: Math.max(1, r.quantidade || 1)
  }));
}

// ============ META INSIGHTS (cache local) ============
export type MetaInsightLocal = {
  adId: string;
  data: string; // YYYY-MM-DD
  adName: string;
  adsetId: string;
  adsetName: string;
  campaignId: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  inlineLinkClicks: number;
  outboundClicks: number;
  cpc: number;
  ctr: number;
  cpm: number;
  reach: number;
  subId1: string;
  subId2: string;
  linkDestino: string;
  status: string;
};

function metaAccountIdAtual(): string {
  return lerConfig("META_AD_ACCOUNT_ID") || "";
}

export function salvarMetaInsights(insights: MetaInsightLocal[]) {
  if (!insights.length) return;
  const accountId = metaAccountIdAtual();
  const stmt = db().prepare(`
    INSERT OR REPLACE INTO meta_insights
    (ad_id, data, ad_name, adset_id, adset_name, campaign_id, campaign_name,
     spend, impressions, clicks, inline_link_clicks, outbound_clicks,
     cpc, ctr, cpm, reach, sub_id_1, sub_id_2, link_destino, status, meta_account_id, sincronizado_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db().transaction((arr: MetaInsightLocal[]) => {
    for (const i of arr) {
      stmt.run(
        i.adId, i.data, i.adName, i.adsetId, i.adsetName, i.campaignId, i.campaignName,
        i.spend, i.impressions, i.clicks, i.inlineLinkClicks, i.outboundClicks,
        i.cpc, i.ctr, i.cpm, i.reach, i.subId1, i.subId2, i.linkDestino, i.status,
        accountId,
        new Date().toISOString()
      );
    }
  });
  tx(insights);
}

export function listarMetaInsights(diasAtras = 30): MetaInsightLocal[] {
  const cutoff = new Date(Date.now() - diasAtras * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const accountId = metaAccountIdAtual();
  // Isolamento multi-tenant: cada conta Meta só vê seus próprios insights
  const rows = (accountId
    ? db().prepare("SELECT * FROM meta_insights WHERE data >= ? AND meta_account_id = ? ORDER BY data DESC").all(cutoff, accountId)
    : db().prepare("SELECT * FROM meta_insights WHERE data >= ? ORDER BY data DESC").all(cutoff)) as Array<{
    ad_id: string; data: string; ad_name: string; adset_id: string; adset_name: string;
    campaign_id: string; campaign_name: string; spend: number; impressions: number; clicks: number;
    inline_link_clicks: number; outbound_clicks: number; cpc: number; ctr: number; cpm: number;
    reach: number; sub_id_1: string; sub_id_2: string; link_destino: string; status: string;
  }>;
  return rows.map((r) => ({
    adId: r.ad_id, data: r.data, adName: r.ad_name, adsetId: r.adset_id, adsetName: r.adset_name,
    campaignId: r.campaign_id, campaignName: r.campaign_name,
    spend: r.spend, impressions: r.impressions, clicks: r.clicks,
    inlineLinkClicks: r.inline_link_clicks, outboundClicks: r.outbound_clicks,
    cpc: r.cpc, ctr: r.ctr, cpm: r.cpm, reach: r.reach,
    subId1: r.sub_id_1, subId2: r.sub_id_2, linkDestino: r.link_destino, status: r.status
  }));
}

export type TopProdutoEnriquecido = {
  nome: string;
  vendas: number;
  comissao: number;
  itemId?: number;
  shopId?: number;
  shopName?: string;
  imagem?: string;
  preco?: number;
  rating?: number;
  linkProduto?: string;
  linkAfiliado?: string;
  ticketMedio?: number;
};

export function statsConversoes(diasAtras = 30, inicio?: string, fim?: string): {
  totalVendas: number; totalRevenue: number; totalComissao: number; totalComissaoConfirmada: number;
  /** Agregação por categoria classificada (chaves: meta_ads, shopee_video, etc) */
  porCanal: Record<string, { vendas: number; comissao: number; canal: string; tipo: TipoTrafego }>;
  /** Resumo orgânico vs pago — útil pra mostrar "X% das vendas vieram de orgânico" */
  porTipo: { campanha: { vendas: number; comissao: number }; organico: { vendas: number; comissao: number } };
  topProdutos: TopProdutoEnriquecido[];
  porDia: Array<{ dia: string; vendas: number; comissao: number }>;
} {
  // Carrega uma janela segura e só então aplica exatamente o mesmo período do
  // Painel ROI. `dias=2` representa "Ontem" (não "últimos 2 dias").
  let diasCarregamento = Math.max(diasAtras, 30);
  if (inicio) {
    const distancia = Math.floor((Date.now() - new Date(inicio + "T00:00:00-03:00").getTime()) / 86400000);
    diasCarregamento = Math.max(diasCarregamento, distancia + 2);
  }
  let conv = listarConversoes(diasCarregamento);
  if (inicio && fim) {
    const tsInicio = timestampInicioDiaBR(inicio);
    const tsFim = timestampFimDiaBR(fim);
    conv = conv.filter((c) => c.purchaseTime >= tsInicio && c.purchaseTime <= tsFim);
  } else if (diasAtras === 1) {
    const tsInicio = timestampInicioDiaBR(dataHojeBR());
    conv = conv.filter((c) => c.purchaseTime >= tsInicio);
  } else if (diasAtras === 2) {
    const ultimoFechado = dataUltimoFechamentoShopeeBR();
    const tsInicio = timestampInicioDiaBR(ultimoFechado);
    const tsFim = timestampFimDiaBR(ultimoFechado);
    conv = conv.filter((c) => c.purchaseTime >= tsInicio && c.purchaseTime <= tsFim);
  } else {
    const fmtBR = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
    const primeiroDia = fmtBR.format(new Date(Date.now() - (diasAtras - 1) * 86400000));
    const tsInicio = timestampInicioDiaBR(primeiroDia);
    conv = conv.filter((c) => c.purchaseTime >= tsInicio);
  }
  const totalVendas = conv.length;
  const totalRevenue = conv.reduce((s, c) => s + c.amount, 0);
  const totalComissao = conv.reduce((s, c) => s + c.totalCommission, 0);
  const totalComissaoConfirmada = conv.reduce((s, c) => {
    // Na API da Shopee, status 2 ou "Completed" representam comissão liquidada/confirmada.
    const s_ = String(c.status).toUpperCase();
    const confirmado = s_ === "2" || s_ === "COMPLETED" || s_ === "SETTLED";
    return s + (confirmado ? c.totalCommission : 0);
  }, 0);

  const porCanalMap = new Map<string, { vendas: number; comissao: number; canal: string; tipo: TipoTrafego }>();
  const porTipo = {
    campanha: { vendas: 0, comissao: 0 },
    organico: { vendas: 0, comissao: 0 }
  };
  for (const c of conv) {
    const cls = classificarCanal({ subId: c.subId, referrer: c.referrer, channelType: c.channelType });
    const cur = porCanalMap.get(cls.categoria) || { vendas: 0, comissao: 0, canal: cls.canal, tipo: cls.tipo };
    porCanalMap.set(cls.categoria, {
      vendas: cur.vendas + 1,
      comissao: cur.comissao + c.totalCommission,
      canal: cls.canal,
      tipo: cls.tipo
    });
    if (cls.tipo === "campanha") {
      porTipo.campanha.vendas += 1;
      porTipo.campanha.comissao += c.totalCommission;
    } else {
      porTipo.organico.vendas += 1;
      porTipo.organico.comissao += c.totalCommission;
    }
  }

  // Agrupa por itemId quando disponivel (mais preciso) e fallback pra nome.
  // Imagem: prefere a que veio com a venda (campo produtoImagem da Shopee API).
  type AggProduto = { nome: string; vendas: number; comissao: number; revenue: number; itemId?: number; shopId?: number; shopName?: string; imagem?: string };
  const produtosMap = new Map<string, AggProduto>();
  for (const c of conv) {
    const chave = c.itemId > 0 ? `i${c.itemId}` : c.produtoNome;
    const cur = produtosMap.get(chave) || {
      nome: c.produtoNome,
      vendas: 0,
      comissao: 0,
      revenue: 0,
      itemId: c.itemId || undefined,
      shopId: c.shopId || undefined,
      shopName: c.shopName || undefined,
      imagem: c.produtoImagem || undefined
    };
    cur.vendas += 1;
    cur.comissao += c.totalCommission;
    cur.revenue += c.amount;
    // Mantém primeira imagem não-vazia encontrada (vendas posteriores podem ter campo vazio)
    if (!cur.imagem && c.produtoImagem) cur.imagem = c.produtoImagem;
    produtosMap.set(chave, cur);
  }

  // Enriquece com dados do catálogo já garimpado (imagem, preço, rating, link)
  const topAgg = Array.from(produtosMap.values())
    .sort((a, b) => b.comissao - a.comissao)
    .slice(0, 10);

  type InfoProduto = { imagem?: string; preco?: number; rating?: number; link_produto?: string; link_afiliado?: string; loja?: string };
  const topProdutos: TopProdutoEnriquecido[] = topAgg.map((p) => {
    let info: InfoProduto | undefined;
    try {
      if (p.itemId && p.shopId) {
        info = db().prepare(
          "SELECT imagem, preco, rating, link_produto, link_afiliado, loja FROM produtos WHERE item_id = ? AND shop_id = ? LIMIT 1"
        ).get(p.itemId, p.shopId) as InfoProduto | undefined;
      }
      if (!info && p.itemId) {
        info = db().prepare(
          "SELECT imagem, preco, rating, link_produto, link_afiliado, loja FROM produtos WHERE item_id = ? LIMIT 1"
        ).get(p.itemId) as InfoProduto | undefined;
      }
      if (!info && p.nome) {
        // Fallback: match parcial por nome (primeiras palavras)
        const palavras = p.nome.split(/\s+/).slice(0, 3).join(" ");
        info = db().prepare(
          "SELECT imagem, preco, rating, link_produto, link_afiliado, loja FROM produtos WHERE nome LIKE ? LIMIT 1"
        ).get(`%${palavras}%`) as InfoProduto | undefined;
      }
    } catch { info = undefined; }

    return {
      nome: p.nome,
      vendas: p.vendas,
      comissao: parseFloat(p.comissao.toFixed(2)),
      itemId: p.itemId,
      shopId: p.shopId,
      shopName: info?.loja || p.shopName,
      // Prioriza imagem da Shopee (vinda na venda) > catálogo local
      imagem: p.imagem || info?.imagem || undefined,
      preco: info?.preco || (p.vendas > 0 ? parseFloat((p.revenue / p.vendas).toFixed(2)) : undefined),
      rating: info?.rating || undefined,
      linkProduto: info?.link_produto || (p.itemId && p.shopId ? `https://shopee.com.br/product/${p.shopId}/${p.itemId}` : undefined),
      linkAfiliado: info?.link_afiliado || undefined,
      ticketMedio: p.vendas > 0 ? parseFloat((p.revenue / p.vendas).toFixed(2)) : 0
    };
  });

  const porDiaMap = new Map<string, { vendas: number; comissao: number }>();
  const fmtDiaBR = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  for (const c of conv) {
    const dia = fmtDiaBR.format(new Date(c.purchaseTime * 1000));
    const cur = porDiaMap.get(dia) || { vendas: 0, comissao: 0 };
    porDiaMap.set(dia, { vendas: cur.vendas + 1, comissao: cur.comissao + c.totalCommission });
  }
  const porDia = Array.from(porDiaMap.entries())
    .map(([dia, v]) => ({ dia, ...v }))
    .sort((a, b) => a.dia.localeCompare(b.dia));

  return {
    totalVendas, totalRevenue, totalComissao, totalComissaoConfirmada,
    porCanal: Object.fromEntries(porCanalMap),
    porTipo,
    topProdutos, porDia
  };
}

// ============ CLIQUES SHOPEE (input manual do dashboard web) ============
export type CliqueShopeeDia = { data: string; cliques: number; origem: string };

export function salvarCliquesShopeeDia(data: string, cliques: number, origem: string = "redes_sociais") {
  const appId = appIdShopeeAtual();
  db().prepare(`
    INSERT INTO cliques_shopee_diarios (data, shopee_app_id, cliques, origem, atualizado_em)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(data, shopee_app_id) DO UPDATE SET cliques = excluded.cliques, origem = excluded.origem, atualizado_em = excluded.atualizado_em
  `).run(data, appId, cliques, origem, new Date().toISOString());
}

export function listarCliquesShopee(diasAtras = 30): CliqueShopeeDia[] {
  const appId = appIdShopeeAtual();
  const cutoff = new Date(Date.now() - diasAtras * 86400 * 1000).toISOString().slice(0, 10);
  const rows = db()
    .prepare("SELECT data, cliques, origem FROM cliques_shopee_diarios WHERE shopee_app_id = ? AND data >= ? ORDER BY data DESC")
    .all(appId, cutoff) as Array<{ data: string; cliques: number; origem: string }>;
  return rows;
}

export type MetricasShopeeDia = {
  data: string;
  cliquesTotal: number;
  cliquesRedesSociais: number;
  cliquesShopeeVideo: number;
  cliquesShopeeLive: number;
  fonte: string;
  atualizadoEm: string;
};

export function salvarMetricasShopeeDia(metricas: Omit<MetricasShopeeDia, "atualizadoEm">) {
  const appId = appIdShopeeAtual();
  db().prepare(`
    INSERT INTO metricas_shopee_diarias
      (data, shopee_app_id, cliques_total, cliques_redes_sociais, cliques_shopee_video, cliques_shopee_live, fonte, atualizado_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(data, shopee_app_id) DO UPDATE SET
      cliques_total = excluded.cliques_total,
      cliques_redes_sociais = excluded.cliques_redes_sociais,
      cliques_shopee_video = excluded.cliques_shopee_video,
      cliques_shopee_live = excluded.cliques_shopee_live,
      fonte = excluded.fonte,
      atualizado_em = excluded.atualizado_em
  `).run(
    metricas.data,
    appId,
    Math.max(0, Math.floor(metricas.cliquesTotal)),
    Math.max(0, Math.floor(metricas.cliquesRedesSociais)),
    Math.max(0, Math.floor(metricas.cliquesShopeeVideo)),
    Math.max(0, Math.floor(metricas.cliquesShopeeLive)),
    metricas.fonte || "painel_shopee",
    new Date().toISOString()
  );
}

export function listarMetricasShopee(diasAtras = 730): MetricasShopeeDia[] {
  const appId = appIdShopeeAtual();
  const cutoff = new Date(Date.now() - diasAtras * 86400 * 1000).toISOString().slice(0, 10);
  const rows = db().prepare(`
    SELECT data, cliques_total, cliques_redes_sociais, cliques_shopee_video, cliques_shopee_live, fonte, atualizado_em
    FROM metricas_shopee_diarias
    WHERE shopee_app_id = ? AND data >= ?
    ORDER BY data DESC
  `).all(appId, cutoff) as Array<{
    data: string;
    cliques_total: number;
    cliques_redes_sociais: number;
    cliques_shopee_video: number;
    cliques_shopee_live: number;
    fonte: string;
    atualizado_em: string;
  }>;
  return rows.map((row) => ({
    data: row.data,
    cliquesTotal: row.cliques_total,
    cliquesRedesSociais: row.cliques_redes_sociais,
    cliquesShopeeVideo: row.cliques_shopee_video,
    cliquesShopeeLive: row.cliques_shopee_live,
    fonte: row.fonte,
    atualizadoEm: row.atualizado_em
  }));
}

// ============ MULTI-TENANT (isolamento de contas) ============
/**
 * Resumo de quantas vendas/insights existem por conta Shopee + Meta no banco.
 * Útil pra UI alertar quando há dados de contas antigas e oferecer limpeza.
 */
export function infoTenants(): {
  shopeeAtual: string;
  metaAtual: string;
  vendasContaAtual: number;
  vendasOutrasContas: number;
  insightsContaAtual: number;
  insightsOutrasContas: number;
  contasShopeeNoBanco: Array<{ appId: string; vendas: number; ultimaVenda: number }>;
} {
  const shopeeAtual = appIdShopeeAtual();
  const metaAtual = metaAccountIdAtual();

  const totalVendasAtual = (db().prepare("SELECT COUNT(*) as n FROM conversoes WHERE shopee_app_id = ?").get(shopeeAtual) as { n: number }).n;
  const totalVendasOutras = (db().prepare("SELECT COUNT(*) as n FROM conversoes WHERE shopee_app_id != ?").get(shopeeAtual) as { n: number }).n;
  const totalInsightsAtual = (db().prepare("SELECT COUNT(*) as n FROM meta_insights WHERE meta_account_id = ?").get(metaAtual) as { n: number }).n;
  const totalInsightsOutras = (db().prepare("SELECT COUNT(*) as n FROM meta_insights WHERE meta_account_id != ?").get(metaAtual) as { n: number }).n;

  const contas = db()
    .prepare("SELECT shopee_app_id as appId, COUNT(*) as vendas, MAX(purchase_time) as ultimaVenda FROM conversoes GROUP BY shopee_app_id ORDER BY vendas DESC")
    .all() as Array<{ appId: string; vendas: number; ultimaVenda: number }>;

  return {
    shopeeAtual,
    metaAtual,
    vendasContaAtual: totalVendasAtual,
    vendasOutrasContas: totalVendasOutras,
    insightsContaAtual: totalInsightsAtual,
    insightsOutrasContas: totalInsightsOutras,
    contasShopeeNoBanco: contas
  };
}

/**
 * Apaga TODOS os dados de contas Shopee/Meta diferentes da atual.
 * Operação destrutiva — usar quando o afiliado troca de conta e quer limpar histórico antigo.
 */
export function limparDadosDeOutrasContas(): { vendasApagadas: number; insightsApagados: number } {
  const shopeeAtual = appIdShopeeAtual();
  const metaAtual = metaAccountIdAtual();
  const vendasApagadas = db().prepare("DELETE FROM conversoes WHERE shopee_app_id != ?").run(shopeeAtual).changes;
  const insightsApagados = db().prepare("DELETE FROM meta_insights WHERE meta_account_id != ?").run(metaAtual).changes;
  return { vendasApagadas, insightsApagados };
}

// ============ FAVORITOS ============
export function alternarFavorito(produtoId: string): boolean {
  const existe = db().prepare("SELECT 1 FROM favoritos WHERE produto_id = ?").get(produtoId);
  if (existe) {
    db().prepare("DELETE FROM favoritos WHERE produto_id = ?").run(produtoId);
    return false;
  }
  db().prepare("INSERT INTO favoritos (produto_id, favoritado_em) VALUES (?, ?)").run(produtoId, new Date().toISOString());
  return true;
}

export function listarFavoritosIds(): Set<string> {
  const rows = db().prepare("SELECT produto_id FROM favoritos").all() as Array<{ produto_id: string }>;
  return new Set(rows.map((r) => r.produto_id));
}

export function listarProdutosFavoritados(): Array<Produto & { favoritadoEm: string }> {
  const rows = db().prepare(`
    SELECT p.*, f.favoritado_em
    FROM produtos p
    INNER JOIN favoritos f ON f.produto_id = p.id
    ORDER BY f.favoritado_em DESC
  `).all() as Array<Record<string, unknown>>;
  return rows.map((r) => ({ ...rowParaProduto(r), favoritadoEm: r.favoritado_em as string }));
}

export function ehFavorito(produtoId: string): boolean {
  return Boolean(db().prepare("SELECT 1 FROM favoritos WHERE produto_id = ?").get(produtoId));
}

// ============ SNAPSHOTS (histórico de preço/vendas) ============
export function salvarSnapshot(produtoId: string, preco: number, vendas: number, comissaoPct: number) {
  db().prepare(`INSERT INTO snapshots (produto_id, preco, vendas, comissao_pct, capturado_em) VALUES (?, ?, ?, ?, ?)`)
    .run(produtoId, preco, vendas, comissaoPct, new Date().toISOString());
}

export function snapshotsDoProduto(produtoId: string, limite = 30): Array<{ preco: number; vendas: number; comissaoPct: number; capturadoEm: string }> {
  const rows = db().prepare("SELECT preco, vendas, comissao_pct, capturado_em FROM snapshots WHERE produto_id = ? ORDER BY capturado_em DESC LIMIT ?")
    .all(produtoId, limite) as Array<{ preco: number; vendas: number; comissao_pct: number; capturado_em: string }>;
  return rows.map((r) => ({ preco: r.preco, vendas: r.vendas, comissaoPct: r.comissao_pct, capturadoEm: r.capturado_em }));
}

export function estatisticasHoje(): { produtos: number; roteiros: number; nichosCobertos: number } {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const iso = hoje.toISOString();
  const produtos = (db().prepare("SELECT COUNT(*) as n FROM produtos WHERE garimpado_em >= ?").get(iso) as { n: number }).n;
  const roteiros = (db().prepare("SELECT COUNT(*) as n FROM roteiros WHERE criado_em >= ?").get(iso) as { n: number }).n;
  const nichosCobertos = (db()
    .prepare("SELECT COUNT(DISTINCT nicho_id) as n FROM produtos WHERE garimpado_em >= ?")
    .get(iso) as { n: number }).n;
  return { produtos, roteiros, nichosCobertos };
}
