"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, LockKeyhole, MessageCircle, ShieldCheck, UsersRound } from "lucide-react";

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string };
    _fbq?: Window["fbq"];
  }
}

type Atribuicao = {
  utmSource: string; utmMedium: string; utmCampaign: string; utmContent: string; utmTerm: string; fbclid: string;
};

function cookie(nome: string): string {
  if (typeof document === "undefined") return "";
  const item = document.cookie.split("; ").find((c) => c.startsWith(`${nome}=`));
  return item ? decodeURIComponent(item.slice(nome.length + 1)) : "";
}

function iniciarPixel(pixelId: string) {
  if (!pixelId || typeof window === "undefined") return;
  if (!window.fbq) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else (fbq.queue ||= []).push(args);
    } as NonNullable<Window["fbq"]>;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    window.fbq = fbq;
    window._fbq = fbq;
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }
  window.fbq?.("init", pixelId);
  window.fbq?.("set", "autoConfig", false, pixelId);
}

function dispararPixel(nome: string, eventId: string) {
  window.fbq?.("track", nome, {}, { eventID: eventId });
}

export function CapturaGrupoClient({
  campanha,
  pixelId,
  atribuicao
}: {
  campanha: { slug: string; titulo: string; descricao: string; textoBotao: string; corDestaque: string };
  pixelId: string;
  atribuicao: Atribuicao;
}) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [consentimento, setConsentimento] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [clicou, setClicou] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [erro, setErro] = useState("");
  const visitanteRef = useRef("");
  const cliqueEnviadoRef = useRef(false);
  const confirmacaoEnviadaRef = useRef(false);

  useEffect(() => {
    const chave = `garimpeiro_visitante_${campanha.slug}`;
    let visitante = localStorage.getItem(chave);
    if (!visitante) {
      visitante = crypto.randomUUID();
      localStorage.setItem(chave, visitante);
    }
    visitanteRef.current = visitante;
    const sessao = `garimpeiro_view_${campanha.slug}`;
    if (!sessionStorage.getItem(sessao)) {
      sessionStorage.setItem(sessao, "1");
      fetch("/api/campanhas-grupo/funil", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "visualizacao", slug: campanha.slug, visitanteId: visitante, ...atribuicao })
      }).catch(() => undefined);
    }
  }, [campanha.slug, atribuicao]);

  async function enviarLead(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true); setErro("");
    try {
      const resposta = await fetch("/api/campanhas-grupo/funil", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "lead", slug: campanha.slug, visitanteId: visitanteRef.current, nome, telefone,
          consentimento, fbp: cookie("_fbp"), fbc: cookie("_fbc"), ...atribuicao
        })
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível continuar.");
      setLeadId(dados.leadId);
      if (pixelId) {
        iniciarPixel(pixelId);
        window.fbq?.("track", "PageView");
        dispararPixel("Contact", dados.eventId);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao enviar.");
    } finally { setCarregando(false); }
  }

  async function abrirGrupo() {
    if (cliqueEnviadoRef.current) return;
    cliqueEnviadoRef.current = true;
    setCarregando(true); setErro("");
    const janela = window.open("about:blank", "_blank");
    try {
      const resposta = await fetch("/api/campanhas-grupo/funil", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "clique", leadId })
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível abrir o grupo.");
      if (pixelId) dispararPixel("WhatsAppGroupClick", dados.eventId);
      setClicou(true);
      if (janela) janela.location.href = dados.link;
      else window.location.href = dados.link;
    } catch (e) {
      cliqueEnviadoRef.current = false;
      janela?.close();
      setErro(e instanceof Error ? e.message : "Falha ao abrir o grupo.");
    } finally { setCarregando(false); }
  }

  async function confirmar() {
    if (confirmacaoEnviadaRef.current) return;
    confirmacaoEnviadaRef.current = true;
    setCarregando(true); setErro("");
    try {
      const resposta = await fetch("/api/campanhas-grupo/funil", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "confirmar", leadId })
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível confirmar.");
      if (pixelId && !dados.jaConfirmado) dispararPixel("CompleteRegistration", dados.eventId);
      setConfirmado(true);
    } catch (e) {
      confirmacaoEnviadaRef.current = false;
      setErro(e instanceof Error ? e.message : "Falha ao confirmar.");
    } finally { setCarregando(false); }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07110b] px-4 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-50" style={{ background: `radial-gradient(circle at 50% 15%, ${campanha.corDestaque}55, transparent 42%)` }} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6 shadow-2xl backdrop-blur-xl sm:p-9">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: `${campanha.corDestaque}25`, color: campanha.corDestaque }}>
          <UsersRound className="h-8 w-8" />
        </div>
        <div className="mt-5 text-center">
          <div className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: campanha.corDestaque }}>Acesso gratuito</div>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">{campanha.titulo}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-300">{campanha.descricao || "Entre no grupo e receba as novidades diretamente no WhatsApp."}</p>
        </div>

        {!leadId ? (
          <form onSubmit={enviarLead} className="mt-7 space-y-3">
            <input value={nome} onChange={(e) => setNome(e.target.value)} required minLength={2} maxLength={100} autoComplete="name" placeholder="Seu nome"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm outline-none transition focus:border-emerald-500/60" />
            <input value={telefone} onChange={(e) => setTelefone(e.target.value)} required inputMode="tel" autoComplete="tel" placeholder="WhatsApp com DDD"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm outline-none transition focus:border-emerald-500/60" />
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] p-3 text-[11px] leading-relaxed text-zinc-400">
              <input type="checkbox" checked={consentimento} onChange={(e) => setConsentimento(e.target.checked)} required className="mt-0.5 h-4 w-4 accent-emerald-500" />
              Aceito receber comunicações desta campanha no WhatsApp e o uso dos dados para medir o resultado. Posso sair do grupo quando quiser.
            </label>
            <button disabled={carregando} className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-4 text-sm font-black text-zinc-950 transition hover:brightness-110 disabled:opacity-60" style={{ backgroundColor: campanha.corDestaque }}>
              {carregando ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
              {carregando ? "Preparando acesso..." : campanha.textoBotao}
            </button>
          </form>
        ) : confirmado ? (
          <div className="mt-7 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
            <div className="mt-3 text-lg font-black">Entrada confirmada!</div>
            <p className="mt-1 text-sm text-zinc-300">Tudo certo. Você já faz parte da comunidade.</p>
          </div>
        ) : (
          <div className="mt-7 space-y-3">
            <button onClick={abrirGrupo} disabled={carregando} className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-4 text-sm font-black text-zinc-950 transition hover:brightness-110 disabled:opacity-60" style={{ backgroundColor: campanha.corDestaque }}>
              {carregando ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
              Abrir convite no WhatsApp
            </button>
            {clicou && (
              <button onClick={confirmar} disabled={carregando} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-bold hover:bg-white/10 disabled:opacity-60">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Já entrei no grupo
              </button>
            )}
            <p className="text-center text-[11px] text-zinc-500">O convite abrirá em uma nova janela. Depois, volte aqui para confirmar.</p>
          </div>
        )}
        {erro && <div role="alert" className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-center text-xs text-rose-200">{erro}</div>}
        <div className="mt-6 flex items-center justify-center gap-4 text-[10px] text-zinc-600">
          <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Dados protegidos</span>
          <span className="flex items-center gap-1"><LockKeyhole className="h-3 w-3" /> Acesso seguro</span>
        </div>
      </div>
    </div>
  );
}
