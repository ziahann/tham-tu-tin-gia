// Khởi động: tải dữ liệu, màn hình chính, Phaser, thanh trên, balo, cài đặt, nguồn.
import { data, loadAll, t } from './data.js';
import { state, loadState, saveSettings, startNewProgress } from './state.js';
import { initInput, on, releaseAll } from './input.js';
import * as dlg from './dialogue.js';
import * as backpack from './backpack.js';
import { setOnChange } from './story.js';
import { updateScore } from './hud.js';
import { WorldScene } from './world.js';
import { applyUiText, toast, openModal, closeModal, confirmBox } from './ui.js';

const $ = id => document.getElementById(id);
let game = null;

/** Tạo phần tử với class và chữ. */
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

const modalOpen = () => $('modal').open;
const titleOpen = () => !$('title').hidden;

// Bản đồ dừng người chơi khi đang ở màn hình chính hoặc hộp thoại phụ.
window.uiBlocked = () => titleOpen() || modalOpen() || dlg.isOpen();

/** Bật/tắt class theo cài đặt. */
function applySettings() {
  document.body.classList.toggle('hide-sensitive', state.settings.hideSensitiveImages);
  document.body.classList.toggle('reduce-motion', state.settings.reduceMotion);
}

/** Cập nhật thanh trên và balo sau mỗi thay đổi tiến độ. */
function refreshUi() {
  updateScore();
  backpack.render();
}

// ---------------------------------------------------------------- màn hình chính

/** Hiện màn hình chính (cảnh báo nội dung, bắt đầu / chơi tiếp). */
function showTitle() {
  releaseAll();
  backpack.close();
  const has = !!state.progress;
  $('title').hidden = false;
  $('hud').hidden = true;
  $('title-name').hidden = true;
  $('title-actions').hidden = false;
  $('title-start').hidden = has;
  $('title-continue').hidden = !has;
  $('title-restart').hidden = !has;
  (has ? $('title-continue') : $('title-start')).focus();
}

/** Vào bản đồ (tạo game Phaser lần đầu). */
function startGame(isNew) {
  $('title').hidden = true;
  $('hud').hidden = false;
  updateScore();
  if (!game) {
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      backgroundColor: '#0f0e17',
      pixelArt: true,
      roundPixels: true,
      scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
      physics: { default: 'arcade', arcade: { debug: false } },
      input: { keyboard: false },
      scene: [WorldScene]
    });
    // Chỉ dùng khi kiểm thử: ?debug cho phép công cụ test truy cập game.
    if (new URLSearchParams(location.search).has('debug')) window.__game = game;
  }
  if (isNew) toast(t('title.firstHint'), 6000);
}

// ---------------------------------------------------------------- hộp thoại phụ

/** Danh mục nguồn APA. */
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

/** Cài đặt: âm thanh, ảnh nhạy cảm, giảm chuyển động, về màn hình chính. */
function openSettings() {
  const wrap = el('div');
  [['hideSensitiveImages', 'hideSensitive'], ['muted', 'mute'], ['reduceMotion', 'reduceMotion']].forEach(([key, label]) => {
    const row = el('label', 'setting');
    const box = el('input');
    box.type = 'checkbox';
    box.checked = !!state.settings[key];
    box.addEventListener('change', () => { state.settings[key] = box.checked; saveSettings(); applySettings(); });
    row.append(box, el('span', null, t(`settingsPanel.${label}`)));
    wrap.append(row);
  });
  const music = el('label', 'setting');
  const mbox = el('input');
  mbox.type = 'checkbox';
  mbox.disabled = true;
  music.append(mbox, el('span', 'muted', `${t('settingsPanel.music')} — ${t('hud.musicSoon')}`));
  const actions = el('div', 'actions');
  const home = el('button', 'btn', t('settingsPanel.home'));
  home.type = 'button';
  home.addEventListener('click', () => { closeModal(); showTitle(); });
  actions.append(home);
  wrap.append(music, actions);
  openModal(t('settingsPanel.title'), wrap);
}

// ---------------------------------------------------------------- khởi động

/** Gắn sự kiện cho nút và phím. */
function bindEvents() {
  $('title-start').addEventListener('click', () => {
    $('title-actions').hidden = true;
    $('title-name').hidden = false;
    $('title-name-input').value = data.quests.hero.displayName;
    $('title-name-input').focus();
  });
  $('title-name').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('title-name-input').value.replace(/\s+/g, ' ').trim().slice(0, 20) || data.quests.hero.displayName;
    startNewProgress(name);
    startGame(true);
  });
  $('title-continue').addEventListener('click', () => startGame(false));
  $('title-restart').addEventListener('click', async () => {
    if (!(await confirmBox(t('title.restart'), t('title.restartConfirm')))) return;
    try { localStorage.removeItem('tfd_progress'); } catch { /* bỏ qua */ }
    location.reload();
  });
  $('btn-sources').addEventListener('click', openSources);
  $('btn-settings').addEventListener('click', openSettings);
  $('modal-close').addEventListener('click', closeModal);

  on('action', () => {
    if (titleOpen() || modalOpen()) return;
    if (dlg.isOpen()) { dlg.advance(); return; }
    game?.scene.getScene('world')?.interact();
  });
  on('backpack', () => { if (!titleOpen() && !modalOpen()) backpack.toggle(); });
  on('escape', () => { if (!modalOpen() && backpack.isOpen()) backpack.close(); });
}

/** Điểm vào. */
async function boot() {
  try {
    await loadAll();
  } catch (err) {
    console.error(err);
    $('loading').textContent = 'Không tải được dữ liệu game. Hãy chạy qua một máy chủ web (xem README).';
    return;
  }
  try { await document.fonts.load('20px VT323'); } catch { /* dùng phông dự phòng */ }
  $('loading').remove();
  loadState();
  applySettings();
  applyUiText();
  document.title = `${t('gameTitle')} · ${data.quests.caseTitle}`;
  $('title-case').textContent = data.quests.caseTitle;
  initInput();
  dlg.initDialog();
  backpack.initBackpack(() => game?.scene.getScene('world') || null);
  setOnChange(refreshUi);
  bindEvents();
  showTitle();
  if (state.lostSave) toast(t('lostSave'));
}

boot();
