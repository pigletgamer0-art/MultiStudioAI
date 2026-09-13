async function pullModel(name) {
  if (!state.ollamaOnline) return showToast('Ollama no está conectado.', true);
  $('#modalBackdrop').classList.remove('hidden');
  $('#modalTitle').textContent = `Instalando ${name}`;
  $('#modalMessage').textContent = 'Conectando con la biblioteca de Ollama…';
  $('#downloadFill').style.width = '0%';
  $('#downloadStatus').textContent = '0%';
  $('#downloadSize').textContent = '';
  $('#closeModalBtn').classList.add('hidden');
  try {
    const response = await fetch(`${LOCAL_API_BASE}/api/pull`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: name }) });
    if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.error || `Error ${response.status}`); }
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue; let data; try { data = JSON.parse(line); } catch { continue; }
        $('#modalMessage').textContent = data.status || 'Descargando…';
        if (data.total && data.completed) { const pct = Math.min(100, Math.round((data.completed / data.total) * 100)); $('#downloadFill').style.width = `${pct}%`; $('#downloadStatus').textContent = `${pct}%`; $('#downloadSize').textContent = `${humanBytes(data.completed)} / ${humanBytes(data.total)}`; }
      }
    }
    $('#downloadFill').style.width = '100%'; $('#downloadStatus').textContent = '100%'; $('#modalMessage').textContent = 'Modelo instalado correctamente.'; $('#closeModalBtn').classList.remove('hidden'); await refreshStatus();
  } catch (error) { $('#modalMessage').textContent = error.message; $('#downloadStatus').textContent = 'Error'; $('#closeModalBtn').classList.remove('hidden'); }
}

function chooseAutoModel(prompt, attachments) {
  const names = installedNames(); if (!names.length) return null;
  const find = (...prefixes) => names.find(name => prefixes.some(p => name.toLowerCase().startsWith(p)));
  const hasImage = attachments.some(a => a.kind === 'image'); const text = String(prompt || '').toLowerCase();
  if (hasImage) return find('gemma3:', 'qwen3-vl', 'qwen2.5-vl', 'llava', 'minicpm-v') || names[0];
  if (/luau|lua|roblox|script|código|codigo|program|bug|error|función|function|studio/.test(text)) return find('qwen3-coder', 'qwen2.5-coder:1.5b', 'qwen2.5-coder', 'deepseek-coder', 'qwen3:') || names[0];
  if (/razona|razonar|plan|arquitectura|por qué|porque|analiza|analizar|lógica|logica/.test(text)) return find('deepseek-r1', 'qwen3:') || names[0];
  return find('qwen3:', 'gemma3:', 'llama3.2') || names[0];
}

function updateModelHint() {
  const name = $('#modelSelect').value; state.selectedModel = name; localStorage.setItem('ms_selected_model', name);
  if (name === '__auto__') { $('#modelHint').textContent = 'Elige automáticamente según la tarea; también puede pasar a visión si una herramienta devuelve una imagen.'; $('#selectedModelMeta').textContent = '✨ Automático'; }
  else { $('#modelHint').textContent = `${modelSupportsVision(name) ? '👁️ Modelo con visión. ' : ''}Puedes cambiarlo sin salir de la conversación.`; $('#selectedModelMeta').textContent = name; }
}

function studioLog(kind, text, detail = '') {
  state.studioLog.push({ t: nowTime(), kind, text, detail }); if (state.studioLog.length > 100) state.studioLog.shift(); renderStudioLog();
}
function renderStudioLog() {
  const root = $('#studioLog'); if (!root) return;
  if (!state.studioLog.length) { root.innerHTML = '<div class="log-line muted">Aún no hay actividad.</div>'; return; }
  root.innerHTML = state.studioLog.slice().reverse().map(item => `<div class="log-line ${escapeHtml(item.kind)}"><span>${escapeHtml(item.t)}</span><b>${escapeHtml(item.text)}</b>${item.detail ? `<small>${escapeHtml(item.detail)}</small>` : ''}</div>`).join('');
}
function rejectBridgePending(reason) { for (const [, pending] of state.bridge.pending) { clearTimeout(pending.timer); pending.reject(new Error(reason)); } state.bridge.pending.clear(); }
function applyBridgeSnapshot(data) {
  if (!data || typeof data !== 'object') return;
  if ('mcp_alive' in data) state.bridge.mcpAlive = !!data.mcp_alive; if ('studio' in data) state.bridge.studio = data.studio; if ('studio_app' in data) state.bridge.studioApp = data.studio_app; if ('studio_proc' in data) state.bridge.studioProc = data.studio_proc; if (Array.isArray(data.tools)) state.bridge.tools = data.tools; if (Array.isArray(data.servers)) state.bridge.servers = data.servers; renderStudioStatus(); renderStudioTools();
}
function scheduleBridgeReconnect() { clearTimeout(state.bridge.reconnectTimer); state.bridge.reconnectTimer = setTimeout(connectStudioBridge, 1800); }
function connectStudioBridge() {
  const old = state.bridge.ws; if (old && (old.readyState === WebSocket.OPEN || old.readyState === WebSocket.CONNECTING)) return;
  try {
    const ws = new WebSocket(STUDIO_WS); state.bridge.ws = ws;
    ws.addEventListener('open', () => { state.bridge.connected = true; studioLog('ok', 'Bridge conectado', STUDIO_WS); renderStudioStatus(); listStudioTools(true).catch(() => {}); });
    ws.addEventListener('message', event => { let msg; try { msg = JSON.parse(event.data); } catch { return; } if (msg.type === 'connected' || msg.type === 'studio_status' || msg.type === 'tools' || msg.type === 'mcp_status') applyBridgeSnapshot(msg); if (msg.id != null) { const pending = state.bridge.pending.get(String(msg.id)); if (pending) { state.bridge.pending.delete(String(msg.id)); clearTimeout(pending.timer); pending.resolve(msg); } } });
    ws.addEventListener('close', () => { const wasConnected = state.bridge.connected; state.bridge.connected = false; state.bridge.studio = null; rejectBridgePending('El bridge de Studio se desconectó.'); if (wasConnected) studioLog('warn', 'Bridge desconectado', 'Intentando reconectar…'); renderStudioStatus(); scheduleBridgeReconnect(); });
    ws.addEventListener('error', () => { state.bridge.connected = false; renderStudioStatus(); });
  } catch { state.bridge.connected = false; renderStudioStatus(); scheduleBridgeReconnect(); }
}
function bridgeRequest(type, payload = {}, timeoutMs = 15000) {
  return new Promise((resolve, reject) => { const ws = state.bridge.ws; if (!state.bridge.connected || !ws || ws.readyState !== WebSocket.OPEN) { reject(new Error('El bridge de Studio no está conectado.')); return; } const id = `ms-${Date.now()}-${state.bridge.seq++}`; const timer = setTimeout(() => { state.bridge.pending.delete(id); reject(new Error(`Studio no respondió a '${type}' a tiempo.`)); }, timeoutMs); state.bridge.pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ type, id, ...payload })); });
}
async function refreshStudioStatus() { if (!state.bridge.connected) { connectStudioBridge(); return; } try { const status = await bridgeRequest('studio_status', {}, 10000); applyBridgeSnapshot(status); } catch { renderStudioStatus(); } }
async function listStudioTools(force = false) { if (!state.bridge.connected) throw new Error('Bridge desconectado.'); if (!force && state.bridge.tools.length) return state.bridge.tools; const result = await bridgeRequest('list_tools', {}, 20000); applyBridgeSnapshot(result); return state.bridge.tools; }
function bareToolName(name) { return String(name || '').split('/').pop().split('.').pop(); }
function resolveToolName(requested) { if (!requested) return null; const exact = state.bridge.tools.find(t => t.name === requested); if (exact) return exact.name; const bare = bareToolName(requested); const matches = state.bridge.tools.filter(t => bareToolName(t.name) === bare); return matches.length === 1 ? matches[0].name : null; }
function hasStudioTool(name) { return !!resolveToolName(name); }
function renderStudioStatus() {
  const dot = $('#studioDot'); const heroDot = $('#studioHeroDot'); if (!dot || !heroDot) return; const setDot = (el, cls) => { el.className = `status-dot ${cls}`; };
  let cls = 'offline', title = 'Bridge desconectado', detail = 'Ejecuta START_MULTISTUDIO.cmd', heroTitle = 'Esperando el bridge local', heroText = 'Mantén abierta la terminal de MultiStudio.';
  if (state.bridge.connected) {
    if (state.bridge.studio === true) { cls = 'online'; title = 'Roblox Studio conectado'; detail = `${state.bridge.tools.length} comandos MCP disponibles`; heroTitle = 'Studio listo'; heroText = 'El agente puede inspeccionar y modificar el Place mediante MCP.'; }
    else if (state.bridge.studioApp === true || state.bridge.studioProc === true) { cls = 'warning'; title = 'Studio detectado, Place no listo'; detail = 'Abre un Place y verifica MCP'; heroTitle = 'Falta conectar el Place'; heroText = 'Abre tu Place y activa “Studio as MCP Server” desde Assistant AI.'; }
    else { cls = 'warning'; title = 'Bridge listo · Studio esperando'; detail = 'Abre Roblox Studio y un Place'; heroTitle = 'Esperando Roblox Studio'; heroText = 'Abre un Place y activa Studio as MCP Server.'; }
  }
  setDot(dot, cls); setDot(heroDot, cls); $('#studioStatus').textContent = title; $('#studioDetail').textContent = detail; $('#studioHeroTitle').textContent = heroTitle; $('#studioHeroText').textContent = heroText;
  const captureAvailable = state.bridge.studio === true && hasStudioTool('screen_capture'); $('#captureStudioBtn')?.classList.toggle('hidden', !captureAvailable); if ($('#studioCaptureBtn')) $('#studioCaptureBtn').disabled = !captureAvailable; if ($('#studioStateBtn')) $('#studioStateBtn').disabled = state.bridge.studio !== true;
}
