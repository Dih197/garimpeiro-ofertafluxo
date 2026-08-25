let state = {};
const $ = selector => document.querySelector(selector);
let panelKey = '';
let stateRefreshInProgress = false;
let destinationView = 'all';
let offerInventory = [];
let integrationsCheckedAt = null;
const api = async (url, options = {}, retried = false) => {
  const headers = { 'content-type': 'application/json', ...(options.headers || {}) };
  if (panelKey) headers['x-panel-key'] = panelKey;
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401 && response.headers.get('x-panel-auth-required') === 'true' && !retried) {
    const key = window.prompt('Informe a chave de acesso deste painel:');
    if (key) { panelKey = key; return api(url, options, true); }
  }
  const payload = response.status === 204 ? {} : await response.json();
  if (!response.ok) throw new Error(payload.error || 'Não foi possível concluir a operação.');
  return payload;
};
function toast(message, error = false) {
  const element = $('#toast'); element.textContent = message; element.className = `show${error ? ' error' : ''}`;
  clearTimeout(toast.timer); toast.timer = setTimeout(() => { element.className = ''; }, 4600);
}
function money(value) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0)); }
function page(id) {
  document.querySelectorAll('.page').forEach(item => item.classList.toggle('active', item.id === id));
  document.querySelectorAll('.nav').forEach(item => item.classList.toggle('active', item.dataset.page === id));
  $('#page-title').textContent = ({ dashboard: 'Visão geral', offers: 'Ofertas', automation: 'Automação', destinations: 'Destinos', tracking: 'Rastreamento', integration: 'Integrações' })[id];
}
function renderActivity(items) {
  $('#activity').classList.toggle('empty', !items.length);
  $('#activity').innerHTML = items.length ? items.slice(0, 5).map(item => `<div class="activity-item"><span>${item.type === 'error' ? '⚠' : item.type === 'success' ? '✓' : '•'}</span><span>${item.message}</span><time>${new Date(item.at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</time></div>`).join('') : 'Nenhuma atividade registrada.';
}
function ensureDestinationsHub() {
  let hub = $('#destinations-hub');
  if (hub) return hub;
  const section = $('#destinations'); const heading = section?.querySelector('.section-title');
  if (!section || !heading) return null;
  hub = document.createElement('article');
  hub.id = 'destinations-hub'; hub.className = 'destinations-hub card';
  hub.innerHTML = '<div class="destinations-hub-copy"><span class="eyebrow">OPERAÇÃO POR GRUPO</span><h3>Destinos autorizados</h3><p id="destinations-hub-copy">Sincronize seus grupos e defina o que cada um pode receber.</p></div><div class="destinations-stats"><div><small>ATIVOS</small><strong id="destinations-active-count">0</strong></div><div><small>PAUSADOS</small><strong id="destinations-paused-count">0</strong></div><div><small>GRUPOS AUTORAIS</small><strong id="destinations-groups-count">0</strong></div></div><button class="secondary" id="refresh-destinations-groups">↻ Sincronizar grupos</button>';
  heading.insertAdjacentElement('afterend', hub);
  return hub;
}
function ensureOverviewHub() {
  let hub = $('#overview-hub');
  if (hub) return hub;
  const dashboard = $('#dashboard'); const notice = dashboard?.querySelector('.notice');
  if (!dashboard || !notice) return null;
  hub = document.createElement('section');
  hub.id = 'overview-hub'; hub.className = 'overview-hub';
  hub.innerHTML = '<article class="overview-command card"><div class="overview-command-main"><p class="eyebrow">CENTRAL DE OFERTAS</p><h2 id="overview-title">Sua operação em um só lugar</h2><p id="overview-copy">Verificando integrações e filas…</p><div id="overview-readiness" class="overview-readiness"></div></div><div class="overview-health"><div class="overview-health-score"><strong id="overview-score">—</strong><span>health score</span></div><small id="overview-score-copy">Calculando prontidão</small></div></article><div class="overview-insights"><article><small>ENVIOS HOJE</small><strong id="overview-sent-today">0</strong><span id="overview-sent-hour">0 na última hora</span></article><article><small>GRUPOS AUTORIZADOS</small><strong id="overview-groups">0</strong><span id="overview-groups-copy">aguardando sincronização</span></article><article><small>OFERTAS CONSULTADAS</small><strong id="overview-offers">—</strong><span>prontas para seleção</span></article><article><small>AUTOMAÇÃO</small><strong id="overview-automation">—</strong><span id="overview-automation-copy">verificando</span></article></div><article class="overview-actions card"><div><h3>Próxima melhor ação</h3><p id="overview-next-action">Carregando recomendação…</p></div><div class="overview-action-buttons"><button class="primary" id="overview-primary-action" data-go="integration">Configurar operação</button><button class="secondary" data-go="offers">Ver ofertas</button><button class="secondary" data-go="automation">Abrir automação</button></div></article>';
  notice.insertAdjacentElement('afterend', hub);
  return hub;
}
function renderOverviewHub() {
  const hub = ensureOverviewHub(); if (!hub) return;
  const activeDestinations = (state.destinations || []).filter(item => item.active && item.consent);
  const groups = state.directStatus?.groups || [];
  const shopeeReady = Boolean(state.shopee?.connected); const whatsappReady = state.directStatus?.status === 'conectado';
  const automation = state.automationStatus || state.automation || {}; const safety = state.safetyStatus || state.safety || {};
  const checks = [
    [shopeeReady, 'Shopee'], [whatsappReady, 'WhatsApp'], [activeDestinations.length > 0, 'Grupo autorizado']
  ];
  const readyCount = checks.filter(([ok]) => ok).length; const score = Math.round((readyCount / checks.length) * 100);
  $('#overview-score').textContent = `${score}%`; $('#overview-score-copy').textContent = score === 100 ? 'Operação pronta para rodar' : `${3 - readyCount} etapa(s) pendente(s)`;
  $('#overview-title').textContent = score === 100 ? 'Operação pronta para acelerar' : 'Construa uma operação pronta para rodar';
  $('#overview-copy').textContent = automation.enabled ? 'A automação organiza a fila e respeita seus limites de segurança.' : 'Conecte os canais, autorize grupos e programe o ritmo das suas ofertas.';
  $('#overview-readiness').innerHTML = checks.map(([ok, label]) => `<span class="${ok ? 'ok' : ''}"><i>${ok ? '✓' : '•'}</i>${label}</span>`).join('');
  $('#overview-sent-today').textContent = String(safety.sentToday || 0); $('#overview-sent-hour').textContent = `${safety.sentLastHour || 0} na última hora`;
  $('#overview-groups').textContent = String(activeDestinations.length); $('#overview-groups-copy').textContent = groups.length ? `${groups.length} grupo(s) autoral(is) sincronizado(s)` : 'sincronize o WhatsApp';
  const offerActivity = (state.activity || []).find(item => /oferta\(s\) consultada/i.test(item.message));
  const offerCount = offerActivity?.message?.match(/\d+/)?.[0]; $('#overview-offers').textContent = offerCount || '—';
  $('#overview-automation').textContent = automation.enabled ? 'Ativa' : 'Pausada'; $('#overview-automation-copy').textContent = automation.enabled && automation.nextRunAt ? `próximo em ${automationTime(automation.nextRunAt)}` : 'defina o ritmo de publicação';
  const nextAction = !shopeeReady ? ['Conecte sua conta Shopee para consultar ofertas reais.', 'integration', 'Conectar Shopee'] : !whatsappReady ? ['Conecte o WhatsApp pelo QR Code para liberar seus grupos.', 'integration', 'Conectar WhatsApp'] : !activeDestinations.length ? ['Autorize seu primeiro grupo para montar a fila de publicação.', 'destinations', 'Autorizar grupo'] : !automation.enabled ? ['Sua estrutura está pronta. Escolha a cadência e ative a automação.', 'automation', 'Programar automação'] : ['A automação está em operação. Confira a fila ou simule a próxima oferta.', 'automation', 'Ver automação'];
  $('#overview-next-action').textContent = nextAction[0]; const primary = $('#overview-primary-action'); primary.dataset.go = nextAction[1]; primary.textContent = nextAction[2];
}
function renderDestinations() {
  const list = $('#destinations-list'); const destinations = state.destinations || []; const hub = ensureDestinationsHub();
  const categoryName = id => (state.categories || []).find(category => category.id === id)?.label || 'Ofertas gerais';
  const categoryIds = item => selectedCategoryIds(item);
  const categoryNames = item => categoryIds(item).map(categoryName).join(' + ');
  const categoryChips = item => (state.categories || []).map(category => `<label class="category-chip${categoryIds(item).includes(category.id) ? ' active' : ''}"><input type="checkbox" value="${escapeHtml(category.id)}" ${categoryIds(item).includes(category.id) ? 'checked' : ''}><span>${escapeHtml(category.label)}</span></label>`).join('');
  const schedule = new Map((state.automationStatus?.destinations || []).map(item => [item.destinationId, item.nextRunAt]));
  const countdown = date => {
    const seconds = Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 1000));
    const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60);
    return hours ? `${hours}h ${String(minutes).padStart(2, '0')}min` : `${Math.max(1, minutes)} min`;
  };
  const whatsappBlocked = state.directWhatsApp?.enabled && state.directStatus?.status !== 'conectado';
  const automationNote = item => state.automation?.enabled && whatsappBlocked
    ? ' · Aguardando reconexão do WhatsApp'
    : state.automation?.enabled && schedule.has(item.id)
    ? ` · Próximo envio em ${countdown(schedule.get(item.id))}`
    : ' · Automação pausada';
  const visibleDestinations = destinations.filter(item => destinationView === 'all' || (destinationView === 'active' ? item.active : !item.active));
  const groups = state.directStatus?.groups || [];
  if (hub) {
    $('#destinations-active-count').textContent = String(destinations.filter(item => item.active && item.consent).length);
    $('#destinations-paused-count').textContent = String(destinations.filter(item => !item.active).length);
    $('#destinations-groups-count').textContent = String(groups.length);
    $('#destinations-hub-copy').textContent = groups.length ? `${groups.length} grupo(s) autoral(is) sincronizado(s). Autorize somente os que devem receber ofertas.` : 'Conecte e sincronize o WhatsApp para encontrar seus grupos autorais.';
  }
  list.classList.toggle('empty', !visibleDestinations.length);
  list.innerHTML = `<div class="destination-filters"><button class="destination-filter${destinationView === 'all' ? ' active' : ''}" data-destination-view="all">Todos <b>${destinations.length}</b></button><button class="destination-filter${destinationView === 'active' ? ' active' : ''}" data-destination-view="active">Ativos <b>${destinations.filter(item => item.active).length}</b></button><button class="destination-filter${destinationView === 'paused' ? ' active' : ''}" data-destination-view="paused">Pausados <b>${destinations.filter(item => !item.active).length}</b></button></div>${visibleDestinations.length ? visibleDestinations.map(item => `<article class="destination"><div class="avatar">${item.type === 'group' ? '♧' : '◔'}</div><div class="destination-main"><strong>${escapeHtml(item.name)}</strong><small>${item.type === 'group' ? escapeHtml(item.number) : `+${escapeHtml(item.number)}`} · Rotação: ${escapeHtml(categoryNames(item))}${automationNote(item)}</small></div><div class="destination-category-summary"><span>${categoryIds(item).length} categoria${categoryIds(item).length === 1 ? '' : 's'}</span><button class="secondary edit-destination-name" data-id="${item.id}">Nome do grupo</button><button class="secondary edit-destination-categories" data-id="${item.id}">Categorias</button></div><span class="tag ${item.active ? '' : 'off'}">${item.active ? 'Ativo' : 'Pausado'}</span><button class="icon-button toggle-destination" title="Ativar ou pausar" data-id="${item.id}">⏻</button><button class="icon-button delete-destination" title="Remover" data-id="${item.id}">⌫</button></article>`).join('') : '<div class="destination-empty">Nenhum destino nesta visualização. Sincronize um grupo autoral ou adicione um destino autorizado.</div>'}`;
  $('#groups-helper').innerHTML = groups.length ? `<div class="groups-heading"><div><h3>Grupos autorais disponíveis</h3><p>Somente grupos administrados por este WhatsApp. Escolha um para definir categoria e consentimento.</p></div><span class="tag">${groups.length} disponível(is)</span></div>${groups.map(group => `<article class="group-picker"><div class="avatar">♧</div><div><strong>${escapeHtml(group.subject)}</strong><small>${escapeHtml(group.id)}</small></div><button class="secondary select-group" data-id="${escapeHtml(group.id)}" data-name="${escapeHtml(group.subject)}">Autorizar grupo</button></article>`).join('')}` : '<div class="groups-empty">Nenhum grupo autoral sincronizado. Confirme se este WhatsApp é administrador do grupo e clique em “Sincronizar grupos”.</div>';
}
function selectedCategoryIds(item = {}) { return Array.isArray(item.categoryIds) && item.categoryIds.length ? item.categoryIds : [item.categoryId || 'all']; }
function escapeHtml(value) { return String(value || '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]); }
function renderTracking() {
  const tracking = state.tracking || {}; const records = tracking.records || [];
  const summary = $('#tracking-summary'); const body = $('#tracking-table-body');
  if (!summary || !body) return;
  summary.innerHTML = `<article><small>LINKS ENVIADOS</small><strong>${Number(tracking.sent || 0)}</strong><span>com Sub IDs Shopee</span></article><article><small>GRUPOS IDENTIFICADOS</small><strong>${Number(tracking.groups || 0)}</strong><span>origem nomeada</span></article><article><small>PRODUTOS RASTREADOS</small><strong>${Number(tracking.products || 0)}</strong><span>por oferta enviada</span></article>`;
  body.innerHTML = records.length ? records.map(item => `<tr><td>${new Date(item.sentAt || item.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td><td><strong>${escapeHtml(item.destinationName)}</strong><small>${escapeHtml(item.subIds?.[1] || '—')}</small></td><td><strong>${escapeHtml(item.productName)}</strong><small>${escapeHtml(item.subIds?.[2] || '—')}</small></td><td>${escapeHtml(item.categoryName || 'Ofertas gerais')}</td><td><code>${(item.subIds || []).map(escapeHtml).join(' · ')}</code></td><td><span class="tag ${item.status === 'enviado' ? '' : 'off'}">${escapeHtml(item.status)}</span></td></tr>`).join('') : '<tr><td colspan="6">Nenhum link rastreável enviado ainda. Ao ativar a automação, cada mensagem será registrada aqui automaticamente.</td></tr>';
}
function renderIntegrationValidation() {
  const element = $('#integration-validation');
  if (!element) return;
  const groups = state.directStatus?.groups || [];
  const shopee = state.shopee?.connected
    ? 'Shopee: credenciais salvas. Use “Atualizar status” para consultar ofertas reais.'
    : 'Shopee: configure App ID e Secret.';
  const direct = state.directStatus?.status === 'conectado'
    ? `WhatsApp direto: conectado${groups.length ? ` · ${groups.length} grupo(s) autoral(is) disponível(is).` : ' · nenhum grupo autoral retornado; confirme se este WhatsApp é administrador do grupo e clique em “Atualizar grupos”.'}`
    : 'WhatsApp direto: conecte pelo QR Code para enviar e listar grupos.';
  const cloud = state.whatsapp?.configured
    ? 'Cloud API: configurada.'
    : 'Cloud API: opcional e aguardando token da Meta.';
  element.textContent = `${shopee} ${direct} ${cloud}`;
  let operations = $('#integration-operations');
  if (!operations) {
    operations = document.createElement('section'); operations.id = 'integration-operations'; operations.className = 'integration-operations';
    const grid = document.querySelector('#integration .integration-grid'); grid?.insertAdjacentElement('afterend', operations);
  }
  const checked = integrationsCheckedAt ? `Validado às ${integrationsCheckedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Aguardando validação manual';
  operations.innerHTML = `<article class="integration-command card"><div><p class="eyebrow">SAÚDE DA OPERAÇÃO</p><h3>${state.shopee?.connected && state.directStatus?.status === 'conectado' ? 'Canais principais prontos' : 'Conexões precisam de atenção'}</h3><p>${checked}. A validação consulta a Shopee e confere a sessão do WhatsApp sem enviar mensagens.</p></div><button class="primary" id="validate-integrations">Validar agora</button></article><div class="integration-health"><article class="${state.shopee?.connected ? 'ok' : ''}"><i>${state.shopee?.connected ? '✓' : '!'}</i><div><strong>Shopee Afiliados</strong><small>${state.shopee?.connected ? 'Credenciais registradas e catálogo disponível.' : 'Informe App ID e Secret.'}</small></div></article><article class="${state.directStatus?.status === 'conectado' ? 'ok' : ''}"><i>${state.directStatus?.status === 'conectado' ? '✓' : '!'}</i><div><strong>WhatsApp direto</strong><small>${state.directStatus?.status === 'conectado' ? `${(state.directStatus?.groups || []).length} grupo(s) autoral(is) sincronizado(s).` : 'Conecte pelo QR Code.'}</small></div></article><article class="${state.whatsapp?.configured ? 'ok' : ''}"><i>${state.whatsapp?.configured ? '✓' : '○'}</i><div><strong>WhatsApp Cloud API</strong><small>${state.whatsapp?.configured ? 'Canal alternativo configurado.' : 'Opcional: use para templates aprovados pela Meta.'}</small></div></article></div>`;
}
function automationTime(date) {
  const milliseconds = new Date(date).getTime() - Date.now();
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return 'agora';
  const minutes = Math.ceil(milliseconds / 60_000);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}min` : `${minutes} min`;
}
function ensureAutomationSimulator() {
  let preview = $('#automation-offer-preview');
  if (preview) return preview;
  const side = document.querySelector('.automation-side'); const safety = side?.querySelector('.safety-card');
  if (!side || !safety) return null;
  const card = document.createElement('article');
  card.className = 'card offer-simulator';
  card.innerHTML = '<div class="card-head"><div><h3>Simulador da próxima oferta</h3><p>Veja o produto que seria escolhido agora, sem enviar mensagem.</p></div><button class="secondary" id="preview-automation-offer">Simular agora</button></div><div id="automation-offer-preview" class="automation-preview">Escolha um grupo autoral autorizado para visualizar a próxima oferta.</div>';
  side.insertBefore(card, safety);
  return $('#automation-offer-preview');
}
function renderAutomationHub() {
  const automation = state.automationStatus || state.automation || {};
  const destinations = (state.destinations || []).filter(item => item.active && item.consent);
  const shopeeReady = Boolean(state.shopee?.connected);
  const whatsappReady = state.directStatus?.status === 'conectado';
  const ready = shopeeReady && whatsappReady && destinations.length > 0;
  const simulator = ensureAutomationSimulator();
  if (simulator && !simulator.dataset.loaded) simulator.textContent = destinations.length ? 'Use “Simular agora” para validar a próxima oferta sem disparar mensagens.' : 'Escolha um grupo autoral autorizado para visualizar a próxima oferta.';
  const pill = $('#automation-state-pill'); const readiness = $('#automation-readiness');
  if (!pill || !readiness) return;
  pill.textContent = automation.enabled ? '● Automação ativa' : ready ? '● Pronta para ativar' : '● Configuração pendente';
  readiness.textContent = ready ? 'Pronta' : `${[shopeeReady, whatsappReady, destinations.length > 0].filter(Boolean).length}/3`;
  $('#automation-readiness-copy').textContent = ready ? 'integrações e grupos validados' : 'etapas essenciais concluídas';
  $('#automation-destinations').textContent = String(destinations.length);
  $('#automation-cadence').textContent = `${automation.intervalMinutes || 60} min`;
  $('#automation-next').textContent = automation.enabled && automation.nextRunAt ? automationTime(automation.nextRunAt) : '—';
  $('#automation-next-copy').textContent = automation.enabled && automation.nextRunAt ? `programado para ${new Date(automation.nextRunAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'salve para criar a programação';
  document.querySelectorAll('.interval-preset').forEach(button => button.classList.toggle('active', Number(button.dataset.automationInterval) === Number(automation.intervalMinutes || 60)));
  const checks = [
    [shopeeReady, 'Shopee conectada', shopeeReady ? 'Consulta de ofertas disponível.' : 'Configure as credenciais da Shopee.'],
    [whatsappReady, 'WhatsApp direto conectado', whatsappReady ? 'Sessão ativa para envios autorizados.' : 'Escaneie o QR Code do WhatsApp.'],
    [destinations.length > 0, 'Grupo autoral autorizado', destinations.length ? `${destinations.length} destino(s) na fila.` : 'Adicione ao menos um grupo com consentimento.']
  ];
  $('#automation-checklist').innerHTML = checks.map(([ok, title, copy]) => `<div class="check-item${ok ? ' ok' : ''}"><i>${ok ? '✓' : '•'}</i><div><strong>${title}</strong><small>${copy}</small></div></div>`).join('');
  const schedule = automation.destinations || [];
  const map = new Map(destinations.map(item => [item.id, item]));
  const queue = $('#automation-queue'); const count = $('#automation-queue-count');
  count.textContent = `${schedule.length} na fila`; count.classList.toggle('off', !schedule.length);
  queue.classList.toggle('empty', !schedule.length);
  queue.innerHTML = schedule.length ? schedule.sort((left, right) => String(left.nextRunAt).localeCompare(String(right.nextRunAt))).map(item => {
    const destination = map.get(item.destinationId); const labels = (Array.isArray(destination?.categoryIds) && destination.categoryIds.length ? destination.categoryIds : [destination?.categoryId || 'all']).map(id => (state.categories || []).find(category => category.id === id)?.label || 'Ofertas gerais'); return `<div class="automation-queue-item"><div class="avatar">♧</div><div><b>${escapeHtml(destination?.name || 'Grupo autorizado')}</b><small>Rotação aleatória: ${escapeHtml(labels.join(' + '))}</small></div><span class="automation-queue-time">${automationTime(item.nextRunAt)}</span></div>`;
  }).join('') : 'Adicione grupos autorais com consentimento para montar a fila.';
}
function renderState() {
  const shopeeOn = state.shopee?.connected;
  const active = (state.destinations || []).filter(item => item.active).length;
  $('#connection-label').textContent = shopeeOn ? 'Shopee conectada' : 'Shopee não configurada';
  $('#metric-connection').textContent = shopeeOn ? 'Conectada' : 'Pendente';
  $('#metric-destinations').textContent = active;
  $('#metric-automation').textContent = state.automation?.enabled ? 'Ativa' : 'Pausada';
  $('#shopee-state').textContent = shopeeOn ? `Conectada (${state.shopee.appId})` : 'Não configurada';
  $('#whatsapp-state').textContent = state.whatsapp?.configured ? 'Configurada' : 'Não configurada';
  $('#direct-state').textContent = state.directStatus?.status === 'conectado' ? 'Conectado' : 'Desconectado';
  $('#account-name').textContent = state.user?.username || 'Conta';
  const categoryField = $('#preview-category'); const previousCategory = categoryField.value;
  categoryField.innerHTML = (state.categories || []).map(category => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.label)}</option>`).join('');
  const activeDestinations = (state.destinations || []).filter(destination => destination.active);
  const preferredCategories = activeDestinations.length === 1 ? (activeDestinations[0].categoryIds || [activeDestinations[0].categoryId]) : ['all'];
  categoryField.value = (state.categories || []).some(category => category.id === previousCategory) ? previousCategory : (preferredCategories[0] || 'all');
  const automation = state.automationStatus || state.automation || {};
  $('#automation-enabled').checked = Boolean(automation.enabled);
  $('#automation-interval').value = String(automation.intervalMinutes || 60);
  const nextRun = automation.nextRunAt ? new Date(automation.nextRunAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';
  const whatsappBlocked = state.directWhatsApp?.enabled && state.directStatus?.status !== 'conectado';
  $('#automation-copy').textContent = automation.enabled
    ? whatsappBlocked
      ? 'Automação aguardando a reconexão do WhatsApp. O próximo envio será reprogramado após a conexão.'
      : `Envios intercalados a cada ${automation.intervalMinutes} minutos por grupo · Próximo envio programado: ${nextRun}${automation.automationWindowOpen === false ? ' · aguardando o fim do descanso' : ''}.`
    : 'A automação está pausada.';
  const safety = state.safetyStatus || state.safety || {};
  $('#safety-hour').value = safety.maxPerHour || 12;
  $('#safety-day').value = safety.maxPerDay || 48;
  $('#safety-group-minutes').value = safety.minMinutesPerDestination || 45;
  $('#safety-quiet-start').value = safety.quietStartHour ?? 22;
  $('#safety-quiet-end').value = safety.quietEndHour ?? 8;
  $('#safety-copy').textContent = `${safety.sentLastHour || 0}/${safety.maxPerHour || 12} envios na última hora · ${safety.sentToday || 0}/${safety.maxPerDay || 48} hoje${safety.automationWindowOpen === false ? ' · descanso ativo' : ''}.`;
  renderDestinations(); renderTracking(); renderActivity(state.activity || []); renderIntegrationValidation(); renderAutomationHub(); renderOverviewHub();
}
async function reload() {
  if (stateRefreshInProgress) return;
  stateRefreshInProgress = true;
  try { state = await api('/api/state'); renderState(); }
  finally { stateRefreshInProgress = false; }
}
function canRefreshInBackground() {
  return document.visibilityState === 'visible'
    && !document.querySelector('dialog[open]')
    && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
}
async function backgroundRefresh() {
  if (!canRefreshInBackground()) return;
  try { await reload(); } catch { /* A próxima atualização tentará novamente sem interromper a tela. */ }
}
function openShopee() {
  $('#shopee-app-id').value = '';
  $('#shopee-app-id').placeholder = state.shopee?.connected ? 'Já configurado — informe apenas para substituir' : 'Ex.: 183...';
  $('#shopee-secret').value = '';
  $('#min-discount').value = state.filters?.minDiscount ?? 15;
  $('#min-price').value = state.filters?.minPrice ?? 0;
  $('#max-price').value = state.filters?.maxPrice ?? 1000;
  $('#preferred-max-price').value = state.filters?.preferredMaxPrice ?? 80;
  $('#max-offers').value = state.filters?.maxOffers ?? 5;
  $('#shopee-dialog').showModal();
}
function ensureOfferWorkbench() {
  let workbench = $('#offer-workbench');
  if (workbench) return workbench;
  const page = $('#offers'); const title = page?.querySelector('.section-title');
  if (!page || !title) return null;
  workbench = document.createElement('div'); workbench.id = 'offer-workbench'; workbench.className = 'offer-workbench';
  workbench.innerHTML = '<div class="offer-search"><span>⌕</span><input id="offer-search-input" placeholder="Buscar por produto ou loja" autocomplete="off"></div><select id="offer-sort"><option value="opportunity">Melhor oportunidade</option><option value="commission">Maior comissão</option><option value="sales">Mais vendidos</option><option value="price-low">Menor preço</option><option value="discount">Maior desconto</option></select><select id="offer-discount"><option value="0">Qualquer desconto</option><option value="10">10%+ OFF</option><option value="20">20%+ OFF</option><option value="30">30%+ OFF</option></select><label class="offer-price-filter">Até R$<input id="offer-price-max" type="number" min="0" placeholder="sem limite"></label><button class="secondary" id="offer-clear-filters">Limpar</button><div id="offer-catalog-stats" class="offer-catalog-stats">Consulte a Shopee para montar seu catálogo.</div>';
  title.insertAdjacentElement('afterend', workbench);
  return workbench;
}
function renderOfferCatalog() {
  ensureOfferWorkbench();
  const query = String($('#offer-search-input')?.value || '').trim().toLowerCase();
  const sort = $('#offer-sort')?.value || 'opportunity'; const minDiscount = Number($('#offer-discount')?.value || 0); const maxPrice = Number($('#offer-price-max')?.value || 0);
  let offers = offerInventory.filter(offer => (!query || `${offer.title} ${offer.shop || ''}`.toLowerCase().includes(query)) && (!minDiscount || Number(offer.discount || 0) >= minDiscount) && (!maxPrice || Number(offer.price || 0) <= maxPrice));
  const opportunity = offer => Number(offer.commissionRate || 0) * 10_000 + Number(offer.sales || 0) * 2 + Number(offer.discount || 0) * 50 - Number(offer.price || 0) * .02;
  offers = [...offers].sort((a, b) => sort === 'commission' ? Number(b.commissionRate || 0) - Number(a.commissionRate || 0) : sort === 'sales' ? Number(b.sales || 0) - Number(a.sales || 0) : sort === 'price-low' ? Number(a.price || 0) - Number(b.price || 0) : sort === 'discount' ? Number(b.discount || 0) - Number(a.discount || 0) : opportunity(b) - opportunity(a));
  const stats = $('#offer-catalog-stats'); if (stats) stats.textContent = offerInventory.length ? `${offers.length} de ${offerInventory.length} oferta(s) no catálogo atual` : 'Consulte a Shopee para montar seu catálogo.';
  $('#offers-grid').innerHTML = offers.length ? offers.map((offer, index) => `<article class="card offer offer-plus"><div class="offer-img">${offer.image ? `<img src="${escapeHtml(offer.image)}" alt="">` : '◈'}<span class="offer-rank">#${index + 1}</span>${offer.discount ? `<span class="offer-discount">${escapeHtml(offer.discount)}% OFF</span>` : ''}</div><div class="offer-info"><div class="offer-shop">${escapeHtml(offer.shop || 'Shopee')}</div><h3>${escapeHtml(offer.title)}</h3><div class="offer-price">${money(offer.price)}</div><div class="offer-score"><span>Comissão <b>${(Number(offer.commissionRate || 0) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</b></span><span>${Number(offer.sales || 0).toLocaleString('pt-BR')} vendidos</span></div><a href="${escapeHtml(offer.url)}" target="_blank" rel="noopener">Abrir oferta <span>→</span></a></div></article>`).join('') : '<div class="offers-empty">Nenhuma oferta com estes filtros. Ajuste os filtros ou limpe a busca para ver o catálogo completo.</div>';
}
async function loadOffers() {
  const button = $('#load-offers'); button.disabled = true; button.textContent = 'Buscando…';
  $('#offers-message').textContent = 'Consultando a Open API da Shopee…';
  try {
    const { offers, category } = await api('/api/offers/preview', { method: 'POST', body: JSON.stringify({ categoryId: $('#preview-category').value }) });
    offerInventory = offers;
    $('#offers-message').textContent = offers.length ? `${offers.length} ofertas encontradas em ${category}. Use os filtros abaixo para decidir a melhor.` : `Nenhuma oferta encontrada em ${category}.`;
    renderOfferCatalog();
    await reload();
  } catch (error) { $('#offers-message').textContent = error.message; toast(error.message, true); }
  finally { button.disabled = false; button.textContent = 'Buscar ofertas'; }
}
document.addEventListener('click', async event => {
  const nav = event.target.closest('.nav'); if (nav) { page(nav.dataset.page); if (nav.dataset.page === 'integration') reload().catch(error => toast(error.message, true)); return; }
  const go = event.target.closest('[data-go]'); if (go) return page(go.dataset.go);
  if (event.target.closest('#open-shopee')) return openShopee();
  if (event.target.closest('#open-whatsapp')) return $('#whatsapp-dialog').showModal();
  if (event.target.closest('#open-evolution')) return $('#evolution-dialog').showModal();
  if (event.target.closest('#automation-refresh')) { try { await reload(); toast('Painel de automação atualizado.'); } catch (error) { toast(error.message, true); } return; }
  if (event.target.closest('#refresh-tracking')) { try { await reload(); toast('Relatório de rastreamento atualizado.'); } catch (error) { toast(error.message, true); } return; }
  if (event.target.closest('#offer-clear-filters')) { $('#offer-search-input').value = ''; $('#offer-sort').value = 'opportunity'; $('#offer-discount').value = '0'; $('#offer-price-max').value = ''; renderOfferCatalog(); return; }
  const intervalPreset = event.target.closest('.interval-preset');
  if (intervalPreset) { $('#automation-interval').value = intervalPreset.dataset.automationInterval; document.querySelectorAll('.interval-preset').forEach(button => button.classList.toggle('active', button === intervalPreset)); return; }
  if (event.target.closest('#preview-automation-offer')) { const preview = ensureAutomationSimulator(); preview.textContent = 'Buscando uma oferta elegível sem enviar mensagens…'; preview.classList.remove('ready'); try {
    const result = await api('/api/automation/preview', { method: 'POST', body: '{}' });
    preview.dataset.loaded = 'true'; preview.classList.add('ready');
    preview.innerHTML = `<strong>${escapeHtml(result.offer.title)}</strong><b>${money(result.offer.price)}${result.offer.discount ? ` · ${escapeHtml(result.offer.discount)}% OFF` : ''}</b><div class="preview-meta"><span>${escapeHtml(result.destination.category)}</span><span>Grupo: ${escapeHtml(result.destination.name)}</span></div>`;
    toast('Prévia gerada sem enviar nenhuma mensagem.');
  } catch (error) { preview.textContent = error.message; preview.classList.remove('ready'); toast(error.message, true); } return; }
  if (event.target.closest('#refresh-direct-groups')) { try {
    const status = await api('/api/whatsapp-direct/groups/refresh', { method: 'POST', body: '{}' });
    await reload();
    toast(status.groups?.length ? `${status.groups.length} grupo(s) autoral(is) atualizado(s).` : 'Nenhum grupo autoral foi encontrado. Confirme se este WhatsApp é administrador do grupo.');
  } catch (error) { toast(error.message, true); } return; }
  if (event.target.closest('#refresh-destinations-groups')) { try {
    const button = $('#refresh-destinations-groups'); button.disabled = true; button.textContent = 'Sincronizando…';
    const status = await api('/api/whatsapp-direct/groups/refresh', { method: 'POST', body: '{}' });
    await reload();
    toast(status.groups?.length ? `${status.groups.length} grupo(s) autoral(is) sincronizado(s).` : 'Nenhum grupo autoral foi encontrado. Confirme se este WhatsApp é administrador do grupo.');
  } catch (error) { toast(error.message, true); } finally { const button = $('#refresh-destinations-groups'); if (button) { button.disabled = false; button.textContent = '↻ Sincronizar grupos'; } } return; }
  const destinationFilter = event.target.closest('[data-destination-view]');
  if (destinationFilter) { destinationView = destinationFilter.dataset.destinationView; renderDestinations(); return; }
  const saveCategories = event.target.closest('.save-destination-categories');
  if (saveCategories) { try {
    const editor = saveCategories.closest('.destination-category-editor');
    const categoryIds = Array.from(editor.querySelectorAll('input:checked')).map(input => input.value);
    if (!categoryIds.length) throw new Error('Escolha ao menos uma categoria para manter a rotação ativa.');
    saveCategories.disabled = true; saveCategories.textContent = 'Salvando…';
    await api(`/api/destinations/${saveCategories.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ categoryIds }) });
    await reload(); toast(`${categoryIds.length} categoria(s) salvas. A próxima oferta será sorteada entre elas.`);
  } catch (error) { toast(error.message, true); } return; }
  if (event.target.closest('#validate-integrations')) { const summary = $('#integration-validation'); summary.textContent = 'Validando Shopee e WhatsApp…'; try {
    const response = await api('/api/offers/preview', { method: 'POST', body: JSON.stringify({ categoryId: 'all' }) });
    integrationsCheckedAt = new Date(); await reload();
    summary.textContent = `Shopee validada: ${response.offers?.length || 0} oferta(s) encontrada(s) com os filtros atuais. WhatsApp direto: ${state.directStatus?.status || 'desconhecido'}.`;
    toast('Integrações validadas.');
  } catch (error) { await reload(); summary.textContent = `A validação da Shopee precisa de atenção: ${error.message}`; toast(error.message, true); } return; }
  if (event.target.closest('#new-destination')) return $('#destination-dialog').showModal();
  const editName = event.target.closest('.edit-destination-name');
  if (editName) { const destination = (state.destinations || []).find(item => item.id === editName.dataset.id); const name = window.prompt('Nome exibido nos relatórios de cliques e vendas:', destination?.name || ''); if (name === null) return; try { await api(`/api/destinations/${editName.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ name }) }); await reload(); toast('Nome do grupo atualizado para os próximos relatórios.'); } catch (error) { toast(error.message, true); } return; }
  const editCategories = event.target.closest('.edit-destination-categories');
  if (editCategories) {
    const destination = (state.destinations || []).find(item => item.id === editCategories.dataset.id);
    if (!destination) return;
    const selected = selectedCategoryIds(destination);
    $('#category-edit-options').innerHTML = (state.categories || []).map(category => `<label class="category-chip${selected.includes(category.id) ? ' active' : ''}"><input type="checkbox" value="${escapeHtml(category.id)}" ${selected.includes(category.id) ? 'checked' : ''}><span>${escapeHtml(category.label)}</span></label>`).join('');
    $('#category-dialog').dataset.destinationId = destination.id;
    $('#category-dialog').showModal();
    return;
  }
  const group = event.target.closest('.select-group');
  if (group) { $('#destination-type').value = 'group'; $('#destination-name').value = group.dataset.name; $('#destination-number').value = group.dataset.id; $('#destination-number-label').firstChild.textContent = 'ID do grupo (…@g.us)'; $('#destination-dialog').showModal(); return; }
  if (event.target.closest('.close')) return event.target.closest('dialog').close();
  const toggle = event.target.closest('.toggle-destination');
  if (toggle) { try { await api(`/api/destinations/${toggle.dataset.id}`, { method: 'PATCH', body: '{}' }); await reload(); } catch (error) { toast(error.message, true); } }
  const remove = event.target.closest('.delete-destination');
  if (remove && confirm('Remover este destino?')) { try { await api(`/api/destinations/${remove.dataset.id}`, { method: 'DELETE' }); await reload(); } catch (error) { toast(error.message, true); } }
});
document.addEventListener('change', event => {
  if (['offer-sort', 'offer-discount', 'offer-price-max'].includes(event.target.id)) { renderOfferCatalog(); return; }
  const input = event.target.closest('.category-chip input');
  if (input) input.closest('.category-chip').classList.toggle('active', input.checked);
});
document.addEventListener('input', event => {
  if (event.target.id === 'offer-search-input' || event.target.id === 'offer-price-max') renderOfferCatalog();
});
$('#load-offers').addEventListener('click', loadOffers);
$('#save-shopee').addEventListener('click', async () => { try {
  await api('/api/config/shopee', { method: 'POST', body: JSON.stringify({ appId: $('#shopee-app-id').value, secret: $('#shopee-secret').value, minDiscount: $('#min-discount').value, minPrice: $('#min-price').value, maxPrice: $('#max-price').value, preferredMaxPrice: $('#preferred-max-price').value, maxOffers: $('#max-offers').value }) });
  $('#shopee-dialog').close(); await reload(); toast('Integração Shopee salva.');
} catch (error) { toast(error.message, true); } });
$('#save-whatsapp').addEventListener('click', async () => { try {
  await api('/api/config/whatsapp', { method: 'POST', body: JSON.stringify({ token: $('#wa-token').value, phoneNumberId: $('#wa-phone-id').value, mode: $('#wa-mode').value, templateName: $('#wa-template').value }) });
  $('#whatsapp-dialog').close(); await reload(); toast('Configuração do WhatsApp salva.');
} catch (error) { toast(error.message, true); } });
async function updateDirectStatus() {
  const status = await api('/api/whatsapp-direct/status');
  $('#direct-status').textContent = status.error || (status.status === 'aguardando_qr' ? 'Aguardando leitura do QR Code…' : status.status);
  $('#direct-qr').innerHTML = status.qr ? `<img src="${status.qr}" alt="QR Code do WhatsApp">` : status.status === 'conectado' ? '✓ WhatsApp conectado com sucesso.' : status.error ? 'Não foi possível gerar o QR Code. Clique em “Gerar QR Code” para tentar novamente.' : 'Gerando QR Code…';
  if (status.status === 'aguardando_qr' || status.status === 'conectando') setTimeout(updateDirectStatus, 1800);
  await reload();
}
$('#start-direct').addEventListener('click', async () => { try {
  $('#direct-status').textContent = 'Iniciando conexão…';
  await api('/api/whatsapp-direct/connect', { method: 'POST', body: '{}' });
  setTimeout(updateDirectStatus, 900);
} catch (error) { toast(error.message, true); } });
$('#save-destination').addEventListener('click', async () => { try {
  const categoryIds = Array.from($('#destination-category').querySelectorAll('input:checked')).map(input => input.value);
  if (!categoryIds.length) throw new Error('Escolha ao menos uma categoria para este destino.');
  await api('/api/destinations', { method: 'POST', body: JSON.stringify({ name: $('#destination-name').value, number: $('#destination-number').value, type: $('#destination-type').value, categoryIds, consent: $('#destination-consent').checked }) });
  $('#destination-dialog').close(); $('#destination-name').value = ''; $('#destination-number').value = ''; $('#destination-category').querySelectorAll('input').forEach(input => { input.checked = input.value === 'all'; input.closest('.category-chip').classList.toggle('active', input.checked); }); $('#destination-consent').checked = false; await reload(); toast(`Destino adicionado com ${categoryIds.length} categoria(s) em rotação.`);
} catch (error) { toast(error.message, true); } });
$('#save-category-rotation').addEventListener('click', async () => { try {
  const dialog = $('#category-dialog'); const categoryIds = Array.from($('#category-edit-options').querySelectorAll('input:checked')).map(input => input.value);
  if (!categoryIds.length) throw new Error('Escolha pelo menos uma categoria.');
  await api(`/api/destinations/${dialog.dataset.destinationId}`, { method: 'PATCH', body: JSON.stringify({ categoryIds }) });
  dialog.close(); await reload(); toast(`Rotação atualizada com ${categoryIds.length} categoria(s).`);
} catch (error) { toast(error.message, true); } });
$('#destination-type').addEventListener('change', () => {
  const group = $('#destination-type').value === 'group';
  $('#destination-number-label').firstChild.textContent = group ? 'ID do grupo (…@g.us)' : 'Número com DDI';
  $('#destination-number').placeholder = group ? '120363…@g.us' : '5511999999999';
});
$('#save-automation').addEventListener('click', async () => { try {
  await api('/api/automation', { method: 'POST', body: JSON.stringify({ enabled: $('#automation-enabled').checked, intervalMinutes: $('#automation-interval').value }) });
  await reload(); toast('Automação atualizada.');
} catch (error) { toast(error.message, true); } });
$('#save-safety').addEventListener('click', async () => { try {
  await api('/api/safety', { method: 'POST', body: JSON.stringify({ maxPerHour: $('#safety-hour').value, maxPerDay: $('#safety-day').value, minMinutesPerDestination: $('#safety-group-minutes').value, quietStartHour: $('#safety-quiet-start').value, quietEndHour: $('#safety-quiet-end').value }) });
  await reload(); toast('Proteções de envio atualizadas.');
} catch (error) { toast(error.message, true); } });
$('#run-now').addEventListener('click', async () => { try { const result = await api('/api/test-send', { method: 'POST', body: '{}' }); toast(`${result.found} oferta de teste enviada.`); await reload(); } catch (error) { toast(error.message, true); await reload(); } });
$('#open-account').addEventListener('click', async () => { try {
  $('#account-dialog').showModal(); $('#account-user').textContent = state.user?.username || '';
  $('#two-factor-state').textContent = state.user?.twoFactorEnabled ? '2 fatores ativado' : '2 fatores não ativado';
  $('#two-factor-setup').hidden = true;
  if (state.user?.role === 'admin') { const data = await api('/api/users'); $('#users-list').innerHTML = `<p><strong>${data.users.length}/${data.limit} usuários cadastrados</strong></p>${data.users.map(user => `<small>${escapeHtml(user.username)} · ${user.role === 'admin' ? 'administrador' : 'usuário'} · ${user.twoFactorEnabled ? '2FA ativo' : 'sem 2FA'}</small>`).join('<br>')}`; }
  else $('#users-list').innerHTML = '';
} catch (error) { toast(error.message, true); } });
$('#start-2fa').addEventListener('click', async () => { try { const data = await api('/api/auth/2fa/setup', { method: 'POST', body: '{}' }); $('#two-factor-qr').innerHTML = `<img src="${data.qr}" alt="QR Code de autenticação">`; $('#two-factor-key').textContent = data.manualKey; $('#two-factor-setup').hidden = false; } catch (error) { toast(error.message, true); } });
$('#confirm-2fa').addEventListener('click', async () => { try { await api('/api/auth/2fa/enable', { method: 'POST', body: JSON.stringify({ code: $('#two-factor-code').value }) }); $('#two-factor-setup').hidden = true; await reload(); toast('2 fatores ativado.'); } catch (error) { toast(error.message, true); } });
$('#disable-2fa').addEventListener('click', async () => { const code = window.prompt('Digite o código atual do autenticador para desativar:'); if (!code) return; try { await api('/api/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ code }) }); await reload(); toast('2 fatores desativado.'); } catch (error) { toast(error.message, true); } });
$('#logout').addEventListener('click', async () => { try { await api('/api/auth/logout', { method: 'POST', body: '{}' }); window.location.href = '/login.html'; } catch (error) { toast(error.message, true); } });
reload().catch(error => toast(error.message, true));
setInterval(() => { if (state.automation?.enabled) renderDestinations(); }, 30_000);
// Mantém métricas, próximos envios, grupos e atividades atualizados sem F5.
// Não consulta a Shopee em segundo plano: a busca de ofertas continua ocorrendo
// somente em envios automáticos ou quando o usuário pede uma prévia.
setInterval(backgroundRefresh, 20_000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') backgroundRefresh(); });
