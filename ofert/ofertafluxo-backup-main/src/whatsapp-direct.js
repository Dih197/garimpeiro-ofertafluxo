import fs from 'node:fs';
import path from 'node:path';
import makeWASocket, { Browsers, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';

const authDir = userId => path.resolve('data/users', String(userId), 'whatsapp-session');
const connections = new Map();
const normalizedJid = jid => String(jid || '').replace(/:\d+(?=@)/, '');
const isAdministrator = (group, ownJids) => {
  const identities = new Set((Array.isArray(ownJids) ? ownJids : [ownJids]).filter(Boolean).map(normalizedJid));
  return group?.participants?.some(participant => identities.has(normalizedJid(participant.id)) && ['admin', 'superadmin'].includes(participant.admin));
};
const directFor = userId => {
  if (!connections.has(userId)) connections.set(userId, { socket: null, status: 'desconectado', qr: null, error: null, groups: [], ownJids: [], connectingSince: 0 });
  return connections.get(userId);
};

async function refreshGroups(direct) {
  if (!direct.socket || direct.status !== 'conectado') throw new Error('Conecte o WhatsApp pelo QR Code antes de atualizar os grupos.');
  const groups = Object.values(await direct.socket.groupFetchAllParticipating());
  // Lista somente grupos autorais, isto é, onde a conta conectada é admin.
  // A credencial pode informar o identificador em formatos diferentes; por
  // isso comparamos os JIDs da sessão e do socket após normalização.
  const ownJids = [...direct.ownJids, direct.socket.user?.id];
  direct.groups = groups.filter(group => isAdministrator(group, ownJids));
  return direct.groups;
}

export function directWhatsAppState(userId) {
  const direct = directFor(userId);
  return { status: direct.status, qr: direct.qr, error: direct.error, groups: direct.groups.map(({ id, subject }) => ({ id, subject })) };
}
export async function refreshDirectWhatsAppGroups(userId) {
  const direct = directFor(userId);
  await refreshGroups(direct);
  return directWhatsAppState(userId);
}
export async function connectDirectWhatsApp(userId) {
  const direct = directFor(userId);
  if (direct.status === 'conectado') return directWhatsAppState(userId);
  // Uma tentativa antiga que não produziu QR não pode deixar o painel travado.
  if (direct.status === 'conectando' && Date.now() - direct.connectingSince < 45_000) return directWhatsAppState(userId);
  direct.status = 'conectando'; direct.connectingSince = Date.now(); direct.error = null; direct.qr = null;
  const { state, saveCreds } = await useMultiFileAuthState(authDir(userId));
  const socket = makeWASocket({ auth: state, browser: Browsers.windows('OfertaFluxo'), logger: pino({ level: 'silent' }), markOnlineOnConnect: false, syncFullHistory: false, generateHighQualityLinkPreview: true });
  direct.ownJids = [state.creds.me?.id, state.creds.me?.lid].filter(Boolean);
  direct.socket = socket;
  socket.ev.on('creds.update', saveCreds);
  socket.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) { direct.qr = await QRCode.toDataURL(qr, { margin: 1, width: 300 }); direct.status = 'aguardando_qr'; direct.error = null; }
    if (connection === 'open') {
      direct.status = 'conectado'; direct.qr = null; direct.error = null; direct.connectingSince = 0;
      try {
        await refreshGroups(direct);
      } catch { direct.groups = []; }
    }
    if (connection === 'close') {
      direct.socket = null; direct.qr = null; direct.status = 'desconectado';
      const code = lastDisconnect?.error?.output?.statusCode;
      direct.error = code === DisconnectReason.loggedOut
        ? 'A sessão do WhatsApp foi encerrada. Gere um novo QR Code para reconectar.'
        : 'A conexão do WhatsApp foi interrompida. Tentaremos reconectar automaticamente.';
      if (code !== DisconnectReason.loggedOut) setTimeout(() => connectDirectWhatsApp(userId).catch(error => { direct.error = error.message; }), 4000);
    }
  });
  return directWhatsAppState(userId);
}
export async function sendDirectWhatsAppOffer(userId, offer, text, targets) {
  const direct = directFor(userId);
  if (!direct.socket || direct.status !== 'conectado') throw new Error('Conecte o WhatsApp pelo QR Code antes de enviar.');
  if (!targets?.length) throw new Error('Adicione ao menos um destino ativo.');
  const results = [];
  for (const target of targets) {
    const jid = target.includes('@') ? target : `${target}@s.whatsapp.net`;
    const content = offer.image ? { image: { url: offer.image }, caption: text } : { text, linkPreview: true };
    results.push(await direct.socket.sendMessage(jid, content));
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  return results;
}
export function directSessionExists(userId) { return fs.existsSync(authDir(userId)); }
