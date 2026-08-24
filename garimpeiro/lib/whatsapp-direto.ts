import path from "path";
import fs from "fs";
import makeWASocket, { Browsers, DisconnectReason, useMultiFileAuthState } from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import pino from "pino";

type GrupoDireto = { id: string; subject: string };
type SessaoDireta = { socket: ReturnType<typeof makeWASocket> | null; status: "desconectado" | "conectando" | "aguardando_qr" | "conectado"; qr: string | null; erro: string | null; grupos: GrupoDireto[]; connectingSince: number };
const sessoes = new Map<string, SessaoDireta>();
const usuarioPadrao = "principal";
const diretorioSessao = () => path.join(process.cwd(), "data", "whatsapp-direto", usuarioPadrao);

export function sessaoWhatsAppDiretoExiste() {
  return fs.existsSync(path.join(diretorioSessao(), "creds.json"));
}

function estado(): SessaoDireta {
  const atual = sessoes.get(usuarioPadrao);
  if (atual) return atual;
  const novo: SessaoDireta = { socket: null, status: "desconectado", qr: null, erro: null, grupos: [], connectingSince: 0 };
  sessoes.set(usuarioPadrao, novo);
  return novo;
}

function jidNormalizado(jid: string | undefined) { return String(jid || "").replace(/:\d+(?=@)/, ""); }
function administraGrupo(grupo: { participants?: Array<{ id: string; admin?: string | null }> }, meuJid: string | undefined) {
  return grupo.participants?.some(p => jidNormalizado(p.id) === jidNormalizado(meuJid) && (p.admin === "admin" || p.admin === "superadmin")) || false;
}

async function sincronizarGrupos(atual: SessaoDireta) {
  if (!atual.socket) throw new Error("Conecte o WhatsApp por QR antes de atualizar os grupos.");
  const grupos = Object.values(await atual.socket.groupFetchAllParticipating()) as Array<{ id: string; subject: string; participants?: Array<{ id: string; admin?: string | null }> }>;
  // Em contas recém-vinculadas, o WhatsApp pode identificar o proprietário por
  // LID e os participantes pelo número normal, impedindo a comparação direta.
  // Exibimos os grupos disponíveis e exigimos confirmação explícita do usuário
  // antes de eles virarem destinos de distribuição.
  const administrados = grupos.filter(g => administraGrupo(g, atual.socket?.user?.id));
  atual.grupos = (administrados.length ? administrados : grupos).map(g => ({ id: g.id, subject: g.subject }));
  return atual.grupos;
}

export function estadoWhatsAppDireto() {
  const atual = estado();
  return { status: atual.status, qr: atual.qr, erro: atual.erro, grupos: atual.grupos };
}

export async function conectarWhatsAppDireto() {
  const atual = estado();
  if (atual.status === "conectado") return estadoWhatsAppDireto();
  if (atual.status === "conectando" && Date.now() - atual.connectingSince < 45_000) return estadoWhatsAppDireto();
  atual.status = "conectando"; atual.connectingSince = Date.now(); atual.erro = null; atual.qr = null;
  const { state, saveCreds } = await useMultiFileAuthState(diretorioSessao());
  const socket = makeWASocket({ auth: state, browser: Browsers.windows("Garimpeiro"), logger: pino({ level: "silent" }), markOnlineOnConnect: false, syncFullHistory: false, generateHighQualityLinkPreview: true });
  atual.socket = socket;
  socket.ev.on("creds.update", saveCreds);
  socket.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr) { atual.qr = await QRCode.toDataURL(qr, { margin: 1, width: 280 }); atual.status = "aguardando_qr"; atual.erro = null; }
    if (connection === "open") {
      atual.status = "conectado"; atual.qr = null; atual.erro = null; atual.connectingSince = 0;
      try { await sincronizarGrupos(atual); } catch { atual.grupos = []; }
    }
    if (connection === "close") {
      atual.socket = null; atual.qr = null; atual.status = "desconectado";
      const code = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;
      const detalhe = lastDisconnect?.error instanceof Error ? lastDisconnect.error.message : "";
      atual.erro = code === DisconnectReason.loggedOut
        ? "Sessão encerrada. Gere um novo QR Code para reconectar."
        : `Conexão interrompida${detalhe ? `: ${detalhe.slice(0, 180)}` : ". Gere outro QR Code para reconectar."}`;
    }
  });
  return estadoWhatsAppDireto();
}

export async function atualizarGruposWhatsAppDireto() {
  const atual = estado();
  if (atual.status !== "conectado") throw new Error("Conecte o WhatsApp por QR antes de atualizar os grupos.");
  await sincronizarGrupos(atual);
  return estadoWhatsAppDireto();
}

/** Envia somente após conexão QR e para um destino que o usuário cadastrou/autorizou. */
export async function enviarTextoWhatsAppDireto(destino: string, texto: string, imagem?: string) {
  const atual = estado();
  if (!atual.socket || atual.status !== "conectado") throw new Error("Conecte o WhatsApp por QR Code antes de enviar.");
  const jid = destino.includes("@") ? destino : `${destino}@s.whatsapp.net`;
  return atual.socket.sendMessage(jid, imagem ? { image: { url: imagem }, caption: texto } : { text: texto });
}
