// Khởi động: tải dữ liệu, màn hình chính, Phaser, thanh trên, balo, cài đặt, nguồn.
import { data, loadAll, t } from './data.js';
import { Bay } from './bay.js';
import { playMusic, unlockMusic, refreshMusic, musicSupported } from './music.js';
import { stopAmbience } from './audio.js';
import { state, loadState, saveSettings, startNewProgress, hasFlag } from './state.js';
import { initInput, on, releaseAll, lockLandscape } from './input.js';
import * as dlg from './dialogue.js';
import * as backpack from './backpack.js';
import { setOnChange, setOnEnding, skipToBoss } from './story.js';
import { earnedBadges, caseProgress } from './grading.js';
import { updateScore } from './hud.js';
import { WorldScene } from './world.js';
import { reader } from './tools.js';
import { randomWeather, dayPhase } from './weather.js';
import { showClock } from './hud.js';
import { exportReport } from './report.js';
import * as journey from './journey.js';
import { feedTick } from './feed.js';
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
const introOpen = () => !$('intro').hidden;
const resultsOpen = () => !$('results').hidden;
let heroLook = 'm';
let bay = null;

// Bản đồ dừng người chơi khi đang ở màn hình chính, intro hoặc hộp thoại phụ.
window.uiBlocked = () => titleOpen() || introOpen() || resultsOpen() || modalOpen() || dlg.blocksWorld();

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
  $('intro').hidden = true;
  stopAmbience();
  $('hud').hidden = true;
  $('title-start').hidden = has;
  $('title-continue').hidden = !has;
  $('title-restart').hidden = !has;
  bay.setScene('calm');
  bay.start();
  playMusic('title');
  (has ? $('title-continue') : $('title-start')).focus();
}

// ---------------------------------------------------------------- chọn nhân vật + tên (lượt mới)

/** Bắt đầu lượt mới: chọn mẫu nhân vật và nhập tên, rồi vào cảnh mở đầu ở phòng riêng. */
function startIntro() {
  $('title').hidden = true;
  $('intro').hidden = false;
  $('intro-name-input').value = '';
  $('intro-name-input').placeholder = t('title.namePlaceholder');
  $('intro-name-input').focus();
}

/** Vào bản đồ (tạo game Phaser lần đầu). */
function startGame(isNew) {
  $('title').hidden = true;
  $('intro').hidden = true;
  bay.stop();
  $('hud').hidden = false;
  // Lượt mới: bắt đầu ở phòng trọ TP.HCM (js/journey.js); lượt cũ đã thắng trận cuối thì chuyển sang chặng về báo cáo
  if (isNew) journey.startJourney();
  else journey.migrate();
  updateScore();
  if (!game) {
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      backgroundColor: '#0f0e17',
      pixelArt: true,
      render: { maxLights: 48 }, // ánh sáng ban đêm: đèn đường, cửa sổ, thiết bị
      roundPixels: true,
      scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
      physics: { default: 'arcade', arcade: { debug: false } },
      input: { keyboard: false },
      scene: [WorldScene]
    });
    // Chỉ dùng khi kiểm thử: ?debug cho phép công cụ test truy cập game.
    if (new URLSearchParams(location.search).has('debug')) window.__game = game;
  }
}

// ---------------------------------------------------------------- hộp thoại phụ

/** Danh mục nguồn APA: đọc tóm tắt ngay trong game; link bài gốc chỉ là phụ. */
function openSources() {
  const wrap = el('div');
  for (const src of data.sources.sources.filter(s => !s.internal)) {
    const box = el('div', 'resource');
    box.append(el('span', null, src.apa));
    const row = el('div', 'row');
    if (src.verifiedContent) {
      const read = el('button', 'btn-small', t('reader.readInGame'));
      read.type = 'button';
      read.addEventListener('click', () => openModal(src.outlet, reader([src.id])));
      row.append(read);
    }
    if (src.url) {
      const a = el('a', 'muted small', t('reader.original'));
      a.href = src.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      row.append(a);
      if (src.urlStatus === 'from_report_unverified') row.append(el('span', 'muted', `(${t('sourcesPanel.unverified')})`));
    } else {
      row.append(el('span', 'muted', t('sourcesPanel.missing')));
    }
    box.append(row);
    wrap.append(box);
  }
  wrap.append(el('h3', null, t('sourcesPanel.authors')), el('p', null, t('sourcesPanel.authorsList')));
  // Ghi công nhạc nền (CC BY 4.0)
  wrap.append(el('h3', null, t('sourcesPanel.music')));
  for (const m of data.sources.music || []) {
    const box = el('div', 'resource');
    box.append(el('span', null, `"${m.title}" ${m.author} (${m.site}). ${m.license}.`));
    const a = el('a', 'muted small', m.licenseUrl);
    a.href = m.licenseUrl; a.target = '_blank'; a.rel = 'noopener noreferrer';
    box.append(a);
    wrap.append(box);
  }
  openModal(t('sourcesPanel.title'), wrap);
}

/** Cài đặt: âm thanh, ảnh nhạy cảm, giảm chuyển động, về màn hình chính. */
function openSettings() {
  const wrap = el('div');
  [['hideSensitiveImages', 'hideSensitive'], ['muted', 'mute'], ['ambience', 'ambience'], ['reduceMotion', 'reduceMotion'], ['clickMove', 'clickMove']].forEach(([key, label]) => {
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
  mbox.checked = state.settings.music !== false && musicSupported;
  mbox.disabled = !musicSupported;
  mbox.addEventListener('change', () => { state.settings.music = mbox.checked; saveSettings(); refreshMusic(); });
  music.append(mbox, el('span', musicSupported ? null : 'muted', musicSupported ? t('settingsPanel.music') : `${t('settingsPanel.music')} — ${t('hud.musicUnsupported')}`));
  // Thử thách: Đầy đủ / Nhẹ (js/obstacles.js)
  const ch = el('fieldset', 'setting-group');
  ch.append(el('legend', null, t('obstacles.challenge')));
  for (const v of ['full', 'light']) {
    const row = el('label', 'setting');
    const r = el('input');
    r.type = 'radio'; r.name = 'challenge'; r.value = v;
    r.checked = (state.settings.challenge || 'full') === v;
    r.addEventListener('change', () => { state.settings.challenge = v; saveSettings(); updateScore(); });
    row.append(r, el('span', null, t(v === 'full' ? 'obstacles.challengeFull' : 'obstacles.challengeLight')));
    ch.append(row);
  }
  wrap.append(ch);
  const actions = el('div', 'actions');
  // Tới thẳng boss (bỏ qua các hồ sơ chưa làm): hỏi lại trước khi làm
  const toBoss = el('button', 'btn', t('settingsPanel.skipBoss'));
  toBoss.type = 'button';
  toBoss.hidden = !game || hasFlag('boss_done');
  toBoss.addEventListener('click', async () => {
    if (!(await confirmBox(t('settingsPanel.skipBoss'), t('settingsPanel.skipBossConfirm')))) return;
    skipToBoss();
  });
  actions.append(toBoss);
  // Bỏ qua phần mở đầu ở TP.HCM (chỉ hiện khi đang ở phần mở đầu)
  const skipIntro = el('button', 'btn', t('journey.skipPrologue'));
  skipIntro.type = 'button';
  skipIntro.hidden = !game || !['home', 'seen', 'called', 'briefed'].includes(journey.stage());
  skipIntro.addEventListener('click', async () => {
    if (!(await confirmBox(t('journey.skipPrologue'), t('journey.skipPrologueConfirm')))) return;
    closeModal();
    journey.skipPrologue();
  });
  actions.append(skipIntro);
  const home = el('button', 'btn', t('settingsPanel.home'));
  home.type = 'button';
  home.addEventListener('click', () => { closeModal(); showTitle(); });
  actions.append(home);
  wrap.append(music, actions);
  openModal(t('settingsPanel.title'), wrap);
}

// ---------------------------------------------------------------- S10: kết quả

/** Màn kết quả sau khi thắng boss. */
function showResults() {
  const r = data.quests.results;
  const p = state.progress;
  $('results-title').textContent = r.title;
  const stats = $('results-stats');
  stats.innerHTML = '';
  const prog = caseProgress(p.flags);
  [[r.closed, `${prog.done}/${prog.total}`], [r.cards, p.evidenceCards.length]].forEach(([k, v]) => {
    const span = el('span', null, `${k}: `);
    span.append(el('strong', null, String(v)));
    stats.append(span);
  });
  // Bộ huy hiệu kỹ năng (thay cho điểm và danh hiệu)
  if (p.title) {
    const span = el('span', null, `${t('journey.resultsTitle')}: `);
    span.append(el('strong', null, p.title.name));
    stats.append(span);
  }
  const shelf = el('div', 'badge-shelf');
  earnedBadges(p.flags).forEach(room => shelf.append(backpack.badgeCard(room, true)));
  stats.append(el('h2', null, r.badges), shelf);
  $('results-verified-title').textContent = `✓ ${r.verifiedTitle}`;
  $('results-unsure-title').textContent = `? ${r.unsureTitle}`;
  const fill = (id, items) => { const ul = $(id); ul.innerHTML = ''; items.forEach(x => ul.append(el('li', null, x))); };
  fill('results-verified', r.verified);
  fill('results-unsure', r.unsure);
  $('results-takeaway').textContent = r.takeaway;
  $('results-continue').textContent = r.keepPlaying;
  $('results-sources').textContent = r.sources;
  $('results-replay').textContent = r.replay;
  let pdf = $('results-pdf');
  if (!pdf) {
    pdf = el('button', 'btn', t('report.button'));
    pdf.id = 'results-pdf';
    pdf.type = 'button';
    pdf.addEventListener('click', exportReport);
    $('results-continue').after(pdf);
  }
  $('results').hidden = false;
  playMusic('ending');
  $('results-continue').focus();
}

// ---------------------------------------------------------------- khởi động

/** Gắn sự kiện cho nút và phím. */
function bindEvents() {
  // điện thoại: bấm nút ở màn hình chính thì vào toàn màn hình, khóa ngang
  ['title-start', 'title-continue', 'title-restart'].forEach(id => $(id).addEventListener('click', lockLandscape));
  $('title-start').addEventListener('click', startIntro);
  $('intro-back').addEventListener('click', showTitle);
  $('intro-name').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('intro-name-input').value.replace(/\s+/g, ' ').trim().slice(0, 20);
    if (!name) { toast(t('title.nameRequired')); $('intro-name-input').focus(); return; }
    startNewProgress(name, heroLook);
    startGame(true);
  });
  document.querySelectorAll('.look').forEach(b => b.addEventListener('click', () => {
    heroLook = b.dataset.look;
    document.querySelectorAll('.look').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  }));
  $('results-continue').addEventListener('click', () => {
    $('results').hidden = true;
    playMusic(game?.scene.getScene('world')?.mapMusic);
  });
  $('results-sources').addEventListener('click', openSources);
  $('results-replay').addEventListener('click', async () => {
    if (!(await confirmBox(t('title.restart'), t('title.restartConfirm')))) return;
    try { localStorage.removeItem('tfd_progress'); } catch { /* bỏ qua */ }
    location.reload();
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
    if (titleOpen() || modalOpen() || resultsOpen()) return;
    if (introOpen()) return;
    if (dlg.isMinimized()) { dlg.restore(); return; }
    if (dlg.isOpen()) { dlg.advance(); return; }
    game?.scene.getScene('world')?.interact();
  });
  on('backpack', () => { if (!titleOpen() && !introOpen() && !modalOpen()) backpack.toggle(); });
  const openCases = () => { if (!titleOpen() && !introOpen() && !modalOpen()) backpack.open('quests'); };
  on('cases', openCases);
  // Đồng hồ trong game: 1 giây thật = 1 phút trong game (một ngày ≈ 24 phút); dừng khi ở màn hình chính / intro
  setInterval(() => {
    if (!state.progress || !game || titleOpen() || introOpen()) return;
    const p = state.progress;
    p.clock = ((p.clock ?? 960) + 1) % 1440;
    showClock();
    feedTick();
    const world = game.scene.getScene('world');
    world?.weather?.setTime(dayPhase(p.clock));
  }, 1000);
  // Thời tiết thành phố đổi ngẫu nhiên mỗi 5 phút (chỉ có hiệu lực ngoài trời; lưu trong cài đặt)
  setInterval(() => {
    const world = game?.scene.getScene('world');
    if (!world?.weather || titleOpen() || introOpen()) return;
    const next = randomWeather(world.weather.global);
    world.weather.set(next);
    if (world.weather.outdoor) toast(`${t(`weather.${next}`)} · ${t(`weather.fx.${next}`)}`, 5000);
  }, 5 * 60 * 1000);
  $('btn-cases').addEventListener('click', openCases);
  $('hud-track').addEventListener('click', openCases);
  on('escape', () => {
    if (modalOpen()) return;
    if (introOpen()) showTitle();
    else if (backpack.isOpen()) backpack.close();
  });
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
  document.title = t('gameTitle');
  bay = new Bay($('bay'));
  $('bay').setAttribute('aria-label', t('title.bayAlt'));
  initInput();
  // Trình duyệt chỉ cho phát nhạc sau thao tác đầu tiên của người chơi.
  ['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, unlockMusic, { once: true }));
  dlg.initDialog();
  backpack.initBackpack(() => game?.scene.getScene('world') || null);
  setOnChange(refreshUi);
  setOnEnding(showResults);
  journey.setOnEnding(showResults);
  bindEvents();
  showTitle();
  if (state.lostSave) toast(t('lostSave'));
}

boot();
