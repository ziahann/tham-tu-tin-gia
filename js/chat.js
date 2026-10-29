// Chat NPC: phát cảnh hội thoại viết sẵn, trả lời tự do theo từ khóa, lưu nhật ký (tfd_chat_log).
import { data, t, fill, npcById, sceneById } from './data.js';
import { state, setFlag, saveProgress } from './state.js';
import { drawAvatar } from './pixel.js';
import { normalize, containsPhrase } from './text.js';
import { sfx } from './audio.js';

const LOG_KEY = 'tfd_chat_log';
const els = {};
let currentNpc = 'npc1';
let screenId = 'S0';

/** Đọc nhật ký chat (mọi lượt chơi). */
export function readLog() {
  try {
    const log = JSON.parse(localStorage.getItem(LOG_KEY));
    if (log && log.schema === 1 && Array.isArray(log.runs)) return log;
  } catch { /* hỏng thì tạo mới */ }
  return { schema: 1, runs: [] };
}

/** Ghi nhật ký chat. */
function writeLog(log) {
  try { localStorage.setItem(LOG_KEY, JSON.stringify(log)); } catch { /* bỏ qua */ }
}

/** Lấy lượt chơi hiện tại trong nhật ký, tạo nếu chưa có. */
function currentRun(log) {
  const p = state.progress;
  let run = log.runs.find(r => r.runId === p.runId);
  if (!run) {
    run = { runId: p.runId, startedAt: p.startedAt, heroName: p.heroName, messages: [] };
    log.runs.push(run);
  }
  return run;
}

/** Biến thay thế trong lời thoại. */
function vars() {
  const hero = data.quests.hero;
  return {
    hero: fill(hero.titleFormat, { name: state.progress?.heroName || hero.displayName }),
    org: data.quests.organization.name
  };
}

/** Gắn phần tử DOM và sự kiện của khung chat. */
export function initChat() {
  els.root = document.getElementById('chat');
  els.list = document.getElementById('chat-messages');
  els.choices = document.getElementById('chat-choices');
  els.form = document.getElementById('chat-form');
  els.input = document.getElementById('chat-input');
  els.toggle = document.getElementById('chat-toggle');
  els.input.placeholder = t('chat.placeholder');

  els.toggle.addEventListener('click', () => setChatOpen(els.root.classList.contains('is-collapsed')));
  els.form.addEventListener('submit', e => {
    e.preventDefault();
    const text = els.input.value.trim();
    if (!text) return;
    els.input.value = '';
    freeChat(text);
  });
  if (isNarrow()) setChatOpen(false);
}

const isNarrow = () => window.matchMedia('(max-width: 760px)').matches;

/** Mở / thu gọn khung chat. */
export function setChatOpen(open) {
  els.root.classList.toggle('is-collapsed', !open);
  els.toggle.setAttribute('aria-expanded', String(open));
}

/** Đặt NPC đang trò chuyện và màn hiện tại. */
export function setContext(npcId, screen) {
  currentNpc = npcId;
  screenId = screen;
}

/** Vẽ lại các tin nhắn của lượt chơi hiện tại (khi tải lại trang). */
export function renderHistory() {
  els.list.innerHTML = '';
  els.choices.innerHTML = '';
  if (!state.progress) return;
  const run = readLog().runs.find(r => r.runId === state.progress.runId);
  run?.messages.forEach(renderMessage);
}

/** Hiển thị một tin nhắn trong khung chat. */
function renderMessage(msg) {
  const li = document.createElement('li');
  const isPlayer = msg.from === 'player';
  li.className = `msg ${isPlayer ? 'from-player' : 'from-npc'}`;
  const avatar = document.createElement('canvas');
  avatar.width = 16; avatar.height = 24;
  avatar.setAttribute('aria-hidden', 'true');
  drawAvatar(avatar, isPlayer ? 'hero' : msg.from);
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  const who = document.createElement('span');
  who.className = 'who';
  if (isPlayer) {
    who.textContent = t('chat.you');
  } else {
    const npc = npcById(msg.from);
    who.textContent = npc ? `${npc.name} · ${t('simulated')}` : msg.from;
  }
  bubble.append(who, document.createTextNode(msg.text));
  li.append(avatar, bubble);
  els.list.append(li);
  els.list.scrollTop = els.list.scrollHeight;
}

/** Lưu và hiển thị một tin nhắn. */
export function appendMessage(msg) {
  const full = { t: new Date().toISOString(), screen: screenId, ...msg };
  const log = readLog();
  currentRun(log).messages.push(full);
  writeLog(log);
  renderMessage(full);
}

const wait = ms => new Promise(r => setTimeout(r, state.settings.reduceMotion ? 0 : ms));

/** Phát một cảnh hội thoại; trả về giá trị "next" cuối cùng ("end" hoặc "go:Sx"). */
export async function playScene(sceneId) {
  let scene = sceneById(sceneId);
  setChatOpen(true);
  while (scene) {
    for (const line of scene.lines) {
      await wait(350);
      appendMessage({ from: scene.npc, dialogueId: scene.id, lineId: line.id, text: fill(line.text, vars()) });
    }
    if (!scene.choices?.length) {
      // Trên điện thoại khung chat che nội dung: thu gọn sau khi cảnh kết thúc.
      if (isNarrow()) setTimeout(() => setChatOpen(false), state.settings.reduceMotion ? 2500 : 3500);
      return scene.next || 'end';
    }
    const choice = await askChoice(scene.choices);
    appendMessage({ from: 'player', dialogueId: scene.id, choiceId: choice.id, text: choice.text });
    (choice.setFlags || []).forEach(setFlag);
    saveProgress();
    if (!choice.next || choice.next === 'end' || choice.next.startsWith('go:')) return choice.next || 'end';
    scene = sceneById(choice.next);
  }
  return 'end';
}

/** Hiện các nút lựa chọn, chờ người chơi bấm một nút. */
function askChoice(choices) {
  return new Promise(resolve => {
    els.choices.innerHTML = '';
    choices.forEach(c => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn';
      b.textContent = c.text;
      b.addEventListener('click', () => { sfx('click'); els.choices.innerHTML = ''; resolve(c); });
      els.choices.append(b);
    });
    els.choices.querySelector('button')?.focus();
  });
}

/** Chọn câu trả lời theo từ khóa cho câu hỏi tự do. */
export function matchTopic(npcId, text) {
  const cfg = data.npcs.freeChat?.[npcId] || data.npcs.freeChat?.npc1;
  if (!cfg) return { id: null, text: '' };
  const norm = normalize(text);
  let best = null, bestScore = 0;
  for (const topic of cfg.topics) {
    const score = topic.keywords.filter(k => containsPhrase(norm, normalize(k))).length;
    if (score > bestScore) { best = topic; bestScore = score; }
  }
  return best ? { id: best.id, text: best.text } : { id: 'fallback', text: cfg.fallback };
}

/** Người chơi gõ câu hỏi tự do; NPC hiện tại trả lời theo từ khóa. */
function freeChat(text) {
  if (!state.progress) return;
  appendMessage({ from: 'player', free: true, text });
  const npc = data.npcs.freeChat?.[currentNpc] ? currentNpc : 'npc1';
  const reply = matchTopic(npc, text);
  setTimeout(() => appendMessage({ from: npc, topicId: reply.id, text: fill(reply.text, vars()) }), state.settings.reduceMotion ? 0 : 300);
}

/** Tải nhật ký chat về máy dưới dạng JSON. */
export function exportLog() {
  const blob = new Blob([JSON.stringify(readLog(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `tham-tu-tin-gia-nhat-ky-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
