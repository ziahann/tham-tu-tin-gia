// Balo: khung dọc bên phải với Sổ tay, Nhiệm vụ + bản đồ nhỏ, Bảng ghim, Lịch sử trò chuyện theo NPC.
import { data, t, evidenceById, sourceById, shortCite, citeLine, npcById, questById } from './data.js';
import { state, clearAllStorage, isQuestDone } from './state.js';
import { questStatus, nextQuestIn, isUnlocked, bossStatus, earnedBadges, caseProgress } from './grading.js';
import { credOf, CRED_MAX } from './obstacles.js';
import { objective, track, giverOf } from './story.js';
import { currentRunByNpc, exportLog } from './history.js';
import { heroTitle } from './dialogue.js';
import { confirmBox } from './ui.js';
import { investigationBoard } from './board.js';
import { vinhFeed, feedAlerts } from './feed.js';

const els = {};
let tab = 'notebook';
let historyNpc = null;
let getWorld = () => null;

/** Tạo phần tử với class và chữ. */
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/** Gắn sự kiện cho balo. worldGetter trả về cảnh bản đồ (để vẽ bản đồ nhỏ). */
export function initBackpack(worldGetter) {
  getWorld = worldGetter;
  els.root = document.getElementById('backpack');
  els.body = document.getElementById('backpack-body');
  els.btn = document.getElementById('btn-backpack');
  els.btn.setAttribute('aria-expanded', 'false');
  document.getElementById('backpack-close').addEventListener('click', close);
  els.root.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));
  els.btn.addEventListener('click', toggle);
}

export const isOpen = () => !els.root.hidden;

/** Mở balo ở một tab. */
export function open(which) {
  if (which) tab = which;
  els.root.hidden = false;
  document.body.classList.add('backpack-open');
  els.btn.setAttribute('aria-expanded', 'true');
  render();
  // Đang hội thoại thì giữ focus ở câu trả lời (không cướp focus sang balo).
  if (!document.getElementById('dialog').hidden) return;
  els.root.querySelector(`[data-tab="${tab}"]`)?.focus();
}

/** Đóng balo. */
export function close() {
  els.root.hidden = true;
  document.body.classList.remove('backpack-open');
  els.btn.setAttribute('aria-expanded', 'false');
}

export function toggle() { isOpen() ? close() : open(); }

/** Vẽ lại tab hiện tại (gọi sau mỗi thay đổi tiến độ). */
export function render() {
  if (!isOpen()) return;
  els.root.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  els.body.innerHTML = '';
  ({ notebook, quests, feed, pinboard, history })[tab]();
  const alerts = feedAlerts();
  const ft = els.root.querySelector('[data-tab="feed"]');
  ft.dataset.alert = alerts ? String(alerts) : '';
}

/** Thẻ huy hiệu: hình huy hiệu (assets/badges/<mã>.png), tên, điều đã học; chưa nhận thì mờ và ẩn nội dung. */
export function badgeCard(room, got) {
  const d = el('div', `badge${got ? '' : ' is-locked'}`);
  const img = el('img', 'badge-img');
  img.src = `assets/badges/${room.id}.png`;
  img.alt = '';
  const txt = el('div', 'badge-txt');
  txt.append(el('strong', null, room.badge.name), el('span', null, got ? room.badge.learned : t('backpack.badgeLocked', { room: room.name })));
  d.append(img, txt);
  return d;
}

/** Thẻ evidence có dẫn nguồn. */
export function evidenceCard(ev) {
  const card = el('div', 'ev-card');
  const h = el('h3');
  h.append(document.createTextNode(ev.title));
  const cite = citeLine(ev.sources);
  card.append(h, el('p', null, ev.text));
  if (cite) card.append(el('p', 'cite', `Nguồn: ${cite}`));
  return card;
}

/** Uy tín: trung bình độ tin cậy của các hồ sơ (không tính Phòng họp, hồ sơ tùy chọn). */
export function trustScore() {
  const rooms = data.quests.rooms.filter(r => !r.boss && !r.optional);
  return Math.round(rooms.reduce((s, r) => s + credOf(r.id), 0) / (rooms.length || 1));
}

/** Thẻ sinh viên (mô phỏng): ảnh chân dung, tên, ngành, uy tín, số huy hiệu / hồ sơ đã khép. */
function studentCard() {
  const flags = state.progress?.flags || [];
  const card = el('div', 'student-card');
  card.setAttribute('aria-label', t('card.title'));
  const head = el('div', 'sc-head');
  const crest = el('span', 'sc-crest');
  crest.setAttribute('aria-hidden', 'true');
  head.append(crest, el('span', 'sc-school', t('card.school')));
  const photo = el('div', 'sc-photo');
  photo.style.backgroundImage = `url(assets/portraits/hero_${state.progress?.heroLook === 'f' ? 'f' : 'm'}.png)`;
  const info = el('div', 'sc-info');
  const trust = trustScore();
  const meter = el('span', 'sc-meter');
  const fill = el('i');
  fill.style.width = `${(trust / CRED_MAX) * 100}%`;
  meter.append(fill);
  const tr = el('div', 'sc-trust');
  tr.title = t('card.trustNote');
  tr.append(el('span', null, `${t('card.trust')} ${trust}/${CRED_MAX}`), meter);
  const cp = caseProgress(flags);
  info.append(el('div', 'sc-kind', t('card.kind')), el('div', 'sc-name', heroTitle()), el('div', 'sc-fac', t('card.faculty')), tr,
    el('div', 'sc-stats', `${t('card.badges')}: ${earnedBadges(flags).length} · ${t('card.cases')}: ${cp.done}/${cp.total}`));
  const body = el('div', 'sc-body');
  body.append(photo, info);
  card.append(head, body, el('div', 'sc-sim', t('card.sim')));
  return card;
}

/** Sổ tay: thẻ sinh viên, huy hiệu kỹ năng, câu hỏi xác minh, thẻ evidence, ghi chép từ báo. */
function notebook() {
  els.body.append(el('h3', null, t('card.title')), studentCard());
  els.body.append(el('h3', null, t('backpack.badges')));
  const earned = new Set(earnedBadges(state.progress?.flags || []).map(r => r.id));
  if (!earned.size) els.body.append(el('p', 'muted', t('backpack.noBadges')));
  const shelf = el('div', 'badge-shelf');
  data.quests.rooms.filter(r => r.badge).forEach(r => shelf.append(badgeCard(r, earned.has(r.id))));
  els.body.append(shelf);
  els.body.append(el('h3', null, t('backpack.questions')));
  const ol = el('ol');
  data.quests.verificationQuestions.forEach(q => ol.append(el('li', null, q)));
  els.body.append(ol, el('h3', null, t('backpack.cards')));
  const cards = (state.progress?.evidenceCards || []).map(evidenceById).filter(Boolean);
  if (!cards.length) els.body.append(el('p', 'muted', t('backpack.noCards')));
  cards.forEach(ev => els.body.append(evidenceCard(ev)));
  // Ghi chép từ trình đọc báo trong game
  els.body.append(el('h3', null, t('backpack.notes2')));
  const notes = state.progress?.notes || [];
  if (!notes.length) els.body.append(el('p', 'muted', t('backpack.noNotes')));
  notes.forEach(n => {
    const p = el('p', 'note-line', n.text);
    const src = sourceById(n.source);
    if (src) p.append(el('span', 'cite', shortCite(src)));
    els.body.append(p);
  });
}

const STATUS_LABEL = { done: 'statusDone', active: 'statusActive', locked: 'statusLocked', building: 'statusBuilding' };

/** Hồ sơ vụ án: mục tiêu, các hồ sơ chọn làm theo thứ tự tùy ý (nút Theo dõi), Phòng họp, bản đồ nhỏ. */
function quests() {
  const obj = el('div', 'objective');
  obj.append(el('h3', null, t('backpack.objective')), el('p', null, objective()));
  els.body.append(obj, el('h3', null, t('backpack.cases')));
  const tracked = state.progress?.tracked;
  for (const room of data.quests.rooms) {
    if (room.boss) { els.body.append(bossCase(tracked)); continue; }
    const list = room.quests.map(questById).filter(Boolean);
    if (list.some(q => q.unlockFlags) && !list.some(isUnlocked)) continue; // màn bonus chỉ hiện sau khi thắng boss
    const done = list.filter(q => isQuestDone(q.id)).length;
    const next = nextQuestIn(room.id);
    const isTracked = !!tracked && list.some(q => q.id === tracked);
    const box = el('section', `case${isTracked ? ' is-tracked' : ''}${next ? '' : ' is-done'}`);
    const head = el('div', 'case-head');
    head.append(el('h4', null, `${room.name}${room.optional ? ` (${t('backpack.optional')})` : ''}`));
    if (!next) head.append(el('span', 'st', t('backpack.caseDone')));
    else if (isTracked) head.append(el('span', 'st', t('backpack.tracking')));
    else {
      const b = el('button', 'btn-small', t('backpack.track'));
      b.type = 'button';
      b.addEventListener('click', () => track(next.id));
      head.append(b);
    }
    const giver = giverOf((next || list[0]).id);
    const bar = el('div', 'case-bar');
    bar.append(Object.assign(el('span'), { style: `width:${Math.round((100 * done) / list.length)}%` }));
    box.append(head,
      el('p', 'case-meta', `${t('backpack.giver', { npc: npcById(giver)?.name || giver, place: room.place || '' })} · ${t('backpack.caseProgress', { done, total: list.length })}`),
      bar);
    for (const q of list) {
      const st = questStatus(q);
      const row = el('div', `quest-row ${st}`);
      row.append(el('span', null, q.title), el('span', 'st', t(`backpack.${STATUS_LABEL[st]}`)));
      box.append(row);
    }
    els.body.append(box);
  }
  els.body.append(el('h3', null, t('backpack.map')));
  const world = getWorld();
  if (world) {
    const mm = world.getMinimap();
    els.body.append(minimap(mm), el('p', 'muted', t('backpack.youAreHere', { place: mm.place })));
  }
}

/** Thẻ Phòng họp: khóa tới khi xong mọi nhiệm vụ bắt buộc và đủ thẻ evidence. */
function bossCase(tracked) {
  const b = data.quests.boss;
  const flags = state.progress?.flags || [];
  const box = el('section', `case${tracked === 'boss' ? ' is-tracked' : ''}${flags.includes('boss_done') ? ' is-done' : ''}`);
  const head = el('div', 'case-head');
  head.append(el('h4', null, t('backpack.bossCase')));
  const total = b.requires.requiredQuests.length;
  const done = b.requires.requiredQuests.filter(isQuestDone).length;
  const cards = (state.progress?.evidenceCards || []).filter(id => !b.guessCards.includes(id)).length;
  const open = bossStatus(flags) === 'open';
  if (flags.includes('boss_done')) head.append(el('span', 'st', t('backpack.caseDone')));
  else if (open && tracked !== 'boss') {
    const btn = el('button', 'btn-small', t('backpack.track'));
    btn.type = 'button';
    btn.addEventListener('click', () => track('boss'));
    head.append(btn);
  } else if (open) head.append(el('span', 'st', t('backpack.tracking')));
  box.append(head, el('p', 'case-meta', open ? t('backpack.bossOpen')
    : t('backpack.bossLocked', { done, total, cards, minCards: b.requires.minCards })));
  return box;
}

/** Vẽ bản đồ nhỏ: tường, đồ đạc, cửa, NPC, vị trí người chơi. */
function minimap(mm) {
  const S = 6;
  const c = el('canvas', 'minimap');
  c.width = mm.W * S;
  c.height = mm.H * S;
  c.setAttribute('role', 'img');
  c.setAttribute('aria-label', t('backpack.youAreHere', { place: mm.place }));
  const ctx = c.getContext('2d');
  const colors = { wall: '#1a2236', furniture: '#6b4630', door: '#c8323c', floor: '#cfc6b3' };
  for (let y = 0; y < mm.H; y++) for (let x = 0; x < mm.W; x++) {
    ctx.fillStyle = colors[mm.kind(x, y)];
    ctx.fillRect(x * S, y * S, S, S);
  }
  ctx.fillStyle = '#3d7fd1';
  mm.npcs.forEach(n => ctx.fillRect(n.x * S - 3, n.y * S - 6, 6, 6));
  ctx.fillStyle = '#f2d36b';
  ctx.fillRect(mm.player.x * S - 4, mm.player.y * S - 8, 8, 8);
  ctx.strokeStyle = '#0f0e17';
  ctx.strokeRect(mm.player.x * S - 4, mm.player.y * S - 8, 8, 8);
  return c;
}

/** Bảng ghim: các thẻ evidence ghim trên bảng gỗ. */
/** Vịnh Feed: mạng xã hội trong game. */
function feed() {
  els.body.append(vinhFeed(() => render()));
}

function pinboard() {
  els.body.append(investigationBoard());
}

/** Tên hiển thị cho một người nói trong lịch sử. */
function speakerName(id) {
  if (id === 'player') return t('backpack.you');
  if (id === 'hero' || id === 'inspect') return heroTitle();
  if (id === 'system') return t('system');
  return npcById(id)?.name || id;
}

/** Lịch sử: mỗi NPC một tab; xuất JSON; xóa dữ liệu. */
function history() {
  const groups = currentRunByNpc();
  const ids = Object.keys(groups);
  const actions = el('div', 'actions');
  const exp = el('button', 'btn-small', t('backpack.export'));
  const clr = el('button', 'btn-small', t('backpack.clear'));
  exp.type = clr.type = 'button';
  exp.addEventListener('click', exportLog);
  clr.addEventListener('click', async () => {
    if (!(await confirmBox(t('backpack.clear'), t('backpack.clearConfirm')))) return;
    clearAllStorage();
    location.reload();
  });
  actions.append(exp, clr);
  els.body.append(actions);
  if (!ids.length) { els.body.append(el('p', 'muted', t('backpack.historyEmpty'))); return; }
  if (!ids.includes(historyNpc)) historyNpc = ids[0];
  const tabs = el('div', 'npc-tabs');
  ids.forEach(id => {
    const b = el('button', null, id === 'notes' ? t('backpack.notes') : speakerName(id));
    b.type = 'button';
    b.setAttribute('aria-pressed', String(id === historyNpc));
    b.addEventListener('click', () => { historyNpc = id; render(); });
    tabs.append(b);
  });
  const list = el('ol', 'log');
  groups[historyNpc].forEach(m => {
    const li = el('li', m.from === 'player' ? 'player' : '');
    li.append(el('span', 'who', speakerName(m.from)), document.createTextNode(m.text));
    list.append(li);
  });
  els.body.append(tabs, list);
  list.lastElementChild?.scrollIntoView({ block: 'nearest' });
}
