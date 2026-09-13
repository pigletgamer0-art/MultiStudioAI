'use strict';

// MultiStudio AI 0.3.0
// Local multi-model web + Roblox Studio MCP agent.
// This project is GPL-3.0. The Studio bridge and parts of the command protocol
// are derived from ZeroScript Free 1.5.5 (see THIRD_PARTY_NOTICES.md).

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const MAX_POINTS = 1_000_000;
const REGEN_MS = 10 * 60 * 1000;
const REGEN_PER_MS = MAX_POINTS / REGEN_MS;
const STUDIO_WS = 'ws://127.0.0.1:17613';
const IS_LOCAL_HOST = ['127.0.0.1', 'localhost'].includes(location.hostname);
const LOCAL_API_BASE = IS_LOCAL_HOST ? '' : 'http://127.0.0.1:8765';

const DEFAULT_SYSTEM_PROMPT = `Eres MultiStudio AI, un asistente especializado en Roblox Studio, Luau y diseño de sistemas de juegos.

Reglas generales:
- Da soluciones concretas y compatibles con Roblox Studio actual.
- Si el agente de Studio está activado, usa el proyecto REAL como fuente de verdad: inspecciona antes de asumir.
- Prefiere cambios pequeños y seguros antes que rehacer sistemas completos.
- Valida en el servidor todo lo relacionado con economía, inventarios, daño, recompensas o datos persistentes.
- No inventes APIs de Roblox. Si no conoces una función con seguridad, compruébala usando las herramientas disponibles o dilo.
- Si el usuario adjunta capturas, Asset IDs, código o archivos, úsalos como contexto principal.
- Cuando el trabajo esté terminado, da un resumen corto de lo que cambiaste.`;

const TOOL_NOTES = {
  execute_luau: 'Usa return para obtener salida; print() no es una salida fiable. El datamodel_type suele ser Edit. Evita esperas indefinidas y usa timeout en WaitForChild.',
  multi_edit: 'Antes de editar un script usa script_read. old_string debe coincidir exactamente. Para cambios persistentes de código, prefiere multi_edit.',
  script_read: 'Lee el script real antes de proponer o aplicar un cambio que dependa de su contenido.',
  inspect_instance: 'Úsalo para comprobar propiedades/atributos reales antes de modificarlos.',
  screen_capture: 'Devuelve una captura de Studio. Solo un modelo con visión puede analizar sus píxeles.',
};

const RECOMMENDED = [
  {
    name: 'qwen2.5-coder:0.5b',
    title: 'Qwen 2.5 Coder 0.5B',
    role: 'Código ultra ligero. Útil en equipos con muy poca RAM.',
    badge: '~398 MB',
    className: 'good',
  },
  {
    name: 'qwen2.5-coder:1.5b',
    title: 'Qwen 2.5 Coder 1.5B',
    role: 'Código y Luau en equipos modestos. Buen punto de partida para Roblox.',
    badge: '~986 MB',
    className: 'good',
  },
  {
    name: 'qwen3:1.7b',
    title: 'Qwen 3 1.7B',
    role: 'Chat general, razonamiento ligero y seguimiento de instrucciones.',
    badge: 'Ligero',
    className: 'good',
  },
  {
    name: 'deepseek-r1:1.5b',
    title: 'DeepSeek R1 1.5B',
    role: 'Razonamiento local para planificar y revisar sistemas.',
    badge: 'Thinking',
    className: '',
  },
  {
    name: 'gemma3:4b',
    title: 'Gemma 3 4B',
    role: 'Visión: analiza capturas e imágenes además de texto.',
    badge: '~3.3 GB · Visión',
    className: '',
  },
  {
    name: 'qwen3-coder:30b',
    title: 'Qwen 3 Coder 30B',
    role: 'Código agentic avanzado y contexto largo. Requiere un equipo potente.',
    badge: '~19 GB',
    className: 'warn',
  },
];

const state = {
  ollamaOnline: false,
  installed: [],
  messages: [],
  attachments: [],
  busy: false,
  stopRequested: false,
  abortController: null,
  selectedModel: localStorage.getItem('ms_selected_model') || '__auto__',
  points: MAX_POINTS,
  pointsUpdatedAt: Date.now(),
  studioLog: [],
  capture: { stream: null, video: null, shots: [], busy: false },
  bridge: {
    ws: null,
    connected: false,
    mcpAlive: false,
    studio: null,
    studioApp: null,
    studioProc: null,
    tools: [],
    servers: [],
    seq: 1,
    pending: new Map(),
    reconnectTimer: null,
  },
};

function formatNumber(n) {
  return Math.floor(n).toLocaleString('es-CL');
}

function humanBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let value = bytes;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i++; }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}

function nowTime() {
  return new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function loadPoints() {
  try {
    const saved = JSON.parse(localStorage.getItem('ms_points') || '{}');
    state.points = Number.isFinite(saved.points) ? saved.points : MAX_POINTS;
    state.pointsUpdatedAt = Number.isFinite(saved.updatedAt) ? saved.updatedAt : Date.now();
  } catch {
    state.points = MAX_POINTS;
    state.pointsUpdatedAt = Date.now();
  }
  regenPoints();
}

function savePoints() {
  localStorage.setItem('ms_points', JSON.stringify({ points: state.points, updatedAt: state.pointsUpdatedAt }));
}

function regenPoints() {
  const now = Date.now();
  const elapsed = Math.max(0, now - state.pointsUpdatedAt);
  state.points = Math.min(MAX_POINTS, state.points + elapsed * REGEN_PER_MS);
  state.pointsUpdatedAt = now;
  savePoints();
  renderPoints();
}

function spendPoints(amount) {
  regenPoints();
  state.points = Math.max(0, state.points - Math.max(0, amount));
  state.pointsUpdatedAt = Date.now();
  savePoints();
  renderPoints();
}

function renderPoints() {
  const fraction = Math.max(0, Math.min(1, state.points / MAX_POINTS));
  $('#pointsText').textContent = formatNumber(state.points);
  $('#pointsFill').style.width = `${fraction * 100}%`;
  const missing = MAX_POINTS - state.points;
  if (missing < 10) {
    $('#fullText').textContent = 'Completo';
  } else {
    const seconds = Math.ceil(missing / (MAX_POINTS / 600));
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    $('#fullText').textContent = `Completo en ${m}:${String(s).padStart(2, '0')}`;
  }
}

function showToast(message, error = false) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.toggle('error', error);
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 3400);
}

async function refreshStatus() {
  try {
    const response = await fetch(`${LOCAL_API_BASE}/api/status`, { cache: 'no-store' });
    const data = await response.json();
    state.ollamaOnline = !!data.ok;
    state.installed = Array.isArray(data.models) ? data.models : [];
    $('#ollamaDot').classList.toggle('online', state.ollamaOnline);
    $('#ollamaDot').classList.toggle('offline', !state.ollamaOnline);
    $('#ollamaStatus').textContent = state.ollamaOnline ? 'Ollama conectado' : 'Ollama desconectado';
    $('#ollamaVersion').textContent = state.ollamaOnline
      ? `v${data.version || '?'} · ${state.installed.length} modelo${state.installed.length === 1 ? '' : 's'}`
      : 'Abre Ollama y vuelve a intentar';
    renderModelSelect();
    renderModels();
  } catch (error) {
    state.ollamaOnline = false;
    $('#ollamaDot').className = 'status-dot offline';
    $('#ollamaStatus').textContent = 'Web sin Ollama';
    $('#ollamaVersion').textContent = error.message;
  }
}

function installedNames() {
  return state.installed.map(m => m.name || m.model).filter(Boolean);
}

function modelSupportsVision(name) {
  const n = String(name || '').toLowerCase();
  return /gemma3(?::|$)|qwen(?:2\.5|3)[-_]?vl|llava|minicpm-v|llama3\.2[-_:]?vision|moondream/.test(n);
}

function findVisionModel() {
  const names = installedNames();
  return names.find(modelSupportsVision) || null;
}

function renderModelSelect() {
  const select = $('#modelSelect');
  const previous = state.selectedModel;
  select.innerHTML = '<option value="__auto__">✨ Automático</option>';
  for (const model of state.installed) {
    const name = model.name || model.model;
    const option = document.createElement('option');
    option.value = name;
    option.textContent = `${modelSupportsVision(name) ? '👁️ ' : ''}${name}`;
    select.appendChild(option);
  }
  if ([...select.options].some(o => o.value === previous)) select.value = previous;
  else {
    state.selectedModel = '__auto__';
    select.value = '__auto__';
  }
  updateModelHint();
}

function renderModels() {
  const names = new Set(installedNames());
  const root = $('#recommendedModels');
  root.innerHTML = '';
  for (const model of RECOMMENDED) {
    const installed = names.has(model.name);
    const card = document.createElement('div');
    card.className = 'model-card';
    card.innerHTML = `
      <div class="model-card-top">
        <div>
          <div class="model-name">${escapeHtml(model.title)}</div>
          <div class="model-role">${escapeHtml(model.role)}</div>
        </div>
        <span class="badge ${model.className || ''}">${escapeHtml(model.badge)}</span>
      </div>
      <div class="model-actions">
        <button class="install-btn ${installed ? 'installed' : ''}" data-model="${escapeHtml(model.name)}">
          ${installed ? '✓ Instalado' : '⬇ Instalar'}
        </button>
      </div>`;
    $('.install-btn', card).addEventListener('click', () => installed ? useModel(model.name) : pullModel(model.name));
    root.appendChild(card);
  }

  const installedRoot = $('#installedModels');
  installedRoot.innerHTML = '';
  if (!state.installed.length) {
    installedRoot.innerHTML = '<div class="model-card"><div class="model-role">No hay modelos instalados todavía.</div></div>';
    return;
  }
  for (const model of state.installed) {
    const name = model.name || model.model;
    const row = document.createElement('div');
    row.className = 'installed-row';
    row.innerHTML = `
      <div><div class="model-name">${escapeHtml(name)}</div><small>${humanBytes(model.size)}${modelSupportsVision(name) ? ' · 👁️ visión' : ''}</small></div>
      <button class="use-btn">Usar</button>
      <button class="delete-btn">Eliminar</button>`;
    $('.use-btn', row).addEventListener('click', () => useModel(name));
    $('.delete-btn', row).addEventListener('click', () => deleteModel(name));
    installedRoot.appendChild(row);
  }
}

function useModel(name) {
  state.selectedModel = name;
  localStorage.setItem('ms_selected_model', name);
  $('#modelSelect').value = name;
  updateModelHint();
  switchView('chat');
  showToast(`Modelo cambiado a ${name}`);
}

async function deleteModel(name) {
  if (!confirm(`¿Eliminar ${name} de Ollama?`)) return;
  try {
    const resp = await fetch(`${LOCAL_API_BASE}/api/model`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: name }),
    });
    if (!resp.ok) throw new Error((await resp.json()).error || 'No se pudo eliminar.');
    showToast(`${name} eliminado.`);
    await refreshStatus();
  } catch (error) {
    showToast(error.message, true);
  }
}
