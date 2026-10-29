// Dựng nhiệm vụ trong phòng, kiểm tra evidence, gợi ý, điểm và thẻ evidence.
import { data, t, questById, evidenceById, sourceById, shortCite } from './data.js';
import { state, questState, isQuestDone, addEvidence, saveProgress, markSourceOpened, hasFlag, setFlag } from './state.js';
import { normalize, containsPhrase, levenshtein } from './text.js';
import { playScene } from './chat.js';
import { sfx } from './audio.js';
import { toast } from './ui.js';

// Kiểu chơi đã dựng. Phòng có nhiệm vụ thuộc kiểu khác hiện "Đang xây dựng".
const SUPPORTED_MODES = { G1: renderFields, G2: renderCards };

/** Tạo phần tử với class và chữ. */
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/** Nhiệm vụ đã mở khóa chưa (nhiệm vụ đầu tiên, hoặc có nhiệm vụ đã xong mở khóa nó). */
export function isUnlocked(q) {
  if (q.order === 1) return true;
  return data.quests.quests.some(o => isQuestDone(o.id) && (o.unlocks || []).includes(q.id));
}

/** Trạng thái phòng: done | open | locked | building. */
export function roomStatus(room) {
  const quests = room.quests.map(questById);
  if (quests.some(q => !q || !SUPPORTED_MODES[q.mode])) return 'building';
  if (quests.filter(q => q.required !== false).every(q => isQuestDone(q.id))) return 'done';
  return quests.some(isUnlocked) ? 'open' : 'locked';
}

/** Đếm số nhiệm vụ đã xong / tổng trong phòng. */
export function roomProgress(room) {
  return { done: room.quests.filter(isQuestDone).length, total: room.quests.length };
}

/** Nhiệm vụ đang làm trong phòng (đã mở, chưa xong). */
export function activeQuest(room) {
  return room.quests.map(questById).find(q => q && isUnlocked(q) && !isQuestDone(q.id)) || null;
}

/** Vẽ danh sách nguồn cho nhiệm vụ hiện tại (vùng tư liệu bên trái). */
export function renderResources(container, quest) {
  container.innerHTML = '';
  if (!quest) return;
  for (const id of quest.resources || []) {
    const src = sourceById(id);
    if (!src) continue;
    const box = el('div', 'resource');
    box.append(el('strong', null, `${src.outlet} · ${shortCite(src)}`), el('span', 'apa', src.apa));
    const row = el('div', 'row');
    if (src.url) {
      const a = el('a', 'btn-small', t('room.openSource'));
      a.href = src.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.addEventListener('click', () => {
        markSourceOpened(id);
        if (!row.querySelector('.opened')) row.append(el('span', 'opened', `✓ ${t('room.opened')}`));
      });
      row.append(a);
      if (state.progress.sourcesOpened.includes(id)) row.append(el('span', 'opened', `✓ ${t('room.opened')}`));
      if (src.urlStatus === 'from_report_unverified') row.append(el('span', 'muted', `(${t('sourcesPanel.unverified')})`));
    } else {
      row.append(el('span', 'muted', t('sourcesPanel.missing')));
    }
    box.append(row);
    container.append(box);
  }
  const facts = (quest.evidenceCards || []).map(evidenceById).filter(Boolean);
  if (facts.length) {
    const det = el('details', 'resource');
    det.append(el('summary', null, t('room.backup')), el('p', 'muted', t('room.backupNote')));
    facts.forEach(f => det.append(el('p', null, `${f.fact}: ${f.text} — ${f.sources.map(s => shortCite(sourceById(s))).join('; ')}`)));
    container.append(det);
  }
}

/** Vẽ toàn bộ nhiệm vụ của phòng: nhiệm vụ đã xong (thu gọn) + nhiệm vụ đang làm. */
export function renderRoomQuests(container, room, onChange) {
  container.innerHTML = '';
  for (const q of room.quests.map(questById)) {
    if (!q) continue;
    if (isQuestDone(q.id)) container.append(renderDone(q));
    else if (isUnlocked(q)) { container.append(renderActive(q, onChange)); break; }
  }
  if (roomStatus(room) === 'done') {
    const p = el('div', 'panel');
    p.append(el('p', null, `✓ ${t('room.roomDone')}`), el('p', 'muted', t('room.nextRoomsBuilding')));
    container.append(p);
  }
}

/** Thẻ evidence (dùng ở phản hồi và sổ tay). */
export function renderEvidenceCard(ev) {
  const card = el('div', 'ev-card');
  const h = el('h3');
  h.append(el('span', 'fact', ev.fact), document.createTextNode(ev.title));
  card.append(h, el('p', null, ev.text), el('p', 'cite', `Nguồn: ${ev.sources.map(s => shortCite(sourceById(s))).join('; ')}`));
  return card;
}

/** Nhiệm vụ đã xong: tóm tắt kết luận và thẻ nhận được. */
function renderDone(q) {
  const det = el('details', 'quest is-done');
  det.append(el('summary', null, `✓ ${q.title}`));
  det.append(el('p', null, `${t('room.conclusion')}: ${q.conclusion}`));
  (q.evidenceCards || []).map(evidenceById).filter(Boolean).forEach(ev => det.append(renderEvidenceCard(ev)));
  return det;
}

/** Nhiệm vụ đang làm: câu hỏi, ô trả lời, gợi ý, kiểm tra. */
function renderActive(q, onChange) {
  const qs = questState(q.id);
  const box = el('section', 'quest');
  box.setAttribute('aria-labelledby', `qt-${q.id}`);
  const h = el('h2', null, q.title);
  h.id = `qt-${q.id}`;
  box.append(h, el('p', 'question', q.question));
  if (q.safetyNote) box.append(el('p', 'safety', q.safetyNote));

  const render = SUPPORTED_MODES[q.mode];
  if (!render) { box.append(el('p', 'muted', t('room.unsupported'))); return box; }
  const body = el('div');
  const readAnswers = render(body, q, qs);
  box.append(body);

  const hintList = el('ol', 'hints');
  const showHints = () => {
    hintList.innerHTML = '';
    q.hints.slice(0, qs.hints).forEach(text => hintList.append(el('li', null, text)));
  };
  showHints();

  const walk = el('p', 'walkthrough');
  walk.hidden = !qs.walkthrough;
  walk.textContent = `${t('room.walkthroughTitle')}: ${q.walkthrough || ''}`;

  const feedback = el('div');
  feedback.setAttribute('aria-live', 'polite');

  const actions = el('div', 'quest-actions');
  const btnCheck = el('button', 'btn-primary', t('room.check'));
  const btnHint = el('button', 'btn', qs.hints ? t('room.hintLevel', { n: qs.hints }) : t('room.hint'));
  const btnWalk = el('button', 'btn', t('room.cantFind'));
  [btnCheck, btnHint, btnWalk].forEach(b => { b.type = 'button'; });
  if (!q.walkthrough) btnWalk.hidden = true;
  actions.append(btnCheck, btnHint, btnWalk);

  btnHint.addEventListener('click', () => {
    sfx('click');
    if (qs.hints >= q.hints.length) { toast(t('room.noMoreHints')); return; }
    qs.hints++;
    btnHint.textContent = t('room.hintLevel', { n: qs.hints });
    showHints();
    saveProgress();
  });
  btnWalk.addEventListener('click', () => {
    sfx('click');
    qs.walkthrough = true;
    walk.hidden = false;
    saveProgress();
  });
  btnCheck.addEventListener('click', () => {
    const answers = readAnswers();
    if (!answers) { toast(t('room.empty')); return; }
    qs.answers = answers.raw;
    const result = CHECKERS[q.mode](q, answers, body);
    if (result.status === 'correct') {
      completeQuest(q, qs, feedback, onChange);
      btnCheck.disabled = btnHint.disabled = btnWalk.disabled = true;
    } else {
      qs.fails++;
      sfx(result.status === 'partial' ? 'partial' : 'wrong');
      showFeedback(feedback, result.status, q.feedback[result.status], result.items);
      (result.reactions || []).forEach(id => playScene(id));
    }
    saveProgress();
  });

  box.append(hintList, walk, actions, feedback);

  // Lời giao việc của NPC chỉ phát một lần mỗi nhiệm vụ.
  if (q.npcIntro && !hasFlag(`intro_${q.id}`)) {
    setFlag(`intro_${q.id}`);
    saveProgress();
    playScene(q.npcIntro);
  }
  return box;
}

/** Hiện thẻ phản hồi: trạng thái (biểu tượng + chữ), giải thích, danh sách chi tiết. */
function showFeedback(container, status, text, items = [], extra = []) {
  container.innerHTML = '';
  const fb = el('div', `feedback ${status}`);
  fb.append(el('p', 'status', t(`result.${status}`)), el('p', null, text));
  if (items.length) {
    const ul = el('ul');
    items.forEach(i => ul.append(el('li', null, i)));
    fb.append(ul);
  }
  extra.forEach(n => fb.append(n));
  container.append(fb);
  fb.scrollIntoView({ block: 'nearest', behavior: state.settings.reduceMotion ? 'auto' : 'smooth' });
}

/** Hoàn thành nhiệm vụ: tính điểm, trao thẻ evidence, mở khóa, hiện kết luận nhỏ. */
function completeQuest(q, qs, container, onChange) {
  const sc = data.quests.settings.scoring;
  let points = Math.max(sc.minAfterHints, sc.firstTry - sc.hintPenaltyPerLevel * qs.hints - 2 * qs.fails);
  if (qs.walkthrough) points = Math.min(points, sc.partial);
  qs.status = 'done';
  qs.points = points;
  state.progress.score += points;
  const newCards = (q.evidenceCards || []).filter(addEvidence);
  saveProgress();
  sfx('correct');

  const extra = [el('p', null, `${t('room.conclusion')}: ${q.conclusion}`)];
  (q.evidenceCards || []).map(evidenceById).filter(Boolean).forEach(ev => extra.push(renderEvidenceCard(ev)));
  extra.push(el('p', 'muted', t('room.points', { n: points })));
  const next = el('button', 'btn-primary', t('room.continue'));
  next.type = 'button';
  next.addEventListener('click', () => { sfx('unlock'); onChange(); });
  extra.push(next);
  showFeedback(container, 'correct', q.feedback.correct, [], extra);
  if (newCards.length) toast(`${t('room.newCard')}: ${newCards.map(id => evidenceById(id)?.title).join(', ')}`);
  next.focus({ preventScroll: true });
}

// ---------- G2: chọn thẻ mệnh đề ----------

/** Vẽ lưới thẻ có ô chọn; trả về hàm đọc lựa chọn. */
function renderCards(body, q, qs) {
  const grid = el('div', 'card-grid');
  grid.setAttribute('role', 'group');
  grid.setAttribute('aria-label', q.question);
  const picked = new Set(qs.answers.picked || []);
  for (const c of q.cards) {
    const wrap = el('div', 'card-option');
    wrap.dataset.id = c.id;
    const label = el('label');
    const box = el('input');
    box.type = 'checkbox';
    box.value = c.id;
    box.checked = picked.has(c.id);
    wrap.classList.toggle('is-picked', box.checked);
    box.addEventListener('change', () => {
      wrap.classList.toggle('is-picked', box.checked);
      wrap.classList.remove('is-right', 'is-wrong');
    });
    label.append(box, el('span', null, c.text));
    wrap.append(label);
    grid.append(wrap);
  }
  body.append(grid);
  return () => {
    const ids = [...grid.querySelectorAll('input:checked')].map(i => i.value);
    return ids.length ? { picked: ids, raw: { picked: ids } } : null;
  };
}

/** Chấm G2: đúng khi chọn đủ thẻ đúng và không chọn thẻ sai. */
function checkCards(q, answers, body) {
  const correct = q.cards.filter(c => c.correct).map(c => c.id);
  const picked = answers.picked;
  const rightPicked = picked.filter(id => correct.includes(id));
  const wrongPicked = picked.filter(id => !correct.includes(id));
  body.querySelectorAll('.card-option').forEach(w => {
    w.classList.toggle('is-wrong', wrongPicked.includes(w.dataset.id));
  });
  const wrongCards = wrongPicked.map(id => q.cards.find(c => c.id === id));
  const items = wrongCards.map(c => `✗ ${c.text}: ${c.feedback}`);
  if (wrongPicked.length === 0 && rightPicked.length < correct.length) items.push(`? Còn thiếu ${correct.length - rightPicked.length} nhóm nội dung.`);
  const status = rightPicked.length === correct.length && wrongPicked.length === 0 ? 'correct'
    : rightPicked.length > 0 ? 'partial' : 'wrong';
  return { status, items, reactions: wrongCards.map(c => c.npcReact).filter(Boolean) };
}

// ---------- G1: điền evidence ----------

/** Vẽ các ô điền chữ; trả về hàm đọc giá trị. */
function renderFields(body, q, qs) {
  for (const f of q.fields) {
    const wrap = el('div', 'field');
    wrap.dataset.id = f.id;
    const label = el('label', null, f.label);
    label.htmlFor = `f-${q.id}-${f.id}`;
    label.append(el('span', 'mark'));
    const input = el('input');
    input.id = label.htmlFor;
    input.autocomplete = 'off';
    if (f.placeholder) input.placeholder = f.placeholder;
    input.value = qs.answers[f.id] || '';
    input.addEventListener('input', () => {
      wrap.classList.remove('is-right', 'is-wrong');
      wrap.querySelector('.mark').textContent = '';
    });
    wrap.append(label, input);
    body.append(wrap);
  }
  return () => {
    const raw = {};
    body.querySelectorAll('.field').forEach(w => { raw[w.dataset.id] = w.querySelector('input').value.trim(); });
    return Object.values(raw).some(Boolean) ? { raw } : null;
  };
}

/** So một câu trả lời với danh sách đáp án: 'right' | 'almost' | 'wrong'. */
export function matchField(value, accepts, fuzzy = true) {
  const norm = normalize(value);
  if (!norm) return 'wrong';
  const accs = accepts.map(normalize);
  if (accs.some(a => containsPhrase(norm, a))) return 'right';
  if (fuzzy && accs.some(a => a.length >= 4 && levenshtein(norm, a) <= (a.length >= 8 ? 2 : 1))) return 'almost';
  return 'wrong';
}

/** Chấm G1: đúng khi mọi ô khớp (cho phép gần đúng), một phần khi khớp một số ô. */
function checkFields(q, answers, body) {
  let ok = 0;
  for (const f of q.fields) {
    const res = matchField(answers.raw[f.id], f.accepts, f.fuzzy !== false);
    const w = body.querySelector(`.field[data-id="${f.id}"]`);
    const good = res !== 'wrong';
    if (good) ok++;
    w.classList.toggle('is-right', good);
    w.classList.toggle('is-wrong', !good);
    w.querySelector('.mark').textContent = res === 'right' ? '✓' : res === 'almost' ? `✓ ${t('room.almost')}` : '✗';
  }
  const status = ok === q.fields.length ? 'correct' : ok > 0 ? 'partial' : 'wrong';
  return { status, items: [] };
}

const CHECKERS = { G1: checkFields, G2: checkCards };
