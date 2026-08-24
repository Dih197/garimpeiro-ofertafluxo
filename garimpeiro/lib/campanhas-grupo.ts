import { createHash, randomUUID } from "crypto";
import { getDatabase } from "./db";

export type CampanhaGrupo = {
  id: string;
  nome: string;
  slug: string;
  whatsappLink: string;
  whatsappGroupId: string;
  metaCampaignId: string;
  titulo: string;
  descricao: string;
  textoBotao: string;
  corDestaque: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

export type MetricasCampanhaGrupo = {
  visualizacoes: number;
  leads: number;
  cliquesGrupo: number;
  entradasConfirmadas: number;
  taxaCaptura: number;
  taxaClique: number;
  taxaEntrada: number;
  gastoMeta: number;
  cpl: number;
  custoPorEntrada: number;
};

export type LeadGrupo = {
  id: string;
  campanhaId: string;
  visitanteId: string;
  nome: string;
  telefone: string;
  telefoneHash: string;
  consentimento: boolean;
  status: "capturado" | "clicou_grupo" | "entrada_confirmada";
  capturadoEm: string;
  clicouEm: string | null;
  entrouEm: string | null;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  fbclid: string;
  fbp: string;
  fbc: string;
};

type CampanhaRow = {
  id: string; nome: string; slug: string; whatsapp_link: string; whatsapp_group_id: string;
  meta_campaign_id: string; titulo: string; descricao: string; texto_botao: string;
  cor_destaque: string; ativo: number; criado_em: string; atualizado_em: string;
};

type LeadRow = {
  id: string; campanha_id: string; visitante_id: string; nome: string; telefone: string;
  telefone_hash: string; consentimento: number; status: LeadGrupo["status"]; capturado_em: string;
  clicou_em: string | null; entrou_em: string | null; utm_source: string; utm_medium: string;
  utm_campaign: string; utm_content: string; utm_term: string; fbclid: string; fbp: string; fbc: string;
};

function mapCampanha(r: CampanhaRow): CampanhaGrupo {
  return {
    id: r.id, nome: r.nome, slug: r.slug, whatsappLink: r.whatsapp_link,
    whatsappGroupId: r.whatsapp_group_id || "", metaCampaignId: r.meta_campaign_id || "",
    titulo: r.titulo, descricao: r.descricao || "", textoBotao: r.texto_botao,
    corDestaque: r.cor_destaque, ativo: r.ativo === 1, criadoEm: r.criado_em, atualizadoEm: r.atualizado_em
  };
}

function mapLead(r: LeadRow): LeadGrupo {
  return {
    id: r.id, campanhaId: r.campanha_id, visitanteId: r.visitante_id || "", nome: r.nome,
    telefone: r.telefone, telefoneHash: r.telefone_hash, consentimento: r.consentimento === 1,
    status: r.status, capturadoEm: r.capturado_em, clicouEm: r.clicou_em, entrouEm: r.entrou_em,
    utmSource: r.utm_source || "", utmMedium: r.utm_medium || "", utmCampaign: r.utm_campaign || "",
    utmContent: r.utm_content || "", utmTerm: r.utm_term || "", fbclid: r.fbclid || "",
    fbp: r.fbp || "", fbc: r.fbc || ""
  };
}

export function slugCampanha(valor: string): string {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
}

export function normalizarTelefone(valor: string): string {
  let digitos = valor.replace(/\D/g, "");
  if ((digitos.length === 10 || digitos.length === 11) && !digitos.startsWith("55")) digitos = `55${digitos}`;
  return digitos.slice(0, 15);
}

export function hashTelefone(valor: string): string {
  return createHash("sha256").update(normalizarTelefone(valor)).digest("hex");
}

export function criarCampanhaGrupo(dados: {
  nome: string; slug?: string; whatsappLink: string; whatsappGroupId?: string; metaCampaignId?: string;
  titulo?: string; descricao?: string; textoBotao?: string; corDestaque?: string;
}): CampanhaGrupo {
  const agora = new Date().toISOString();
  const id = randomUUID();
  let slug = slugCampanha(dados.slug || dados.nome) || `grupo-${id.slice(0, 8)}`;
  const existe = getDatabase().prepare("SELECT 1 FROM campanhas_grupo WHERE slug = ?").get(slug);
  if (existe) slug = `${slug}-${id.slice(0, 6)}`;
  getDatabase().prepare(`
    INSERT INTO campanhas_grupo
      (id, nome, slug, whatsapp_link, whatsapp_group_id, meta_campaign_id, titulo, descricao, texto_botao, cor_destaque, ativo, criado_em, atualizado_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    id, dados.nome, slug, dados.whatsappLink, dados.whatsappGroupId || "", dados.metaCampaignId || "",
    dados.titulo || dados.nome, dados.descricao || "", dados.textoBotao || "Entrar no grupo grátis",
    dados.corDestaque || "#22c55e", agora, agora
  );
  return buscarCampanhaGrupoPorId(id)!;
}

export function atualizarCampanhaGrupo(id: string, dados: Partial<{
  nome: string; slug: string; whatsappLink: string; whatsappGroupId: string; metaCampaignId: string;
  titulo: string; descricao: string; textoBotao: string; corDestaque: string; ativo: boolean;
}>): CampanhaGrupo | null {
  const atual = buscarCampanhaGrupoPorId(id);
  if (!atual) return null;
  const proxima = { ...atual, ...dados, slug: slugCampanha(dados.slug || atual.slug) || atual.slug };
  getDatabase().prepare(`
    UPDATE campanhas_grupo SET nome=?, slug=?, whatsapp_link=?, whatsapp_group_id=?, meta_campaign_id=?,
      titulo=?, descricao=?, texto_botao=?, cor_destaque=?, ativo=?, atualizado_em=? WHERE id=?
  `).run(
    proxima.nome, proxima.slug, proxima.whatsappLink, proxima.whatsappGroupId, proxima.metaCampaignId,
    proxima.titulo, proxima.descricao, proxima.textoBotao, proxima.corDestaque, proxima.ativo ? 1 : 0,
    new Date().toISOString(), id
  );
  return buscarCampanhaGrupoPorId(id);
}

export function excluirCampanhaGrupo(id: string): boolean {
  return getDatabase().prepare("DELETE FROM campanhas_grupo WHERE id = ?").run(id).changes > 0;
}

export function listarCampanhasGrupo(): Array<CampanhaGrupo & { metricas: MetricasCampanhaGrupo }> {
  const rows = getDatabase().prepare("SELECT * FROM campanhas_grupo ORDER BY ativo DESC, atualizado_em DESC").all() as CampanhaRow[];
  return rows.map((r) => {
    const campanha = mapCampanha(r);
    return { ...campanha, metricas: metricasCampanhaGrupo(campanha.id) };
  });
}

export function buscarCampanhaGrupoPorId(id: string): CampanhaGrupo | null {
  const row = getDatabase().prepare("SELECT * FROM campanhas_grupo WHERE id = ?").get(id) as CampanhaRow | undefined;
  return row ? mapCampanha(row) : null;
}

export function buscarCampanhaGrupoPorSlug(slug: string, somenteAtiva = true): CampanhaGrupo | null {
  const row = getDatabase().prepare(`SELECT * FROM campanhas_grupo WHERE slug = ? ${somenteAtiva ? "AND ativo = 1" : ""}`).get(slug) as CampanhaRow | undefined;
  return row ? mapCampanha(row) : null;
}

export function registrarVisualizacao(campanhaId: string, visitanteId: string, dados: Record<string, string>): string {
  const eventId = `view_${randomUUID()}`;
  getDatabase().prepare(`INSERT INTO eventos_grupo (event_id, campanha_id, visitante_id, tipo, origem, dados, criado_em) VALUES (?, ?, ?, 'page_view', 'site', ?, ?)`)
    .run(eventId, campanhaId, visitanteId, JSON.stringify(dados), new Date().toISOString());
  return eventId;
}

export function capturarLead(dados: {
  campanhaId: string; visitanteId: string; nome: string; telefone: string; consentimento: boolean;
  utmSource?: string; utmMedium?: string; utmCampaign?: string; utmContent?: string; utmTerm?: string;
  fbclid?: string; fbp?: string; fbc?: string;
}): { lead: LeadGrupo; eventId: string; novo: boolean } {
  const telefone = normalizarTelefone(dados.telefone);
  const telefoneHash = hashTelefone(telefone);
  const banco = getDatabase();
  const existente = banco.prepare("SELECT * FROM leads_grupo WHERE campanha_id = ? AND telefone_hash = ?").get(dados.campanhaId, telefoneHash) as LeadRow | undefined;
  const agora = new Date().toISOString();
  const leadId = existente?.id || randomUUID();
  if (existente) {
    banco.prepare(`UPDATE leads_grupo SET nome=?, telefone=?, visitante_id=?, consentimento=?, utm_source=?, utm_medium=?,
      utm_campaign=?, utm_content=?, utm_term=?, fbclid=?, fbp=?, fbc=? WHERE id=?`).run(
      dados.nome, telefone, dados.visitanteId, dados.consentimento ? 1 : 0, dados.utmSource || "", dados.utmMedium || "",
      dados.utmCampaign || "", dados.utmContent || "", dados.utmTerm || "", dados.fbclid || "", dados.fbp || "", dados.fbc || "", leadId
    );
  } else {
    banco.prepare(`INSERT INTO leads_grupo
      (id, campanha_id, visitante_id, nome, telefone, telefone_hash, consentimento, utm_source, utm_medium, utm_campaign,
       utm_content, utm_term, fbclid, fbp, fbc, status, capturado_em)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'capturado', ?)`
    ).run(
      leadId, dados.campanhaId, dados.visitanteId, dados.nome, telefone, telefoneHash, dados.consentimento ? 1 : 0,
      dados.utmSource || "", dados.utmMedium || "", dados.utmCampaign || "", dados.utmContent || "", dados.utmTerm || "",
      dados.fbclid || "", dados.fbp || "", dados.fbc || "", agora
    );
  }
  const eventId = `lead_${leadId}`;
  banco.prepare(`INSERT OR IGNORE INTO eventos_grupo (event_id, campanha_id, lead_id, visitante_id, tipo, origem, dados, criado_em)
    VALUES (?, ?, ?, ?, 'lead', 'site', '{}', ?)`).run(eventId, dados.campanhaId, leadId, dados.visitanteId, agora);
  const lead = banco.prepare("SELECT * FROM leads_grupo WHERE id = ?").get(leadId) as LeadRow;
  return { lead: mapLead(lead), eventId, novo: !existente };
}

export function buscarLeadGrupo(id: string): LeadGrupo | null {
  const row = getDatabase().prepare("SELECT * FROM leads_grupo WHERE id = ?").get(id) as LeadRow | undefined;
  return row ? mapLead(row) : null;
}

export function registrarCliqueGrupo(leadId: string): { lead: LeadGrupo; eventId: string } | null {
  const lead = buscarLeadGrupo(leadId);
  if (!lead) return null;
  const agora = new Date().toISOString();
  getDatabase().prepare(`UPDATE leads_grupo SET status = CASE WHEN status = 'entrada_confirmada' THEN status ELSE 'clicou_grupo' END,
    clicou_em = COALESCE(clicou_em, ?) WHERE id = ?`).run(agora, leadId);
  const eventId = `group_click_${leadId}`;
  getDatabase().prepare(`INSERT OR IGNORE INTO eventos_grupo (event_id, campanha_id, lead_id, visitante_id, tipo, origem, dados, criado_em)
    VALUES (?, ?, ?, ?, 'group_click', 'site', '{}', ?)`).run(eventId, lead.campanhaId, lead.id, lead.visitanteId, agora);
  return { lead: buscarLeadGrupo(leadId)!, eventId };
}

export function confirmarEntradaGrupo(leadId: string, origem: "autoconfirmacao" | "webhook" = "autoconfirmacao"): { lead: LeadGrupo; eventId: string; novo: boolean } | null {
  const lead = buscarLeadGrupo(leadId);
  if (!lead) return null;
  const novo = lead.status !== "entrada_confirmada";
  const agora = new Date().toISOString();
  getDatabase().prepare("UPDATE leads_grupo SET status='entrada_confirmada', entrou_em=COALESCE(entrou_em, ?) WHERE id=?").run(agora, leadId);
  const eventId = `group_join_${leadId}`;
  getDatabase().prepare(`INSERT OR IGNORE INTO eventos_grupo (event_id, campanha_id, lead_id, visitante_id, tipo, origem, dados, criado_em)
    VALUES (?, ?, ?, ?, 'group_join', ?, '{}', ?)`).run(eventId, lead.campanhaId, lead.id, lead.visitanteId, origem, agora);
  return { lead: buscarLeadGrupo(leadId)!, eventId, novo };
}

export function confirmarEntradaPorWebhook(groupId: string, telefone: string): ReturnType<typeof confirmarEntradaGrupo> {
  const hash = hashTelefone(telefone);
  const row = getDatabase().prepare(`SELECT l.id FROM leads_grupo l JOIN campanhas_grupo c ON c.id=l.campanha_id
    WHERE c.whatsapp_group_id=? AND l.telefone_hash=? ORDER BY l.capturado_em DESC LIMIT 1`).get(groupId, hash) as { id: string } | undefined;
  return row ? confirmarEntradaGrupo(row.id, "webhook") : null;
}

export function listarLeadsGrupo(campanhaId: string, limite = 200): LeadGrupo[] {
  const rows = getDatabase().prepare("SELECT * FROM leads_grupo WHERE campanha_id=? ORDER BY capturado_em DESC LIMIT ?")
    .all(campanhaId, limite) as LeadRow[];
  return rows.map(mapLead);
}

export function metricasCampanhaGrupo(campanhaId: string): MetricasCampanhaGrupo {
  const banco = getDatabase();
  const views = banco.prepare("SELECT COUNT(DISTINCT CASE WHEN visitante_id != '' THEN visitante_id ELSE event_id END) n FROM eventos_grupo WHERE campanha_id=? AND tipo='page_view'").get(campanhaId) as { n: number };
  const leads = banco.prepare(`SELECT COUNT(*) leads,
    SUM(CASE WHEN clicou_em IS NOT NULL THEN 1 ELSE 0 END) cliques,
    SUM(CASE WHEN entrou_em IS NOT NULL THEN 1 ELSE 0 END) entradas FROM leads_grupo WHERE campanha_id=?`).get(campanhaId) as { leads: number; cliques: number | null; entradas: number | null };
  const campanha = buscarCampanhaGrupoPorId(campanhaId);
  let gastoMeta = 0;
  if (campanha?.metaCampaignId) {
    const gasto = banco.prepare("SELECT COALESCE(SUM(spend), 0) total FROM meta_insights WHERE campaign_id=?").get(campanha.metaCampaignId) as { total: number };
    gastoMeta = Number(gasto.total || 0);
  }
  const visualizacoes = Number(views.n || 0);
  const totalLeads = Number(leads.leads || 0);
  const cliquesGrupo = Number(leads.cliques || 0);
  const entradasConfirmadas = Number(leads.entradas || 0);
  return {
    visualizacoes, leads: totalLeads, cliquesGrupo, entradasConfirmadas,
    taxaCaptura: visualizacoes ? (totalLeads / visualizacoes) * 100 : 0,
    taxaClique: totalLeads ? (cliquesGrupo / totalLeads) * 100 : 0,
    taxaEntrada: totalLeads ? (entradasConfirmadas / totalLeads) * 100 : 0,
    gastoMeta, cpl: totalLeads ? gastoMeta / totalLeads : 0,
    custoPorEntrada: entradasConfirmadas ? gastoMeta / entradasConfirmadas : 0
  };
}
