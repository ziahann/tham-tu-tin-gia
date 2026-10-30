// Bảng điều tra "dây đỏ": mệnh đề (giấy vàng) bên trái, thẻ evidence đã thu bên phải. Bấm thẻ rồi bấm mệnh đề để căng
// dây; nối đúng thì dây đỏ ở lại, nối sai thì dây rơi kèm lời giải thích. Dùng chung cho balo (Bảng ghim) và
// Tường bằng chứng ở Phòng xác minh. Tiến độ lưu ở progress.board = [[thẻ, mệnh đề], ...].
import { data, t, evidenceById } from './data.js';
import { state, saveProgress } from './state.js';
import { sfx } from './audio.js';
import { toast } from './ui.js';

const SVG = 'http://www.w3.org/2000/svg';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/** Mệnh đề mà một thẻ chứng minh (hoặc null với thẻ suy đoán / thẻ không thuộc mệnh đề nào). */
const claimOf = cardId => data.quests.board.claims.find(c => c.cards.includes(cardId)) || null;

/** Số dây đúng đã nối / tổng số dây có thể nối với các thẻ đang có. */
export function boardProgress() {
  const have = new Set(state.progress?.evidenceCards || []);
  const total = data.quests.board.claims.reduce((s, c) => s + c.cards.filter(id => have.has(id)).length, 0);
  return { done: (state.progress?.board || []).length, total };
}

/** Dựng bảng điều tra (phần tử DOM). */
export function investigationBoard() {
  const B = data.quests.board;
  const p = state.progress;
  p.board ||= [];
  const wrap = el('div', 'board');
  const head = el('p', 'board-status');
  const grid = el('div', 'board-grid');
  const claimsCol = el('div', 'board-claims');
  const cardsCol = el('div', 'board-cards');
  const svg = document.createElementNS(SVG, 'svg');
  svg.classList.add('board-strings');
  grid.append(claimsCol, cardsCol, svg);
  wrap.append(el('p', 'muted', B.howto), head, grid);

  const claimEls = new Map(), cardEls = new Map();
  let picked = null;
  for (const c of B.claims) {
    const n = el('button', 'board-claim', c.text);
    n.type = 'button';
    n.addEventListener('click', () => connect(c));
    claimEls.set(c.id, n);
    claimsCol.append(n);
  }
  const cards = (p.evidenceCards || []).map(evidenceById).filter(Boolean);
  if (!cards.length) cardsCol.append(el('p', 'muted', t('backpack.noCards')));
  for (const ev of cards) {
    const n = el('button', `board-card${ev.id.startsWith('ev_money') || ev.id.startsWith('ev_identity') ? ' is-guess' : ''}`, ev.title);
    n.type = 'button';
    n.title = ev.text;
    n.addEventListener('click', () => { picked = picked === ev.id ? null : ev.id; sfx('click'); sync(); });
    cardEls.set(ev.id, n);
    cardsCol.append(n);
  }

  // vị trí hai đầu dây: mép phải mệnh đề → mép trái thẻ (tính lại khi đổi cỡ)
  const ends = (cardId, claimId) => {
    const g = grid.getBoundingClientRect();
    const a = claimEls.get(claimId)?.getBoundingClientRect(), b = cardEls.get(cardId)?.getBoundingClientRect();
    if (!a || !b) return null;
    return [a.right - g.left - 4, a.top + a.height / 2 - g.top, b.left - g.left + 4, b.top + b.height / 2 - g.top];
  };
  const line = (cardId, claimId, cls) => {
    const e = ends(cardId, claimId);
    if (!e) return null;
    const [x1, y1, x2, y2] = e;
    const path = document.createElementNS(SVG, 'path');
    // dây chùng xuống một chút như sợi len thật
    path.setAttribute('d', `M${x1},${y1} Q${(x1 + x2) / 2},${Math.max(y1, y2) + 18} ${x2},${y2}`);
    path.setAttribute('class', cls);
    svg.append(path);
    for (const [x, y] of [[x1, y1], [x2, y2]]) {
      const pin = document.createElementNS(SVG, 'circle');
      pin.setAttribute('cx', x); pin.setAttribute('cy', y); pin.setAttribute('r', 4);
      pin.setAttribute('class', `${cls}-pin`);
      svg.append(pin);
    }
    return path;
  };
  const draw = () => {
    svg.innerHTML = '';
    const g = grid.getBoundingClientRect();
    svg.setAttribute('width', g.width); svg.setAttribute('height', g.height);
    for (const [cardId, claimId] of p.board) line(cardId, claimId, 'string');
  };
  const sync = () => {
    const prog = boardProgress();
    head.textContent = t('board.status', prog);
    head.classList.toggle('is-done', prog.total > 0 && prog.done >= prog.total);
    for (const [id, n] of cardEls) {
      n.classList.toggle('is-picked', picked === id);
      n.classList.toggle('is-linked', p.board.some(([c]) => c === id));
    }
    for (const [id, n] of claimEls) n.classList.toggle('is-linked', p.board.some(([, c]) => c === id));
    draw();
  };

  function connect(claim) {
    if (!picked) { toast(t('board.pickCard')); return; }
    const cardId = picked;
    picked = null;
    const ev = evidenceById(cardId);
    if (p.board.some(([c, m]) => c === cardId && m === claim.id)) { sync(); return; }
    const right = claimOf(cardId);
    if (right?.id === claim.id) {
      p.board.push([cardId, claim.id]);
      saveProgress();
      sfx('partial');
      toast(`✓ ${claim.why?.[cardId] || t('board.right', { card: ev.title, claim: claim.text })}`, 4500);
      sync();
      if (boardProgress().done >= boardProgress().total) { sfx('unlock'); toast(t('board.complete'), 5000); }
      return;
    }
    // nối sai: dây chớp rồi rơi
    sync();
    const bad = line(cardId, claim.id, 'string is-wrong');
    sfx('wrong');
    const msg = !right ? t('board.guess', { card: ev.title }) : t('board.wrong', { card: ev.title, claim: claim.text, right: right.text });
    toast(`✗ ${msg}`, 6000);
    setTimeout(() => { bad?.classList.add('is-drop'); setTimeout(draw, 500); }, 700);
  }

  // vẽ dây sau khi bảng đã gắn vào trang và có kích thước
  const ro = new ResizeObserver(() => draw());
  ro.observe(grid);
  requestAnimationFrame(() => sync());
  return wrap;
}
