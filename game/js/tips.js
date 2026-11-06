// Mẹo cho người mới: thẻ nhỏ hiện một lần mỗi mẹo, xếp hàng, chờ khi đang có cảnh cắt.
import { data, t } from './data.js';
import { state, saveSettings } from './state.js';

export const TIP_IDS = ['move', 'backpack', 'track', 'notebook', 'hint', 'minimize', 'cred', 'pressure', 'rumor', 'decoy', 'feed', 'board', 'guestCard', 'weather', 'crossing', 'eavesdrop'];
const SHOW_MS = 12000;
const queue = [];
let current = null; // { id, timer }

function next() {
  current = null;
  const box = document.getElementById('tip');
  if (box) box.hidden = true;
  if (queue.length) setTimeout(show, 0);
}

function show() {
  const box = document.getElementById('tip');
  if (current || !queue.length || !box) return;
  if (document.body.classList.contains('is-cine')) { setTimeout(show, 1000); return; }
  const id = queue.shift();
  const tip = data.ui.tips[id]; // t() chỉ trả chuỗi
  if (!tip || state.settings.tips === false) { show(); return; }
  const lines = id === 'move' && window.matchMedia('(pointer: coarse)').matches && tip.linesTouch ? tip.linesTouch : tip.lines;
  const title = document.createElement('b');
  title.textContent = tip.title;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = t('tipsUi.ok');
  box.replaceChildren(title, ...lines.map(l => Object.assign(document.createElement('p'), { textContent: l })), btn);
  box.hidden = false;
  const timer = setTimeout(() => { if (current?.timer === timer) next(); }, SHOW_MS);
  btn.addEventListener('click', () => { clearTimeout(timer); next(); });
  current = { id, timer };
  (state.settings.tipsSeen ||= []).push(id);
  saveSettings();
}

/** Hiện mẹo `id` một lần (bỏ qua nếu tắt mẹo, đã xem hoặc đã xếp hàng). */
export function showTip(id) {
  const s = state.settings;
  if (s.tips === false || !TIP_IDS.includes(id) || (s.tipsSeen || []).includes(id) || queue.includes(id) || current?.id === id) return;
  queue.push(id);
  show();
}

/** Chỉ cho debug: cho xem lại mọi mẹo. */
export function resetTips() {
  state.settings.tipsSeen = [];
  saveSettings();
}
