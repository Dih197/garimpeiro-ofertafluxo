import fs from "node:fs";
import path from "node:path";
import {
  atualizarDestinoDistribuicao,
  criarDestinoDistribuicao,
  listarDestinosDistribuicao,
  obterAutomacaoDistribuicao,
  obterSegurancaDistribuicao,
  salvarAutomacaoDistribuicao,
  salvarSegurancaDistribuicao
} from "@/lib/db";

type NativeDestination = {
  name?: unknown;
  number?: unknown;
  type?: unknown;
  consent?: unknown;
  active?: unknown;
};

type NativeSettings = {
  shopee?: { appId?: unknown; secret?: unknown };
  directWhatsApp?: { enabled?: unknown };
  evolution?: { enabled?: unknown; url?: unknown; apiKey?: unknown; instanceName?: unknown };
  whatsapp?: { token?: unknown; phoneNumberId?: unknown };
  automation?: { enabled?: unknown; intervalMinutes?: unknown; lastRunAt?: unknown; destinationSchedule?: Record<string, { nextRunAt?: unknown }> };
  safety?: { maxPerHour?: unknown; maxPerDay?: unknown; minMinutesPerDestination?: unknown; quietStartHour?: unknown; quietEndHour?: unknown };
  destinations?: NativeDestination[];
};

type NativeUser = { id?: unknown; username?: unknown };
type NativeActivity = { id?: unknown; at?: unknown; type?: unknown; message?: unknown };

export type OfertaFluxoSync = {
  disponivel: boolean;
  atualizadoEm: string;
  usuario: string | null;
  destinos: { lidos: number; criados: number; atualizados: number; ativos: number };
  automacao: { ativa: boolean; intervaloMinutos: number; proximaExecucao: string | null };
  protecao: { maxPorHora: number; maxPorDia: number; intervaloDestinoMinutos: number; descansoInicio: number; descansoFim: number };
  integracoes: { shopee: boolean; whatsappDireto: boolean; evolution: boolean; cloud: boolean };
  gruposAutorizados: Array<{ id: string; subject: string }>;
  atividade: Array<{ id: string; em: string; tipo: string; mensagem: string }>;
  aviso?: string;
};

const nativeRoot = path.resolve(process.cwd(), "..", "ofert", "ofertafluxo-backup-main");
const nativeUsersPath = path.join(nativeRoot, "data", "users.json");

function readJson<T>(file: string, fallback: T): T {
  try { return JSON.parse(fs.readFileSync(file, "utf8")) as T; } catch { return fallback; }
}

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function bool(value: unknown) { return value === true; }
function number(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function emptySync(aviso: string): OfertaFluxoSync {
  const agenda = obterAutomacaoDistribuicao();
  const seguranca = obterSegurancaDistribuicao();
  return {
    disponivel: false,
    atualizadoEm: new Date().toISOString(),
    usuario: null,
    destinos: { lidos: 0, criados: 0, atualizados: 0, ativos: 0 },
    automacao: { ativa: agenda.ativa, intervaloMinutos: agenda.intervaloMinutos, proximaExecucao: agenda.proximaExecucao },
    protecao: seguranca,
    integracoes: { shopee: false, whatsappDireto: false, evolution: false, cloud: false },
    gruposAutorizados: [],
    atividade: [],
    aviso
  };
}

/**
 * Espelha o estado operacional local do OfertaFluxo no painel Garimpeiro.
 * A fonte nativa continua sendo a dona das credenciais; só dados operacionais
 * não sensíveis são lidos e persistidos no banco principal.
 */
export function sincronizarOfertaFluxo(): OfertaFluxoSync {
  if (!fs.existsSync(nativeUsersPath)) return emptySync("OfertaFluxo não foi encontrado neste computador.");
  const users = readJson<NativeUser[]>(nativeUsersPath, []);
  const user = users.find(item => text(item.username).toLowerCase() === "dikili") || users[0];
  const userId = text(user?.id);
  if (!userId) return emptySync("Nenhuma conta do OfertaFluxo está disponível para sincronizar.");

  const userDir = path.join(nativeRoot, "data", "users", userId);
  const settings = readJson<NativeSettings>(path.join(userDir, "settings.json"), {});
  const activity = readJson<NativeActivity[]>(path.join(userDir, "activity.json"), []);
  const nativeDestinations = Array.isArray(settings.destinations) ? settings.destinations : [];
  const existing = listarDestinosDistribuicao();
  let criados = 0;
  let atualizados = 0;

  for (const item of nativeDestinations) {
    const destino = text(item.number);
    const nome = text(item.name) || "Grupo OfertaFluxo";
    if (!destino) continue;
    const tipo = item.type === "contact" ? "contato" : "grupo";
    const dados = { nome, destino, tipo: tipo as "grupo" | "contato", confirmado: bool(item.consent), ativo: bool(item.active) };
    const current = existing.find(candidate => candidate.destino === destino);
    if (current) {
      if (current.nome !== dados.nome || current.tipo !== dados.tipo || current.confirmado !== dados.confirmado || current.ativo !== dados.ativo) {
        atualizarDestinoDistribuicao(current.id, dados);
        atualizados += 1;
      }
    } else {
      criarDestinoDistribuicao(dados);
      criados += 1;
    }
  }

  const safety = settings.safety || {};
  const protecao = salvarSegurancaDistribuicao({
    maxPorHora: number(safety.maxPerHour, 12),
    maxPorDia: number(safety.maxPerDay, 48),
    intervaloDestinoMinutos: number(safety.minMinutesPerDestination, 45),
    descansoInicio: number(safety.quietStartHour, 22),
    descansoFim: number(safety.quietEndHour, 8)
  });
  const automation = settings.automation || {};
  const agenda = salvarAutomacaoDistribuicao({
    ativa: bool(automation.enabled),
    intervaloMinutos: number(automation.intervalMinutes, 60)
  });
  const schedule = automation.destinationSchedule || {};
  const proximaExecucao = Object.values(schedule)
    .map(item => text(item?.nextRunAt))
    .filter(Boolean)
    .sort()[0] || agenda.proximaExecucao;

  const directSession = fs.existsSync(path.join(userDir, "whatsapp-session"));
  const appId = text(settings.shopee?.appId);
  const secret = text(settings.shopee?.secret);
  const activityPublic = activity.slice(0, 8).map(item => ({
    id: text(item.id) || `${text(item.at)}-${text(item.message)}`,
    em: text(item.at),
    tipo: text(item.type) || "info",
    mensagem: text(item.message)
  }));

  return {
    disponivel: true,
    atualizadoEm: new Date().toISOString(),
    usuario: text(user?.username) || null,
    destinos: { lidos: nativeDestinations.length, criados, atualizados, ativos: nativeDestinations.filter(item => bool(item.active) && bool(item.consent)).length },
    automacao: { ativa: agenda.ativa, intervaloMinutos: agenda.intervaloMinutos, proximaExecucao },
    protecao: { maxPorHora: protecao.maxPorHora, maxPorDia: protecao.maxPorDia, intervaloDestinoMinutos: protecao.intervaloDestinoMinutos, descansoInicio: protecao.descansoInicio, descansoFim: protecao.descansoFim },
    integracoes: {
      shopee: Boolean(appId && secret),
      whatsappDireto: directSession && settings.directWhatsApp?.enabled !== false,
      evolution: Boolean(settings.evolution?.enabled && text(settings.evolution?.url) && text(settings.evolution?.apiKey) && text(settings.evolution?.instanceName)),
      cloud: Boolean(text(settings.whatsapp?.token) && text(settings.whatsapp?.phoneNumberId))
    },
    gruposAutorizados: nativeDestinations
      .filter(item => item.type === "group" && bool(item.active) && bool(item.consent) && text(item.number))
      .map(item => ({ id: text(item.number), subject: text(item.name) || "Grupo autorizado" })),
    atividade: activityPublic
  };
}
