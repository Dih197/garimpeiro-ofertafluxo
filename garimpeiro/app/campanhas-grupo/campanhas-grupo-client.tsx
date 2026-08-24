"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity, Check, CheckCircle2, Copy, Download, ExternalLink, Eye, Link2, Pencil,
  Loader2, MessageCircle, MousePointerClick, Plus, Power, Target, Trash2, UsersRound, X
} from "lucide-react";
import type { CampanhaGrupo, LeadGrupo, MetricasCampanhaGrupo } from "@/lib/campanhas-grupo";

type CampanhaComMetricas = CampanhaGrupo & { metricas: MetricasCampanhaGrupo };

const VAZIO = {
  nome: "", whatsappLink: "", titulo: "", descricao: "", textoBotao: "Entrar no grupo grátis",
  metaCampaignId: "", whatsappGroupId: ""
};

const numero = (v: number) => v.toLocaleString("pt-BR");
const dinheiro = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const percentual = (v: number) => `${v.toFixed(1).replace(".", ",")}%`;

export function CampanhasGrupoClient({ iniciais }: { iniciais: CampanhaComMetricas[] }) {
  const [campanhas, setCampanhas] = useState(iniciais);
  const [form, setForm] = useState(VAZIO);
  const [abrirForm, setAbrirForm] = useState(iniciais.length === 0);
  const [editandoId, setEditandoId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState("");
  const [selecionada, setSelecionada] = useState(iniciais[0]?.id || "");
  const [leads, setLeads] = useState<LeadGrupo[]>([]);
  const [carregandoLeads, setCarregandoLeads] = useState(false);
  const campanhaAtual = useMemo(() => campanhas.find((c) => c.id === selecionada), [campanhas, selecionada]);

  async function recarregar(id?: string) {
    const r = await fetch(`/api/campanhas-grupo${id ? `?id=${encodeURIComponent(id)}` : ""}`, { cache: "no-store" });
    const d = await r.json();
    if (d.campanhas) setCampanhas(d.campanhas);
    if (d.leads) setLeads(d.leads);
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault(); setSalvando(true); setErro("");
    try {
      const r = await fetch("/api/campanhas-grupo", {
        method: editandoId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editandoId ? { ...form, id: editandoId } : form)
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.erro || "Não foi possível criar.");
      setForm(VAZIO); setEditandoId(""); setAbrirForm(false); setSelecionada(d.campanha.id);
      await recarregar(d.campanha.id);
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha ao criar campanha."); }
    finally { setSalvando(false); }
  }

  async function alternar(c: CampanhaComMetricas) {
    setSalvando(true); setErro("");
    try {
      const r = await fetch("/api/campanhas-grupo", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, ativo: !c.ativo }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.erro || "Não foi possível atualizar.");
      await recarregar(c.id);
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha ao atualizar."); }
    finally { setSalvando(false); }
  }

  async function excluir(c: CampanhaComMetricas) {
    if (!confirm(`Excluir permanentemente a campanha "${c.nome}" e todos os leads/eventos dela?`)) return;
    setSalvando(true); setErro("");
    try {
      const r = await fetch("/api/campanhas-grupo", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.erro || "Não foi possível excluir.");
      const restantes = campanhas.filter((item) => item.id !== c.id);
      setCampanhas(restantes); setSelecionada(restantes[0]?.id || ""); setLeads([]);
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha ao excluir."); }
    finally { setSalvando(false); }
  }

  function editar(c: CampanhaComMetricas) {
    setForm({
      nome: c.nome, whatsappLink: c.whatsappLink, titulo: c.titulo, descricao: c.descricao,
      textoBotao: c.textoBotao, metaCampaignId: c.metaCampaignId, whatsappGroupId: c.whatsappGroupId
    });
    setEditandoId(c.id); setAbrirForm(true); setErro("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function abrirDetalhes(id: string) {
    setSelecionada(id); setCarregandoLeads(true); setLeads([]);
    try { await recarregar(id); } finally { setCarregandoLeads(false); }
  }

  async function copiar(texto: string, id: string) {
    await navigator.clipboard.writeText(texto);
    setCopiado(id); setTimeout(() => setCopiado(""), 1800);
  }

  function urlPublica(slug: string) {
    return typeof window === "undefined" ? `/entrar/${slug}` : `${window.location.origin}/entrar/${slug}`;
  }

  function exportarCsv() {
    if (!campanhaAtual) return;
    const limpar = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const linhas = [
      ["Nome", "WhatsApp", "Status", "Capturado em", "UTM source", "UTM campaign", "UTM content"],
      ...leads.map((l) => [l.nome, l.telefone, l.status, l.capturadoEm, l.utmSource, l.utmCampaign, l.utmContent])
    ].map((l) => l.map(limpar).join(";")).join("\r\n");
    const blob = new Blob(["\ufeff" + linhas], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `leads-${campanhaAtual.slug}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }

  return (
    <div className="page-shell mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="page-header mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-400"><MessageCircle className="h-4 w-4" /> Aquisição</div>
          <h1 className="mt-2 text-3xl font-black">Campanhas para grupos WhatsApp</h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">Meça anúncio → página → contato → clique → entrada no grupo, com UTMs e atribuição Meta Pixel + CAPI.</p>
        </div>
        <button onClick={() => { setAbrirForm(!abrirForm); setEditandoId(""); setForm(VAZIO); }} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-black text-zinc-950 hover:bg-emerald-400">
          {abrirForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {abrirForm ? "Fechar" : "Nova campanha"}
        </button>
      </header>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <Info titulo="Link para o anúncio" texto="Use /entrar/sua-campanha como destino no Meta Ads e mantenha os parâmetros UTM." />
        <Info titulo="Grupo comum" texto="O clique é automático; a entrada real é confirmada pelo lead ao voltar para a página." />
        <Info titulo="Grupo API oficial" texto="Informe o Group ID e configure o webhook para confirmar a entrada automaticamente." />
      </div>

      {abrirForm && (
        <form onSubmit={criar} className="glass mb-6 rounded-2xl border-emerald-500/20 p-5">
          <div className="mb-4 text-sm font-black text-emerald-300">{editandoId ? "Editar página de captura" : "Configurar nova página de captura"}</div>
          <div className="grid gap-4 md:grid-cols-2">
            <Campo label="Nome interno *"><input required minLength={3} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ofertas VIP Agosto" className="input-campanha" /></Campo>
            <Campo label="Link de convite WhatsApp *"><input required type="url" value={form.whatsappLink} onChange={(e) => setForm({ ...form, whatsappLink: e.target.value })} placeholder="https://chat.whatsapp.com/..." className="input-campanha" /></Campo>
            <Campo label="Título da página"><input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Entre no grupo de ofertas VIP" className="input-campanha" /></Campo>
            <Campo label="Texto do botão"><input value={form.textoBotao} onChange={(e) => setForm({ ...form, textoBotao: e.target.value })} className="input-campanha" /></Campo>
            <Campo label="ID da campanha Meta Ads"><input value={form.metaCampaignId} onChange={(e) => setForm({ ...form, metaCampaignId: e.target.value })} placeholder="Liga gasto real a CPL e custo/entrada" className="input-campanha font-mono" /></Campo>
            <Campo label="WhatsApp Group ID (opcional)"><input value={form.whatsappGroupId} onChange={(e) => setForm({ ...form, whatsappGroupId: e.target.value })} placeholder="Só para Groups API oficial" className="input-campanha font-mono" /></Campo>
            <div className="md:col-span-2"><Campo label="Descrição da oferta"><textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} maxLength={500} rows={3} placeholder="Explique o benefício de entrar no grupo..." className="input-campanha resize-none" /></Campo></div>
          </div>
          {erro && <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{erro}</div>}
          <button disabled={salvando} className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-zinc-950 disabled:opacity-60">
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : editandoId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {editandoId ? "Salvar alterações" : "Criar campanha"}
          </button>
        </form>
      )}

      {!campanhas.length ? (
        <div className="glass rounded-2xl py-16 text-center"><UsersRound className="mx-auto h-12 w-12 text-zinc-700" /><h2 className="mt-4 font-bold">Crie sua primeira campanha</h2><p className="mt-1 text-sm text-zinc-500">A página e todo o rastreamento serão gerados automaticamente.</p></div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 xl:grid-cols-2">
            {campanhas.map((c) => (
              <article key={c.id} className={`glass rounded-2xl border p-5 transition ${selecionada === c.id ? "border-emerald-500/40" : "border-white/5"}`}>
                <div className="flex items-start justify-between gap-3">
                  <button onClick={() => abrirDetalhes(c.id)} className="min-w-0 text-left">
                    <div className="flex items-center gap-2"><h2 className="truncate font-black">{c.nome}</h2><span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${c.ativo ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-700/30 text-zinc-500"}`}>{c.ativo ? "ATIVA" : "PAUSADA"}</span></div>
                    <div className="mt-1 truncate font-mono text-[11px] text-zinc-500">/entrar/{c.slug}</div>
                  </button>
                  <button title={c.ativo ? "Pausar página" : "Ativar página"} onClick={() => alternar(c)} className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 hover:text-white"><Power className="h-4 w-4" /></button>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  <Mini icon={Eye} label="Visitas" valor={numero(c.metricas.visualizacoes)} />
                  <Mini icon={Target} label="Contatos" valor={numero(c.metricas.leads)} />
                  <Mini icon={MousePointerClick} label="Cliques" valor={numero(c.metricas.cliquesGrupo)} />
                  <Mini icon={CheckCircle2} label="Entradas" valor={numero(c.metricas.entradasConfirmadas)} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-black/20 p-3 text-center">
                  <Taxa label="Captura" valor={percentual(c.metricas.taxaCaptura)} />
                  <Taxa label="Entrada" valor={percentual(c.metricas.taxaEntrada)} />
                  <Taxa label="Custo/entrada" valor={dinheiro(c.metricas.custoPorEntrada)} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/entrar/${c.slug}`} target="_blank" className="flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[11px] font-bold text-emerald-300"><ExternalLink className="h-3 w-3" /> Ver página</Link>
                  <button onClick={() => copiar(urlPublica(c.slug), c.id)} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-bold text-zinc-300">{copiado === c.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copiar URL</button>
                  <button onClick={() => editar(c)} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-bold text-zinc-300"><Pencil className="h-3 w-3" /> Editar</button>
                  <button onClick={() => excluir(c)} className="flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-[11px] font-bold text-rose-300"><Trash2 className="h-3 w-3" /> Excluir</button>
                  <button onClick={() => abrirDetalhes(c.id)} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-bold text-zinc-300"><Activity className="h-3 w-3" /> Ver leads</button>
                </div>
              </article>
            ))}
          </div>

          {campanhaAtual && (
            <section className="glass overflow-hidden rounded-2xl">
              <div className="flex flex-col justify-between gap-3 border-b border-white/5 p-5 sm:flex-row sm:items-center">
                <div><h2 className="font-black">Leads · {campanhaAtual.nome}</h2><p className="text-xs text-zinc-500">Telefone local; o Meta recebe apenas o hash SHA-256.</p></div>
                <button onClick={exportarCsv} disabled={!leads.length} className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold disabled:opacity-40"><Download className="h-3.5 w-3.5" /> Exportar CSV</button>
              </div>
              {carregandoLeads ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-emerald-400" /></div> : !leads.length ? <div className="py-12 text-center text-sm text-zinc-500">Nenhum lead capturado ainda.</div> : (
                <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-black/20 text-[10px] uppercase tracking-wider text-zinc-500"><tr><th className="p-3">Lead</th><th className="p-3">WhatsApp</th><th className="p-3">Status</th><th className="p-3">Origem</th><th className="p-3">Campanha UTM</th><th className="p-3">Capturado</th></tr></thead><tbody>{leads.map((l) => <tr key={l.id} className="border-t border-white/5"><td className="p-3 font-bold">{l.nome}</td><td className="p-3 font-mono text-zinc-400">+{l.telefone}</td><td className="p-3"><StatusLead status={l.status} /></td><td className="p-3 text-zinc-400">{l.utmSource || "direto"}</td><td className="p-3 text-zinc-400">{l.utmCampaign || "—"}</td><td className="p-3 text-zinc-500">{new Date(l.capturadoEm).toLocaleString("pt-BR")}</td></tr>)}</tbody></table></div>
              )}
            </section>
          )}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 text-xs leading-relaxed text-sky-100/80">
        <strong className="text-sky-300">Webhook automático:</strong> publique o app em HTTPS e cadastre <code className="rounded bg-black/30 px-1.5 py-0.5">/api/webhooks/whatsapp</code> no app Meta, assinando <code className="rounded bg-black/30 px-1.5 py-0.5">group_participants_update</code>. Requer um grupo compatível com a Groups API oficial.
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) { return <label className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{label}</span>{children}</label>; }
function Info({ titulo, texto }: { titulo: string; texto: string }) { return <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4"><div className="flex items-center gap-2 text-xs font-black text-zinc-200"><Link2 className="h-3.5 w-3.5 text-emerald-400" />{titulo}</div><p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">{texto}</p></div>; }
function Mini({ icon: Icon, label, valor }: { icon: typeof Eye; label: string; valor: string }) { return <div className="rounded-xl bg-white/[0.035] p-2 text-center"><Icon className="mx-auto h-3.5 w-3.5 text-emerald-400" /><div className="mt-1 text-base font-black">{valor}</div><div className="text-[9px] uppercase text-zinc-600">{label}</div></div>; }
function Taxa({ label, valor }: { label: string; valor: string }) { return <div><div className="text-xs font-black text-zinc-200">{valor}</div><div className="text-[9px] uppercase text-zinc-600">{label}</div></div>; }
function StatusLead({ status }: { status: LeadGrupo["status"] }) { const mapa = { capturado: ["Contato", "bg-sky-500/10 text-sky-300"], clicou_grupo: ["Clicou", "bg-amber-500/10 text-amber-300"], entrada_confirmada: ["Entrou", "bg-emerald-500/10 text-emerald-300"] } as const; const [nome, classe] = mapa[status]; return <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${classe}`}>{nome}</span>; }
