// Khung thoại kiểu game cốt truyện ở cạnh dưới: NPC nói, người chơi chọn / gõ / chọn thẻ / mở nguồn.
import { data, t, fill, npcById, sourceById, shortCite } from './data.js';
import { state, markSourceOpened } from './state.js';
import { appendMessage } from './history.js';
import { releaseAll } from './input.js';
import { sfx } from './audio.js';
import { toast } from './ui.js';

// Chân dung 72x88, 5 cột biểu cảm (tools/gen-portraits.mjs). Boss có bộ cột riêng.
const PORTRAITS = new Set(['npc1', 'npc2', 'npc3', 'npc4', 'npc5', 'npc6', 'boss']);
const MOODS = ['neutral', 'happy', 'thinking', 'surprised', 'serious'];
const BOSS_COL = { neutral: 0, thinking: 0, happy: 1, smug: 1, surprised: 2, cracked: 2, blank: 3, serious: 4, angry: 4 };
/** File sprite / chân dung của thám tử theo mẫu nam / nữ. */
const heroFile = () => `hero_${state.progress?.heroLook === 'f' ? 'f' : 'm'}`;
const els = {};
let partner = null;
let rightId = null;          // nhân vật đang hiện ở chân dung bên phải
const pinned = {};           // biểu cảm cố định (ví dụ boss đã gỡ mặt nạ)
let open = false;
let advanceFn = null;
let typingTimer = null;
let finishTyping = null;

/** Gắn phần tử DOM của khung thoại. */
export function initDialog() {
  for (const id of ['root:dialog', 'stage:dialog-stage', 'left:portrait-left', 'right:portrait-right', 'name:dialog-name', 'tag:dialog-tag', 'text:dialog-text', 'extra:dialog-extra', 'next:dialog-next', 'live:dialog-live']) {
    const [k, v] = id.split(':');
    els[k] = document.getElementById(v);
  }
  els.tag.textContent = t('simulated');
  els.root.addEventListener('click', e => {
    if (e.target.closest('button, a, input')) return;
    advance();
  });
}

export const isOpen = () => open;

/** Mở khung thoại; partnerId là NPC đang trò chuyện (dùng để chia lịch sử theo NPC). */
export function begin(partnerId) {
  partner = partnerId;
  rightId = PORTRAITS.has(partnerId) ? partnerId : null;
  open = true;
  setPortrait(els.left, heroFile(), 'neutral');
  setPortrait(els.right, rightId, 'neutral');
  focus(null);
  els.root.hidden = false;
  document.getElementById('touch').classList.add('is-dialog');
  releaseAll();
}

/** Đóng khung thoại. */
export function end() {
  open = false;
  Object.keys(pinned).forEach(k => delete pinned[k]);
  advanceFn = null;
  els.root.hidden = true;
  els.extra.innerHTML = '';
  document.getElementById('touch').classList.remove('is-dialog');
}

/** Tên hiển thị của thám tử theo tên người chơi đặt. */
export function heroTitle() {
  const hero = data.quests.hero;
  return fill(hero.titleFormat, { name: state.progress?.heroName || hero.displayName });
}

/** Biến thay thế trong lời thoại. */
const vars = () => ({ hero: heroTitle(), org: data.quests.organization.name });

/** Giữ một biểu cảm cho nhân vật tới hết cuộc trò chuyện (ví dụ boss sau khi gỡ mặt nạ: 'blank'). */
export function pinMood(id, mood) { pinned[id] = mood; if (id === rightId) setPortrait(els.right, id, mood); }

/** Đặt chân dung theo nhân vật và biểu cảm; id rỗng thì ẩn. */
function setPortrait(node, id, mood) {
  node.hidden = !id;
  if (!id) return;
  mood = pinned[id] || mood;
  const col = id === 'boss' ? (BOSS_COL[mood] ?? 0) : Math.max(0, MOODS.indexOf(mood));
  node.style.backgroundImage = `url(assets/portraits/${id}.png)`;
  node.style.backgroundPosition = `${col * 25}% 0`;
}

/** Làm sáng chân dung một bên ('left' | 'right'), bên kia mờ đi; null = cả hai mờ (hệ thống nói). */
function focus(side) {
  els.left.classList.toggle('is-on', side === 'left');
  els.right.classList.toggle('is-on', side === 'right');
}

/** Biểu cảm đoán từ đầu câu: ✓ vui, ✗ nghiêm, ? suy nghĩ. */
function moodOf(text) {
  if (/^✓/.test(text)) return 'happy';
  if (/^✗/.test(text)) return 'serious';
  if (/^\?/.test(text)) return 'thinking';
  return 'neutral';
}

/** Đặt tên, nhãn GIẢ LẬP và chân dung cho người nói. */
function setSpeaker(id, text = '', mood = null) {
  let name, fictional = true;
  const m = mood || moodOf(text);
  if (id === 'hero' || id === 'inspect') {
    name = id === 'hero' ? heroTitle() : t('dialog.inspectSpeaker');
    setPortrait(els.left, heroFile(), mood || (id === 'inspect' ? 'thinking' : m));
    focus('left');
  } else if (id === 'system') {
    name = t('system'); fictional = false;
    focus(null);
  } else {
    const npc = npcById(id);
    name = npc ? npc.name : id;
    if (PORTRAITS.has(id)) { rightId = id; setPortrait(els.right, id, m); }
    // thám tử phản ứng theo lời NPC: đúng thì vui, sai thì giật mình
    setPortrait(els.left, heroFile(), m === 'happy' ? 'happy' : m === 'serious' ? 'surprised' : 'neutral');
    focus(rightId === id ? 'right' : null);
  }
  els.name.textContent = name;
  els.tag.hidden = !fictional;
  return name;
}

/** Hiện chữ dần (tắt khi bật giảm chuyển động); gọi done khi hiện đủ. */
function typeText(text, done) {
  clearInterval(typingTimer);
  els.text.textContent = '';
  if (state.settings.reduceMotion) { els.text.textContent = text; finishTyping = null; done(); return; }
  let i = 0;
  els.stage.classList.add('is-talking');
  finishTyping = () => {
    clearInterval(typingTimer);
    els.text.textContent = text;
    els.stage.classList.remove('is-talking');
    finishTyping = null;
    done();
  };
  typingTimer = setInterval(() => {
    i += 1;
    els.text.textContent = text.slice(0, i);
    if (i % 4 === 0) sfx('blip');
    if (i >= text.length) finishTyping();
  }, 22);
}

/** Hiện một câu (ghi lịch sử, đọc cho trình đọc màn hình). */
function show(speakerId, text, meta = {}) {
  const full = fill(text, vars());
  const { mood, ...logMeta } = meta;
  meta = logMeta;
  const name = setSpeaker(speakerId, full, mood);
  els.extra.innerHTML = '';
  els.root.classList.remove('has-exhibit');
  els.next.textContent = '';
  appendMessage({ npc: partner, from: speakerId, text: full, ...meta });
  els.live.textContent = `${name}: ${full}`;
  return full;
}

/** NPC (hoặc hệ thống) nói một câu; chờ người chơi bấm E/Space/A hoặc chạm để tiếp. */
export function say(speakerId, text, meta) {
  return new Promise(resolve => {
    const full = show(speakerId, text, meta);
    advanceFn = null;
    typeText(full, () => {
      els.next.textContent = t('dialog.continueHint');
      advanceFn = () => { advanceFn = null; els.next.textContent = ''; sfx('click'); resolve(); };
    });
  });
}

/** Tiếp lời thoại: nếu chữ đang chạy thì hiện hết, nếu không thì sang câu sau. */
export function advance() {
  if (finishTyping) { finishTyping(); return; }
  if (advanceFn) advanceFn();
}

/** Hiện câu hỏi (nếu có) rồi gắn phần điều khiển ngay bên dưới, không chờ bấm tiếp. */
function prompt(opts) {
  if (opts?.text) {
    const full = show(opts.speaker, opts.text);
    typeText(full, () => {});
  }
  advanceFn = null;
  els.next.textContent = '';
  els.extra.innerHTML = '';
  // Tới lượt người chơi trả lời: chân dung thám tử sáng lên, đang suy nghĩ.
  setPortrait(els.left, heroFile(), 'thinking');
  focus('left');
  els.root.classList.toggle('has-exhibit', !!(opts?.exhibit || opts?.wide));
  if (opts?.exhibit) els.extra.append(opts.exhibit);
}

/**
 * Bước tương tác tùy chỉnh (ví dụ bấm vào khung ảnh). mount(container, done, help) dựng giao diện;
 * done({ log, ...giá trị }) ghi lịch sử và trả kết quả; help() trả { help: true }.
 */
export function interactive(opts, mount) {
  return new Promise(resolve => {
    prompt(opts);
    const finish = value => {
      if (value.log) logPlayer(value.log);
      els.extra.innerHTML = '';
      resolve(value);
    };
    mount(els.extra, finish, () => { els.extra.innerHTML = ''; resolve({ help: true }); });
  });
}

/** Nút dùng chung cho các bước tùy chỉnh. */
export function makeButton(cls, text, onClick) {
  return button(cls, text, onClick);
}

/** Tạo nút. */
function button(cls, text, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

/** Ghi lựa chọn của người chơi vào lịch sử. */
const logPlayer = (text, meta = {}) => appendMessage({ npc: partner, from: 'player', text, ...meta });

/** Danh sách lựa chọn; phím mũi tên / số để chọn. Trả về lựa chọn được bấm. */
export function choose(options, opts) {
  return new Promise(resolve => {
    prompt(opts);
    const list = document.createElement('div');
    list.className = 'choice-list';
    options.forEach((o, i) => list.append(button('btn', `${i + 1}. ${o.text}`, () => {
      sfx('click');
      if (!o.silent) logPlayer(o.text, { choiceId: o.id });
      els.extra.innerHTML = '';
      resolve(o);
    })));
    list.addEventListener('keydown', e => {
      const btns = [...list.querySelectorAll('button')];
      const i = btns.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        btns[(i + (e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length].focus();
      } else if (/^[1-9]$/.test(e.key) && btns[+e.key - 1]) {
        btns[+e.key - 1].click();
      }
    });
    els.extra.append(list);
    list.querySelector('button')?.focus();
  });
}

/** Ô gõ câu trả lời. Trả về { value } hoặc { help: true }. */
export function input(opts) {
  return new Promise(resolve => {
    prompt(opts);
    const row = document.createElement('form');
    row.className = 'answer-row';
    const field = document.createElement('input');
    field.autocomplete = 'off';
    field.maxLength = 120;
    field.placeholder = opts.placeholder || opts.label || '';
    field.setAttribute('aria-label', opts.label || opts.text || '');
    const submit = button('btn-primary', t('dialog.submit'), () => {});
    submit.type = 'submit';
    const help = button('btn', t('dialog.help'), () => { els.extra.innerHTML = ''; resolve({ help: true }); });
    row.addEventListener('submit', e => {
      e.preventDefault();
      const value = field.value.trim();
      if (!value) { field.focus(); return; }
      logPlayer(value);
      els.extra.innerHTML = '';
      resolve({ value });
    });
    row.append(field, submit, help);
    els.extra.append(row);
    field.focus();
  });
}

/** Chọn nhiều thẻ. Trả về { ids } hoặc { help: true }. */
export function multi(cards, opts) {
  return new Promise(resolve => {
    prompt(opts);
    const picked = new Set(opts.picked || []);
    const grid = document.createElement('div');
    grid.className = 'card-pick';
    grid.setAttribute('role', 'group');
    for (const c of cards) {
      const b = button('', c.text, () => {
        picked.has(c.id) ? picked.delete(c.id) : picked.add(c.id);
        b.setAttribute('aria-pressed', String(picked.has(c.id)));
        sfx('click');
      });
      b.setAttribute('aria-pressed', String(picked.has(c.id)));
      grid.append(b);
    }
    const row = document.createElement('div');
    row.className = 'row';
    row.append(
      button('btn-primary', opts.submitLabel || t('dialog.submit'), () => {
        if (!picked.size) { toast(t('dialog.emptyPick')); return; }
        const ids = cards.filter(c => picked.has(c.id)).map(c => c.id);
        logPlayer(cards.filter(c => picked.has(c.id)).map(c => `• ${c.text}`).join('\n'));
        els.extra.innerHTML = '';
        resolve({ ids });
      }),
      button('btn', t('dialog.help'), () => { els.extra.innerHTML = ''; resolve({ help: true }); })
    );
    els.extra.append(grid, row);
    grid.querySelector('button')?.focus();
  });
}

/** Các nút mở nguồn (tab mới) + tóm tắt dự phòng + "đã đọc xong". Trả về { done } hoặc { backup }. */
export function links(sourceIds, opts) {
  return new Promise(resolve => {
    prompt(opts);
    const row = document.createElement('div');
    row.className = 'row';
    for (const id of sourceIds) {
      const src = sourceById(id);
      if (!src?.url) continue;
      const a = document.createElement('a');
      a.className = 'btn-primary';
      a.href = src.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      const opened = () => state.progress.sourcesOpened.includes(id);
      const label = () => `${opened() ? '✓ ' : ''}${t('dialog.openSource', { outlet: `${src.outlet} (${shortCite(src)})` })}`;
      a.textContent = label();
      if (src.urlStatus === 'from_report_unverified') a.title = t('dialog.unverified');
      a.addEventListener('click', () => { markSourceOpened(id); a.textContent = label(); logPlayer(a.textContent); });
      row.append(a);
    }
    const row2 = document.createElement('div');
    row2.className = 'row';
    row2.append(
      button('btn', t('dialog.backup'), () => { els.extra.innerHTML = ''; resolve({ backup: true }); }),
      button('btn', t('dialog.doneReading'), () => { logPlayer(t('dialog.doneReading')); els.extra.innerHTML = ''; resolve({ done: true }); })
    );
    els.extra.append(row, row2);
    row.querySelector('a')?.focus();
  });
}
