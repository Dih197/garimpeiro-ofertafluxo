"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Loader2,
  Copy,
  Check,
  Share2,
  Send,
  QrCode,
  ExternalLink,
  Sparkles,
  ShoppingBag,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Trash2,
  UsersRound,
  Wifi,
  Clock3,
  SlidersHorizontal,
  ListChecks,
  Smartphone,
  RefreshCw,
  Activity
} from "lucide-react";
import { cn, formatBRL } from "@/lib/utils";
import { gerarCopy, type CopyPlatform } from "@/lib/copy";
import type { Produto } from "@/lib/types";

const CANAIS: Array<{ id: CopyPlatform; nome: string; cor: string; icon: string }> = [
  { id: "shopeevd", nome: "Shopee Vídeo", cor: "bg-orange-500/20 text-orange-300 border-orange-500/30", icon: "SV" },
  { id: "reels", nome: "Reels", cor: "bg-pink-500/20 text-pink-300 border-pink-500/30", icon: "IG" },
  { id: "tiktok", nome: "TikTok", cor: "bg-zinc-500/20 text-zinc-200 border-zinc-500/30", icon: "TT" },
  { id: "kwai", nome: "Kwai", cor: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", icon: "KW" },
  { id: "ytshorts", nome: "YouTube Shorts", cor: "bg-red-500/20 text-red-300 border-red-500/30", icon: "YT" },
  { id: "facebook", nome: "Facebook", cor: "bg-blue-500/20 text-blue-300 border-blue-500/30", icon: "FB" },
  { id: "wpp", nome: "WhatsApp", cor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", icon: "WA" },
  { id: "tg", nome: "Telegram", cor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30", icon: "TG" }
];

export function DistribuicaoClient({ produtos }: { produtos: Produto[] }) {
  const [selecionado, setSelecionado] = useState<Produto | null>(produtos[0] || null);

  if (!produtos.length) {
    return (
      <div className="space-y-6">
        <div className="glass rounded-2xl py-12 text-center">
          <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-zinc-700" />
          <div className="text-sm font-semibold text-zinc-300">Nenhum produto pra distribuir ainda</div>
          <div className="mt-1 text-xs text-zinc-500">Garimpe um produto para liberar o envio; a integração e os destinos já podem ser configurados abaixo.</div>
        </div>
        <AutomacaoWhatsApp produto={null} />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <aside className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">Produtos garimpados</div>
        <div className="scrollbar-thin max-h-[70vh] space-y-1.5 overflow-y-auto pr-2">
          {produtos.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelecionado(p)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-all",
                selecionado?.id === p.id
                  ? "border-sky-500/50 bg-sky-500/10"
                  : "border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10"
              )}
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                {p.imagem && <Image src={p.imagem} alt="" fill sizes="48px" className="object-cover" unoptimized />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold">{p.nome}</div>
                <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                  <span>{formatBRL(p.preco)}</span>·<span>{p.comissaoPct.toFixed(0)}%</span>
                  {p.comissaoExtraPct > 0 && <span className="rounded bg-shopee/20 px-1 text-[8px] font-black text-shopee">EX</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {selecionado && <PainelDistribuicao key={selecionado.id} produto={selecionado} />}
    </div>
  );
}

function PainelDistribuicao({ produto }: { produto: Produto }) {
  const [canaisAtivos, setCanaisAtivos] = useState<Set<CopyPlatform>>(
    new Set(["shopeevd", "reels", "tiktok", "wpp"])
  );
  const [links, setLinks] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(false);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  function toggleCanal(c: CopyPlatform) {
    setCanaisAtivos((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  async function gerarLinks() {
    if (!canaisAtivos.size) return;
    setCarregando(true);
    try {
      const r = await fetch("/api/distribuicao/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produtoId: produto.id, canais: Array.from(canaisAtivos) })
      });
      const d = await r.json();
      if (d.links) setLinks(d.links);
    } finally {
      setCarregando(false);
    }
  }

  async function copiar(id: string, texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoId(id);
      setTimeout(() => setCopiadoId(null), 2000);
    } catch {}
  }

  return (
    <div className="space-y-5">
      <div className="glass overflow-hidden rounded-2xl">
        <div className="flex gap-4 p-4">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
            {produto.imagem && <Image src={produto.imagem} alt="" fill sizes="96px" className="object-cover" unoptimized />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 text-sm font-bold leading-snug">{produto.nome}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <span className="font-bold text-shopee">{formatBRL(produto.preco)}</span>
              <span className="flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 font-bold text-emerald-300">
                {produto.comissaoPct.toFixed(1)}% comissão
                {produto.comissaoExtraPct > 0 && <span className="rounded bg-shopee/30 px-1 text-[9px] text-shopee" title={`Bonus seller: ${produto.comissaoExtraPct.toFixed(1)}%`}>EXTRA</span>}
              </span>
              <span>{produto.vendas.toLocaleString("pt-BR")} vendas</span>
              <span>⭐ {produto.rating.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Share2 className="h-4 w-4 text-sky-400" /> Selecione canais e gere links rastreáveis
        </div>
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CANAIS.map((c) => (
            <button
              key={c.id}
              onClick={() => toggleCanal(c.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all",
                canaisAtivos.has(c.id) ? c.cor : "border-white/10 bg-white/5 text-zinc-500 hover:bg-white/10"
              )}
            >
              <span className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-black",
                canaisAtivos.has(c.id) ? "bg-black/30" : "bg-zinc-800"
              )}>
                {c.icon}
              </span>
              <span className="text-left leading-tight">{c.nome}</span>
            </button>
          ))}
        </div>
        <button
          onClick={gerarLinks}
          disabled={carregando || !canaisAtivos.size}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500/20 px-4 py-3 text-sm font-bold text-sky-200 ring-1 ring-sky-500/30 transition-all hover:bg-sky-500/30 disabled:opacity-50"
        >
          {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {carregando ? "Gerando links rastreáveis..." : `Gerar ${canaisAtivos.size} links com SubID único`}
        </button>
      </div>

      {Object.keys(links).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Links gerados</h3>
          {CANAIS.filter((c) => links[c.id]).map((c) => {
            const link = links[c.id];
            const copy = gerarCopy(produto, c.id, link);
            return (
              <div key={c.id} className="glass rounded-xl p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-black", c.cor)}>
                      {c.icon}
                    </span>
                    <span className="text-sm font-bold">{c.nome}</span>
                  </div>
                  <a
                    href={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-zinc-300 hover:bg-white/10"
                  >
                    <QrCode className="h-3 w-3" /> QR
                  </a>
                </div>

                <div className="mb-2 flex items-center gap-2 rounded-lg border border-white/5 bg-black/30 px-3 py-2">
                  <code className="flex-1 truncate font-mono text-xs text-sky-300">{link}</code>
                  <button
                    onClick={() => copiar(`link-${c.id}`, link)}
                    className={cn(
                      "flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold",
                      copiadoId === `link-${c.id}`
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                    )}
                  >
                    {copiadoId === `link-${c.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    Link
                  </button>
                </div>

                <details className="group">
                  <summary className="cursor-pointer list-none text-[11px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300">
                    📝 Copy adaptado pra {c.nome}
                  </summary>
                  <div className="mt-2 rounded-lg border border-white/5 bg-black/30 p-3">
                    <pre className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">{copy}</pre>
                    <button
                      onClick={() => copiar(`copy-${c.id}`, copy)}
                      className={cn(
                        "mt-2 flex items-center gap-1 rounded-md border px-2.5 py-1 text-[10px] font-bold",
                        copiadoId === `copy-${c.id}`
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : "border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20"
                      )}
                    >
                      {copiadoId === `copy-${c.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      Copiar copy
                    </button>
                  </div>
                </details>

                {c.id === "wpp" && (
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(copy)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30"
                  >
                    <Send className="h-3.5 w-3.5" /> Abrir no WhatsApp
                  </a>
                )}
                {c.id === "tg" && (
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(copy)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-cyan-500/20 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30"
                  >
                    <Send className="h-3.5 w-3.5" /> Abrir no Telegram
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      <a
        href={produto.linkProduto}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
      >
        Ver produto na Shopee <ExternalLink className="h-3 w-3" />
      </a>

      <AutomacaoWhatsApp produto={produto} />
    </div>
  );
}

type DestinoAutomacao = { id: string; nome: string; destino: string; tipo: "grupo" | "contato"; confirmado: boolean; ativo: boolean };
type EstadoAutomacao = { destinos: DestinoAutomacao[]; evolution: { configurada: boolean; instancia: string }; cloud: { configurada: boolean }; direto: { status: "desconectado" | "conectando" | "aguardando_qr" | "conectado"; qr: string | null; erro: string | null; grupos: Array<{ id: string; subject: string }> }; agenda: { ativa: boolean; intervaloMinutos: number; proximaExecucao: string | null }; seguranca: { maxPorHora: number; maxPorDia: number; intervaloDestinoMinutos: number; descansoInicio: number; descansoFim: number }; campanhasGrupo: Array<{ id: string; nome: string; slug: string; whatsappGroupId: string; ativo: boolean; metricas: { visualizacoes: number; leads: number; cliquesGrupo: number; entradasConfirmadas: number } }>; envios: Array<{ id: string; status: string; destinoNome: string; produtoNome: string; criadoEm: string; erro: string }>; ofertaFluxo?: { disponivel: boolean; atualizadoEm: string; usuario: string | null; destinos: { lidos: number; criados: number; atualizados: number; ativos: number }; automacao: { ativa: boolean; intervaloMinutos: number; proximaExecucao: string | null }; integracoes: { shopee: boolean; whatsappDireto: boolean; evolution: boolean; cloud: boolean }; atividade: Array<{ id: string; em: string; tipo: string; mensagem: string }>; aviso?: string } };

export function AutomacaoWhatsApp({ produto }: { produto: Produto | null }) {
  const [estado, setEstado] = useState<EstadoAutomacao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [formDestino, setFormDestino] = useState({ nome: "", destino: "", tipo: "grupo" as "grupo" | "contato", confirmado: false });
  const [formEvolution, setFormEvolution] = useState({ url: "", instancia: "", key: "" });
  const [formCloud, setFormCloud] = useState({ phoneNumberId: "", token: "" });
  const [formAgenda, setFormAgenda] = useState({ ativa: false, intervaloMinutos: 60 });
  const [formSeguranca, setFormSeguranca] = useState({ maxPorHora: 12, maxPorDia: 48, intervaloDestinoMinutos: 45, descansoInicio: 22, descansoFim: 8 });

  async function carregar() {
    setCarregando(true);
    try {
      const r = await fetch("/api/distribuicao/automacao", { cache: "no-store" });
      const d = await r.json();
      if (d.ok) { setEstado(d); setFormAgenda({ ativa: d.agenda.ativa, intervaloMinutos: d.agenda.intervaloMinutos }); setFormSeguranca(d.seguranca); }
      else setErro(d.erro || "Não foi possível carregar a automação.");
    } catch { setErro("Não foi possível conectar à automação."); }
    finally { setCarregando(false); }
  }

  useEffect(() => { void carregar(); }, []);

  useEffect(() => {
    if (!estado || !["conectando", "aguardando_qr"].includes(estado.direto.status)) return;
    const timer = window.setInterval(() => { void carregar(); }, 2_500);
    return () => window.clearInterval(timer);
  }, [estado?.direto.status]);

  async function executar(corpo: Record<string, unknown>) {
    setErro(""); setSucesso("");
    const r = await fetch("/api/distribuicao/automacao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.ok) throw new Error(d.erro || "Não foi possível concluir esta ação.");
    return d;
  }

  async function salvarEvolution(e: React.FormEvent) {
    e.preventDefault(); setSalvando(true);
    try { await executar({ acao: "salvar_evolution", ...formEvolution }); setFormEvolution({ url: "", instancia: "", key: "" }); setSucesso("Evolution API configurada com sucesso."); await carregar(); }
    catch (e) { setErro(e instanceof Error ? e.message : "Falha ao salvar a integração."); }
    finally { setSalvando(false); }
  }

  async function conectarDireto() {
    setSalvando(true);
    try { await executar({ acao: "conectar_direto" }); setSucesso("QR Code sendo preparado. Abra o WhatsApp no celular e use Aparelhos conectados."); await new Promise((resolve) => setTimeout(resolve, 800)); await carregar(); }
    catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível iniciar a conexão direta."); }
    finally { setSalvando(false); }
  }

  async function atualizarGruposDireto() {
    setSalvando(true);
    try { await executar({ acao: "atualizar_grupos_direto" }); setSucesso("Lista de grupos atualizada."); await carregar(); }
    catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível atualizar os grupos."); }
    finally { setSalvando(false); }
  }

  async function salvarCloud(e: React.FormEvent) {
    e.preventDefault(); setSalvando(true);
    try { await executar({ acao: "salvar_cloud", ...formCloud }); setFormCloud({ phoneNumberId: "", token: "" }); setSucesso("WhatsApp Cloud configurado para contatos com opt-in."); await carregar(); }
    catch (e) { setErro(e instanceof Error ? e.message : "Falha ao salvar WhatsApp Cloud."); }
    finally { setSalvando(false); }
  }

  async function criarDestino(e: React.FormEvent) {
    e.preventDefault(); setSalvando(true);
    try { await executar({ acao: "criar_destino", ...formDestino }); setFormDestino({ nome: "", destino: "", tipo: "grupo", confirmado: false }); setSucesso("Destino autorizado e adicionado."); await carregar(); }
    catch (e) { setErro(e instanceof Error ? e.message : "Falha ao criar destino."); }
    finally { setSalvando(false); }
  }

  async function salvarAgenda(e: React.FormEvent) {
    e.preventDefault(); setSalvando(true);
    try { await executar({ acao: "salvar_agenda", ...formAgenda }); setSucesso(formAgenda.ativa ? "Agenda ativada. Use o cron do servidor para executar os ciclos." : "Agenda pausada."); await carregar(); }
    catch (e) { setErro(e instanceof Error ? e.message : "Falha ao salvar agenda."); }
    finally { setSalvando(false); }
  }

  async function salvarSeguranca(e: React.FormEvent) {
    e.preventDefault(); setSalvando(true);
    try { await executar({ acao: "salvar_seguranca", ...formSeguranca }); setSucesso("Proteções de envio atualizadas."); await carregar(); }
    catch (e) { setErro(e instanceof Error ? e.message : "Falha ao salvar proteções."); }
    finally { setSalvando(false); }
  }

  async function alterarDestino(id: string, acao: "atualizar_destino" | "excluir_destino", ativo?: boolean) {
    try { await executar({ acao, id, ...(ativo !== undefined ? { ativo } : {}) }); await carregar(); }
    catch (e) { setErro(e instanceof Error ? e.message : "Falha ao atualizar destino."); }
  }

  function vincularCampanha(campanha: NonNullable<EstadoAutomacao>["campanhasGrupo"][number]) {
    if (!campanha.whatsappGroupId) { setErro(`A campanha “${campanha.nome}” ainda não possui ID do grupo. Abra Grupos WhatsApp e informe o ID para vinculá-la.`); return; }
    setFormDestino({ nome: campanha.nome, destino: campanha.whatsappGroupId, tipo: "grupo", confirmado: false });
    setSucesso(`Campanha “${campanha.nome}” preparada. Confirme a autorização e adicione o destino para distribuir ofertas no mesmo grupo.`);
    document.getElementById("destinos-autorizados")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function enviar(destinoId: string) {
    if (!produto) { setErro("Garimpe ou selecione um produto antes de enviar uma oferta."); return; }
    setEnviandoId(destinoId);
    try { await executar({ acao: "enviar", produtoId: produto.id, destinoId }); setSucesso("Oferta enviada e registrada no histórico."); await carregar(); }
    catch (e) { setErro(e instanceof Error ? e.message : "Falha ao enviar oferta."); }
    finally { setEnviandoId(null); }
  }

  const destinosAtivos = estado?.destinos.filter((d) => d.ativo && d.confirmado) || [];
  return (
    <section id="automacao-whatsapp" className="glass rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold"><Wifi className="h-4 w-4 text-emerald-300" /> Automação WhatsApp segura</div>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-500">Integração Evolution API para publicar somente nos seus destinos autorizados. Cada envio usa link Shopee com SubID de WhatsApp, fica registrado e respeita limite de 12/h, 48/dia e 45 min por destino.</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${estado?.evolution.configurada ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>{estado?.evolution.configurada ? `Conectada · ${estado.evolution.instancia}` : "Configuração pendente"}</span>
      </div>

      <div className={`mt-4 rounded-xl border p-3 ${estado?.ofertaFluxo?.disponivel ? "border-cyan-400/25 bg-cyan-400/[0.045]" : "border-amber-400/25 bg-amber-400/[0.045]"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2"><Activity className={`mt-0.5 h-4 w-4 shrink-0 ${estado?.ofertaFluxo?.disponivel ? "text-cyan-300" : "text-amber-300"}`} /><div><div className="text-xs font-bold">OfertaFluxo ↔ Garimpeiro sincronizados</div><p className="mt-1 text-[10px] leading-relaxed text-zinc-400">Destinos autorizados, agenda, proteções, integrações e atividade recente do painel de afiliados são espelhados automaticamente neste centro.</p></div></div>
          <button onClick={() => void carregar()} disabled={carregando || salvando} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-cyan-400/25 px-2.5 py-1.5 text-[10px] font-bold text-cyan-200 hover:bg-cyan-400/10 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${carregando ? "animate-spin" : ""}`} />Sincronizar agora</button>
        </div>
        {estado?.ofertaFluxo ? <div className="mt-3 grid gap-2 text-[10px] sm:grid-cols-4"><div className="rounded-lg bg-black/20 px-2.5 py-2"><span className="text-zinc-500">Conta</span><div className="mt-0.5 font-bold text-zinc-200">{estado.ofertaFluxo.usuario || "Não localizada"}</div></div><div className="rounded-lg bg-black/20 px-2.5 py-2"><span className="text-zinc-500">Destinos próprios</span><div className="mt-0.5 font-bold text-emerald-300">{estado.ofertaFluxo.destinos.ativos} ativos</div></div><div className="rounded-lg bg-black/20 px-2.5 py-2"><span className="text-zinc-500">Automação</span><div className="mt-0.5 font-bold text-zinc-200">{estado.ofertaFluxo.automacao.ativa ? `Ativa · ${estado.ofertaFluxo.automacao.intervaloMinutos} min` : "Pausada"}</div></div><div className="rounded-lg bg-black/20 px-2.5 py-2"><span className="text-zinc-500">Shopee + WhatsApp</span><div className="mt-0.5 font-bold text-zinc-200">{estado.ofertaFluxo.integracoes.shopee ? "Shopee pronta" : "Shopee pendente"} · {estado.ofertaFluxo.integracoes.whatsappDireto ? "WA pronto" : "WA pendente"}</div></div></div> : null}
        {estado?.ofertaFluxo?.aviso ? <div className="mt-2 text-[10px] text-amber-200">{estado.ofertaFluxo.aviso}</div> : null}
        {estado?.ofertaFluxo?.atividade?.length ? <div className="mt-3 border-t border-white/5 pt-2"><div className="mb-1 text-[9px] font-black uppercase tracking-wider text-zinc-500">Atividade recente do OfertaFluxo</div><div className="space-y-1">{estado.ofertaFluxo.atividade.slice(0, 3).map((item) => <div key={item.id} className="truncate text-[10px] text-zinc-400"><span className={item.tipo === "error" ? "text-rose-300" : item.tipo === "success" ? "text-emerald-300" : "text-cyan-300"}>●</span> {item.mensagem}</div>)}</div></div> : null}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3"><Wifi className="h-4 w-4 text-emerald-300" /><div className="mt-2 text-xs font-bold">Conexões</div><p className="mt-1 text-[10px] text-zinc-500">Evolution API para grupos próprios; campanhas Meta continuam no módulo Grupos WhatsApp.</p></div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3"><SlidersHorizontal className="h-4 w-4 text-sky-300" /><div className="mt-2 text-xs font-bold">Ofertas e filtros</div><p className="mt-1 text-[10px] text-zinc-500">Use os presets do Dashboard; cada envio usa preço, cupom, comissão e SubID de WhatsApp.</p></div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3"><ListChecks className="h-4 w-4 text-amber-300" /><div className="mt-2 text-xs font-bold">Auditoria segura</div><p className="mt-1 text-[10px] text-zinc-500">Histórico persistente, 12 envios/h, 48/dia e intervalo de 45 min por destino.</p></div>
      </div>

      {(erro || sucesso) && <div className={`mt-4 flex items-start gap-2 rounded-xl border p-3 text-xs ${erro ? "border-rose-500/25 bg-rose-500/10 text-rose-200" : "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"}`}>
        {erro ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}<span>{erro || sucesso}</span>
      </div>}

      {!estado?.evolution.configurada && <form onSubmit={salvarEvolution} className="mt-5 grid gap-2 rounded-xl border border-white/10 bg-black/20 p-3 md:grid-cols-[1.4fr_1fr_1.2fr_auto]">
        <input required value={formEvolution.url} onChange={(e) => setFormEvolution({ ...formEvolution, url: e.target.value })} placeholder="URL Evolution API (https://...)" className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs outline-none focus:border-emerald-500/60" />
        <input required value={formEvolution.instancia} onChange={(e) => setFormEvolution({ ...formEvolution, instancia: e.target.value })} placeholder="Nome da instância" className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs outline-none focus:border-emerald-500/60" />
        <input required type="password" value={formEvolution.key} onChange={(e) => setFormEvolution({ ...formEvolution, key: e.target.value })} placeholder="Chave da API" className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs outline-none focus:border-emerald-500/60" />
        <button disabled={salvando} className="rounded-lg bg-emerald-500/20 px-3 py-2 text-xs font-bold text-emerald-200 ring-1 ring-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50">Salvar integração</button>
      </form>}

      {!estado?.cloud.configurada && <form onSubmit={salvarCloud} className="mt-3 grid gap-2 rounded-xl border border-blue-500/20 bg-blue-500/[0.045] p-3 md:grid-cols-[1fr_1.8fr_auto]">
        <div className="self-center text-xs font-bold text-blue-100">WhatsApp Cloud API<br /><span className="text-[10px] font-normal text-zinc-400">Oficial · somente contatos com opt-in</span></div>
        <div className="grid gap-2 sm:grid-cols-2"><input required value={formCloud.phoneNumberId} onChange={(e) => setFormCloud({ ...formCloud, phoneNumberId: e.target.value })} placeholder="Phone Number ID" className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs outline-none focus:border-blue-500/60" /><input required type="password" value={formCloud.token} onChange={(e) => setFormCloud({ ...formCloud, token: e.target.value })} placeholder="Access token permanente" className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs outline-none focus:border-blue-500/60" /></div>
        <button disabled={salvando} className="rounded-lg bg-blue-500/15 px-3 py-2 text-xs font-bold text-blue-200 ring-1 ring-blue-500/30 hover:bg-blue-500/25 disabled:opacity-50">Conectar Cloud</button>
      </form>}

      <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.045] p-3">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-xs font-bold text-emerald-100"><Smartphone className="h-4 w-4" /> WhatsApp direto por QR Code</div><p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-zinc-400">Conexão do clone para sua conta WhatsApp. Por segurança, só serão exibidos grupos em que a conta conectada é administradora. Não envie em grupos de terceiros ou sem autorização.</p></div><span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${estado?.direto.status === "conectado" ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-500/15 text-zinc-400"}`}>{estado?.direto.status.replace("_", " ") || "desconectado"}</span></div>
        {estado?.direto.qr ? <div className="mt-3 flex flex-wrap items-center gap-4"><img src={estado.direto.qr} alt="QR Code para conectar WhatsApp" className="h-40 w-40 rounded-lg bg-white p-2" /><div className="max-w-sm text-xs leading-relaxed text-zinc-400"><strong className="text-emerald-200">Como conectar:</strong><br />No WhatsApp do celular, abra <em>Aparelhos conectados</em> → <em>Conectar um aparelho</em> e leia este QR. A página atualiza automaticamente após a conexão.</div></div> : estado?.direto.status === "conectado" ? <div className="mt-3 text-xs text-emerald-200">Conta conectada. {estado.direto.grupos.length ? `${estado.direto.grupos.length} grupo(s) administrado(s) detectado(s).` : "Nenhum grupo administrado encontrado."}</div> : <button onClick={() => void conectarDireto()} disabled={salvando} className="mt-3 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-200 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-50">{estado?.direto.status === "conectando" ? "Preparando QR…" : "Conectar WhatsApp por QR"}</button>}
        {estado?.direto.erro && <div className="mt-2 text-[10px] text-amber-300">{estado.direto.erro}</div>}
        {estado?.direto.status === "conectado" && <button onClick={() => void atualizarGruposDireto()} disabled={salvando} className="mt-3 rounded-lg border border-emerald-500/25 px-2.5 py-1.5 text-[10px] font-bold text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-50">Atualizar grupos</button>}
        {estado?.direto.grupos.length ? <div className="mt-3 flex flex-wrap gap-2">{estado.direto.grupos.map((g) => <button key={g.id} onClick={() => { setFormDestino({ nome: g.subject, destino: g.id, tipo: "grupo", confirmado: false }); document.getElementById("destinos-autorizados")?.scrollIntoView({ behavior: "smooth", block: "center" }); }} className="rounded-lg border border-emerald-500/20 bg-black/20 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-200 hover:bg-emerald-500/10">+ {g.subject}</button>)}</div> : null}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <form id="destinos-autorizados" onSubmit={criarDestino} className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold"><UsersRound className="h-4 w-4 text-sky-300" /> Adicionar destino autorizado</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input required value={formDestino.nome} onChange={(e) => setFormDestino({ ...formDestino, nome: e.target.value })} placeholder="Nome do grupo ou contato" className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs outline-none focus:border-sky-500/60" />
            <select value={formDestino.tipo} onChange={(e) => setFormDestino({ ...formDestino, tipo: e.target.value as "grupo" | "contato" })} className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs outline-none focus:border-sky-500/60"><option value="grupo">Grupo</option><option value="contato">Contato com opt-in</option></select>
          </div>
          <input required value={formDestino.destino} onChange={(e) => setFormDestino({ ...formDestino, destino: e.target.value })} placeholder={formDestino.tipo === "grupo" ? "ID do grupo na Evolution (ex.: 123@g.us)" : "WhatsApp com DDI e DDD"} className="mt-2 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs outline-none focus:border-sky-500/60" />
          <label className="mt-3 flex cursor-pointer gap-2 text-[11px] leading-relaxed text-zinc-400"><input required type="checkbox" checked={formDestino.confirmado} onChange={(e) => setFormDestino({ ...formDestino, confirmado: e.target.checked })} className="mt-0.5" />Confirmo que administro este destino e tenho autorização para publicar ofertas nele.</label>
          <button disabled={salvando} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-sky-500/15 px-3 py-2 text-xs font-bold text-sky-200 ring-1 ring-sky-500/30 hover:bg-sky-500/25 disabled:opacity-50"><ShieldCheck className="h-3.5 w-3.5" />Adicionar destino</button>
        </form>

        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="mb-3 text-xs font-bold">{produto ? <>Enviar “{produto.nome.length > 34 ? `${produto.nome.slice(0, 34)}…` : produto.nome}”</> : "Envio de oferta"}</div>
          {carregando ? <div className="text-xs text-zinc-500">Carregando destinos…</div> : !destinosAtivos.length ? <div className="text-xs leading-relaxed text-zinc-500">Adicione e autorize ao menos um destino. O envio só é liberado após a confirmação de propriedade/opt-in.</div> : <div className="space-y-2">{destinosAtivos.map((d) => <div key={d.id} className="flex items-center gap-2 rounded-lg bg-white/5 p-2"><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">{d.nome}</div><div className="text-[10px] uppercase text-zinc-500">{d.tipo}</div></div><button onClick={() => void enviar(d.id)} disabled={!produto || !estado?.evolution.configurada || enviandoId === d.id} className="rounded-md bg-emerald-500/15 px-2.5 py-1.5 text-[10px] font-bold text-emerald-200 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-40">{enviandoId === d.id ? "Enviando…" : produto ? "Enviar agora" : "Selecione produto"}</button></div>)}</div>}
        </div>
      </div>

      <form onSubmit={salvarAgenda} className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <Clock3 className="h-4 w-4 text-amber-300" />
        <div className="mr-auto"><div className="text-xs font-bold">Agenda de automação</div><div className="text-[10px] text-zinc-500">Alterna ciclos de distribuição entre destinos autorizados.</div></div>
        <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={formAgenda.ativa} onChange={(e) => setFormAgenda({ ...formAgenda, ativa: e.target.checked })} />Ativar</label>
        <label className="flex items-center gap-2 text-xs text-zinc-400">A cada <input type="number" min="15" max="1440" value={formAgenda.intervaloMinutos} onChange={(e) => setFormAgenda({ ...formAgenda, intervaloMinutos: Number(e.target.value) })} className="w-16 rounded-md border border-white/10 bg-black/25 px-2 py-1 text-center text-xs outline-none focus:border-amber-500/60" /> min</label>
        <button disabled={salvando} className="rounded-lg bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-200 ring-1 ring-amber-500/30 hover:bg-amber-500/25 disabled:opacity-50">Salvar agenda</button>
        {estado?.agenda.proximaExecucao && <span className="w-full text-[10px] text-zinc-500 sm:w-auto">Próximo ciclo: {new Date(estado.agenda.proximaExecucao).toLocaleString("pt-BR")}</span>}
      </form>

      <form onSubmit={salvarSeguranca} className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="mb-1 text-sm font-bold">Proteção de envios</div><p className="mb-3 text-[11px] text-zinc-500">{estado?.envios.filter(e => e.status === "enviado").length || 0}/{formSeguranca.maxPorHora} envios registrados nesta sessão · os destinos são sempre processados individualmente.</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{([['maxPorHora','Máximo por hora',1,100],['maxPorDia','Máximo por dia',1,500],['intervaloDestinoMinutos','Intervalo por grupo (min)',15,360],['descansoInicio','Início descanso (h)',0,23],['descansoFim','Fim descanso (h)',0,23]] as const).map(([campo,rotulo,min,max]) => <label key={campo} className="text-[10px] font-bold text-zinc-400">{rotulo}<input type="number" min={min} max={max} value={formSeguranca[campo]} onChange={(e) => setFormSeguranca({ ...formSeguranca, [campo]: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500/60" /></label>)}</div>
        <button disabled={salvando} className="mt-3 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-200 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-50">Salvar proteções</button>
      </form>

      <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/[0.045] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-xs font-bold text-violet-100">Campanhas para grupos WhatsApp</div><p className="mt-1 text-[10px] text-zinc-400">Mesmo funil do painel Grupos WhatsApp: página de captura → CAPI/Meta → clique → entrada confirmada. Vincule um grupo para também distribuir ofertas nele.</p></div><a href="/campanhas-grupo" className="rounded-lg border border-violet-400/25 px-2.5 py-1.5 text-[10px] font-bold text-violet-200 hover:bg-violet-500/10">Gerenciar campanhas</a></div>
        {!estado ? <div className="mt-3 text-xs text-zinc-500">Carregando campanhas…</div> : !estado.campanhasGrupo.length ? <div className="mt-3 rounded-lg border border-dashed border-white/10 p-3 text-xs text-zinc-500">Você ainda não criou uma campanha de grupo. Crie uma no módulo Grupos WhatsApp e ela aparecerá aqui automaticamente.</div> : <div className="mt-3 grid gap-2 md:grid-cols-2">{estado.campanhasGrupo.map((c) => <div key={c.id} className="rounded-lg border border-white/10 bg-black/20 p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="truncate text-xs font-bold">{c.nome}</div><div className="mt-0.5 text-[10px] text-zinc-500">/entrar/{c.slug} · {c.ativo ? "Ativa" : "Pausada"}</div></div><button onClick={() => vincularCampanha(c)} disabled={!c.ativo} className="shrink-0 rounded-md bg-violet-500/15 px-2 py-1 text-[10px] font-bold text-violet-200 hover:bg-violet-500/25 disabled:opacity-40">Vincular destino</button></div><div className="mt-3 flex gap-3 text-[10px] text-zinc-400"><span>{c.metricas.leads} leads</span><span>{c.metricas.cliquesGrupo} cliques</span><span>{c.metricas.entradasConfirmadas} entradas</span></div></div>)}</div>}
      </div>

      {estado && estado.destinos.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{estado.destinos.map((d) => <div key={d.id} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[10px] ${d.ativo ? "border-white/10 bg-white/5" : "border-white/5 bg-black/20 text-zinc-500"}`}><span className="max-w-32 truncate font-bold">{d.nome}</span><button onClick={() => void alterarDestino(d.id, "atualizar_destino", !d.ativo)} className="text-sky-300 hover:text-sky-100">{d.ativo ? "Pausar" : "Ativar"}</button><button onClick={() => void alterarDestino(d.id, "excluir_destino")} className="text-rose-300 hover:text-rose-100" aria-label={`Excluir ${d.nome}`}><Trash2 className="h-3 w-3" /></button></div>)}</div>}
      {estado?.envios.length ? <div className="mt-4 overflow-hidden rounded-xl border border-white/10"><div className="border-b border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-500">Últimos envios</div>{estado.envios.slice(0, 5).map((envio) => <div key={envio.id} className="flex items-center justify-between gap-3 border-b border-white/5 px-3 py-2 text-xs last:border-0"><span className="min-w-0 truncate text-zinc-300">{envio.produtoNome} → {envio.destinoNome}</span><span className={envio.status === "enviado" ? "text-emerald-300" : envio.status === "falhou" ? "text-rose-300" : "text-amber-300"}>{envio.status}</span></div>)}</div> : null}
    </section>
  );
}
