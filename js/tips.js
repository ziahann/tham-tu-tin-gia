// Mẹo cho người mới: thẻ nhỏ hiện một lần mỗi mẹo, xếp hàng, chờ khi đang có cảnh cắt.
import { data, t } from './data.js';
import { state, saveSettings } from './state.js';
import { getWorld } from './story.js'; // vòng import, chỉ gọi lúc chạy

export const TIP_IDS = ['move', 'backpack', 'track', 'notebook', 'hint', 'minimize', 'cred', 'pressure', 'rumor', 'decoy', 'feed', 'board', 'guestCard', 'weather', 'crossing', 'eavesdrop'];
const SHOW_MS = 12000;
const queue = [];
let current = null; // { id, timer }
let wait = null; // một vòng chờ duy nhất khi đang có cảnh cắt (không chồng nhiều vòng)

function next() {
  const was = current?.id;
  current = null;
  const box = document.getElementById('tip');
  if (box) box.hidden = true;
  // 'backpack' nối ngay sau 'move', trước các mẹo đã xếp hàng từ trước
  if (was === 'move' && canQueue('backpack')) queue.unshift('backpack');
  show();
}

function show() {
  const box = document.getElementById('tip');
  if (current || !queue.length || !box) return;
  if (document.body.classList.contains('is-cine') || getWorld()?.cutscene || document.querySelector('.trip')) { wait ||= setTimeout(() => { wait = null; show(); }, 1000); return; }
  // mẹo đầu tiên luôn là 'move': các mẹo khác chờ trong hàng đến khi 'move' được gọi (mỗi lần vào bản đồ, hoặc khi bật lại mẹo)
  if (!(state.settings.tipsSeen || []).includes('move') && !queue.includes('move')) return;
  if (!(state.settings.tipsSeen || []).includes('move')) queue.splice(0, queue.length, 'move', ...queue.filter(q => q !== 'move'));
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

function canQueue(id) {
  const s = state.settings;
  return s.tips !== false && TIP_IDS.includes(id) && !(s.tipsSeen || []).includes(id) && !queue.includes(id) && current?.id !== id;
}

/** Hiện mẹo `id` một lần (bỏ qua nếu tắt mẹo, đã xem hoặc đã xếp hàng). */
export function showTip(id) {
  if (!canQueue(id)) return;
  queue.push(id);
  show();
}

/** Chỉ cho debug: cho xem lại mọi mẹo. */
export function resetTips() {
  state.settings.tipsSeen = [];
  saveSettings();
}
