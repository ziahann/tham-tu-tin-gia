// Khởi động game, điều hướng màn hình S0–S3, sổ tay, nguồn, nhật ký, cài đặt.
import { data, loadAll, t, evidenceById, sceneById } from './data.js';
import { state, loadState, saveProgress, saveSettings, startNewProgress, clearAllStorage, hasFlag, setFlag } from './state.js';
import { initChat, renderHistory, playScene, setContext, readLog, exportLog } from './chat.js';
import { drawScene, fitCanvas, validateSprites } from './pixel.js';
import { roomStatus, roomProgress, activeQuest, renderResources, renderRoomQuests, renderEvidenceCard } from './quests.js';
import { applyUiText, toast, openModal, closeModal, confirmBox } from './ui.js';
import { sfx } from './audio.js';

const $ = id => document.getElementById(id);
const SCREENS = ['S0', 'S1', 'S2', 'room'];
const ROOM_SCENES = ['S3']; // phòng đã có cảnh vẽ riêng

/** Tạo phần tử với class và chữ. */
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

const roomById = id => data.quests.rooms.find(r => r.id === id);

/** Bật/tắt class theo cài đặt (ẩn ảnh nhạy cảm, giảm chuyển động). */
function applySettings() {
  document.body.classList.toggle('hide-sensitive', state.settings.hideSensitiveImages);
  document.body.classList.toggle('reduce-motion', state.settings.reduceMotion);
}

/** Cập nhật điểm trên thanh trên. */
function updateScore() {
  $('topbar-score').textContent = state.progress ? `${t('topbar.score')}: ${state.progress.score}` : '';
}

/** Vẽ và căn cỡ canvas cảnh của màn, kèm mô tả thay thế. */
function paintCanvas(canvas, sceneId, opts) {
  drawScene(canvas, sceneId, opts);
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', data.quests.sceneAlt?.[sceneId] || '');
  fitCanvas(canvas);
}

/** Chuyển màn hình. screen ∈ S0 | S1 | S2 | room. */
function showScreen(screen, roomId = null) {
  closeModal();
  SCREENS.forEach(s => { $(`screen-${s}`).hidden = s !== screen; });
  $('btn-map').hidden = !(screen === 'room' || (screen === 'S1' && hasFlag('s1_done')));
  $('chat').hidden = screen === 'S0';
  const room = roomId && roomById(roomId);
  $('topbar-room').textContent = room ? room.name : screen === 'S0' ? '' : t(`${screen}.title`);
  if (state.progress && screen !== 'S0') {
    state.progress.screen = screen;
    state.progress.room = roomId;
    saveProgress();
  }
  setContext(room?.npc || 'npc1', room?.id || screen);
  updateScore();
  ({ S0: enterS0, S1: enterS1, S2: enterS2, room: () => enterRoom(roomId) })[screen]();
  $('app').focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

// ---------- S0 ----------

/** Trang chủ: cảnh báo nội dung, bắt đầu / chơi tiếp / chơi lại. */
function enterS0() {
  paintCanvas(document.querySelector('[data-scene="S0"]'), 'S0');
  const has = !!state.progress;
  $('s0-start').hidden = has;
  $('s0-continue').hidden = !has;
  $('s0-restart').hidden = !has;
}

/** Tiếp tục từ màn đã lưu. */
function continueGame() {
  const p = state.progress;
  if (p.screen === 'room' && roomById(p.room)) showScreen('room', p.room);
  else showScreen(hasFlag('s1_done') ? 'S2' : 'S1');
}

// ---------- S1 ----------

/** Nhận vụ án: đặt tên thám tử, nghe NPC giao việc, xem ba câu hỏi xác minh. */
function enterS1() {
  paintCanvas(document.querySelector('[data-scene="S1"]'), 'S1');
  const list = $('s1-question-list');
  list.innerHTML = '';
  data.quests.verificationQuestions.forEach(q => list.append(el('li', null, q)));
  const done = hasFlag('s1_done');
  $('s1-name-form').hidden = done;
  $('s1-questions').hidden = !done;
  $('s1-name').value = state.progress?.heroName || data.quests.hero.displayName;
  if (!done) $('s1-name').focus();
}

/** Người chơi xác nhận tên → bắt đầu lượt (nếu chưa có) và phát cảnh S1. */
async function submitName(e) {
  e.preventDefault();
  sfx('click');
  const name = $('s1-name').value.replace(/\s+/g, ' ').trim().slice(0, 20) || data.quests.hero.displayName;
  if (!state.progress) startNewProgress(name);
  else { state.progress.heroName = name; saveProgress(); }
  renderHistory();
  $('s1-name-form').hidden = true;
  await playScene('s1_intro');
  setFlag('s1_done');
  saveProgress();
  $('s1-questions').hidden = false;
  $('btn-map').hidden = false;
  $('s1-to-map').focus();
}

// ---------- S2 ----------

/** Bản đồ văn phòng: danh sách phòng, trạng thái và tiến độ. */
function enterS2() {
  const rooms = data.quests.rooms;
  const statuses = rooms.map(roomStatus);
  paintCanvas(document.querySelector('[data-scene="S2"]'), 'S2', { doors: statuses });
  const list = $('room-list');
  list.innerHTML = '';
  rooms.forEach((room, i) => {
    const st = statuses[i];
    const li = el('li', `is-${st}`);
    const label = { done: 'statusDone', open: 'statusOpen', locked: 'statusLocked', building: 'statusBuilding' }[st];
    li.append(el('strong', null, `${room.id} · ${room.name}`), el('span', 'room-status', t(`S2.${label}`)));
    if (st === 'done' || st === 'open') {
      li.append(el('span', 'muted', t('S2.progress', roomProgress(room))));
      const go = el('button', st === 'open' ? 'btn-primary' : 'btn', room.name);
      go.type = 'button';
      go.addEventListener('click', () => { sfx('click'); showScreen('room', room.id); });
      li.append(go);
    }
    list.append(li);
  });
}

// ---------- S3–S8 ----------

/** Phòng điều tra: tư liệu bên trái, nhiệm vụ bên phải. */
function enterRoom(roomId) {
  const room = roomById(roomId);
  $('room-title').textContent = room.name;
  paintCanvas($('room-canvas'), ROOM_SCENES.includes(room.id) ? room.id : 'default');
  const refresh = () => {
    const quest = activeQuest(room) || room.quests.map(id => data.quests.quests.find(q => q.id === id)).filter(Boolean).pop();
    renderResources($('room-resources'), quest);
    renderRoomQuests($('room-quests'), room, refresh);
    updateScore();
    const doneScene = `${room.id.toLowerCase()}_done`;
    if (roomStatus(room) === 'done' && !hasFlag(`done_${room.id}`) && sceneById(doneScene)) {
      setFlag(`done_${room.id}`);
      saveProgress();
      playScene(doneScene);
    }
  };
  const introScene = `${room.id.toLowerCase()}_intro`;
  if (!hasFlag(`intro_${room.id}`) && sceneById(introScene)) {
    setFlag(`intro_${room.id}`);
    saveProgress();
    playScene(introScene).then(refresh);
  } else {
    refresh();
  }
}

// ---------- Bảng phụ ----------

/** Sổ tay: câu hỏi xác minh + thẻ evidence đã có. */
function openNotebook() {
  const wrap = el('div');
  wrap.append(el('h3', null, t('notebook.questions')));
  const ol = el('ol');
  data.quests.verificationQuestions.forEach(q => ol.append(el('li', null, q)));
  wrap.append(ol, el('h3', null, t('notebook.cards')));
  const cards = state.progress?.evidenceCards.map(evidenceById).filter(Boolean) || [];
  if (!cards.length) wrap.append(el('p', 'muted', t('notebook.empty')));
  cards.forEach(ev => wrap.append(renderEvidenceCard(ev)));
  openModal(t('notebook.title'), wrap);
}

/** Danh mục nguồn (APA) và liên kết. */
function openSources() {
  const wrap = el('div');
  for (const src of data.sources.sources) {
    const box = el('div', 'resource');
    box.append(el('span', null, src.apa));
    if (src.url) {
      const a = el('a', null, src.url);
      a.href = src.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      box.append(a);
      if (src.urlStatus === 'from_report_unverified') box.append(el('span', 'muted', `(${t('sourcesPanel.unverified')})`));
    } else {
      box.append(el('span', 'muted', t('sourcesPanel.missing')));
    }
    wrap.append(box);
  }
  openModal(t('sourcesPanel.title'), wrap);
}

/** Nhật ký chat của mọi lượt chơi; xuất JSON; xóa dữ liệu. */
function openChatLog() {
  const wrap = el('div');
  const actions = el('div', 'actions');
  const exp = el('button', 'btn-primary', t('chatLogPanel.export'));
  const clr = el('button', 'btn', t('chatLogPanel.clear'));
  exp.type = clr.type = 'button';
  exp.addEventListener('click', exportLog);
  clr.addEventListener('click', async () => {
    if (!(await confirmBox(t('chatLogPanel.title'), t('chatLogPanel.clearConfirm')))) return;
    clearAllStorage();
    applySettings();
    renderHistory();
    showScreen('S0');
  });
  actions.append(exp, clr);
  wrap.append(actions);
  const runs = readLog().runs.slice().reverse();
  if (!runs.length) wrap.append(el('p', 'muted', t('chatLogPanel.empty')));
  runs.forEach(run => {
    const sec = el('div', 'log-run');
    sec.append(el('h3', null, `${t('chatLogPanel.run')} ${new Date(run.startedAt).toLocaleString('vi-VN')} · ${run.heroName || ''}`));
    const ol = el('ol');
    run.messages.forEach(m => ol.append(el('li', null, `[${m.screen}] ${m.from === 'player' ? t('chat.you') : (data.npcs.npcs.find(n => n.id === m.from)?.name || m.from)}: ${m.text}`)));
    sec.append(ol);
    wrap.append(sec);
  });
  openModal(t('chatLogPanel.title'), wrap);
}

/** Cài đặt: ẩn ảnh nhạy cảm, tắt tiếng, giảm chuyển động. */
function openSettings() {
  const wrap = el('div');
  [['hideSensitiveImages', 'hideSensitive'], ['muted', 'mute'], ['reduceMotion', 'reduceMotion']].forEach(([key, label]) => {
    const row = el('label', 'setting');
    const box = el('input');
    box.type = 'checkbox';
    box.checked = !!state.settings[key];
    box.addEventListener('change', () => {
      state.settings[key] = box.checked;
      saveSettings();
      applySettings();
    });
    row.append(box, el('span', null, t(`settingsPanel.${label}`)));
    wrap.append(row);
  });
  openModal(t('settingsPanel.title'), wrap);
}

/** Hướng dẫn chơi. */
function openHowTo() {
  openModal(t('S0.howTo'), el('p', null, t('S0.howToText')));
}

// ---------- Khởi động ----------

/** Gắn sự kiện cho các nút cố định. */
function bindEvents() {
  $('s0-start').addEventListener('click', () => { sfx('click'); showScreen('S1'); });
  $('s0-continue').addEventListener('click', () => { sfx('click'); continueGame(); });
  $('s0-restart').addEventListener('click', async () => {
    if (!(await confirmBox(t('S0.restart'), t('S0.restartConfirm')))) return;
    try { localStorage.removeItem('tfd_progress'); } catch { /* bỏ qua */ }
    state.progress = null;
    renderHistory();
    showScreen('S1');
  });
  $('s0-howto').addEventListener('click', openHowTo);
  $('s1-name-form').addEventListener('submit', submitName);
  $('s1-to-map').addEventListener('click', () => { sfx('click'); showScreen('S2'); });
  $('room-back').addEventListener('click', () => showScreen('S2'));
  $('btn-map').addEventListener('click', () => showScreen('S2'));
  $('btn-notebook').addEventListener('click', openNotebook);
  $('btn-sources').addEventListener('click', openSources);
  $('footer-sources').addEventListener('click', openSources);
  $('btn-chatlog').addEventListener('click', openChatLog);
  $('btn-settings').addEventListener('click', openSettings);
  $('modal-close').addEventListener('click', closeModal);
  window.addEventListener('resize', () => document.querySelectorAll('canvas.scene').forEach(c => { if (c.offsetParent) fitCanvas(c); }));
}

/** Điểm vào: tải dữ liệu, nạp tiến trình, hiện trang chủ. */
async function boot() {
  try {
    await loadAll();
  } catch (err) {
    console.error(err);
    $('loading').textContent = 'Không tải được dữ liệu game. Hãy chạy qua một máy chủ web (xem README).';
    return;
  }
  $('loading').remove();
  validateSprites();
  loadState();
  applySettings();
  applyUiText();
  document.title = `${t('gameTitle')} · ${data.quests.caseTitle}`;
  $('s0-case-title').textContent = data.quests.caseTitle;
  initChat();
  bindEvents();
  if (state.progress) renderHistory();
  showScreen('S0');
  if (state.lostSave) toast(t('lostSave'));
  await document.fonts?.ready;
  document.querySelectorAll('canvas.scene').forEach(c => { if (c.offsetParent) fitCanvas(c); });
}

boot();
