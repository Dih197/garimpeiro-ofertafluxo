"use client";

import { useEffect, useState, useTransition, useCallback, useMemo, useRef } from "react";
import {
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Pause,
  Rocket,
  Hourglass,
  Wrench,
  ExternalLink,
  Eye,
  MousePointerClick,
  PieChart,
  Trophy,
  ShoppingBag,
  LayoutDashboard,
  Tag,
  Megaphone,
  Calendar,
  Sparkles,
  Heart,
  Wallet,
  Shield,
  Zap,
  Bell,
  Activity,
  GraduationCap,
  Send,
  Video,
  Radio
} from "lucide-react";
import { cn, formatBRL, formatNumber } from "@/lib/utils";
import { StatCard } from "@/components/stat-card";
import { GraficoLucro, type PontoLucro } from "@/components/grafico-lucro";
import { GraficoOrganicoVsPago, type PontoDiarioCompleto } from "@/components/grafico-organico-vs-pago";
import { HealthScore } from "@/components/health-score";
import { DREPanel } from "@/components/dre-panel";
import { GoalTracker } from "@/components/goal-tracker";

type InfoMoeda = {
  moeda: string;
  cotacao: number;
  dataCotacao: string;
  impostoMeta: number;
  label: string;
};

type RoasPorAnuncio = {
  adId: string;
  adName: string;
  adsetName: string;
  campaignName: string;
  status: string;
  linkDestino: string;
  spend: number;
  spendBRL: number;
  spendComImposto: number;
  impressions: number;
  clicks: number;
  linkClicks: number;
  outboundClicks: number;
  cpc: number;
  ctr: number;
  vendas: number;
  vendasDiretas: number;
  vendasMesmaLoja: number;
  vendasCrossShop: number;
  comissao: number;
  comissaoDireta: number;
  comissaoIndireta: number;
  roas: number;
  lucro: number;
  cpa: number;
  status_lucro: "lucrativo" | "empate" | "prejuizo" | "sem_dados";
  recomendacao: "ESCALAR" | "MANTER" | "PAUSAR" | "AGUARDAR" | "OTIMIZAR_CRIATIVO";
  motivo: string;
  subIdInferido: string;
};

type ResumoTrafego = {
  vendas: number;
  /** GMV — quanto vendeu em reais */
  faturamento: number;
  /** Comissão líquida do afiliado */
  comissao: number;
  ticketMedio: number;
};

type AnaliseRedirect = {
  cliquesMeta: number;
  cliquesShopee: number;
  perdaPct: number;
  cliquesPerdidos: number;
  cpcShopeeReal: number;
  conversaoRealPct: number;
  temDadosShopee: boolean;
  porDia: Array<{ data: string; cliquesMeta: number; cliquesShopee: number; perda: number }>;
};

type ProblemaDropoff = {
  prioridade: "alta" | "media" | "baixa";
  categoria: "link" | "tracking" | "criativo" | "configuracao" | "qualidade";
  titulo: string;
  detalhe: string;
  acao: string;
  afetados?: string[];
  impactoPct?: number;
};

type BucketDelay = "instant" | "ate1h" | "ate24h" | "ate3d" | "ate7d" | "alem7d";
type AnaliseCookies = {
  totalVendas: number;
  distribuicaoDelay: Record<BucketDelay, { vendas: number; comissao: number; faturamento: number }>;
  tempoMedioDecisaoSeg: number;
  tempoMedianoDecisaoSeg: number;
  vendasComBoostSeller: { vendas: number; comissao: number };
  vendasSemBoost: { vendas: number; comissao: number };
  mesmaLoja: number;
  lojaDiferente: number;
  pctCookieAtivo: number;
};
type CategoriaCanalUI =
  | "meta_ads" | "shopee_video" | "shopee_live" | "tiktok" | "kwai"
  | "instagram_reels" | "youtube" | "whatsapp" | "telegram"
  | "site_blog" | "qrcode" | "outros_organico" | "direto";

type BreakdownCanal = {
  campanha: ResumoTrafego;
  organico: ResumoTrafego;
  porCategoria: Record<string, {
    categoria: CategoriaCanalUI;
    canal: string;
    tipo: "campanha" | "organico" | "indefinido";
    vendas: number;
    comissao: number;
    faturamento: number;
  }>;
};

type ResumoCanalConteudo = ResumoTrafego & {
  participacaoVendasPct: number;
  participacaoComissaoPct: number;
  comissaoPorVenda: number;
};

type ConteudoShopee = {
  video: ResumoCanalConteudo;
  live: ResumoCanalConteudo;
  total: ResumoCanalConteudo;
  porDia: Array<{
    data: string;
    vendasVideo: number;
    comissaoVideo: number;
    vendasLive: number;
    comissaoLive: number;
  }>;
  topProdutos: Array<{
    itemId: number;
    produtoNome: string;
    produtoImagem: string;
    canal: "shopee_video" | "shopee_live";
    vendas: number;
    comissao: number;
    faturamento: number;
  }>;
};

type PerformanceShopee = {
  periodoInicio: string;
  periodoFim: string;
  dataSolicitada?: string;
  usandoUltimoDisponivel: boolean;
  atualizadoDiariamenteAs: string;
  cliquesTotal: number | null;
  cliquesRedesSociais: number | null;
  cliquesShopeeVideo: number | null;
  pedidos: number;
  itensVendidos: number;
  comissaoEstimada: number;
  valorPedidos: number;
  novosCompradores: number;
  topProdutos: Array<{
    itemId: number;
    produtoNome: string;
    produtoImagem: string;
    itensVendidos: number;
    comissao: number;
    valorPedidos: number;
  }>;
};

type ResumoShopeePeriodo = {
  vendas: number;
  faturamento: number;
  comissao: number;
  comissaoConfirmada: number;
  comissaoPendente: number;
};

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
  referrer?: string;
  channelType?: string;
  campaignType?: string;
  attributionType?: string;
  buyerType?: string;
  device?: string;
  quantidade?: number;
};

type RelatorioRoas = {
  ok: boolean;
  mock?: boolean;
  dias: number;
  totalAnuncios: number;
  conversoesBrutas?: ConversaoLocal[];
  consolidado: {
    spend: number;
    spendBRL: number;
    spendComImposto: number;
    impressions: number;
    clicks: number;
    linkClicks: number;
    outboundClicks: number;
    vendas: number;
    comissao: number;
    roas: number;
    lucro: number;
  };
  porAnuncio: RoasPorAnuncio[];
  porCriativo: Record<string, { vendas: number; comissao: number; spend: number; roas: number }>;
  breakdownCanal?: BreakdownCanal;
  conteudoShopee?: ConteudoShopee;
  performanceShopee?: PerformanceShopee;
  resumoShopee?: ResumoShopeePeriodo;
  analiseCookies?: AnaliseCookies;
  analiseRedirect?: AnaliseRedirect;
  problemasDropoff?: ProblemaDropoff[];
  alertas: string[];
  avisos?: string[];
  confianca?: {
    dias: number;
    confiabilidadePct: number;
    diasParaConsolidar: number;
    rotuloConfianca: "MUITO_BAIXA" | "BAIXA" | "MEDIA" | "ALTA" | "TOTAL";
    textoExplicativo: string;
    emoji: string;
  };
  serieLucroDiario?: PontoLucro[];
  serieDiariaCompleta?: PontoDiarioCompleto[];
  projecao?: {
    vendasFinais: number;
    comissaoFinal: number;
    lucroProjetadoFinal: number;
    roasProjetadoFinal: number;
    multiplicador: number;
  };
  infoMoeda?: InfoMoeda;
};

type StatsShopee = {
  totalVendas: number;
  totalRevenue: number;
  totalComissao: number;
  totalComissaoConfirmada?: number;
  porCanal: Record<string, { vendas: number; comissao: number; canal?: string; tipo?: "campanha" | "organico" | "indefinido" }>;
  porTipo?: { campanha: { vendas: number; comissao: number }; organico: { vendas: number; comissao: number } };
  topProdutos: Array<{
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
  }>;
  porDia: Array<{ dia: string; vendas: number; comissao: number }>;
};

type AcaoSugerida = {
  prioridade: "alta" | "media" | "baixa";
  tipo: "pausar" | "escalar" | "renovar_criativo" | "trocar_publico" | "verificar" | "celebrar";
  texto: string;
  alvo?: string;
  impactoEstimado?: string;
};

type Insights = {
  resumo: {
    textoNarrativo: string;
    comparativo: { campo: string; hoje: number; ontem: number; variacao: number }[];
    acoes: AcaoSugerida[];
  };
  fadigas: Array<{ adId: string; adName: string; ctrInicio: number; ctrAgora: number; quedaPct: number; diasAteParar: number }>;
  saude: {
    contaNome: string;
    contaStatus: number;
    saldo: number;
    saldoMoeda: string;
    spendCap: number;
    anunciosEmRevisao: number;
    anunciosRejeitados: number;
    anunciosAtivos: number;
    token: { vitalicio: boolean; expiraEmHoras: number | null };
    alertas: string[];
  } | null;
};

const PERIODOS: Array<{ id: number; label: string }> = [
  { id: 1, label: "Hoje" },
  { id: 2, label: "Ontem" },
  { id: 3, label: "3 dias" },
  { id: 7, label: "7 dias" },
  { id: 14, label: "14 dias" },
  { id: 30, label: "30 dias" }
];

// Categorias normalizadas (vindas do servidor via lib/canais.ts).
// Mantém aliases legados de sub_id pra dados antigos no banco.
const NOMES_CANAL: Record<string, string> = {
  // Categorias novas (lib/canais)
  meta_ads: "Meta Ads (pago)",
  shopee_video: "Shopee Vídeo (orgânico)",
  shopee_live: "Shopee Live (orgânico)",
  tiktok: "TikTok",
  kwai: "Kwai",
  instagram_reels: "Instagram/Facebook",
  youtube: "YouTube Shorts",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  site_blog: "Site/Blog",
  qrcode: "QR Code",
  outros_organico: "Outros (orgânico)",
  direto: "Sem rastreio",
  // Aliases legados (dados antigos)
  shopeevd: "Shopee Vídeo (orgânico)",
  reels: "Instagram/Facebook",
  ytshorts: "YouTube Shorts",
  facebook: "Facebook (orgânico)",
  wpp: "WhatsApp",
  tg: "Telegram",
  MetaAds: "Meta Ads (pago)",
  metaads: "Meta Ads (pago)",
  intelbeleza: "Intel · Beleza",
  intelcustom: "Intel · Custom"
};

const CONFIG_REC = {
  ESCALAR: { icon: Rocket, color: "emerald", bg: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/30" },
  MANTER: { icon: CheckCircle2, color: "blue", bg: "bg-blue-500/10", text: "text-blue-300", border: "border-blue-500/30" },
  AGUARDAR: { icon: Hourglass, color: "amber", bg: "bg-amber-500/10", text: "text-amber-300", border: "border-amber-500/30" },
  OTIMIZAR_CRIATIVO: { icon: Wrench, color: "violet", bg: "bg-violet-500/10", text: "text-violet-300", border: "border-violet-500/30" },
  PAUSAR: { icon: Pause, color: "rose", bg: "bg-rose-500/10", text: "text-rose-300", border: "border-rose-500/30" }
} as const;

type Aba = "geral" | "anuncios" | "criativos" | "canais" | "produtos" | "historico" | "resumo" | "auditoria";

const ABAS: Array<{ id: Aba; label: string; icon: typeof LayoutDashboard; badge?: string }> = [
  { id: "geral", label: "Visão geral", icon: LayoutDashboard },
  { id: "historico", label: "Histórico", icon: Calendar },
  { id: "resumo", label: "Resumo Executivo", icon: Wallet, badge: "NOVO" },
  { id: "auditoria", label: "Auditoria de Vendas", icon: Activity, badge: "RAW" },
  { id: "anuncios", label: "Anúncios Meta", icon: Megaphone },
  { id: "criativos", label: "Criativos", icon: Tag },
  { id: "canais", label: "Canais (Shopee)", icon: PieChart },
  { id: "produtos", label: "Top produtos", icon: Trophy }
];

export function RoasClient() {
  const [aba, setAba] = useState<Aba>("geral");
  const [dias, setDias] = useState(1);
  // Range custom (sobrescreve `dias` quando ambos preenchidos)
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [calendarioAberto, setCalendarioAberto] = useState(false);
  const usandoRange = Boolean(dataInicio && dataFim);
  const [relatorio, setRelatorio] = useState<RelatorioRoas | null>(null);
  const [statsShopee, setStatsShopee] = useState<StatsShopee | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimaSync, setUltimaSync] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [agora, setAgora] = useState<Date>(new Date());
  const [, startTransition] = useTransition();
  const carregarSeqRef = useRef(0);

  // Chat com especialista
  type AcaoIA =
    | { tipo: "pausar_ad"; adId: string; descricao: string }
    | { tipo: "ativar_ad"; adId: string; descricao: string }
    | { tipo: "escalar_orcamento"; alvoId: string; alvoTipo: "campaign" | "adset"; percentual: number; descricao: string }
    | { tipo: "gerar_link_shopee"; produtoUrl: string; subIds: string[]; descricao: string };
  type ChatMsg = {
    role: "user" | "assistant";
    texto: string;
    acao?: AcaoIA | null;
    statusAcao?: "pendente" | "aplicando" | "ok" | "erro";
    resultadoAcao?: string;
  };
  const [chatAberto, setChatAberto] = useState(false);
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatPergunta, setChatPergunta] = useState("");
  const [chatCarregando, setChatCarregando] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Multi-tenant: avisa quando há vendas/insights de contas anteriores no banco
  type InfoTenants = {
    shopeeAtual: string;
    metaAtual: string;
    vendasContaAtual: number;
    vendasOutrasContas: number;
    insightsContaAtual: number;
    insightsOutrasContas: number;
    contasShopeeNoBanco: Array<{ appId: string; vendas: number; ultimaVenda: number }>;
  };
  const [infoTenants, setInfoTenants] = useState<InfoTenants | null>(null);
  const [limpandoOutras, setLimpandoOutras] = useState(false);

  const carregarTenants = useCallback(async () => {
    try {
      const r = await fetch("/api/analytics/tenants");
      const d = await r.json();
      if (d.ok) setInfoTenants(d as InfoTenants);
    } catch {}
  }, []);
  async function limparContasAntigas() {
    if (!confirm("Apagar TODAS as vendas e insights de contas Shopee/Meta diferentes da atual? Essa ação não tem volta.")) return;
    setLimpandoOutras(true);
    try {
      const r = await fetch("/api/analytics/tenants", { method: "DELETE" });
      const d = await r.json();
      if (d.ok) {
        setInfoTenants(d.info as InfoTenants);
        await carregar(true);
      }
    } finally {
      setLimpandoOutras(false);
    }
  }

  // Auto-scroll do chat pro fundo quando nova mensagem chega
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMsgs, chatCarregando]);

  async function aplicarAcao(idx: number) {
    const msg = chatMsgs[idx];
    if (!msg?.acao) return;
    setChatMsgs((m) => m.map((x, i) => (i === idx ? { ...x, statusAcao: "aplicando" } : x)));
    try {
      const r = await fetch("/api/acoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg.acao)
      });
      const d = await r.json();
      if (d.ok) {
        setChatMsgs((m) => m.map((x, i) => (i === idx ? { ...x, statusAcao: "ok", resultadoAcao: d.mensagem } : x)));
        // Re-sync depois de ação executada
        setTimeout(() => carregar(true), 1500);
      } else {
        setChatMsgs((m) => m.map((x, i) => (i === idx ? { ...x, statusAcao: "erro", resultadoAcao: d.mensagem || d.erro || "Falhou" } : x)));
      }
    } catch (e) {
      setChatMsgs((m) => m.map((x, i) => (i === idx ? { ...x, statusAcao: "erro", resultadoAcao: (e as Error).message } : x)));
    }
  }

  async function perguntarEspecialista() {
    const pergunta = chatPergunta.trim();
    if (!pergunta || chatCarregando) return;
    setChatCarregando(true);
    setChatMsgs((m) => [...m, { role: "user", texto: pergunta }]);
    setChatPergunta("");

    // Injeta contexto atual da campanha
    const contexto = relatorio
      ? `Período: ${dias} dia(s)
Anúncios ativos: ${relatorio.totalAnuncios}
Gasto consolidado: R$ ${relatorio.consolidado.spendBRL?.toFixed(2) ?? relatorio.consolidado.spend.toFixed(2)} (com imposto: R$ ${relatorio.consolidado.spendComImposto.toFixed(2)})
Comissão: R$ ${relatorio.consolidado.comissao.toFixed(2)}
ROAS: ${relatorio.consolidado.roas.toFixed(2)}x
Lucro: R$ ${relatorio.consolidado.lucro.toFixed(2)}
Cliques outbound: ${relatorio.consolidado.outboundClicks}
Vendas atribuídas: ${relatorio.consolidado.vendas}

Por anúncio:
${relatorio.porAnuncio.map((a) => `- "${a.adName}" (${a.subIdInferido}): gasto R$${a.spend.toFixed(2)}, ${a.outboundClicks} cliques, CPC R$${a.cpc.toFixed(2)}, CTR ${a.ctr.toFixed(2)}%, ${a.vendas} vendas, ROAS ${a.roas.toFixed(2)}x, lucro R$${a.lucro.toFixed(2)}, status ${a.status}, recomendação atual: ${a.recomendacao}`).join("\n")}

${insights?.saude ? `Saúde da conta: saldo R$ ${insights.saude.saldo.toFixed(2)}, token ${insights.saude.token.vitalicio ? "vitalício" : `expira em ${insights.saude.token.expiraEmHoras}h`}, ${insights.saude.anunciosRejeitados} anúncios rejeitados.` : ""}
${insights?.fadigas?.length ? `Fadigas: ${insights.fadigas.map((f) => `${f.adName} CTR caiu ${f.quedaPct.toFixed(0)}%`).join(", ")}` : ""}`
      : "";

    try {
      const r = await fetch("/api/especialista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta, contexto })
      });
      const d = await r.json();
      if (d.ok) {
        setChatMsgs((m) => [...m, { role: "assistant", texto: d.resposta, acao: d.acao || null, statusAcao: d.acao ? "pendente" : undefined }]);
      } else {
        setChatMsgs((m) => [...m, { role: "assistant", texto: `❌ ${d.erro}` }]);
      }
    } catch (e) {
      setChatMsgs((m) => [...m, { role: "assistant", texto: `❌ ${(e as Error).message}` }]);
    } finally {
      setChatCarregando(false);
    }
  }

  const carregar = useCallback(async (forcar = false) => {
    const sequencia = ++carregarSeqRef.current;
    setCarregando(true);
    setErro(null);
    try {
      const queryPeriodo = usandoRange
        ? `inicio=${dataInicio}&fim=${dataFim}`
        : `dias=${dias}`;
      const queryRoas = forcar ? `${queryPeriodo}&auto=true` : queryPeriodo;
      // No refresh forçado, o ROAS sincroniza Meta+Shopee uma única vez. As
      // estatísticas são lidas depois para evitar duas chamadas simultâneas à Shopee.
      const insightsPromise = fetch("/api/analytics/insights", { method: "GET" });
      let r1: Response;
      let r2: Response;
      let r3: Response;
      if (forcar) {
        r1 = await fetch(`/api/analytics/roas?${queryRoas}`, { method: "POST" });
        [r2, r3] = await Promise.all([
          fetch(`/api/analytics/sincronizar?${queryPeriodo}`),
          insightsPromise
        ]);
      } else {
        [r1, r2, r3] = await Promise.all([
          fetch(`/api/analytics/roas?${queryRoas}`),
          fetch(`/api/analytics/sincronizar?${queryPeriodo}`),
          insightsPromise
        ]);
      }
      const d1 = (await r1.json()) as RelatorioRoas | { ok: false; erro: string };
      const d2 = await r2.json();
      const d3 = await r3.json();

      // Ignora respostas de um período anterior que chegaram depois da seleção atual.
      if (sequencia !== carregarSeqRef.current) return;

      if (!d1.ok) {
        setErro((d1 as { erro: string }).erro);
      } else {
        startTransition(() => {
          setRelatorio(d1 as RelatorioRoas);
          if (d2.stats) setStatsShopee(d2.stats as StatsShopee);
          if (d3.ok) setInsights({ resumo: d3.resumo, fadigas: d3.fadigas, saude: d3.saude });
        });
        if (forcar) setUltimaSync(new Date());
      }
    } catch (e) {
      if (sequencia === carregarSeqRef.current) setErro((e as Error).message);
    } finally {
      if (sequencia === carregarSeqRef.current) {
        setCarregando(false);
        setSincronizando(false);
      }
    }
  }, [dias, dataInicio, dataFim, usandoRange]);

  // Primeira abertura: GET rápido pra mostrar algo na hora, e em seguida
  // dispara sync completo Shopee+Meta em background pra trazer vendas novas.
  const jaSincronizouRef = useRef(false);
  useEffect(() => {
    let cancelado = false;
    (async () => {
      await carregar(false);
      if (cancelado) return;
      if (!jaSincronizouRef.current) {
        jaSincronizouRef.current = true;
        setSincronizando(true);
        await Promise.all([carregar(true), carregarTenants()]);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [carregar, carregarTenants]);

  // Auto-refresh: ressincroniza a cada 5 min se aba estiver visível
  useEffect(() => {
    if (!autoRefresh) return;
    const tick = () => {
      if (document.visibilityState === "visible") carregar(true);
    };
    const id = setInterval(tick, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [autoRefresh, carregar]);

  // Atualiza relógio "há X minutos" a cada 30s
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Re-sync ao voltar pra aba após muito tempo
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "visible" && ultimaSync) {
        const segundos = (Date.now() - ultimaSync.getTime()) / 1000;
        if (segundos > 5 * 60) carregar(true);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [ultimaSync, carregar]);

  async function sincronizarLive() {
    setSincronizando(true);
    await carregar(true);
  }

  function tempoDesdeSync(): string {
    if (!ultimaSync) return "ainda não sincronizado";
    const seg = Math.max(0, Math.floor((agora.getTime() - ultimaSync.getTime()) / 1000));
    if (seg < 60) return `há ${seg}s`;
    if (seg < 3600) return `há ${Math.floor(seg / 60)} min`;
    return `há ${Math.floor(seg / 3600)}h`;
  }

  // Calculos derivados pra Visão Geral
  const consolidadoGeral = useMemo(() => {
    const r = relatorio?.consolidado;
    const s = statsShopee;
    const resumoPeriodo = relatorio?.resumoShopee;
    const redir = relatorio?.analiseRedirect;
    return {
      gastoMeta: r?.spendComImposto || 0,
      // O resumo do relatório respeita exatamente o período/range selecionado.
      // `stats` continua como fallback para respostas antigas do servidor.
      comissaoTotal: resumoPeriodo?.comissao ?? s?.totalComissao ?? r?.comissao ?? 0,
      comissaoConfirmada: resumoPeriodo?.comissaoConfirmada ?? s?.totalComissaoConfirmada ?? 0,
      receita: resumoPeriodo?.faturamento ?? s?.totalRevenue ?? 0,
      vendasTotal: resumoPeriodo?.vendas ?? s?.totalVendas ?? 0,
      vendasMetaAds: r?.vendas || 0,
      lucroLiquido: (resumoPeriodo?.comissaoConfirmada ?? s?.totalComissaoConfirmada ?? 0) - (r?.spendComImposto || 0),
      lucroLiquidoEstimado: (resumoPeriodo?.comissao ?? s?.totalComissao ?? r?.comissao ?? 0) - (r?.spendComImposto || 0),
      roasGeral: r && r.spendBRL > 0 ? (resumoPeriodo?.comissaoConfirmada ?? s?.totalComissaoConfirmada ?? 0) / r.spendBRL : 0,
      roasGeralEstimado: r && r.spendBRL > 0 ? (resumoPeriodo?.comissao ?? s?.totalComissao ?? r?.comissao ?? 0) / r.spendBRL : 0,
      // CPC baseado em link clicks (= "CPC (custo por clique no link)" do Ads Manager)
      cpcMedio: r && r.linkClicks > 0 ? r.spend / r.linkClicks : 0,
      cliques: r?.linkClicks || 0,
      cliquesOutbound: r?.outboundClicks || 0,
      cliquesShopee: redir?.cliquesShopee || 0,
      perdaRedirectPct: redir?.perdaPct || 0,
      cpcShopeeReal: redir?.cpcShopeeReal || 0,
      temDadosShopee: redir?.temDadosShopee || false,
      ticketMedio: (resumoPeriodo?.vendas ?? s?.totalVendas ?? 0) > 0
        ? (resumoPeriodo?.faturamento ?? s?.totalRevenue ?? 0) / (resumoPeriodo?.vendas ?? s?.totalVendas ?? 1)
        : 0
    };
  }, [relatorio, statsShopee]);

  // Forecast (do analytics)
  const forecast = useMemo(() => {
    if (!statsShopee) return null;
    const ultimos7 = statsShopee.porDia.slice(-7);
    if (!ultimos7.length) return null;
    const mediaDia = ultimos7.reduce((s, d) => s + d.comissao, 0) / ultimos7.length;
    return { proximos30: mediaDia * 30, proximos90: mediaDia * 90, mediaDia };
  }, [statsShopee]);

  const periodoSelecionadoLabel = usandoRange
    ? formatarRange(dataInicio, dataFim)
    : dias === 1 ? "Hoje" : dias === 2 ? "Ontem" : `Últimos ${dias} dias`;

  return (
    <>
      {/* BANNER MULTI-TENANT — aparece se há dados de contas anteriores */}
      {infoTenants && (infoTenants.vendasOutrasContas > 0 || infoTenants.insightsOutrasContas > 0) && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3 text-xs">
          <span className="rounded-md bg-amber-500/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-200">
            ⚠ DADOS DE OUTRAS CONTAS
          </span>
          <span className="flex-1 text-amber-200/90">
            {infoTenants.vendasOutrasContas > 0 && <>{infoTenants.vendasOutrasContas} venda(s) Shopee </>}
            {infoTenants.vendasOutrasContas > 0 && infoTenants.insightsOutrasContas > 0 && <>· </>}
            {infoTenants.insightsOutrasContas > 0 && <>{infoTenants.insightsOutrasContas} insight(s) Meta </>}
            armazenado(s) de contas anteriores. Já estão filtrados, mas você pode apagar.
          </span>
          <button
            onClick={limparContasAntigas}
            disabled={limpandoOutras}
            className="rounded-md bg-amber-500/20 px-3 py-1 font-bold text-amber-200 hover:bg-amber-500/30 disabled:opacity-50"
          >
            {limpandoOutras ? "Apagando..." : "Apagar dados antigos"}
          </button>
        </div>
      )}

      {/* BADGE MOCK */}
      {relatorio?.mock && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-500/15 to-fuchsia-500/15 p-3 text-xs">
          <span className="rounded-md bg-violet-500/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-violet-200">
            🎭 DEMO
          </span>
          <span className="text-violet-200">
            Modo demonstração ATIVO — todos os números são fictícios. Pra ver dados reais, desligue
            <a href="/configuracoes" className="ml-1 underline hover:text-white">"Modo demonstração"</a> em Configurações.
          </span>
        </div>
      )}

      {/* TOOLBAR */}
      <div className={cn(
        "glass relative mb-4 flex flex-col gap-2 overflow-visible rounded-2xl p-2.5 xl:flex-row xl:items-center xl:justify-between",
        calendarioAberto ? "z-[60]" : "z-10"
      )}>
        <div className="scrollbar-thin flex items-center gap-1 overflow-x-auto rounded-xl border border-white/[0.055] bg-black/20 p-1">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setDias(p.id);
                setDataInicio("");
                setDataFim("");
                setCalendarioAberto(false);
              }}
              className={cn(
                "shrink-0 rounded-lg px-3.5 py-2 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shopee/50",
                dias === p.id && !usandoRange
                  ? "bg-gradient-to-r from-shopee to-orange-500 text-white shadow-lg shadow-shopee/20"
                  : "text-zinc-500 hover:bg-white/[0.045] hover:text-zinc-200"
              )}
            >
              {p.label}
            </button>
          ))}

          {/* Botão Calendário Custom */}
          <button
            onClick={() => setCalendarioAberto((v) => !v)}
            className={cn(
              "ml-1 flex shrink-0 items-center gap-1.5 rounded-lg border-l border-white/10 px-3.5 py-2 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shopee/50",
              usandoRange
                ? "bg-gradient-to-r from-shopee to-orange-500 text-white shadow-lg shadow-shopee/20"
                : "text-zinc-500 hover:bg-white/[0.045] hover:text-zinc-200"
            )}
            title="Escolher dia ou período custom"
          >
            <Calendar className="h-3.5 w-3.5" />
            {usandoRange ? formatarRange(dataInicio, dataFim) : "Personalizar"}
          </button>

        </div>

        {/* Fora do container com scroll para o calendário não ser recortado. */}
        {calendarioAberto && (
          <CalendarioPopover
            dataInicio={dataInicio}
            dataFim={dataFim}
            onAplicar={(ini, fim) => {
              setDataInicio(ini);
              setDataFim(fim);
              setCalendarioAberto(false);
            }}
            onLimpar={() => {
              setDataInicio("");
              setDataFim("");
              setCalendarioAberto(false);
            }}
            onFechar={() => setCalendarioAberto(false)}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 xl:justify-end">
          <span className="hidden items-center gap-1.5 px-1 text-[9px] font-bold uppercase tracking-wider text-zinc-600 2xl:flex">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Período aplicado em todo o painel
          </span>
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.055] bg-black/20 px-3 py-2">
            <span
              className={cn("h-2 w-2 rounded-full", autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-zinc-500")}
              title={autoRefresh ? "Auto-refresh ATIVO (5 min)" : "Auto-refresh PAUSADO"}
            />
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">
              {ultimaSync ? `sync ${tempoDesdeSync()}` : "sem sync ainda"}
            </span>
            <button
              onClick={() => setAutoRefresh((v) => !v)}
              className={cn(
                "rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-colors",
                autoRefresh ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-700 text-zinc-400"
              )}
            >
              auto {autoRefresh ? "ON" : "OFF"}
            </button>
          </div>

          <button
            onClick={sincronizarLive}
            disabled={carregando || sincronizando}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-shopee to-orange-500 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-shopee/20 transition-all hover:-translate-y-0.5 hover:shadow-shopee/30 disabled:translate-y-0 disabled:opacity-50"
          >
            {sincronizando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {sincronizando ? "Puxando Meta + Shopee..." : "Sincronizar Live"}
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="glass scrollbar-thin mb-6 flex gap-1 overflow-x-auto rounded-2xl p-1.5">
        {ABAS.map((a) => {
          const Icon = a.icon;
          const ativa = aba === a.id;
          return (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={cn(
                "shrink-0 flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shopee/40",
                ativa
                  ? "bg-gradient-to-r from-white/[0.095] to-white/[0.055] text-zinc-50 shadow-[inset_0_0_0_1px_rgba(255,255,255,.06),0_8px_22px_rgba(0,0,0,.18)]"
                  : "text-zinc-500 hover:bg-white/[0.035] hover:text-zinc-200"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {a.label}
              {a.badge && (
                <span className="ml-1 rounded-md bg-shopee/20 px-1.5 py-0.5 text-[8px] font-black uppercase text-shopee animate-pulse">
                  {a.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ERROS / AVISOS */}
      {erro && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {!relatorio && carregando && (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="mt-3 text-xs">Carregando…</p>
        </div>
      )}

      {/* AVISOS DE INTEGRAÇÃO */}
      {relatorio?.avisos && relatorio.avisos.length > 0 && (
        <section className="mb-4 space-y-2">
          {relatorio.avisos.map((a, i) => (
            <div key={`aviso-${i}`} className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <div className="flex-1">
                <strong>Falha de integração:</strong> {a}
                {a.toLowerCase().includes("expired") && (
                  <a
                    href="https://developers.facebook.com/tools/accesstoken/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 inline-flex items-center gap-1 underline"
                  >
                    Gerar novo token <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ALERTAS INTELIGENTES */}
      {relatorio?.alertas && relatorio.alertas.length > 0 && (
        <section className="mb-4 space-y-2">
          {relatorio.alertas.map((a, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <span>{a}</span>
            </div>
          ))}
        </section>
      )}

      {/* CONTEÚDO DAS ABAS */}
      {relatorio && (
        <>
          {aba === "geral" && (
            <AbaGeral cg={consolidadoGeral} relatorio={relatorio} stats={statsShopee} dias={relatorio.dias} periodoLabel={periodoSelecionadoLabel} insights={insights} onRecarregar={() => carregar(true)} />
          )}
          {aba === "resumo" && (
            <AbaResumoExecutivo cg={consolidadoGeral} relatorio={relatorio} stats={statsShopee} dias={relatorio.dias} periodoLabel={periodoSelecionadoLabel} />
          )}
          {aba === "anuncios" && <AbaAnuncios anuncios={relatorio.porAnuncio} infoMoeda={relatorio.infoMoeda} />}
          {aba === "criativos" && <AbaCriativos porCriativo={relatorio.porCriativo} infoMoeda={relatorio.infoMoeda} />}
          {aba === "canais" && <AbaCanais stats={statsShopee} />}
          {aba === "produtos" && <AbaProdutos stats={statsShopee} />}
          {aba === "historico" && <AbaHistorico stats={statsShopee} forecast={forecast} serieLucro={relatorio.serieLucroDiario} serieCompleta={relatorio.serieDiariaCompleta} infoMoeda={relatorio.infoMoeda} />}
          {aba === "auditoria" && <AbaAuditoria conversoes={relatorio.conversoesBrutas || []} />}
        </>
      )}

      <p className="mt-6 text-[11px] text-zinc-600">
        Cruzamento automático Meta Marketing API (insights por anúncio) ↔ Shopee Affiliate API (conversionReport).
        Sub_ID 1 = canal · Sub_ID 2 = nome do criativo · Imposto Meta {((relatorio?.infoMoeda?.impostoMeta ?? 0.13) * 100)}% aplicado · Cookie Shopee 7 dias{relatorio?.infoMoeda?.moeda && relatorio.infoMoeda.moeda !== 'BRL' ? ` · Câmbio ${relatorio.infoMoeda.moeda}/BRL R$ ${relatorio.infoMoeda.cotacao.toFixed(2)}` : ''}.
      </p>

      {/* BOTÃO FLUTUANTE PERGUNTAR AO ESPECIALISTA */}
      {!chatAberto && (
        <button
          onClick={() => setChatAberto(true)}
          aria-label="Perguntar ao Especialista"
          title="Perguntar ao Especialista"
          className="group fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-shopee to-orange-500 text-white shadow-[0_16px_44px_rgba(238,77,45,.32)] transition-all hover:-translate-y-1 hover:scale-105"
        >
          <GraduationCap className="h-6 w-6" />
          <span className="absolute right-full mr-3 hidden whitespace-nowrap rounded-lg border border-white/10 bg-zinc-950/95 px-3 py-2 text-xs font-bold text-zinc-200 shadow-xl backdrop-blur-xl group-hover:block">
            Pergunte ao Especialista
          </span>
          <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-[3px] border-zinc-950 bg-emerald-400" />
        </button>
      )}

      {/* PAINEL DE CHAT */}
      {chatAberto && (
        <div className="fixed inset-x-3 bottom-3 z-50 flex h-[min(600px,calc(100vh-1.5rem))] flex-col overflow-hidden rounded-2xl border border-shopee/25 bg-zinc-950/95 shadow-2xl backdrop-blur-2xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[440px]">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-shopee to-amber-500">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold">Especialista Shopee + Meta Ads</div>
                <div className="text-[10px] text-zinc-500">Skill esp_shopee_meta · com contexto da sua conta</div>
              </div>
            </div>
            <button onClick={() => setChatAberto(false)} className="rounded-md p-1 text-zinc-500 hover:bg-white/10">
              ✕
            </button>
          </div>

          <div ref={chatScrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {chatMsgs.length === 0 && (
              <div className="space-y-3 text-xs text-zinc-400">
                <p>Pergunte qualquer coisa sobre suas campanhas. Eu tenho acesso aos dados em tempo real (Meta + Shopee) e respondo como afiliado sênior.</p>
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600">Sugestões:</p>
                  {[
                    "Vale escalar minha campanha agora?",
                    "Por que meu CPC subiu hoje?",
                    "Qual criativo eu pauso?",
                    "Quanto orçamento subir pro 11.11?",
                    "Como atribuir venda de carrinho cheio?"
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => setChatPergunta(s)}
                      className="block w-full rounded-lg border border-white/5 bg-zinc-900/60 px-3 py-2 text-left text-[11px] text-zinc-300 transition-colors hover:border-shopee/30 hover:bg-shopee/5"
                    >
                      💬 {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatMsgs.map((msg, i) => {
              const iconeAcao = msg.acao?.tipo === "pausar_ad" ? Pause
                : msg.acao?.tipo === "ativar_ad" ? CheckCircle2
                : msg.acao?.tipo === "escalar_orcamento" ? Rocket
                : msg.acao?.tipo === "gerar_link_shopee" ? ExternalLink
                : Zap;
              const IconeAcao = iconeAcao;
              return (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg px-3 py-2 text-xs leading-relaxed",
                    msg.role === "user"
                      ? "ml-8 bg-shopee/15 text-shopee-100 border border-shopee/30"
                      : "mr-8 bg-zinc-900 text-zinc-200 border border-white/5"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-shopee">
                      <GraduationCap className="h-2.5 w-2.5" />
                      Especialista
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.texto}</div>

                  {/* AÇÃO SUGERIDA */}
                  {msg.acao && (
                    <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
                        <Zap className="h-3 w-3" /> Ação sugerida
                      </div>
                      <div className="mt-1 text-[11px] text-amber-100">
                        <strong className="capitalize">{msg.acao.tipo.replace(/_/g, " ")}</strong> · {msg.acao.descricao}
                      </div>

                      {msg.statusAcao === "pendente" && (
                        <button
                          onClick={() => aplicarAcao(i)}
                          className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-zinc-900 hover:bg-amber-400"
                        >
                          <IconeAcao className="h-3 w-3" />
                          Aplicar agora
                        </button>
                      )}
                      {msg.statusAcao === "aplicando" && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-300">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Executando…
                        </div>
                      )}
                      {msg.statusAcao === "ok" && (
                        <div className="mt-2 flex items-start gap-1.5 rounded-md bg-emerald-500/15 px-2 py-1.5 text-[11px] text-emerald-300">
                          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
                          {msg.resultadoAcao}
                        </div>
                      )}
                      {msg.statusAcao === "erro" && (
                        <div className="mt-2 flex items-start gap-1.5 rounded-md bg-rose-500/15 px-2 py-1.5 text-[11px] text-rose-300">
                          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                          {msg.resultadoAcao}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {chatCarregando && (
              <div className="mr-8 flex items-center gap-2 rounded-lg border border-white/5 bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Pensando…
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={chatPergunta}
                onChange={(e) => setChatPergunta(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    perguntarEspecialista();
                  }
                }}
                placeholder="Ex: vale escalar o Anuncio 02?"
                rows={2}
                className="flex-1 resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none focus:border-shopee/50"
              />
              <button
                onClick={perguntarEspecialista}
                disabled={chatCarregando || !chatPergunta.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-shopee text-white hover:bg-shopee/80 disabled:opacity-50"
              >
                {chatCarregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-[9px] text-zinc-600">
              Enter pra enviar · Shift+Enter pra nova linha · contexto da sua conta enviado automaticamente
            </p>
          </div>
        </div>
      )}
    </>
  );
}

/* ============== ABA: VISÃO GERAL ============== */
/* ============== CARD: PLANO DE AÇÃO PRA REDUZIR DROP-OFF ============== */
function CardPlanoDropoff({ problemas }: { problemas: ProblemaDropoff[] }) {
  if (problemas.length === 0) return null;

  const altas = problemas.filter((p) => p.prioridade === "alta");
  const medias = problemas.filter((p) => p.prioridade === "media");
  const baixas = problemas.filter((p) => p.prioridade === "baixa");

  const impactoTotal = problemas.reduce((s, p) => s + (p.impactoPct || 0), 0);

  const ICONES_CAT = {
    link: ExternalLink,
    tracking: Target,
    criativo: Sparkles,
    configuracao: Wrench,
    qualidade: AlertTriangle
  } as const;

  function CardProblema({ p }: { p: ProblemaDropoff }) {
    const Icone = ICONES_CAT[p.categoria];
    const cor =
      p.prioridade === "alta" ? "border-rose-500/30 bg-rose-500/[0.04]" :
      p.prioridade === "media" ? "border-amber-500/30 bg-amber-500/[0.04]" :
      "border-zinc-700/40 bg-zinc-800/30";
    const corIcone =
      p.prioridade === "alta" ? "text-rose-400" :
      p.prioridade === "media" ? "text-amber-400" :
      "text-zinc-400";
    return (
      <div className={cn("rounded-xl border p-4", cor)}>
        <div className="flex items-start gap-3">
          <Icone className={cn("h-5 w-5 shrink-0 mt-0.5", corIcone)} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-zinc-100">{p.titulo}</h4>
              {p.impactoPct && p.impactoPct > 0 && (
                <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  −{p.impactoPct}% drop-off
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-zinc-400">{p.detalhe}</p>
            <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">✓ Como corrigir</div>
              <p className="mt-0.5 text-xs text-zinc-200">{p.acao}</p>
            </div>
            {p.afetados && p.afetados.length > 0 && (
              <details className="mt-2 text-[10px] text-zinc-500">
                <summary className="cursor-pointer hover:text-zinc-300">
                  {p.afetados.length} afetado(s) — clique pra ver
                </summary>
                <ul className="mt-1 space-y-0.5 pl-3">
                  {p.afetados.slice(0, 10).map((a, i) => (
                    <li key={i} className="list-disc">{a}</li>
                  ))}
                  {p.afetados.length > 10 && <li className="text-zinc-600">...e mais {p.afetados.length - 10}</li>}
                </ul>
              </details>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="mb-4 glass rounded-2xl border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.03] to-blue-500/[0.03] p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
          <Wrench className="h-4 w-4 text-emerald-400" /> Plano de ação · Reduzir drop-off
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-zinc-500">{problemas.length} problema(s)</span>
          {impactoTotal > 0 && (
            <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-300">
              Potencial: −{Math.min(impactoTotal, 80)}% drop-off
            </span>
          )}
        </div>
      </div>

      {altas.length > 0 && (
        <>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-rose-300">
            <AlertCircle className="h-3 w-3" /> Prioridade alta · resolva primeiro
          </div>
          <div className="space-y-2 mb-4">
            {altas.map((p, i) => <CardProblema key={`a${i}`} p={p} />)}
          </div>
        </>
      )}

      {medias.length > 0 && (
        <>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-300">
            <AlertTriangle className="h-3 w-3" /> Prioridade média
          </div>
          <div className="space-y-2 mb-4">
            {medias.map((p, i) => <CardProblema key={`m${i}`} p={p} />)}
          </div>
        </>
      )}

      {baixas.length > 0 && (
        <>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            <Bell className="h-3 w-3" /> Otimizações secundárias
          </div>
          <div className="space-y-2">
            {baixas.map((p, i) => <CardProblema key={`b${i}`} p={p} />)}
          </div>
        </>
      )}

      {/* Checklist genérico — sempre visível */}
      <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/[0.04] p-4">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-blue-300">
          Checklist universal (independente dos seus dados)
        </div>
        <ul className="space-y-1 text-xs text-zinc-300">
          <li>✓ Em <span className="font-bold text-zinc-100">Configurações Avançadas → Placements</span>: desmarcar <span className="font-mono text-rose-300">Audience Network</span> e <span className="font-mono text-rose-300">Messenger</span>. Mantenha só Feed + Stories + Reels (Instagram + Facebook).</li>
          <li>✓ Objetivo da campanha: <span className="font-bold">"Tráfego" → "Cliques no link"</span> (não "Visualização da página de destino" nem "Engajamento").</li>
          <li>✓ Use <span className="font-mono text-emerald-300">link direto</span>: <span className="font-mono">https://shopee.com.br/product/SHOPID/ITEMID?sub_id1=MetaAds&amp;sub_id2=Cri01</span> em vez de shortlink.</li>
          <li>✓ CPC alvo: deixe <span className="font-bold">"Manual"</span> em ~R$ 0,30–0,50 (orgânico Shopee Vídeo). CPC abaixo disso = audiência ruim.</li>
          <li>✓ CTA do criativo: <span className="font-mono text-emerald-300">"Clique pra ver na Shopee"</span>, não <span className="font-mono text-rose-300">"Saiba mais"</span> ou <span className="font-mono text-rose-300">"Veja você mesmo"</span>.</li>
          <li>✓ Orçamento mínimo: R$ 25/dia por conjunto. Abaixo disso, Meta não otimiza direito.</li>
          <li>✓ Renomeie anúncios pra incluir <span className="font-mono text-blue-300">"CriXX"</span> (Cri01, Cri02...) — sistema infere sub_id_2 automaticamente.</li>
          <li>✓ Mantenha 3-5 criativos ativos por conjunto pra Meta otimizar entrega.</li>
        </ul>
      </div>
    </section>
  );
}

/* ============== CARD: REDIRECT META→SHOPEE (drop-off de cliques) ============== */
function CardRedirectShopee({
  redirect,
  dias,
  onAtualizar,
  triggerAbrir
}: {
  redirect: AnaliseRedirect;
  dias: number;
  onAtualizar: () => void;
  /** Contador externo — quando muda, scrolla pro card e abre o form (usado pelo atalho do MiniStat) */
  triggerAbrir?: number;
}) {
  // Helper pra pegar data BR (fuso São Paulo) — evita bug onde ISOString UTC mostra dia errado
  const fmtBR = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  const hojeBR = fmtBR.format(new Date());
  const ontemBR = fmtBR.format(new Date(Date.now() - 86400000));

  // Default: ONTEM (Shopee dashboard atualiza às 17:30 com dado do dia anterior consolidado)
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState<string>("");
  const [data, setData] = useState<string>(ontemBR);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "ok" | "erro"; msg: string } | null>(null);

  // Lista de cliques já registrados nos últimos 14 dias
  const [historico, setHistorico] = useState<Array<{ data: string; cliques: number }>>([]);
  useEffect(() => {
    fetch("/api/analytics/cliques-shopee?dias=14")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setHistorico(d.cliques || []); })
      .catch(() => {});
  }, [redirect.cliquesShopee]);

  // Quando atalho externo (MiniStat) clica, abre form e scrolla
  const cardRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (triggerAbrir && triggerAbrir > 0) {
      setEditando(true);
      requestAnimationFrame(() => {
        cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [triggerAbrir]);

  async function salvar() {
    const cliques = parseInt(valor, 10);
    if (isNaN(cliques) || cliques < 0) {
      setFeedback({ tipo: "erro", msg: "Digite um número válido" });
      return;
    }
    setSalvando(true);
    setFeedback(null);
    try {
      const r = await fetch("/api/analytics/cliques-shopee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, cliques })
      });
      const d = await r.json();
      if (!d.ok) {
        setFeedback({ tipo: "erro", msg: d.erro || "Falhou ao salvar" });
        return;
      }
      const dataFmt = new Date(data + "T12:00:00-03:00").toLocaleDateString("pt-BR");
      setFeedback({ tipo: "ok", msg: `${cliques} cliques salvos pra ${dataFmt}` });
      setValor("");
      // Recarrega histórico + relatório principal
      const hist = await fetch("/api/analytics/cliques-shopee?dias=14").then((r) => r.json());
      if (hist.ok) setHistorico(hist.cliques || []);
      onAtualizar();
    } catch (e) {
      setFeedback({ tipo: "erro", msg: (e as Error).message });
    } finally {
      setSalvando(false);
    }
  }

  // Só renderiza se houver gasto Meta no período (caso contrário não tem sentido)
  if (redirect.cliquesMeta === 0) return null;

  const corPerda = redirect.perdaPct > 70 ? "rose" : redirect.perdaPct > 40 ? "amber" : "emerald";
  const corClasses = {
    rose: "border-rose-500/30 bg-rose-500/[0.05] text-rose-300",
    amber: "border-amber-500/30 bg-amber-500/[0.05] text-amber-300",
    emerald: "border-emerald-500/30 bg-emerald-500/[0.05] text-emerald-300"
  };

  return (
    <section ref={cardRef} className="mb-4 glass rounded-2xl border-amber-500/20 bg-gradient-to-br from-amber-500/[0.03] to-rose-500/[0.03] p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
          <Activity className="h-4 w-4 text-amber-400" /> Redirect Meta → Shopee · perda de cliques
        </h3>
        <button
          onClick={() => setEditando((v) => !v)}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300 hover:bg-white/10"
        >
          {editando ? "Cancelar" : "Registrar cliques Shopee"}
        </button>
      </div>

      {/* INPUT pra registrar cliques manualmente do dashboard Shopee */}
      {editando && (
        <div className="mb-4 rounded-xl border border-amber-500/20 bg-black/30 p-3">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">
            Pegue o valor em <a href="https://affiliate.shopee.com.br/dashboard" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline">affiliate.shopee.com.br/dashboard</a> → Detalhes de cliques → Redes sociais
            <br />
            <span className="text-[9px] text-zinc-600">
              💡 Shopee atualiza dado do dia anterior às 17:30. Hoje parcial só é mostrado depois das 18h.
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setData(ontemBR)}
              className={cn(
                "rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors",
                data === ontemBR ? "bg-shopee text-white" : "border border-white/10 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              )}
            >
              Ontem
            </button>
            <button
              type="button"
              onClick={() => setData(hojeBR)}
              className={cn(
                "rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors",
                data === hojeBR ? "bg-shopee text-white" : "border border-white/10 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              )}
            >
              Hoje
            </button>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="rounded-md border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200"
            />
            <input
              type="number"
              min="0"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="Ex: 54"
              className="w-32 rounded-md border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200"
              autoFocus
            />
            <button
              onClick={salvar}
              disabled={salvando || !valor}
              className="rounded-md bg-shopee px-3 py-1.5 text-xs font-bold text-white hover:bg-shopee/90 disabled:opacity-50"
            >
              {salvando ? "Salvando..." : "Salvar cliques"}
            </button>
          </div>
          {feedback && (
            <div className={cn(
              "mt-2 rounded-md px-2 py-1 text-[11px] font-bold",
              feedback.tipo === "ok" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
            )}>
              {feedback.tipo === "ok" ? "✓" : "✗"} {feedback.msg}
            </div>
          )}

          {/* Histórico recente — verifica que valores estão no banco */}
          {historico.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                Últimos registros ({historico.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {historico.slice(0, 14).map((h) => {
                  const dt = new Date(h.data + "T12:00:00-03:00");
                  const ehHoje = h.data === hojeBR;
                  const ehOntem = h.data === ontemBR;
                  return (
                    <button
                      key={h.data}
                      type="button"
                      onClick={() => { setData(h.data); setValor(String(h.cliques)); }}
                      className="rounded-md border border-white/10 bg-zinc-900/50 px-2 py-1 text-[10px] hover:border-shopee/40 hover:bg-shopee/10"
                      title={`Editar ${h.data}`}
                    >
                      <span className="text-zinc-500">
                        {ehHoje ? "Hoje" : ehOntem ? "Ontem" : dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      </span>
                      <span className="ml-1 font-bold tabular-nums text-zinc-200">{h.cliques}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {!redirect.temDadosShopee ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.04] p-4 text-xs text-amber-100">
          <div className="font-bold mb-1">⚠ Por que isso é manual?</div>
          <div className="text-amber-100/80 leading-relaxed">
            A API GraphQL da Shopee Affiliate (<span className="font-mono">conversionReport, validatedReport, partnerOrderReport</span>)
            <span className="font-bold"> não expõe relatório de cliques</span> — só conversões. Os 54 cliques que aparecem no dashboard
            web vêm de um endpoint interno fechado da Shopee.
          </div>
          <div className="mt-2 text-amber-100/80 leading-relaxed">
            <span className="font-bold">Como registrar:</span> abra <a href="https://affiliate.shopee.com.br/dashboard" target="_blank" rel="noopener noreferrer" className="underline">affiliate.shopee.com.br/dashboard</a> →
            "Detalhes de cliques" → veja o número de "Redes sociais" → clique no botão <span className="font-mono">"Registrar cliques Shopee"</span> acima e cole o valor.
          </div>
        </div>
      ) : (
        <>
          {/* COMPARATIVO PRINCIPAL */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-300">Cliques Meta (paid)</div>
              <div className="mt-1 text-2xl font-black tabular-nums text-rose-300">{formatNumber(redirect.cliquesMeta)}</div>
              <div className="text-[10px] text-zinc-500">Meta cobra por isso</div>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Cliques Shopee</div>
              <div className="mt-1 text-2xl font-black tabular-nums text-emerald-300">{formatNumber(redirect.cliquesShopee)}</div>
              <div className="text-[10px] text-zinc-500">Realmente entraram</div>
            </div>
            <div className={cn("rounded-xl border p-3", corClasses[corPerda])}>
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-90">Perda no redirect</div>
              <div className="mt-1 text-2xl font-black tabular-nums">{redirect.perdaPct.toFixed(0)}%</div>
              <div className="text-[10px] text-zinc-500">{formatNumber(redirect.cliquesPerdidos)} cliques perdidos</div>
            </div>
          </div>

          {/* MÉTRICAS DERIVADAS (CPC real + conversão real) */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white/5 bg-black/30 p-3">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">CPC Shopee real</div>
              <div className="text-lg font-black tabular-nums text-zinc-100">{formatBRL(redirect.cpcShopeeReal)}</div>
              <div className="text-[10px] text-zinc-500">
                Custo por clique que de fato chegou à Shopee (gasto Meta ÷ cliques Shopee)
              </div>
            </div>
            <div className="rounded-lg border border-white/5 bg-black/30 p-3">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Taxa de conversão real</div>
              <div className="text-lg font-black tabular-nums text-zinc-100">{redirect.conversaoRealPct.toFixed(2)}%</div>
              <div className="text-[10px] text-zinc-500">
                Vendas Meta Ads ÷ cliques Shopee (mais honesto que vendas/cliques Meta)
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

/* ============== CARD: ANÁLISE DE COOKIES (janela 7d Shopee) ============== */
function CardAnaliseCookies({ cookies }: { cookies: AnaliseCookies }) {
  if (cookies.totalVendas === 0) return null;

  const buckets: Array<{ chave: BucketDelay; rotulo: string; cor: string; descricao: string }> = [
    { chave: "instant", rotulo: "Instantânea (<1min)", cor: "from-emerald-500 to-emerald-400", descricao: "Comprou direto após clique" },
    { chave: "ate1h",   rotulo: "Até 1 hora",          cor: "from-emerald-400 to-teal-400",   descricao: "Compra rápida — alta intenção" },
    { chave: "ate24h",  rotulo: "1h – 24h",            cor: "from-cyan-400 to-blue-400",      descricao: "Pensou um pouco antes" },
    { chave: "ate3d",   rotulo: "1 – 3 dias",          cor: "from-blue-400 to-indigo-400",    descricao: "Cookie marinou — consideração média" },
    { chave: "ate7d",   rotulo: "3 – 7 dias",          cor: "from-violet-400 to-purple-400",  descricao: "Cookie quase expirando" },
    { chave: "alem7d",  rotulo: "Além de 7 dias",      cor: "from-rose-500 to-rose-400",      descricao: "Atribuição anômala" }
  ];

  const total = cookies.totalVendas;

  function fmtTempo(seg: number): string {
    if (seg < 60) return `${seg}s`;
    if (seg < 3600) return `${Math.round(seg / 60)}min`;
    if (seg < 86400) return `${(seg / 3600).toFixed(1)}h`;
    return `${(seg / 86400).toFixed(1)}d`;
  }

  const pctBoost = total > 0 ? (cookies.vendasComBoostSeller.vendas / total) * 100 : 0;
  const pctSemBoost = total > 0 ? (cookies.vendasSemBoost.vendas / total) * 100 : 0;

  return (
    <section className="mb-4 glass rounded-2xl border-violet-500/20 bg-gradient-to-br from-violet-500/[0.04] to-emerald-500/[0.03] p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
          <Activity className="h-4 w-4 text-violet-400" /> Análise de cookies · Janela Shopee 7d
        </h3>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>Mediana: <span className="font-bold text-zinc-300 tabular-nums">{fmtTempo(cookies.tempoMedianoDecisaoSeg)}</span></span>
          <span>·</span>
          <span>Cookie ativo: <span className="font-bold text-violet-300 tabular-nums">{cookies.pctCookieAtivo.toFixed(0)}%</span></span>
        </div>
      </div>

      {/* Distribuição por bucket de delay */}
      <div className="space-y-2">
        {buckets.map((b) => {
          const dados = cookies.distribuicaoDelay[b.chave];
          const pct = total > 0 ? (dados.vendas / total) * 100 : 0;
          if (dados.vendas === 0) return null;
          return (
            <div key={b.chave}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-zinc-300">{b.rotulo}</span>
                <div className="flex items-center gap-3 tabular-nums">
                  <span className="text-zinc-500">{dados.vendas} venda(s)</span>
                  <span className="font-bold text-zinc-200 w-24 text-right">{formatBRL(dados.faturamento)}</span>
                  <span className="font-bold text-violet-300 w-12 text-right">{pct.toFixed(0)}%</span>
                </div>
              </div>
              <div className="overflow-hidden rounded-full bg-zinc-900">
                <div
                  className={cn("h-2 bg-gradient-to-r", b.cor)}
                  style={{ width: `${Math.max(2, pct)}%` }}
                />
              </div>
              <div className="mt-0.5 text-[10px] text-zinc-600">{b.descricao}</div>
            </div>
          );
        })}
      </div>

      {/* Linha inferior: direta vs cookie */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
            <Zap className="h-3 w-3" /> Direta · Boost do seller
          </div>
          <div className="mt-1 text-base font-black tabular-nums text-emerald-300">
            {cookies.vendasComBoostSeller.vendas} ({pctBoost.toFixed(0)}%)
          </div>
          <div className="text-[10px] text-zinc-500">
            Comissão: {formatBRL(cookies.vendasComBoostSeller.comissao)} · Comprou produto com boost da campanha do seller
          </div>
        </div>
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-3">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-violet-300">
            <Activity className="h-3 w-3" /> Indireta · Cookie/cross-sell
          </div>
          <div className="mt-1 text-base font-black tabular-nums text-violet-300">
            {cookies.vendasSemBoost.vendas} ({pctSemBoost.toFixed(0)}%)
          </div>
          <div className="text-[10px] text-zinc-500">
            Comissão: {formatBRL(cookies.vendasSemBoost.comissao)} · Veio da janela 7d sem boost (carrinho/cross-shop)
          </div>
        </div>
      </div>

      {cookies.lojaDiferente > 0 && (
        <div className="mt-3 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.04] p-3 text-xs text-cyan-200">
          🔀 <span className="font-bold">{cookies.lojaDiferente} venda(s) cross-shop</span> — comprador clicou no link e comprou em outra loja dentro da janela cookie de 7d.
        </div>
      )}
    </section>
  );
}

/* ============== CARD: SHOPEE VÍDEO + LIVE ============== */
function CardCanalConteudo({ tipo, resumo }: { tipo: "video" | "live"; resumo: ResumoCanalConteudo }) {
  const ehVideo = tipo === "video";
  const Icone = ehVideo ? Video : Radio;
  return (
    <div className={cn(
      "rounded-xl border p-4",
      ehVideo
        ? "border-violet-500/25 bg-gradient-to-br from-violet-500/[0.09] to-transparent"
        : "border-rose-500/25 bg-gradient-to-br from-rose-500/[0.09] to-transparent"
    )}>
      <div className="flex items-center justify-between gap-2">
        <div className={cn("flex items-center gap-2 text-xs font-black uppercase tracking-wider", ehVideo ? "text-violet-300" : "text-rose-300")}>
          <span className={cn("rounded-lg p-2", ehVideo ? "bg-violet-500/15" : "bg-rose-500/15")}>
            <Icone className="h-4 w-4" />
          </span>
          Shopee {ehVideo ? "Vídeo" : "Live"}
        </div>
        <span className={cn(
          "rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wider",
          resumo.vendas > 0
            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
            : "border-white/10 bg-white/[0.03] text-zinc-500"
        )}>
          {resumo.vendas > 0 ? "Convertendo" : "Aguardando venda"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Vendas</div>
          <div className="mt-0.5 text-2xl font-black tabular-nums text-zinc-100">{resumo.vendas}</div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Comissão</div>
          <div className={cn("mt-0.5 text-2xl font-black tabular-nums", ehVideo ? "text-violet-300" : "text-rose-300")}>
            {formatBRL(resumo.comissao)}
          </div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Faturamento</div>
          <div className="mt-0.5 text-sm font-bold tabular-nums text-zinc-200">{formatBRL(resumo.faturamento)}</div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Comissão/venda</div>
          <div className="mt-0.5 text-sm font-bold tabular-nums text-zinc-200">{formatBRL(resumo.comissaoPorVenda)}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-[10px]">
        <span className="text-zinc-500">Participação nas vendas Shopee</span>
        <span className="font-black tabular-nums text-zinc-300">{resumo.participacaoVendasPct.toFixed(1)}%</span>
      </div>
    </div>
  );
}

function CardConteudoShopee({
  dados,
  performance,
  periodoLabel,
  onAtualizar
}: {
  dados: ConteudoShopee;
  performance?: PerformanceShopee;
  periodoLabel: string;
  onAtualizar: () => void;
}) {
  const temConteudo = dados.total.vendas > 0;
  const pontos = dados.porDia.slice(-14);
  const maiorComissaoDia = Math.max(
    ...pontos.map((p) => p.comissaoVideo + p.comissaoLive),
    0
  );
  const dataEfetiva = performance?.periodoFim || new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const [editandoCliques, setEditandoCliques] = useState(false);
  const [dataCliques, setDataCliques] = useState(dataEfetiva);
  const [cliquesRedes, setCliquesRedes] = useState("");
  const [cliquesVideo, setCliquesVideo] = useState("");
  const [salvandoCliques, setSalvandoCliques] = useState(false);
  const [feedbackCliques, setFeedbackCliques] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  useEffect(() => {
    setDataCliques(dataEfetiva);
    setCliquesRedes(performance?.cliquesRedesSociais === null || performance?.cliquesRedesSociais === undefined ? "" : String(performance.cliquesRedesSociais));
    setCliquesVideo(performance?.cliquesShopeeVideo === null || performance?.cliquesShopeeVideo === undefined ? "" : String(performance.cliquesShopeeVideo));
  }, [dataEfetiva, performance?.cliquesRedesSociais, performance?.cliquesShopeeVideo]);

  async function salvarCliquesPerformance() {
    const redes = Number(cliquesRedes || 0);
    const video = Number(cliquesVideo || 0);
    if (!Number.isFinite(redes) || !Number.isFinite(video) || redes < 0 || video < 0) {
      setFeedbackCliques({ tipo: "erro", texto: "Informe números válidos, iguais ou maiores que zero." });
      return;
    }
    setSalvandoCliques(true);
    setFeedbackCliques(null);
    try {
      const resposta = await fetch("/api/analytics/cliques-shopee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: dataCliques,
          cliquesRedesSociais: Math.floor(redes),
          cliquesShopeeVideo: Math.floor(video)
        })
      });
      const json = await resposta.json();
      if (!json.ok) throw new Error(json.erro || "Não foi possível salvar os cliques.");
      setFeedbackCliques({ tipo: "ok", texto: `${Math.floor(redes + video)} cliques registrados no resumo Shopee.` });
      onAtualizar();
    } catch (erro) {
      setFeedbackCliques({ tipo: "erro", texto: (erro as Error).message });
    } finally {
      setSalvandoCliques(false);
    }
  }

  return (
    <section className="mb-4 glass overflow-hidden rounded-2xl border-orange-500/20 bg-gradient-to-br from-orange-500/[0.04] via-violet-500/[0.025] to-rose-500/[0.035]">
      <div className="border-b border-white/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-zinc-200">
              <Video className="h-4 w-4 text-orange-400" /> Shopee Vídeo + Live
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Vendas atribuídas pelo <span className="font-semibold text-zinc-400">channelType/referrer</span> do relatório oficial de conversões.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-300">
              API Shopee ativa
            </span>
            <span className="text-[10px] text-zinc-500">
              {performance
                ? `${new Date(`${performance.periodoInicio}T12:00:00-03:00`).toLocaleDateString("pt-BR")}${performance.periodoInicio !== performance.periodoFim ? ` → ${new Date(`${performance.periodoFim}T12:00:00-03:00`).toLocaleDateString("pt-BR")}` : ""}`
                : periodoLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="p-5">
        {performance?.usandoUltimoDisponivel && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] px-4 py-3 text-xs leading-relaxed text-amber-100">
            <span className="font-black">Filtro Ontem:</span> a Shopee ainda não fechou {performance.dataSolicitada ? new Date(`${performance.dataSolicitada}T12:00:00-03:00`).toLocaleDateString("pt-BR") : "o dia solicitado"}.
            Exibindo o último dia oficial disponível, <span className="font-black">{new Date(`${performance.periodoFim}T12:00:00-03:00`).toLocaleDateString("pt-BR")}</span>.
            O painel da Shopee atualiza diariamente às {performance.atualizadoDiariamenteAs}.
          </div>
        )}

        {performance && (
          <div className="mb-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-zinc-200">Métricas principais Shopee</div>
                <div className="mt-0.5 text-[10px] text-zinc-500">Mesmo formato do Painel de Controle do Afiliado</div>
              </div>
              <button
                type="button"
                onClick={() => setEditandoCliques((valor) => !valor)}
                className="rounded-lg border border-orange-500/25 bg-orange-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-orange-300 transition hover:bg-orange-500/20"
              >
                {editandoCliques ? "Fechar" : "Atualizar cliques"}
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {[
                { label: "Cliques", valor: performance.cliquesTotal === null ? "—" : formatNumber(performance.cliquesTotal), cor: "text-orange-300" },
                { label: "Pedidos", valor: formatNumber(performance.pedidos), cor: "text-zinc-100" },
                { label: "Comissão est.", valor: formatBRL(performance.comissaoEstimada), cor: "text-emerald-300" },
                { label: "Itens vendidos", valor: formatNumber(performance.itensVendidos), cor: "text-zinc-100" },
                { label: "Valor do pedido", valor: formatBRL(performance.valorPedidos), cor: "text-orange-200" },
                { label: "Novos compradores", valor: formatNumber(performance.novosCompradores), cor: "text-cyan-300" }
              ].map((metrica) => (
                <div key={metrica.label} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{metrica.label}</div>
                  <div className={cn("mt-1 text-xl font-black tabular-nums", metrica.cor)}>{metrica.valor}</div>
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border border-blue-500/15 bg-blue-500/[0.04] px-4 py-3">
                <span className="text-xs font-semibold text-zinc-300">Redes sociais</span>
                <span className="text-lg font-black tabular-nums text-blue-300">{performance.cliquesRedesSociais === null ? "—" : formatNumber(performance.cliquesRedesSociais)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-orange-500/15 bg-orange-500/[0.04] px-4 py-3">
                <span className="text-xs font-semibold text-zinc-300">Shopee Vídeo</span>
                <span className="text-lg font-black tabular-nums text-orange-300">{performance.cliquesShopeeVideo === null ? "—" : formatNumber(performance.cliquesShopeeVideo)}</span>
              </div>
            </div>

            {performance.cliquesTotal === null && !editandoCliques && (
              <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">
                Pedidos, itens, comissão, valor e compradores vêm automaticamente da API oficial. A API não libera cliques; registre os dois números exibidos em “Detalhes de cliques”.
              </p>
            )}

            {editandoCliques && (
              <div className="mt-3 rounded-xl border border-orange-500/20 bg-orange-500/[0.04] p-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="space-y-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                    Data do painel
                    <input type="date" value={dataCliques} onChange={(evento) => setDataCliques(evento.target.value)} className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-xs font-medium normal-case tracking-normal text-zinc-200" />
                  </label>
                  <label className="space-y-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                    Redes sociais
                    <input type="number" min="0" value={cliquesRedes} onChange={(evento) => setCliquesRedes(evento.target.value)} placeholder="Ex: 18" className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-xs font-medium normal-case tracking-normal text-zinc-200" />
                  </label>
                  <label className="space-y-1 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                    Shopee Vídeo
                    <input type="number" min="0" value={cliquesVideo} onChange={(evento) => setCliquesVideo(evento.target.value)} placeholder="Ex: 40" className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-xs font-medium normal-case tracking-normal text-zinc-200" />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[10px] text-zinc-500">Total calculado: <span className="font-black text-zinc-200">{formatNumber(Math.max(0, Number(cliquesRedes || 0)) + Math.max(0, Number(cliquesVideo || 0)))}</span></div>
                  <button type="button" onClick={salvarCliquesPerformance} disabled={salvandoCliques} className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-black text-white transition hover:bg-orange-400 disabled:opacity-50">
                    {salvandoCliques ? "Salvando..." : "Salvar métricas"}
                  </button>
                </div>
                {feedbackCliques && (
                  <div className={cn("mt-2 rounded-lg px-3 py-2 text-xs font-semibold", feedbackCliques.tipo === "ok" ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300")}>{feedbackCliques.texto}</div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_0.72fr]">
          <CardCanalConteudo tipo="video" resumo={dados.video} />
          <CardCanalConteudo tipo="live" resumo={dados.live} />

          <div className="rounded-xl border border-orange-500/20 bg-orange-500/[0.05] p-4">
            <div className="text-[10px] font-black uppercase tracking-wider text-orange-300">Conteúdo Shopee total</div>
            <div className="mt-3 text-3xl font-black tabular-nums text-orange-300">{formatBRL(dados.total.comissao)}</div>
            <div className="mt-1 text-xs text-zinc-400">{dados.total.vendas} venda(s) · {formatBRL(dados.total.faturamento)} faturado</div>
            <div className="mt-4 space-y-2 border-t border-white/5 pt-3 text-[10px]">
              <div className="flex justify-between gap-2">
                <span className="text-zinc-500">Participação da comissão</span>
                <span className="font-black text-orange-200">{dados.total.participacaoComissaoPct.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-zinc-500">Ticket médio</span>
                <span className="font-black text-zinc-300">{formatBRL(dados.total.ticketMedio)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-zinc-500">Custo de mídia</span>
                <span className="font-black text-emerald-300">R$ 0,00</span>
              </div>
            </div>
          </div>
        </div>

        {!temConteudo ? (
          <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-center text-xs text-zinc-500">
            A integração está pronta. Quando a Shopee retornar uma conversão com canal Vídeo ou Live, ela aparecerá aqui automaticamente.
          </div>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-xl border border-white/5 bg-black/20 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Comissão por dia</div>
                <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1 text-violet-300"><span className="h-2 w-2 rounded-sm bg-violet-500" /> Vídeo</span>
                  <span className="flex items-center gap-1 text-rose-300"><span className="h-2 w-2 rounded-sm bg-rose-500" /> Live</span>
                </div>
              </div>
              <div className="overflow-x-auto pb-1">
                <div className="flex h-32 min-w-max items-end gap-2">
                  {pontos.map((p) => {
                    const videoH = maiorComissaoDia > 0 ? (p.comissaoVideo / maiorComissaoDia) * 92 : 0;
                    const liveH = maiorComissaoDia > 0 ? (p.comissaoLive / maiorComissaoDia) * 92 : 0;
                    const label = new Date(`${p.data}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
                    return (
                      <div key={p.data} className="flex w-10 shrink-0 flex-col items-center justify-end gap-1" title={`${label}: Vídeo ${formatBRL(p.comissaoVideo)} · Live ${formatBRL(p.comissaoLive)}`}>
                        <div className="flex h-24 items-end gap-0.5">
                          <div className="w-3 rounded-t bg-gradient-to-t from-violet-600 to-violet-400" style={{ height: p.comissaoVideo > 0 ? `${Math.max(4, videoH)}px` : 0 }} />
                          <div className="w-3 rounded-t bg-gradient-to-t from-rose-600 to-rose-400" style={{ height: p.comissaoLive > 0 ? `${Math.max(4, liveH)}px` : 0 }} />
                        </div>
                        <span className="text-[8px] tabular-nums text-zinc-600">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-black/20 p-4">
              <div className="mb-3 text-[10px] font-black uppercase tracking-wider text-zinc-400">Produtos que converteram</div>
              {dados.topProdutos.length === 0 ? (
                <div className="text-xs text-zinc-600">Nenhum produto atribuído.</div>
              ) : (
                <div className="space-y-2.5">
                  {dados.topProdutos.slice(0, 4).map((produto) => (
                    <div key={`${produto.canal}-${produto.itemId}-${produto.produtoNome}`} className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-900">
                        {produto.produtoImagem ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={produto.produtoImagem} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : produto.canal === "shopee_video" ? (
                          <Video className="h-4 w-4 text-violet-400" />
                        ) : (
                          <Radio className="h-4 w-4 text-rose-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11px] font-semibold text-zinc-300">{produto.produtoNome}</div>
                        <div className={cn("text-[9px] font-bold", produto.canal === "shopee_video" ? "text-violet-400" : "text-rose-400")}>
                          {produto.canal === "shopee_video" ? "Shopee Vídeo" : "Shopee Live"} · {produto.vendas} venda(s)
                        </div>
                      </div>
                      <div className="text-right text-[10px] font-black tabular-nums text-emerald-300">{formatBRL(produto.comissao)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <p className="mt-4 text-[10px] leading-relaxed text-zinc-600">
          Este painel mede conversões, faturamento e comissão de conteúdo. Visualizações, alcance e audiência da live não fazem parte do conversionReport usado para o ROI.
        </p>
      </div>
    </section>
  );
}

/* ============== CARD: MIX ORGÂNICO vs PAGO ============== */
function CardMixTrafego({ breakdown, periodoLabel }: { breakdown: BreakdownCanal; periodoLabel: string }) {
  const { campanha, organico, porCategoria } = breakdown;
  const totalVendas = campanha.vendas + organico.vendas;
  if (totalVendas === 0) return null;

  const pctOrganico = Math.round((organico.vendas / totalVendas) * 100);
  const pctCampanha = 100 - pctOrganico;
  const totalFaturamento = campanha.faturamento + organico.faturamento;

  const topCats = Object.values(porCategoria)
    .sort((a, b) => b.faturamento - a.faturamento)
    .slice(0, 5);

  return (
    <section className="mb-4 glass rounded-2xl border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.04] to-rose-500/[0.04] p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
          <PieChart className="h-4 w-4 text-emerald-400" /> Mix de tráfego · Orgânico vs Pago
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-zinc-500">{periodoLabel}</span>
          <span className="font-bold text-zinc-300 tabular-nums">{totalVendas} venda(s)</span>
          <span className="font-bold text-zinc-200 tabular-nums">{formatBRL(totalFaturamento)} faturado</span>
        </div>
      </div>

      <div className="mb-4 flex h-3 w-full overflow-hidden rounded-full bg-black/40">
        {organico.vendas > 0 && (
          <div
            className="flex items-center justify-center bg-gradient-to-r from-emerald-500 to-emerald-400 text-[10px] font-black text-emerald-950"
            style={{ width: `${pctOrganico}%` }}
          >
            {pctOrganico >= 12 ? `${pctOrganico}%` : ""}
          </div>
        )}
        {campanha.vendas > 0 && (
          <div
            className="flex items-center justify-center bg-gradient-to-r from-rose-500 to-rose-400 text-[10px] font-black text-rose-950"
            style={{ width: `${pctCampanha}%` }}
          >
            {pctCampanha >= 12 ? `${pctCampanha}%` : ""}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* ORGÂNICO */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
            <Heart className="h-3.5 w-3.5" /> Orgânico (sem custo)
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <BlocoMetrica label="Vendas" valor={String(organico.vendas)} cor="emerald" />
            <BlocoMetrica label="Faturamento" valor={formatBRL(organico.faturamento)} cor="emerald" destaque />
            <BlocoMetrica label="Comissão" valor={formatBRL(organico.comissao)} cor="emerald" />
            <BlocoMetrica label="Ticket médio" valor={formatBRL(organico.ticketMedio)} cor="zinc" />
          </div>
        </div>

        {/* PAGO */}
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-300">
            <Megaphone className="h-3.5 w-3.5" /> Campanha (tráfego pago)
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <BlocoMetrica label="Vendas" valor={String(campanha.vendas)} cor="rose" />
            <BlocoMetrica label="Faturamento" valor={formatBRL(campanha.faturamento)} cor="rose" destaque />
            <BlocoMetrica label="Comissão" valor={formatBRL(campanha.comissao)} cor="rose" />
            <BlocoMetrica label="Ticket médio" valor={formatBRL(campanha.ticketMedio)} cor="zinc" />
          </div>
        </div>
      </div>

      {topCats.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            <span>Quebra por canal</span>
            <span>Faturamento</span>
          </div>
          <div className="space-y-1.5">
            {topCats.map((c) => {
              const pct = totalFaturamento > 0 ? (c.faturamento / totalFaturamento) * 100 : 0;
              const ehCampanha = c.tipo === "campanha";
              return (
                <div key={c.categoria} className="flex items-center gap-2 text-xs">
                  <span className={cn("h-2 w-2 rounded-full", ehCampanha ? "bg-rose-400" : "bg-emerald-400")} />
                  <span className="flex-1 text-zinc-300">{c.canal}</span>
                  <span className="tabular-nums text-zinc-500">{c.vendas} venda(s)</span>
                  <span className="w-24 text-right tabular-nums font-bold text-zinc-200">{formatBRL(c.faturamento)}</span>
                  <span className="w-12 text-right tabular-nums text-zinc-500">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function BlocoMetrica({ label, valor, cor, destaque }: { label: string; valor: string; cor: "emerald" | "rose" | "zinc"; destaque?: boolean }) {
  const corText =
    cor === "emerald" ? "text-emerald-300" :
    cor === "rose" ? "text-rose-300" :
    "text-zinc-200";
  return (
    <div>
      <div className="text-[10px] uppercase text-zinc-500">{label}</div>
      <div className={cn("font-black tabular-nums", corText, destaque ? "text-xl" : "text-lg")}>
        {valor}
      </div>
    </div>
  );
}

function AbaGeral({
  cg,
  relatorio,
  stats,
  dias,
  periodoLabel,
  insights,
  onRecarregar
}: {
  cg: ReturnType<typeof Object> & {
    gastoMeta: number; comissaoTotal: number; comissaoConfirmada: number; lucroLiquido: number; lucroLiquidoEstimado: number; roasGeral: number; roasGeralEstimado: number;
    cliques: number; cliquesOutbound: number; cliquesShopee: number; perdaRedirectPct: number; cpcShopeeReal: number; temDadosShopee: boolean;
    vendasTotal: number; vendasMetaAds: number; cpcMedio: number; ticketMedio: number; receita: number;
  };
  relatorio: RelatorioRoas;
  stats: StatsShopee | null;
  dias: number;
  periodoLabel: string;
  insights: Insights | null;
  onRecarregar: () => void;
}) {
  // Trigger pra abrir o form de cliques Shopee a partir do MiniStat (atalho)
  const [triggerCliques, setTriggerCliques] = useState(0);
  const abrirRegistroCliques = () => setTriggerCliques((n) => n + 1);
  const ehHoje = periodoLabel === "Hoje";
  const textoResumo = ehHoje
    ? insights?.resumo.textoNarrativo
    : `${periodoLabel}: ${cg.vendasTotal} venda(s), ${formatBRL(cg.receita)} em faturamento e ${formatBRL(cg.comissaoTotal)} de comissão. Gasto Meta com imposto: ${formatBRL(cg.gastoMeta)} · resultado estimado: ${formatBRL(cg.lucroLiquidoEstimado)}.`;
  return (
    <>
      {/* SAÚDE DA CONTA META + RESUMO DIÁRIO */}
      {insights && (insights.saude || insights.resumo.textoNarrativo) && (
        <section className="mb-6 grid gap-4 lg:grid-cols-3">
          {/* SAÚDE */}
          {insights.saude && <CardSaudeConta saude={insights.saude} />}

          {/* RESUMO DIÁRIO */}
          <div className={cn("glass rounded-2xl p-5", insights.saude ? "lg:col-span-2" : "lg:col-span-3")}>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-shopee">
              <Sparkles className="h-4 w-4" /> {ehHoje ? "Resumo do dia" : "Resumo do período"}
            </h3>
            <p className="text-sm leading-relaxed text-zinc-200">{textoResumo}</p>

            {/* Comparativo hoje vs ontem */}
            {ehHoje && insights.resumo.comparativo.some((c) => c.hoje > 0 || c.ontem > 0) && (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {insights.resumo.comparativo.map((c) => (
                  <div key={c.campo} className="rounded-lg border border-white/5 bg-black/30 p-2.5 text-center">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{c.campo}</div>
                    <div className="mt-0.5 text-sm font-black tabular-nums text-zinc-100">
                      {/* Campos de contagem (vendas/cliques) usam número; demais usam moeda BRL */}
                      {/Vendas|Cliques/i.test(c.campo) ? formatNumber(c.hoje) : formatBRL(c.hoje)}
                    </div>
                    {c.ontem > 0 && (
                      <div className={cn(
                        "text-[9px] font-bold tabular-nums",
                        c.variacao > 0 ? "text-emerald-400" : c.variacao < 0 ? "text-rose-400" : "text-zinc-500"
                      )}>
                        {c.variacao > 0 ? "+" : ""}{c.variacao.toFixed(0)}% vs ontem
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* TOP AÇÕES SUGERIDAS */}
            {ehHoje && insights.resumo.acoes.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <Zap className="h-3 w-3 text-amber-400" /> Próximas ações ({insights.resumo.acoes.length})
                </div>
                <div className="space-y-2">
                  {insights.resumo.acoes.map((a, i) => <CardAcao key={i} acao={a} />)}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* DETECTOR DE FADIGA */}
      {insights && insights.fadigas.length > 0 && (
        <section className="mb-6 glass rounded-2xl border-violet-500/30 bg-violet-500/5 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-violet-300">
            <Activity className="h-4 w-4" /> Fadiga de criativo detectada ({insights.fadigas.length})
          </h3>
          <p className="mb-3 text-xs text-violet-200/80">
            Quando o CTR cai mais de 25% em relação ao começo do período, o criativo está cansando do público. Prepare substituto.
          </p>
          <div className="space-y-2">
            {insights.fadigas.map((f) => (
              <div key={f.adId} className="rounded-lg border border-violet-500/20 bg-black/30 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-zinc-100">{f.adName}</div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-zinc-400">CTR: <span className="font-bold text-zinc-200">{f.ctrInicio.toFixed(2)}%</span> → <span className="font-bold text-rose-400">{f.ctrAgora.toFixed(2)}%</span></span>
                    <span className="rounded-md bg-rose-500/20 px-2 py-0.5 font-bold text-rose-300">-{f.quedaPct.toFixed(0)}%</span>
                    <span className="text-amber-300">~{f.diasAteParar}d até parar</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SHOPEE VÍDEO + LIVE — mantém o canal visível mesmo antes da primeira venda Live */}
      {relatorio.conteudoShopee && (
        <CardConteudoShopee
          dados={relatorio.conteudoShopee}
          performance={relatorio.performanceShopee}
          periodoLabel={periodoLabel}
          onAtualizar={onRecarregar}
        />
      )}

      {/* MIX ORGÂNICO vs PAGO — só aparece quando há dados de breakdown */}
      {relatorio.breakdownCanal && (relatorio.breakdownCanal.organico.vendas + relatorio.breakdownCanal.campanha.vendas) > 0 && (
        <CardMixTrafego
          breakdown={relatorio.breakdownCanal}
          periodoLabel={periodoLabel}
        />
      )}

      {/* REDIRECT META→SHOPEE — drop-off de cliques (input manual) */}
      {relatorio.analiseRedirect && relatorio.analiseRedirect.cliquesMeta > 0 && (
        <CardRedirectShopee
          redirect={relatorio.analiseRedirect}
          dias={dias}
          onAtualizar={onRecarregar}
          triggerAbrir={triggerCliques}
        />
      )}

      {/* PLANO DE AÇÃO — diagnóstico automático de problemas e como reduzir drop-off */}
      {relatorio.problemasDropoff && relatorio.problemasDropoff.length > 0 && (
        <CardPlanoDropoff problemas={relatorio.problemasDropoff} />
      )}

      {/* ANÁLISE DE COOKIES — distribuição click→compra na janela 7d Shopee */}
      {relatorio.analiseCookies && relatorio.analiseCookies.totalVendas > 0 && (
        <CardAnaliseCookies cookies={relatorio.analiseCookies} />
      )}

      {/* KPIs principais */}
      <section className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 stagger-children">
        <StatCard
          label="Gasto Meta (c/imposto)"
          value={formatBRL(cg.gastoMeta)}
          icon={DollarSign}
          accent="rose"
          hint={relatorio.infoMoeda?.moeda !== "BRL"
            ? `${relatorio.infoMoeda?.moeda || "USD"} → BRL · sem imposto BR`
            : `incl. ${((relatorio.infoMoeda?.impostoMeta ?? 0.13) * 100).toFixed(0)}% imposto`}
          sparkline={stats?.porDia?.slice(-7).map(d => d.comissao * 0.3)}
        />
        <StatCard
          label="Comissão confirmada"
          value={formatBRL(cg.comissaoConfirmada)}
          icon={DollarSign}
          accent="emerald"
          hint={`+${formatBRL(Math.max(0, cg.comissaoTotal - cg.comissaoConfirmada))} pendente`}
          trend={cg.comissaoConfirmada > 0 ? "up" : "neutral"}
          sparkline={stats?.porDia?.slice(-7).map(d => d.comissao)}
        />
        <StatCard
          label={`ROAS Conf. (${cg.roasGeral.toFixed(2)}x)`}
          value={`${(cg.roasGeral * 100).toFixed(0)}%`}
          icon={Target}
          accent="emerald"
          hint={`Est. ${(cg.roasGeralEstimado * 100).toFixed(0)}%`}
          trend={cg.roasGeral >= 2 ? "up" : cg.roasGeral >= 1 ? "neutral" : "down"}
        />
        <StatCard
          label="Lucro Líquido"
          value={formatBRL(cg.lucroLiquido)}
          icon={cg.lucroLiquido >= 0 ? TrendingUp : TrendingDown}
          accent={cg.lucroLiquido >= 0 ? "emerald" : "rose"}
          hint={`Est. ${formatBRL(cg.lucroLiquidoEstimado)}`}
          trend={cg.lucroLiquido >= 0 ? "up" : "down"}
        />
      </section>

      {/* JANELA DE CONFIANÇA SHOPEE (delay de atribuição) */}
      {relatorio.confianca && relatorio.projecao && relatorio.confianca.confiabilidadePct < 100 && (
        <CardJanelaConfianca confianca={relatorio.confianca} projecao={relatorio.projecao} consolidado={relatorio.consolidado} />
      )}

      {/* Sub-KPIs — separa Cliques Meta (oficial Ads Manager) vs Cliques Shopee real */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <MiniStat label="Impressões Meta" value={formatNumber(relatorio.consolidado.impressions)} icon={Eye} />
        <MiniStat
          label="Cliques no link (Meta)"
          value={formatNumber(cg.cliques)}
          icon={MousePointerClick}
          sub={cg.cliquesOutbound > cg.cliques ? `outbound: ${formatNumber(cg.cliquesOutbound)}` : undefined}
          subTone={cg.cliquesOutbound > cg.cliques * 1.4 ? "amber" : undefined}
        />
        <MiniStat
          label="Cliques Shopee"
          value={cg.temDadosShopee ? formatNumber(cg.cliquesShopee) : "—"}
          icon={Activity}
          sub={
            cg.temDadosShopee
              ? (cg.perdaRedirectPct > 0 ? `−${cg.perdaRedirectPct.toFixed(0)}% drop-off · clique p/ editar` : "100% chegaram · clique p/ editar")
              : (cg.cliques > 0 ? "clique aqui pra registrar" : "API Shopee não expõe cliques")
          }
          subTone={
            cg.temDadosShopee
              ? (cg.perdaRedirectPct > 60 ? "rose" : cg.perdaRedirectPct > 30 ? "amber" : "emerald")
              : "amber"
          }
          onClick={cg.cliques > 0 ? abrirRegistroCliques : undefined}
        />
        <MiniStat
          label="CPC Shopee real"
          value={cg.temDadosShopee && cg.cpcShopeeReal > 0 ? formatBRL(cg.cpcShopeeReal) : "—"}
          icon={DollarSign}
          sub={cg.temDadosShopee && cg.cpcMedio > 0 ? `Meta: ${formatBRL(cg.cpcMedio)}` : "clique p/ registrar cliques"}
          onClick={!cg.temDadosShopee && cg.cliques > 0 ? abrirRegistroCliques : undefined}
        />
        <MiniStat
          label="CPC link (Meta)"
          value={formatBRL(cg.cpcMedio)}
          icon={DollarSign}
          sub="custo por clique no link"
        />
        <MiniStat
          label="Ticket médio"
          value={formatBRL(cg.ticketMedio)}
          icon={ShoppingBag}
        />
      </section>

    </>
  );
}

/* ============== ABA: RESUMO EXECUTIVO ============== */
function AbaResumoExecutivo({
  cg,
  relatorio,
  stats,
  dias,
  periodoLabel
}: {
  cg: {
    gastoMeta: number; comissaoTotal: number; comissaoConfirmada: number; lucroLiquido: number; roasGeral: number;
    cliques: number; cliquesOutbound: number; cliquesShopee: number; perdaRedirectPct: number; cpcShopeeReal: number; temDadosShopee: boolean;
    vendasTotal: number; vendasMetaAds: number; cpcMedio: number; ticketMedio: number; receita: number;
  };
  relatorio: RelatorioRoas;
  stats: StatsShopee | null;
  dias: number;
  periodoLabel: string;
}) {
  const ctr = relatorio.consolidado.impressions > 0
    ? (relatorio.consolidado.linkClicks / relatorio.consolidado.impressions) * 100
    : 0;

  return (
    <div className="space-y-6 animate-float-in">
      {/* HEADER */}
      <div className="glass rounded-2xl p-6 gradient-border">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl shopee-gradient">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Resumo Executivo</h2>
            <p className="text-xs text-zinc-500">{periodoLabel} · Painel completo de performance</p>
          </div>
        </div>
      </div>

      {/* HEALTH + GOAL — side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        <HealthScore
          roas={cg.roasGeral}
          ctr={ctr}
          cpc={cg.cpcMedio}
          gastoTotal={cg.gastoMeta}
          receita={cg.receita}
          conversoes={cg.vendasMetaAds}
          clicks={cg.cliques}
        />
        <GoalTracker
          comissaoAtual={cg.comissaoConfirmada}
          lucroAtual={cg.lucroLiquido}
          diasNoPerido={dias}
          diasTotais={30}
        />
      </div>

      {/* DRE */}
      <DREPanel
        receitaBruta={cg.receita}
        comissaoShopee={cg.comissaoConfirmada}
        gastoMeta={relatorio.consolidado.spendBRL ?? relatorio.consolidado.spend}
        periodo={periodoLabel}
        diasNoPerido={dias}
        impostoMetaPct={relatorio.infoMoeda?.impostoMeta ?? 0.13}
      />

      {/* QUICK STATS GRID */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 stagger-children">
        <StatCard
          label="Vendas totais"
          value={String(cg.vendasTotal)}
          icon={ShoppingBag}
          accent="shopee"
          hint={`${cg.vendasMetaAds} via Meta Ads`}
          sparkline={stats?.porDia?.slice(-7).map(d => d.vendas)}
        />
        <StatCard
          label="Receita bruta"
          value={formatBRL(cg.receita)}
          icon={DollarSign}
          accent="indigo"
          hint="GMV total Shopee"
          sparkline={stats?.porDia?.slice(-7).map(d => d.comissao * 8)}
        />
        <StatCard
          label="CPC link"
          value={formatBRL(cg.cpcMedio)}
          icon={MousePointerClick}
          accent={cg.cpcMedio <= 1.5 ? "emerald" : "amber"}
          hint={cg.cpcMedio <= 1.5 ? "Custo saudável" : "Custo elevado"}
          trend={cg.cpcMedio <= 1.5 ? "up" : "down"}
        />
        <StatCard
          label="Ticket médio"
          value={formatBRL(cg.ticketMedio)}
          icon={Target}
          accent="indigo"
          hint={`${cg.cliques} cliques totais`}
        />
      </div>

      {/* PERFORMANCE BREAKDOWN — rápido visual */}
      <div className="glass rounded-2xl p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
          <Activity className="h-4 w-4 text-indigo-400" />
          Funil de conversão
        </h3>
        <div className="grid grid-cols-5 gap-1">
          {[
            { label: "Impressões", value: formatNumber(relatorio.consolidado.impressions), pct: 100 },
            { label: "Cliques link", value: formatNumber(cg.cliques), pct: relatorio.consolidado.impressions > 0 ? (cg.cliques / relatorio.consolidado.impressions) * 100 : 0 },
            { label: "Chegaram Shopee", value: cg.temDadosShopee ? formatNumber(cg.cliquesShopee) : "—", pct: cg.temDadosShopee && cg.cliques > 0 ? (cg.cliquesShopee / cg.cliques) * 100 : 0 },
            { label: "Vendas Meta", value: String(cg.vendasMetaAds), pct: cg.cliques > 0 ? (cg.vendasMetaAds / cg.cliques) * 100 : 0 },
            { label: "Vendas total", value: String(cg.vendasTotal), pct: cg.cliques > 0 ? (cg.vendasTotal / cg.cliques) * 100 : 0 }
          ].map((step, i) => (
            <div key={step.label} className="text-center">
              <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">{step.label}</div>
              <div className="text-lg font-black tabular-nums text-zinc-100">{step.value}</div>
              {i > 0 && step.pct > 0 && (
                <div className="text-[10px] font-bold tabular-nums text-zinc-500">{step.pct.toFixed(1)}%</div>
              )}
              {i < 4 && (
                <div className="mt-2 mx-auto h-1 w-full max-w-[60px] rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-shopee to-orange-400 transition-all duration-1000"
                    style={{ width: `${Math.min(step.pct, 100)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============== ABA: ANÚNCIOS META ============== */
function AbaAnuncios({ anuncios, infoMoeda }: { anuncios: RoasPorAnuncio[]; infoMoeda?: InfoMoeda }) {
  const [mostrarInativos, setMostrarInativos] = useState(false);

  if (anuncios.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 text-center text-xs text-zinc-500">
        Nenhum anúncio Meta encontrado. Clique em "Sincronizar Live" pra puxar.
      </div>
    );
  }

  // Status considerados ativos (anúncio ainda pode receber entrega)
  const STATUS_ATIVOS = new Set(["ACTIVE", "IN_REVIEW", "DISAPPROVED", "PREAPPROVED", "PENDING_REVIEW", "WITH_ISSUES", "PENDING_BILLING_INFO"]);
  const ativos = anuncios.filter((a) => STATUS_ATIVOS.has(a.status));
  const inativosComGasto = anuncios.filter((a) => !STATUS_ATIVOS.has(a.status) && a.spend > 0);
  const inativosSemGasto = anuncios.filter((a) => !STATUS_ATIVOS.has(a.status) && a.spend === 0);

  const spendInativos = inativosComGasto.reduce((s, a) => s + a.spendComImposto, 0);
  const spendTotalConta = ativos.reduce((s, a) => s + a.spendComImposto, 0) + spendInativos;

  return (
    <div className="space-y-3">
      {/* ALERTA: Gasto real da conta + aviso de inativos com gasto */}
      {inativosComGasto.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                Gasto real da conta: <span className="text-base text-amber-300">{formatBRL(spendTotalConta)}</span>
              </div>
              <div className="mt-1 text-[10px] text-zinc-400">
                {inativosComGasto.length} anúncio(s) pausado(s) ou excluído(s) contribuíram com <span className="font-bold text-amber-300">{formatBRL(spendInativos)}</span> em gasto
                {inativosSemGasto.length > 0 && ` · +${inativosSemGasto.length} sem gasto`}
              </div>
            </div>
            <button
              onClick={() => setMostrarInativos(!mostrarInativos)}
              className="rounded-lg border border-amber-500/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 transition-colors hover:bg-amber-500/10"
            >
              {mostrarInativos ? "Ocultar" : "Ver detalhes"}
            </button>
          </div>

          {/* Lista expansível de inativos com gasto */}
          {mostrarInativos && (
            <div className="mt-4 space-y-2 border-t border-amber-500/10 pt-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Anúncios pausados/excluídos com gasto
              </div>
              {inativosComGasto
                .sort((a, b) => b.spendComImposto - a.spendComImposto)
                .map((a) => (
                  <div key={a.adId} className="rounded-lg border border-white/5 bg-black/30 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={a.status} />
                        <span className="text-sm font-bold text-zinc-300">{a.adName}</span>
                        <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-mono font-bold text-shopee">
                          {a.subIdInferido || "sem ID"}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black tabular-nums text-amber-300">{formatBRL(a.spendComImposto)}</div>
                        <div className="text-[9px] text-zinc-500">{a.campaignName} · {a.adsetName}</div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Gasto real da conta (sempre visível, mesmo sem inativos) */}
      {inativosComGasto.length === 0 && ativos.length > 0 && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            <Wallet className="h-3.5 w-3.5 text-zinc-500" />
            Gasto total conta: <span className="text-zinc-200">{formatBRL(spendTotalConta)}</span>
          </div>
        </div>
      )}

      {/* Lista de anúncios ativos */}
      {ativos.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-xs text-zinc-500">
          Nenhum anúncio ativo no momento. {inativosComGasto.length > 0 && "Há anúncios pausados/excluídos com gasto acima."}
        </div>
      ) : (
        ativos.map((a) => (
          <AdRow key={a.adId} ad={a} infoMoeda={infoMoeda} />
        ))
      )}

      {/* Inativos sem gasto: só um contador discreto */}
      {inativosSemGasto.length > 0 && (
        <div className="text-center text-[10px] text-zinc-600">
          +{inativosSemGasto.length} anúncio(s) pausado(s)/excluído(s) sem gasto no período
        </div>
      )}
    </div>
  );
}

/* ============== ABA: CRIATIVOS ============== */
function AbaCriativos({ porCriativo, infoMoeda }: { porCriativo: Record<string, { vendas: number; comissao: number; spend: number; roas: number }>; infoMoeda?: InfoMoeda }) {
  const entries = Object.entries(porCriativo).sort(([, a], [, b]) => b.roas - a.roas);
  if (entries.length === 0) {
    return <div className="glass rounded-2xl p-12 text-center text-xs text-zinc-500">Sem dados de criativos.</div>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map(([sub, dados]) => {
        const impostoCri = (infoMoeda?.impostoMeta ?? 0.13);
        const lucro = dados.comissao - dados.spend * (1 + impostoCri);
        return (
          <div
            key={sub}
            className={cn(
              "glass rounded-xl p-4",
              lucro > 0 ? "border-emerald-500/30 bg-emerald-500/5" : lucro < -2 ? "border-rose-500/30 bg-rose-500/5" : ""
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                {sub === "_sem_criativo" || sub === "indefinido" ? "Sem ID" : sub}
              </span>
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                  lucro > 0 ? "bg-emerald-500/20 text-emerald-300" : lucro < -2 ? "bg-rose-500/20 text-rose-300" : "bg-amber-500/20 text-amber-300"
                )}
              >
                ROAS {dados.roas.toFixed(2)}x
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Stat label="Vendas" value={String(dados.vendas)} />
              <Stat label="Comissão" value={formatBRL(dados.comissao)} />
              <Stat label="Gasto" value={formatBRL(dados.spend)} />
            </div>
            <div className={cn("mt-3 text-center text-sm font-black tabular-nums", lucro > 0 ? "text-emerald-400" : lucro < 0 ? "text-rose-400" : "text-zinc-300")}>
              {lucro >= 0 ? "+" : ""}{formatBRL(lucro)} de lucro
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============== ABA: CANAIS SHOPEE — separa orgânico vs pago ============== */
function AbaCanais({ stats }: { stats: StatsShopee | null }) {
  if (!stats || Object.keys(stats.porCanal).length === 0) {
    return <div className="glass rounded-2xl p-12 text-center text-xs text-zinc-500">Sem vendas atribuídas. Sincronize.</div>;
  }
  const entradas = Object.entries(stats.porCanal).map(([categoria, dados]) => ({
    categoria,
    ...dados,
    nome: dados.canal || NOMES_CANAL[categoria] || categoria,
    tipo: dados.tipo || (categoria === "meta_ads" ? "campanha" : "organico")
  }));
  const max = Math.max(...entradas.map((c) => c.comissao), 0);
  const pagos = entradas.filter((e) => e.tipo === "campanha").sort((a, b) => b.comissao - a.comissao);
  const organicos = entradas.filter((e) => e.tipo !== "campanha").sort((a, b) => b.comissao - a.comissao);

  function Linha(c: typeof entradas[number]) {
    const cor = c.tipo === "campanha" ? "from-rose-500 to-rose-400" : "from-emerald-500 to-emerald-400";
    const corTexto = c.tipo === "campanha" ? "text-rose-300" : "text-emerald-300";
    return (
      <div key={c.categoria}>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-semibold text-zinc-300">{c.nome}</span>
          <span className={cn("font-mono font-bold", corTexto)}>{formatBRL(c.comissao)}</span>
        </div>
        <div className="overflow-hidden rounded-full bg-zinc-900">
          <div
            className={cn("h-2 bg-gradient-to-r", cor)}
            style={{ width: max > 0 ? `${(c.comissao / max) * 100}%` : "0%" }}
          />
        </div>
        <div className="mt-0.5 text-[10px] text-zinc-500">{c.vendas} venda(s)</div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ORGÂNICO */}
      <div className="glass rounded-2xl border-emerald-500/20 bg-emerald-500/[0.03] p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-emerald-300">
          <Heart className="h-4 w-4" /> Tráfego orgânico ({organicos.reduce((s, c) => s + c.vendas, 0)})
        </h3>
        {organicos.length === 0 ? (
          <p className="text-xs text-zinc-500">Nenhuma venda orgânica no período.</p>
        ) : (
          <div className="space-y-3">{organicos.map(Linha)}</div>
        )}
      </div>

      {/* PAGO */}
      <div className="glass rounded-2xl border-rose-500/20 bg-rose-500/[0.03] p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-rose-300">
          <Megaphone className="h-4 w-4" /> Tráfego pago ({pagos.reduce((s, c) => s + c.vendas, 0)})
        </h3>
        {pagos.length === 0 ? (
          <p className="text-xs text-zinc-500">Nenhuma venda de campanha paga no período.</p>
        ) : (
          <div className="space-y-3">{pagos.map(Linha)}</div>
        )}
      </div>
    </div>
  );
}

/* ============== ABA: TOP PRODUTOS ============== */
function AbaProdutos({ stats }: { stats: StatsShopee | null }) {
  if (!stats || stats.topProdutos.length === 0) {
    return <div className="glass rounded-2xl p-12 text-center text-xs text-zinc-500">Sem produtos vendidos ainda.</div>;
  }
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
          <Trophy className="h-4 w-4 text-amber-400" /> Top produtos vendidos
        </h3>
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">
          {stats.topProdutos.length} produtos · ordenado por comissão
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.topProdutos.map((p, i) => <CardProdutoVendido key={`${p.itemId || p.nome}-${i}`} produto={p} rank={i + 1} />)}
      </div>
    </div>
  );
}

function CardProdutoVendido({
  produto,
  rank
}: {
  produto: NonNullable<StatsShopee>["topProdutos"][number];
  rank: number;
}) {
  const podabilismo = produto.imagem ? "" : "from-zinc-800 to-zinc-900";
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-zinc-900/40 transition-all hover:border-shopee/30">
      {/* Rank badge */}
      <div className="absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/90 text-xs font-black text-zinc-900 shadow-lg">
        {rank}
      </div>

      {/* Imagem ou placeholder */}
      <div className={cn("relative aspect-[4/3] overflow-hidden bg-gradient-to-br", podabilismo)}>
        {produto.imagem ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={produto.imagem}
            alt={produto.nome}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-700">
            <ShoppingBag className="h-12 w-12" strokeWidth={1.5} />
          </div>
        )}
        {/* Comissão flutuante */}
        <div className="absolute bottom-2 right-2 rounded-md bg-emerald-500/90 px-2 py-1 text-[11px] font-black text-zinc-900 shadow-lg">
          {formatBRL(produto.comissao)}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="line-clamp-2 min-h-[32px] text-xs font-semibold text-zinc-100">{produto.nome}</div>

        {(produto.shopName || produto.rating) && (
          <div className="mt-2 flex items-center gap-2 text-[10px] text-zinc-500">
            {produto.rating && produto.rating > 0 && (
              <span className="flex items-center gap-0.5 text-amber-400">
                ★ {produto.rating.toFixed(1)}
              </span>
            )}
            {produto.shopName && (
              <span className="line-clamp-1">{produto.shopName}</span>
            )}
          </div>
        )}

        <div className="mt-2 grid grid-cols-3 gap-1 border-t border-white/5 pt-2">
          <ProdMini label="Vendas" valor={String(produto.vendas)} />
          <ProdMini label="Ticket" valor={produto.ticketMedio ? formatBRL(produto.ticketMedio) : "—"} />
          <ProdMini label="Preço" valor={produto.preco ? formatBRL(produto.preco) : "—"} />
        </div>

        {produto.linkProduto && (
          <a
            href={produto.linkProduto}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center justify-center gap-1 rounded-md border border-shopee/30 bg-shopee/10 px-2 py-1.5 text-[10px] font-bold text-shopee transition-colors hover:bg-shopee/20"
          >
            <ExternalLink className="h-3 w-3" />
            Ver na Shopee
          </a>
        )}
      </div>
    </div>
  );
}

function ProdMini({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="text-center">
      <div className="text-[8px] uppercase tracking-wider text-zinc-600">{label}</div>
      <div className="text-[10px] font-bold tabular-nums text-zinc-200">{valor}</div>
    </div>
  );
}

function MetricaHistorico({
  label,
  valor,
  detalhe,
  icon: Icon,
  cor = "zinc"
}: {
  label: string;
  valor: string;
  detalhe: string;
  icon: typeof Activity;
  cor?: "zinc" | "emerald" | "orange" | "violet" | "cyan" | "rose";
}) {
  const cores = {
    zinc: "border-white/[0.07] bg-white/[0.025] text-zinc-100",
    emerald: "border-emerald-500/20 bg-emerald-500/[0.045] text-emerald-300",
    orange: "border-orange-500/20 bg-orange-500/[0.045] text-orange-300",
    violet: "border-violet-500/20 bg-violet-500/[0.045] text-violet-300",
    cyan: "border-cyan-500/20 bg-cyan-500/[0.045] text-cyan-300",
    rose: "border-rose-500/20 bg-rose-500/[0.045] text-rose-300"
  } as const;
  return (
    <div className={cn("rounded-xl border p-3.5", cores[cor])}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">{label}</span>
        <Icon className="h-3.5 w-3.5 opacity-80" />
      </div>
      <div className="mt-1.5 text-xl font-black tabular-nums tracking-tight">{valor}</div>
      <div className="mt-0.5 truncate text-[9px] text-zinc-500" title={detalhe}>{detalhe}</div>
    </div>
  );
}

function PainelMetricasHistorico({ dados }: { dados: PontoDiarioCompleto[] }) {
  const [mostrarZerados, setMostrarZerados] = useState(false);
  const resumo = useMemo(() => {
    const pedidos = dados.reduce((s, d) => s + d.pedidosTotal, 0);
    const itens = dados.reduce((s, d) => s + d.itensVendidos, 0);
    const faturamento = dados.reduce((s, d) => s + d.faturamentoTotal, 0);
    const comissao = dados.reduce((s, d) => s + d.comissaoTotal, 0);
    const confirmada = dados.reduce((s, d) => s + d.comissaoConfirmada, 0);
    const pendente = dados.reduce((s, d) => s + d.comissaoPendente, 0);
    const cliques = dados.reduce((s, d) => s + d.cliquesShopeeTotal, 0);
    const cliquesRedes = dados.reduce((s, d) => s + d.cliquesRedesSociais, 0);
    const cliquesVideo = dados.reduce((s, d) => s + d.cliquesShopeeVideo, 0);
    const temCliques = dados.some((d) => d.temDadosCliquesShopee);
    const novos = dados.reduce((s, d) => s + d.novosCompradores, 0);
    const cancelados = dados.reduce((s, d) => s + d.pedidosCancelados, 0);
    const video = dados.reduce((s, d) => s + d.vendasVideo, 0);
    const live = dados.reduce((s, d) => s + d.vendasLive, 0);
    const lucro = dados.reduce((s, d) => s + d.lucroLiquido, 0);
    const diasAtivos = dados.filter((d) => d.pedidosTotal > 0 || d.cliquesShopeeTotal > 0 || d.spendMeta > 0).length;
    const melhorDia = dados.reduce<PontoDiarioCompleto | null>((melhor, dia) =>
      !melhor || dia.comissaoTotal > melhor.comissaoTotal ? dia : melhor, null);
    const ticketMedio = pedidos > 0 ? faturamento / pedidos : 0;
    const conversao = temCliques && cliques > 0 ? (pedidos / cliques) * 100 : null;
    const comissaoClique = temCliques && cliques > 0 ? comissao / cliques : null;
    return {
      pedidos, itens, faturamento, comissao, confirmada, pendente, cliques, cliquesRedes, cliquesVideo,
      temCliques, novos, cancelados, video, live, lucro, diasAtivos, melhorDia, ticketMedio, conversao, comissaoClique
    };
  }, [dados]);

  const temMovimento = (dia: PontoDiarioCompleto) =>
    dia.pedidosTotal > 0 || dia.cliquesShopeeTotal > 0 || dia.spendMeta > 0 || dia.comissaoTotal > 0;
  const diasVisiveis = (mostrarZerados ? dados : dados.filter(temMovimento)).slice().reverse();
  const formatarDia = (data: string, longo = false) => new Date(`${data}T12:00:00-03:00`).toLocaleDateString("pt-BR",
    longo ? { weekday: "short", day: "2-digit", month: "short" } : { day: "2-digit", month: "2-digit" });

  return (
    <section className="glass overflow-hidden rounded-2xl border-orange-500/15 bg-gradient-to-br from-orange-500/[0.025] via-transparent to-emerald-500/[0.02]">
      <div className="border-b border-white/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-zinc-200">
              <Activity className="h-4 w-4 text-orange-400" /> Performance histórica completa
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              {dados.length} {dados.length === 1 ? "dia analisado" : "dias analisados"} · {resumo.diasAtivos} com movimento
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px]">
            {resumo.melhorDia && resumo.melhorDia.comissaoTotal > 0 && (
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 font-bold text-emerald-300">
                Melhor dia {formatarDia(resumo.melhorDia.data)} · {formatBRL(resumo.melhorDia.comissaoTotal)}
              </span>
            )}
            <span className={cn(
              "rounded-full border px-3 py-1 font-bold",
              resumo.lucro >= 0 ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-rose-500/20 bg-rose-500/10 text-rose-300"
            )}>
              Resultado {resumo.lucro >= 0 ? "+" : ""}{formatBRL(resumo.lucro)}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
          <MetricaHistorico label="Pedidos" valor={formatNumber(resumo.pedidos)} detalhe={`${resumo.itens} item(ns) vendido(s)`} icon={ShoppingBag} cor="orange" />
          <MetricaHistorico label="Faturamento" valor={formatBRL(resumo.faturamento)} detalhe={`Ticket ${formatBRL(resumo.ticketMedio)}`} icon={DollarSign} cor="violet" />
          <MetricaHistorico label="Comissão" valor={formatBRL(resumo.comissao)} detalhe={`${formatBRL(resumo.confirmada)} confirmada · ${formatBRL(resumo.pendente)} pendente`} icon={Wallet} cor="emerald" />
          <MetricaHistorico label="Cliques Shopee" valor={resumo.temCliques ? formatNumber(resumo.cliques) : "—"} detalhe={resumo.temCliques ? `${resumo.cliquesRedes} social · ${resumo.cliquesVideo} vídeo` : "Aguardando importação"} icon={MousePointerClick} cor="cyan" />
          <MetricaHistorico label="Conversão" valor={resumo.conversao === null ? "—" : `${resumo.conversao.toFixed(2)}%`} detalhe="Pedidos ÷ cliques Shopee" icon={Target} cor="cyan" />
          <MetricaHistorico label="Comissão/clique" valor={resumo.comissaoClique === null ? "—" : formatBRL(resumo.comissaoClique)} detalhe="Eficiência do tráfego" icon={TrendingUp} cor="emerald" />
          <MetricaHistorico label="Vídeo + Live" valor={`${resumo.video} + ${resumo.live}`} detalhe="Pedidos por conteúdo Shopee" icon={Video} cor="violet" />
          <MetricaHistorico label="Novos compradores" valor={formatNumber(resumo.novos)} detalhe={`${resumo.cancelados} pedido(s) cancelado(s)`} icon={Heart} cor={resumo.cancelados > 0 ? "rose" : "zinc"} />
        </div>
      </div>

      <div className="p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Detalhamento por dia</div>
            <div className="text-[9px] text-zinc-600">Passe o filtro de período acima para ampliar ou reduzir o histórico.</div>
          </div>
          {dados.some((dia) => !temMovimento(dia)) && (
            <button type="button" onClick={() => setMostrarZerados((valor) => !valor)} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400 hover:bg-white/[0.06]">
              {mostrarZerados ? "Ocultar dias zerados" : `Mostrar dias zerados (${dados.length - dados.filter(temMovimento).length})`}
            </button>
          )}
        </div>

        {diasVisiveis.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-xs text-zinc-500">
            Nenhum movimento no período. Use “Personalizar” para consultar um dia já fechado pela Shopee.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
            <table className="w-full min-w-[1050px] text-left text-[10px]">
              <thead className="bg-white/[0.035] text-[9px] font-black uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-3 py-3">Data</th>
                  <th className="px-3 py-3">Cliques Shopee</th>
                  <th className="px-3 py-3">Pedidos / Itens</th>
                  <th className="px-3 py-3">Vídeo / Live</th>
                  <th className="px-3 py-3 text-right">Faturamento</th>
                  <th className="px-3 py-3 text-right">Comissão</th>
                  <th className="px-3 py-3 text-right">Conversão</th>
                  <th className="px-3 py-3 text-right">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {diasVisiveis.map((dia) => {
                  const conversao = dia.temDadosCliquesShopee && dia.cliquesShopeeTotal > 0
                    ? (dia.pedidosTotal / dia.cliquesShopeeTotal) * 100
                    : null;
                  return (
                    <tr key={dia.data} className="bg-black/10 transition hover:bg-white/[0.025]">
                      <td className="whitespace-nowrap px-3 py-3">
                        <div className="font-bold capitalize text-zinc-200">{formatarDia(dia.data, true)}</div>
                        <div className="text-[9px] text-zinc-600">{dia.novosCompradores} novo(s) · {dia.pedidosCancelados} cancelado(s)</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-black tabular-nums text-cyan-300">{dia.temDadosCliquesShopee ? formatNumber(dia.cliquesShopeeTotal) : "—"}</div>
                        <div className="text-[9px] text-zinc-600">{dia.temDadosCliquesShopee ? `${dia.cliquesRedesSociais} social · ${dia.cliquesShopeeVideo} vídeo` : "sem relatório"}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-black tabular-nums text-zinc-200">{dia.pedidosTotal} / {dia.itensVendidos}</div>
                        <div className="text-[9px] text-zinc-600">pedidos / itens</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-black tabular-nums text-violet-300">{dia.vendasVideo} / <span className="text-rose-300">{dia.vendasLive}</span></div>
                        <div className="text-[9px] text-zinc-600">{formatBRL(dia.comissaoVideo)} / {formatBRL(dia.comissaoLive)}</div>
                      </td>
                      <td className="px-3 py-3 text-right font-black tabular-nums text-zinc-200">{formatBRL(dia.faturamentoTotal)}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="font-black tabular-nums text-emerald-300">{formatBRL(dia.comissaoTotal)}</div>
                        <div className="text-[9px] text-zinc-600">{formatBRL(dia.comissaoConfirmada)} conf. · {formatBRL(dia.comissaoPendente)} pend.</div>
                      </td>
                      <td className="px-3 py-3 text-right font-black tabular-nums text-cyan-300">{conversao === null ? "—" : `${conversao.toFixed(2)}%`}</td>
                      <td className={cn("px-3 py-3 text-right font-black tabular-nums", dia.lucroLiquido >= 0 ? "text-emerald-300" : "text-rose-300")}>
                        {dia.lucroLiquido >= 0 ? "+" : ""}{formatBRL(dia.lucroLiquido)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

/* ============== ABA: HISTÓRICO + FORECAST ============== */
function AbaHistorico({
  stats,
  forecast,
  serieLucro,
  serieCompleta,
  infoMoeda
}: {
  stats: StatsShopee | null;
  forecast: { mediaDia: number; proximos30: number; proximos90: number } | null;
  serieLucro?: PontoLucro[];
  serieCompleta?: PontoDiarioCompleto[];
  infoMoeda?: InfoMoeda;
}) {
  // Cálculos ROAS / ROI a partir da série completa (respeita filtros de data)
  const roiData = useMemo(() => {
    if (!serieCompleta || serieCompleta.length === 0) return null;
    const totalComissao = serieCompleta.reduce((s, d) => s + d.comissaoTotal, 0);
    const totalSpend = serieCompleta.reduce((s, d) => s + d.spendMeta, 0);
    const totalSpendImp = serieCompleta.reduce((s, d) => s + d.spendMetaComImposto, 0);
    const totalComOrg = serieCompleta.reduce((s, d) => s + d.comissaoOrganica, 0);
    const totalComCamp = serieCompleta.reduce((s, d) => s + d.comissaoCampanha, 0);
    const lucro = totalComissao - totalSpendImp;
    const roas = totalSpend > 0 ? totalComissao / totalSpend : 0;
    const roasComImposto = totalSpendImp > 0 ? totalComissao / totalSpendImp : 0;
    const roiPct = totalSpendImp > 0 ? ((totalComissao - totalSpendImp) / totalSpendImp) * 100 : 0;
    // Status do ROAS
    const status: "excelente" | "bom" | "empate" | "negativo" =
      roas >= 2 ? "excelente" : roas >= 1.5 ? "bom" : roas >= 1 ? "empate" : "negativo";
    return { totalComissao, totalSpend, totalSpendImp, totalComOrg, totalComCamp, lucro, roas, roasComImposto, roiPct, status };
  }, [serieCompleta]);

  return (
    <div className="space-y-4">
      {serieCompleta && serieCompleta.length > 0 && <PainelMetricasHistorico dados={serieCompleta} />}

      {/* CARD ROAS / ROI — cálculo dinâmico respeitando filtro de datas */}
      {roiData && roiData.totalSpend > 0 && (
        <div className="glass relative overflow-hidden rounded-2xl">
          {/* Glow de fundo baseado no status */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              background: roiData.status === "excelente" ? "radial-gradient(ellipse at 30% 50%, #34d399 0%, transparent 70%)"
                : roiData.status === "bom" ? "radial-gradient(ellipse at 30% 50%, #60a5fa 0%, transparent 70%)"
                : roiData.status === "empate" ? "radial-gradient(ellipse at 30% 50%, #fbbf24 0%, transparent 70%)"
                : "radial-gradient(ellipse at 30% 50%, #f43f5e 0%, transparent 70%)"
            }}
          />

          <div className="relative border-b border-white/5 px-6 pb-4 pt-5">
            <div className="flex flex-wrap items-end justify-between gap-6">
              {/* ROAS principal */}
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                  <Target className="h-3 w-3" />
                  ROAS / ROI · {serieCompleta!.length} {serieCompleta!.length === 1 ? "dia" : "dias"}
                </div>
                <div className="mt-2 flex items-end gap-4">
                  {/* ROAS */}
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">ROAS</div>
                    <div
                      className={cn(
                        "flex items-center gap-2 font-black tabular-nums",
                        roiData.roas >= 1.5 ? "text-emerald-400" : roiData.roas >= 1 ? "text-amber-400" : "text-rose-400"
                      )}
                      style={{ fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1, letterSpacing: "-0.03em" }}
                    >
                      {roiData.roas.toFixed(2)}x
                    </div>
                    <div className="mt-0.5 text-[9px] text-zinc-600">
                      {infoMoeda && infoMoeda.impostoMeta === 0
                      ? `ROAS bruto: ${roiData.roasComImposto.toFixed(2)}x`
                      : `s/ imposto · c/ imposto: ${roiData.roasComImposto.toFixed(2)}x`}
                    </div>
                  </div>

                  {/* Separador vertical */}
                  <div className="hidden h-14 w-px bg-white/10 sm:block" />

                  {/* ROI % */}
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">ROI</div>
                    <div
                      className={cn(
                        "flex items-center gap-1.5 font-black tabular-nums",
                        roiData.roiPct >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}
                      style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", lineHeight: 1, letterSpacing: "-0.02em" }}
                    >
                      {roiData.roiPct >= 0 ? "+" : ""}{roiData.roiPct.toFixed(1)}%
                      {roiData.roiPct >= 0
                        ? <TrendingUp className="h-5 w-5" />
                        : <TrendingDown className="h-5 w-5" />
                      }
                    </div>
                    <div className="mt-0.5 text-[9px] text-zinc-600">
                      retorno sobre investimento
                    </div>
                  </div>
                </div>
              </div>

              {/* Mini-cards de breakdown */}
              <div className="flex flex-wrap gap-3">
                {/* Receita total */}
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-400 opacity-90">
                    <DollarSign className="h-2.5 w-2.5" /> Receita
                  </div>
                  <div className="mt-0.5 text-base font-black tabular-nums text-emerald-400" style={{ letterSpacing: "-0.02em" }}>
                    {formatBRL(roiData.totalComissao)}
                  </div>
                  <div className="text-[9px] text-zinc-500">
                    {roiData.totalComOrg > 0 && `org: ${formatBRL(roiData.totalComOrg)}`}
                    {roiData.totalComOrg > 0 && roiData.totalComCamp > 0 && " · "}
                    {roiData.totalComCamp > 0 && `pago: ${formatBRL(roiData.totalComCamp)}`}
                  </div>
                </div>

                {/* Investimento total */}
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/[0.04] px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-1 text-[9px] font-bold uppercase tracking-wider text-rose-400 opacity-90">
                    <Wallet className="h-2.5 w-2.5" /> Investido
                  </div>
                  <div className="mt-0.5 text-base font-black tabular-nums text-rose-400" style={{ letterSpacing: "-0.02em" }}>
                    −{formatBRL(roiData.totalSpendImp)}
                  </div>
                  <div className="text-[9px] text-zinc-500">
                    gasto: {formatBRL(roiData.totalSpend)} + {((infoMoeda?.impostoMeta ?? 0.13) * 100).toFixed(0)}% imp.
                  </div>
                </div>

                {/* Lucro líquido */}
                <div className={cn(
                  "rounded-lg border px-3 py-2 text-right",
                  roiData.lucro >= 0
                    ? "border-emerald-500/20 bg-emerald-500/[0.04]"
                    : "border-rose-500/20 bg-rose-500/[0.04]"
                )}>
                  <div className={cn(
                    "flex items-center justify-end gap-1 text-[9px] font-bold uppercase tracking-wider opacity-90",
                    roiData.lucro >= 0 ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {roiData.lucro >= 0
                      ? <TrendingUp className="h-2.5 w-2.5" />
                      : <TrendingDown className="h-2.5 w-2.5" />
                    }
                    Lucro
                  </div>
                  <div className={cn(
                    "mt-0.5 text-base font-black tabular-nums",
                    roiData.lucro >= 0 ? "text-emerald-400" : "text-rose-400"
                  )} style={{ letterSpacing: "-0.02em" }}>
                    {roiData.lucro >= 0 ? "+" : ""}{formatBRL(roiData.lucro)}
                  </div>
                  <div className="text-[9px] text-zinc-500">
                    receita − gasto c/ imposto
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de status / recomendação */}
          <div className={cn(
            "px-6 py-3 text-xs font-medium",
            roiData.status === "excelente" && "bg-emerald-500/[0.06] text-emerald-300",
            roiData.status === "bom" && "bg-blue-500/[0.06] text-blue-300",
            roiData.status === "empate" && "bg-amber-500/[0.06] text-amber-300",
            roiData.status === "negativo" && "bg-rose-500/[0.06] text-rose-300"
          )}>
            <div className="flex items-center gap-2">
              {roiData.status === "excelente" && <><Rocket className="h-3.5 w-3.5" /> <span><strong>Conta lucrativa!</strong> ROAS {roiData.roas.toFixed(2)}x — ideal pra escalar gradual (+50%/dia).</span></>}
              {roiData.status === "bom" && <><CheckCircle2 className="h-3.5 w-3.5" /> <span><strong>Acima do break-even.</strong> Mantém e otimiza criativos pra subir ROAS.</span></>}
              {roiData.status === "empate" && <><AlertTriangle className="h-3.5 w-3.5" /> <span><strong>Empate técnico.</strong> Revise criativos, landing page e público pra melhorar conversão.</span></>}
              {roiData.status === "negativo" && <><AlertCircle className="h-3.5 w-3.5" /> <span><strong>ROI negativo.</strong> Pause anúncios sem venda, teste novos criativos e revise a oferta.</span></>}
            </div>
          </div>
        </div>
      )}

      {/* GRÁFICO ORGÂNICO vs PAGO — separação visual com barras lado a lado + linha de spend */}
      {serieCompleta && serieCompleta.length > 0 && <GraficoOrganicoVsPago dados={serieCompleta} altura={300} impostoMetaPct={infoMoeda?.impostoMeta} />}

      {/* GRÁFICO EDITORIAL DE LUCRO LÍQUIDO ACUMULADO */}
      {serieLucro && serieLucro.length > 0 && <GraficoLucro dados={serieLucro} altura={340} impostoMetaPct={infoMoeda?.impostoMeta} />}

      {forecast && (
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
            <Target className="h-4 w-4 text-shopee" /> Forecast de comissão (mantendo o ritmo)
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <ProjecaoCard label="Média/dia" valor={forecast.mediaDia} />
            <ProjecaoCard label="Próximos 30 dias" valor={forecast.proximos30} destaque />
            <ProjecaoCard label="Próximos 90 dias" valor={forecast.proximos90} />
          </div>
          <p className="mt-3 text-[11px] text-zinc-500">
            * Projeção baseada na média dos últimos 7 dias. Aumente postagens diárias pra escalar.
          </p>
        </div>
      )}

      {(!serieLucro || serieLucro.length === 0) && (!serieCompleta || serieCompleta.length === 0) && (!stats || stats.porDia.length === 0) && (
        <div className="glass rounded-2xl p-12 text-center text-xs text-zinc-500">Sem histórico ainda.</div>
      )}
    </div>
  );
}

/* ============== AUXILIARES ============== */
function MiniStat({
  label,
  value,
  icon: Icon,
  sub,
  subTone,
  onClick
}: {
  label: string;
  value: string;
  icon: typeof Eye;
  sub?: string;
  subTone?: "rose" | "amber" | "emerald";
  onClick?: () => void;
}) {
  const subColor =
    subTone === "rose" ? "text-rose-400" :
    subTone === "amber" ? "text-amber-400" :
    subTone === "emerald" ? "text-emerald-400" :
    "text-zinc-500";
  const Element = onClick ? "button" : "div";
  return (
    <Element
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-white/5 bg-zinc-900/40 p-3 text-left",
        onClick && "cursor-pointer hover:border-shopee/40 hover:bg-zinc-900/70 transition-colors"
      )}
    >
      <Icon className="h-4 w-4 text-zinc-500 shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 truncate">{label}</div>
        <div className="text-sm font-bold text-zinc-100 truncate">{value}</div>
        {sub && (
          <div className={cn("text-[9px] font-bold tabular-nums truncate", subColor)}>{sub}</div>
        )}
      </div>
    </Element>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="text-xs font-bold text-zinc-200">{value}</div>
    </div>
  );
}

function Linha({ label, valor, positivo, negativo, destaque }: { label: string; valor: string; positivo?: boolean; negativo?: boolean; destaque?: "verde" | "vermelho" }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-zinc-400">{label}</span>
      <span
        className={cn(
          "font-mono font-bold tabular-nums",
          destaque === "verde" && "text-emerald-400 text-sm",
          destaque === "vermelho" && "text-rose-400 text-sm",
          positivo && !destaque && "text-emerald-400",
          negativo && !destaque && "text-rose-400",
          !positivo && !negativo && !destaque && "text-zinc-200"
        )}
      >
        {valor}
      </span>
    </div>
  );
}

function ProjecaoCard({ label, valor, destaque = false }: { label: string; valor: number; destaque?: boolean }) {
  return (
    <div className={cn("rounded-xl border p-4", destaque ? "border-shopee/40 bg-shopee/10" : "border-white/5 bg-black/20")}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={cn("mt-1 text-2xl font-black tabular-nums", destaque ? "text-shopee" : "text-zinc-200")}>
        {formatBRL(valor)}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_STYLE[status] || STATUS_STYLE._default;
  return (
    <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold uppercase", cfg.bg, cfg.text)}>
      {cfg.label}
    </span>
  );
}

const STATUS_STYLE: Record<string, { label: string; bg: string; text: string }> = {
  ACTIVE: { label: "Ativo", bg: "bg-emerald-500/20", text: "text-emerald-300" },
  IN_REVIEW: { label: "Em revisão", bg: "bg-blue-500/20", text: "text-blue-300" },
  DISAPPROVED: { label: "Reprovado", bg: "bg-rose-500/20", text: "text-rose-300" },
  PREAPPROVED: { label: "Pré-aprovado", bg: "bg-blue-500/20", text: "text-blue-300" },
  PENDING_REVIEW: { label: "Revisão pendente", bg: "bg-amber-500/20", text: "text-amber-300" },
  WITH_ISSUES: { label: "Com problemas", bg: "bg-amber-500/20", text: "text-amber-300" },
  PENDING_BILLING_INFO: { label: "Pagamento pendente", bg: "bg-amber-500/20", text: "text-amber-300" },
  PAUSED: { label: "Pausado", bg: "bg-amber-500/20", text: "text-amber-300" },
  CAMPAIGN_PAUSED: { label: "Campanha pausada", bg: "bg-amber-500/20", text: "text-amber-300" },
  ADSET_PAUSED: { label: "Conjunto pausado", bg: "bg-amber-500/20", text: "text-amber-300" },
  DELETED: { label: "Excluído", bg: "bg-rose-500/20", text: "text-rose-300" },
  ARCHIVED: { label: "Arquivado", bg: "bg-zinc-700/50", text: "text-zinc-400" },
  _default: { label: "Desconhecido", bg: "bg-zinc-700", text: "text-zinc-400" }
};

function AdRow({ ad, infoMoeda }: { ad: RoasPorAnuncio; infoMoeda?: InfoMoeda }) {
  const cfg = CONFIG_REC[ad.recomendacao];
  const Icon = cfg.icon;
  return (
    <div className={cn("rounded-xl border p-4 transition-all", cfg.border, cfg.bg)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusBadge status={ad.status} />
            <span className="text-sm font-bold text-zinc-100">{ad.adName}</span>
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-mono font-bold text-shopee">
              {ad.subIdInferido || "sem ID"}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-500">
            <span className="inline-flex items-center gap-1">
              <span className="text-zinc-600">📢</span> {ad.campaignName}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="text-zinc-600">📦</span> {ad.adsetName}
            </span>
          </div>
          {ad.linkDestino && (
            <a
              href={ad.linkDestino}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-[10px] text-zinc-500 hover:text-shopee"
            >
              <ExternalLink className="h-3 w-3" />
              {ad.linkDestino.replace("https://", "")}
            </a>
          )}
        </div>
        <div className={cn("flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-black", cfg.text, cfg.bg, cfg.border, "border")}>
          <Icon className="h-3.5 w-3.5" />
          {ad.recomendacao}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <Metric label="Gasto" value={formatBRL(ad.spendComImposto)} sub={
          infoMoeda && infoMoeda.moeda !== "BRL"
            ? `${infoMoeda.moeda} ${ad.spend.toFixed(2)} × R$ ${infoMoeda.cotacao.toFixed(2)}`
            : `R$ ${ad.spend.toFixed(2)} + ${(infoMoeda?.impostoMeta ?? 0.13) * 100}% imposto`
        } />
        <Metric label="Cliques link" value={formatNumber(ad.linkClicks)} sub={`CPC R$ ${ad.cpc.toFixed(2)}`} />
        <Metric label="CTR" value={`${ad.ctr.toFixed(2)}%`} />
        <Metric label="Vendas" value={String(ad.vendas)} sub={ad.vendas > 0 ? `${ad.vendasDiretas} dir · ${ad.vendasMesmaLoja} loja · ${ad.vendasCrossShop} cross` : ""} />
        <Metric label="Comissão" value={formatBRL(ad.comissao)} accent="emerald" sub={ad.comissao > 0 ? `Dir ${formatBRL(ad.comissaoDireta)} · Ind ${formatBRL(ad.comissaoIndireta)}` : ""} />
        <Metric label="CPA" value={ad.vendas > 0 ? formatBRL(ad.cpa) : "—"} accent={ad.cpa > 0 && ad.cpa < 15 ? "emerald" : "amber"} />
        <Metric label="ROAS" value={`${ad.roas.toFixed(2)}x`} accent={ad.roas >= 1.5 ? "emerald" : ad.roas >= 1 ? "amber" : "rose"} />
        <Metric label="Lucro" value={formatBRL(ad.lucro)} accent={ad.lucro > 0 ? "emerald" : ad.lucro < -2 ? "rose" : "amber"} />
      </div>

      {/* Detalhamento granular de vendas */}
      {ad.vendas > 0 && (
        <div className="mt-3 rounded-lg border border-white/5 bg-black/20 p-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Detalhamento de vendas</div>
          <div className="grid gap-2 sm:grid-cols-3">
            {/* Vendas Diretas */}
            <div className="rounded-md border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                <Target className="h-3 w-3" /> DIRETA (boost seller)
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-lg font-black tabular-nums text-emerald-300">{ad.vendasDiretas}</span>
                <span className="text-[10px] text-zinc-500">vendas</span>
              </div>
              <div className="mt-0.5 text-[10px] text-zinc-400">
                Comissão: <span className="font-bold text-emerald-400">{formatBRL(ad.comissaoDireta)}</span>
              </div>
              <div className="text-[9px] text-zinc-600">Mesmo produto do link · seller pagou boost</div>
            </div>

            {/* Mesma loja (cookie) */}
            <div className="rounded-md border border-amber-500/20 bg-amber-500/[0.04] px-3 py-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400">
                <ShoppingBag className="h-3 w-3" /> MESMA LOJA (cookie)
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-lg font-black tabular-nums text-amber-300">{ad.vendasMesmaLoja}</span>
                <span className="text-[10px] text-zinc-500">vendas</span>
              </div>
              <div className="mt-0.5 text-[10px] text-zinc-400">
                Comissão: <span className="font-bold text-amber-400">{formatBRL(ad.comissaoIndireta - (ad.vendasCrossShop > 0 ? ad.comissaoIndireta * (ad.vendasCrossShop / (ad.vendasMesmaLoja + ad.vendasCrossShop || 1)) : 0))}</span>
              </div>
              <div className="text-[9px] text-zinc-600">Produto diferente · mesma loja · sem boost</div>
            </div>

            {/* Cross-Shop */}
            <div className="rounded-md border border-rose-500/20 bg-rose-500/[0.04] px-3 py-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-400">
                <ExternalLink className="h-3 w-3" /> CROSS-SHOP
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-lg font-black tabular-nums text-rose-300">{ad.vendasCrossShop}</span>
                <span className="text-[10px] text-zinc-500">vendas</span>
              </div>
              <div className="mt-0.5 text-[10px] text-zinc-400">
                Comissão: <span className="font-bold text-rose-400">{formatBRL(ad.vendasCrossShop > 0 && ad.vendasMesmaLoja + ad.vendasCrossShop > 0 ? ad.comissaoIndireta * (ad.vendasCrossShop / (ad.vendasMesmaLoja + ad.vendasCrossShop)) : 0)}</span>
              </div>
              <div className="text-[9px] text-zinc-600">Loja diferente · attributionType</div>
            </div>
          </div>

          {/* Barra de proporção visual */}
          {ad.vendas > 0 && (
            <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-zinc-800">
              {ad.vendasDiretas > 0 && (
                <div className="bg-emerald-500 transition-all" style={{ width: `${(ad.vendasDiretas / ad.vendas) * 100}%` }} />
              )}
              {ad.vendasMesmaLoja > 0 && (
                <div className="bg-amber-500 transition-all" style={{ width: `${(ad.vendasMesmaLoja / ad.vendas) * 100}%` }} />
              )}
              {ad.vendasCrossShop > 0 && (
                <div className="bg-rose-500 transition-all" style={{ width: `${(ad.vendasCrossShop / ad.vendas) * 100}%` }} />
              )}
            </div>
          )}
        </div>
      )}

      <div className={cn("mt-3 rounded-lg px-3 py-2 text-[11px]", cfg.bg, cfg.text)}>
        <strong>Motivo:</strong> {ad.motivo}
      </div>
    </div>
  );
}

function formatarRange(inicio: string, fim: string): string {
  if (!inicio || !fim) return "";
  if (inicio === fim) {
    const d = new Date(inicio + "T00:00:00");
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }
  const di = new Date(inicio + "T00:00:00");
  const df = new Date(fim + "T00:00:00");
  return `${di.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} → ${df.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`;
}

function CalendarioPopover({
  dataInicio,
  dataFim,
  onAplicar,
  onLimpar,
  onFechar
}: {
  dataInicio: string;
  dataFim: string;
  onAplicar: (inicio: string, fim: string) => void;
  onLimpar: () => void;
  onFechar: () => void;
}) {
  const fmtBR = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  const hoje = fmtBR.format(new Date());
  const ontem = fmtBR.format(new Date(Date.now() - 24 * 3600 * 1000));
  const [iniLocal, setIniLocal] = useState(dataInicio || hoje);
  const [fimLocal, setFimLocal] = useState(dataFim || hoje);
  const [modo, setModo] = useState<"unico" | "range">(dataInicio === dataFim || !dataFim ? "unico" : "range");

  function aplicar() {
    if (modo === "unico") {
      onAplicar(iniLocal, iniLocal);
    } else {
      const ini = iniLocal <= fimLocal ? iniLocal : fimLocal;
      const fim = iniLocal <= fimLocal ? fimLocal : iniLocal;
      onAplicar(ini, fim);
    }
  }

  // Atalhos de período
  function aplicarAtalho(diasAtras: number) {
    const fim = hoje;
    const ini = fmtBR.format(new Date(Date.now() - diasAtras * 24 * 3600 * 1000));
    onAplicar(ini, fim);
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onFechar} />
      <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-xl border border-white/10 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Período personalizado</h3>
          <button onClick={onFechar} className="text-zinc-500 hover:text-zinc-100">✕</button>
        </div>

        {/* Toggle modo */}
        <div className="mb-3 flex gap-1 rounded-lg border border-white/10 bg-black/30 p-1">
          <button
            onClick={() => setModo("unico")}
            className={cn(
              "flex-1 rounded-md px-2 py-1 text-[11px] font-bold transition-all",
              modo === "unico" ? "bg-shopee text-white" : "text-zinc-500 hover:text-zinc-200"
            )}
          >
            📅 Dia específico
          </button>
          <button
            onClick={() => setModo("range")}
            className={cn(
              "flex-1 rounded-md px-2 py-1 text-[11px] font-bold transition-all",
              modo === "range" ? "bg-shopee text-white" : "text-zinc-500 hover:text-zinc-200"
            )}
          >
            🗓️ Período
          </button>
        </div>

        {/* Inputs */}
        {modo === "unico" ? (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Data</label>
            <input
              type="date"
              value={iniLocal}
              onChange={(e) => setIniLocal(e.target.value)}
              onInput={(e) => setIniLocal(e.currentTarget.value)}
              max={hoje}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-shopee/50"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">De</label>
              <input
                type="date"
                value={iniLocal}
                onChange={(e) => setIniLocal(e.target.value)}
                onInput={(e) => setIniLocal(e.currentTarget.value)}
                max={fimLocal || hoje}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-xs outline-none focus:border-shopee/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Até</label>
              <input
                type="date"
                value={fimLocal}
                onChange={(e) => setFimLocal(e.target.value)}
                onInput={(e) => setFimLocal(e.currentTarget.value)}
                min={iniLocal}
                max={hoje}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-xs outline-none focus:border-shopee/50"
              />
            </div>
          </div>
        )}

        {/* Atalhos rápidos */}
        <div className="mt-3 space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Atalhos</div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onAplicar(ontem, ontem)}
              className="rounded-md border border-white/5 bg-zinc-900/60 px-2 py-1.5 text-[10px] font-medium text-zinc-300 hover:border-shopee/30"
            >
              Só ontem
            </button>
            <button
              onClick={() => aplicarAtalho(2)}
              className="rounded-md border border-white/5 bg-zinc-900/60 px-2 py-1.5 text-[10px] font-medium text-zinc-300 hover:border-shopee/30"
            >
              Últimos 3d
            </button>
            <button
              onClick={() => {
                const d = new Date();
                const inicioSemana = new Date(d.setDate(d.getDate() - d.getDay() + 1)).toISOString().slice(0, 10);
                onAplicar(inicioSemana, hoje);
              }}
              className="rounded-md border border-white/5 bg-zinc-900/60 px-2 py-1.5 text-[10px] font-medium text-zinc-300 hover:border-shopee/30"
            >
              Esta semana
            </button>
            <button
              onClick={() => {
                const d = new Date();
                const inicioMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
                onAplicar(inicioMes, hoje);
              }}
              className="rounded-md border border-white/5 bg-zinc-900/60 px-2 py-1.5 text-[10px] font-medium text-zinc-300 hover:border-shopee/30"
            >
              Este mês
            </button>
            <button
              onClick={() => {
                const d = new Date();
                const mesPassado = new Date(d.getFullYear(), d.getMonth() - 1, 1);
                const ini = `${mesPassado.getFullYear()}-${String(mesPassado.getMonth() + 1).padStart(2, "0")}-01`;
                const ult = new Date(d.getFullYear(), d.getMonth(), 0);
                const fim = `${ult.getFullYear()}-${String(ult.getMonth() + 1).padStart(2, "0")}-${String(ult.getDate()).padStart(2, "0")}`;
                onAplicar(ini, fim);
              }}
              className="rounded-md border border-white/5 bg-zinc-900/60 px-2 py-1.5 text-[10px] font-medium text-zinc-300 hover:border-shopee/30"
            >
              Mês passado
            </button>
            <button
              onClick={() => aplicarAtalho(60)}
              className="rounded-md border border-white/5 bg-zinc-900/60 px-2 py-1.5 text-[10px] font-medium text-zinc-300 hover:border-shopee/30"
            >
              Últimos 60d
            </button>
          </div>
        </div>

        {/* Ações */}
        <div className="mt-4 flex gap-2">
          {(dataInicio || dataFim) && (
            <button
              onClick={onLimpar}
              className="flex-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20"
            >
              Limpar
            </button>
          )}
          <button
            onClick={aplicar}
            className="flex-1 rounded-lg bg-shopee px-3 py-2 text-xs font-bold text-white hover:bg-shopee/80"
          >
            Aplicar
          </button>
        </div>
      </div>
    </>
  );
}

function CardJanelaConfianca({
  confianca,
  projecao,
  consolidado
}: {
  confianca: NonNullable<RelatorioRoas["confianca"]>;
  projecao: NonNullable<RelatorioRoas["projecao"]>;
  consolidado: RelatorioRoas["consolidado"];
}) {
  const corMap = {
    MUITO_BAIXA: "border-rose-500/40 bg-rose-500/10 text-rose-200",
    BAIXA: "border-amber-500/40 bg-amber-500/10 text-amber-200",
    MEDIA: "border-amber-500/30 bg-amber-500/5 text-amber-200",
    ALTA: "border-emerald-500/30 bg-emerald-500/5 text-emerald-200",
    TOTAL: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
  };
  const barCor = {
    MUITO_BAIXA: "from-rose-500 to-rose-400",
    BAIXA: "from-amber-500 to-amber-400",
    MEDIA: "from-amber-500 to-amber-400",
    ALTA: "from-emerald-500 to-emerald-400",
    TOTAL: "from-emerald-500 to-emerald-400"
  };

  return (
    <section className={cn("mb-4 rounded-2xl border p-4", corMap[confianca.rotuloConfianca])}>
      <div className="flex items-start gap-3">
        <div className="text-2xl">{confianca.emoji}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider">
              Janela de atribuição Shopee
            </h3>
            <span className="rounded-md bg-black/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
              {confianca.confiabilidadePct}% consolidado
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed">{confianca.textoExplicativo}</p>

          {/* Barra de progresso */}
          <div className="mt-3 overflow-hidden rounded-full bg-black/40">
            <div
              className={cn("h-2 bg-gradient-to-r transition-all", barCor[confianca.rotuloConfianca])}
              style={{ width: `${confianca.confiabilidadePct}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] opacity-70">
            <span>0%</span>
            <span>50%</span>
            <span>95% ideal</span>
          </div>

          {/* Projeção final */}
          {consolidado.vendas > 0 && projecao.multiplicador > 1.05 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <ProjecaoMetric
                label="Vendas projetadas"
                atual={String(consolidado.vendas)}
                final={String(projecao.vendasFinais)}
                hint={`+${projecao.vendasFinais - consolidado.vendas} ainda virão`}
              />
              <ProjecaoMetric
                label="Comissão projetada"
                atual={formatBRL(consolidado.comissao)}
                final={formatBRL(projecao.comissaoFinal)}
                hint={`+${formatBRL(projecao.comissaoFinal - consolidado.comissao)} esperados`}
              />
              <ProjecaoMetric
                label="ROAS projetado"
                atual={`${consolidado.roas.toFixed(2)}x`}
                final={`${projecao.roasProjetadoFinal.toFixed(2)}x`}
                hint={`Final estimado em ${confianca.diasParaConsolidar}d`}
              />
            </div>
          )}

          <p className="mt-3 text-[10px] opacity-70">
            Por que isso? Cookie Shopee tem 7 dias. Vendas atribuídas a cliques desse período aparecem em fases:
            ~18% no D+1, ~38% no D+2, ~70% no D+4, ~94% no D+7, 100% no D+30.
            <strong> Não tome decisão de pausar/escalar antes de 5-7 dias do gasto.</strong>
          </p>
        </div>
      </div>
    </section>
  );
}

function ProjecaoMetric({ label, atual, final, hint }: { label: string; atual: string; final: string; hint: string }) {
  return (
    <div className="rounded-lg bg-black/30 p-3">
      <div className="text-[9px] font-bold uppercase tracking-wider opacity-70">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-sm font-bold tabular-nums opacity-80">{atual}</span>
        <span className="text-[10px] opacity-50">→</span>
        <span className="text-base font-black tabular-nums">{final}</span>
      </div>
      <div className="text-[10px] opacity-70">{hint}</div>
    </div>
  );
}

function CardSaudeConta({ saude }: { saude: NonNullable<Insights["saude"]> }) {
  const saldoBaixo = saude.saldo > 0 && saude.saldo < 30;
  const saldoZero = saude.saldo === 0;
  const tokenOk = saude.token.vitalicio || (saude.token.expiraEmHoras !== null && saude.token.expiraEmHoras > 24);
  const saudeGeral = saldoZero ? "ruim" : saldoBaixo || !tokenOk || saude.anunciosRejeitados > 0 ? "alerta" : "ok";

  const corMap = {
    ok: "border-emerald-500/30 bg-emerald-500/5",
    alerta: "border-amber-500/30 bg-amber-500/5",
    ruim: "border-rose-500/30 bg-rose-500/5"
  };

  return (
    <div className={cn("glass rounded-2xl p-5", corMap[saudeGeral])}>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-300">
        <Shield className="h-4 w-4 text-emerald-400" /> Saúde da conta Meta
      </h3>
      <div className="space-y-2.5">
        <SaudeLinha
          icone={Wallet}
          label="Saldo"
          valor={`${saude.saldoMoeda} ${saude.saldo.toFixed(2)}`}
          sub={saldoZero ? "ZERADO — campanhas vão pausar" : saldoBaixo ? "Recarregue logo" : "OK"}
          status={saldoZero ? "ruim" : saldoBaixo ? "alerta" : "ok"}
        />
        <SaudeLinha
          icone={Heart}
          label="Token"
          valor={saude.token.vitalicio ? "Vitalício 🟢" : saude.token.expiraEmHoras !== null ? `Expira em ${saude.token.expiraEmHoras}h` : "Desconhecido"}
          status={saude.token.vitalicio ? "ok" : (saude.token.expiraEmHoras ?? 0) > 24 ? "ok" : "alerta"}
        />
        <SaudeLinha
          icone={Megaphone}
          label="Anúncios"
          valor={`${saude.anunciosAtivos} ativos`}
          sub={saude.anunciosEmRevisao > 0 ? `${saude.anunciosEmRevisao} em revisão` : ""}
          status="ok"
        />
        {saude.anunciosRejeitados > 0 && (
          <SaudeLinha
            icone={AlertTriangle}
            label="REJEITADOS"
            valor={`${saude.anunciosRejeitados} anúncio(s)`}
            sub="Precisa de ação manual"
            status="ruim"
          />
        )}
      </div>
      {saude.alertas.length > 0 && (
        <div className="mt-3 space-y-1">
          {saude.alertas.map((a, i) => (
            <div key={i} className="flex items-start gap-1.5 rounded-md bg-rose-500/10 px-2 py-1 text-[10px] text-rose-300">
              <Bell className="mt-0.5 h-2.5 w-2.5 shrink-0" /> {a}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SaudeLinha({ icone: Icon, label, valor, sub, status }: { icone: typeof Heart; label: string; valor: string; sub?: string; status: "ok" | "alerta" | "ruim" }) {
  const corStatus = status === "ok" ? "text-emerald-400" : status === "alerta" ? "text-amber-400" : "text-rose-400";
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-3.5 w-3.5", corStatus)} />
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{label}</span>
      </div>
      <div className="text-right">
        <div className={cn("text-xs font-bold tabular-nums", corStatus)}>{valor}</div>
        {sub && <div className="text-[9px] text-zinc-500">{sub}</div>}
      </div>
    </div>
  );
}

function CardAcao({ acao }: { acao: AcaoSugerida }) {
  const cfgPrioridade = {
    alta: { bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-300", label: "URGENTE" },
    media: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-300", label: "ATENÇÃO" },
    baixa: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-300", label: "OK" }
  } as const;
  const iconeTipo = {
    pausar: Pause,
    escalar: Rocket,
    renovar_criativo: Wrench,
    trocar_publico: Target,
    verificar: AlertCircle,
    celebrar: CheckCircle2
  } as const;
  const cfg = cfgPrioridade[acao.prioridade];
  const Icon = iconeTipo[acao.tipo] || AlertCircle;

  return (
    <div className={cn("flex items-start gap-3 rounded-lg border p-3", cfg.bg, cfg.border)}>
      <div className={cn("mt-0.5 rounded-md p-1.5", cfg.bg)}>
        <Icon className={cn("h-3.5 w-3.5", cfg.text)} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase", cfg.bg, cfg.text)}>
            {cfg.label}
          </span>
          <span className="text-xs font-bold text-zinc-100">{acao.tipo.replace(/_/g, " ").toUpperCase()}</span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-300">{acao.texto}</p>
        {acao.impactoEstimado && (
          <p className="mt-0.5 text-[10px] text-zinc-500">→ {acao.impactoEstimado}</p>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, sub, accent = "default" }: { label: string; value: string; sub?: string; accent?: "default" | "emerald" | "rose" | "amber" }) {
  const colorClass = accent === "emerald" ? "text-emerald-400"
    : accent === "rose" ? "text-rose-400"
    : accent === "amber" ? "text-amber-400"
    : "text-zinc-200";
  return (
    <div>
      <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={cn("text-sm font-black tabular-nums", colorClass)}>{value}</div>
      {sub && <div className="text-[9px] text-zinc-500">{sub}</div>}
    </div>
  );
}

function AbaAuditoria({ conversoes }: { conversoes: ConversaoLocal[] }) {
  const [busca, setBusca] = useState("");

  const filtradas = useMemo(() => {
    if (!busca) return conversoes;
    const lower = busca.toLowerCase();
    return conversoes.filter(
      (c) =>
        c.produtoNome?.toLowerCase().includes(lower) ||
        c.orderId?.toLowerCase().includes(lower) ||
        c.subId?.toLowerCase().includes(lower) ||
        c.subId2?.toLowerCase().includes(lower)
    );
  }, [conversoes, busca]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-zinc-100">Auditoria de Vendas Shopee (RAW)</h3>
        <div className="text-sm text-zinc-400">{conversoes.length} registros no período</div>
      </div>

      <input
        type="text"
        placeholder="Buscar por ID do Pedido, Produto, subId, subId2..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-shopee focus:outline-none"
      />

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-zinc-900/50">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="border-b border-white/5 bg-black/20 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="p-3">Data/Hora (Shopee)</th>
              <th className="p-3">Pedido</th>
              <th className="p-3">Produto</th>
              <th className="p-3">Status</th>
              <th className="p-3">Sub_ID (Canal)</th>
              <th className="p-3">Sub_ID2 (Criativo)</th>
              <th className="p-3 text-right">Comissão</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtradas.map((c) => (
              <tr key={c.orderId} className="transition-colors hover:bg-white/[0.02]">
                <td className="p-3 whitespace-nowrap">
                  {new Date(c.purchaseTime * 1000).toLocaleString("pt-BR")}
                </td>
                <td className="p-3 font-mono text-[10px] text-zinc-400">{c.orderId}</td>
                <td className="p-3 max-w-[200px] truncate" title={c.produtoNome}>
                  {c.produtoNome}
                </td>
                <td className="p-3">
                  <span className={cn(
                    "rounded px-2 py-0.5 text-[10px] font-bold",
                    c.status === "Completed" ? "bg-emerald-500/20 text-emerald-400" :
                    c.status === "Cancelled" ? "bg-rose-500/20 text-rose-400" :
                    "bg-amber-500/20 text-amber-400"
                  )}>
                    {c.status}
                  </span>
                </td>
                <td className="p-3 font-mono text-zinc-300">{c.subId || "-"}</td>
                <td className="p-3 font-mono text-zinc-300">{c.subId2 || "-"}</td>
                <td className="p-3 text-right font-black text-emerald-400">
                  {formatBRL(c.totalCommission)}
                </td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-500">
                  Nenhuma conversão encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
