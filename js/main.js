// Khởi động: tải dữ liệu, màn hình chính, Phaser, thanh trên, balo, cài đặt, nguồn.
import { data, loadAll, t, sourceById, shortCite } from './data.js';
import { Bay } from './bay.js';
import { state, loadState, saveSettings, startNewProgress } from './state.js';
import { initInput, on, releaseAll } from './input.js';
import * as dlg from './dialogue.js';
import * as backpack from './backpack.js';
import { setOnChange, setOnEnding } from './story.js';
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
const introOpen = () => !$('intro').hidden;
const resultsOpen = () => !$('results').hidden;
let heroLook = 'm';
let bay = null;
let introIdx = 0;

// Bản đồ dừng người chơi khi đang ở màn hình chính, intro hoặc hộp thoại phụ.
window.uiBlocked = () => titleOpen() || introOpen() || resultsOpen() || modalOpen() || dlg.isOpen();

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
  $('hud').hidden = true;
  $('title-start').hidden = has;
  $('title-continue').hidden = !has;
  $('title-restart').hidden = !has;
  bay.setScene('calm');
  bay.start();
  (has ? $('title-continue') : $('title-start')).focus();
}

// ---------------------------------------------------------------- intro: bối cảnh vụ án

/** Điện thoại mô phỏng bài đăng lan truyền; fake = đã lộ là ảnh giả / video cũ. */
function renderPhone(fake) {
  const phone = $('intro-phone');
  phone.innerHTML = '';
  phone.className = `phone${fake ? ' is-fake' : ''}`;
  phone.setAttribute('role', 'img');
  phone.setAttribute('aria-label', t('intro.phoneAlt'));
  phone.append(el('div', 'phone-head', t('intro.feed')));
  [['post1', '', t('intro.fake')], ['post2', ' video', t('intro.old')]].forEach(([key, kind, label]) => {
    const post = el('div', 'post');
    // Nhãn nằm ngoài phần bị làm mờ để "Ẩn hình ảnh nhạy cảm" không che mất nhãn ẢNH GIẢ.
    const img = el('div', `post-img${kind}`);
    const pic = el('div', 'sensitive');
    pic.append(el('div', 'post-pic'));
    img.append(pic, el('span', 'tag', label));
    post.append(el('div', 'post-who', t('intro.page')), img, el('div', null, t(`intro.${key}`)), el('span', 'post-share', t('intro.share')), el('span', 'post-hearts', '♥'));
    phone.append(post);
  });
}

/** Hiện một thẻ hồ sơ của intro. */
function renderIntroCard() {
  const intro = data.quests.intro;
  const card = intro.cards[introIdx];
  const box = document.querySelector('.intro-box');
  box.classList.remove('is-new');
  void box.offsetWidth; // chạy lại hiệu ứng hiện chữ
  box.classList.add('is-new');
  bay.setScene(card.scene);
  $('intro-step').textContent = t('intro.step', { n: introIdx + 1, total: intro.cards.length });
  $('intro-title').textContent = card.title + (card.simulated ? ` · ${t('simulated')}` : '');
  $('intro-text').textContent = card.text;
  $('intro-cite').textContent = card.cite ? t('intro.sources', { list: card.cite.map(id => shortCite(sourceById(id))).join('; ') }) : '';
  $('intro-phone').hidden = !card.overlay;
  if (card.overlay) renderPhone(card.overlay === 'phone-fake');
  $('intro-next').focus();
}

/** Bắt đầu intro cho lượt chơi mới. */
function startIntro() {
  const intro = data.quests.intro;
  $('title').hidden = true;
  $('intro').hidden = false;
  $('intro-final').hidden = true;
  $('intro-actions').hidden = false;
  $('intro-next').textContent = intro.next;
  $('intro-skip').textContent = intro.skip;
  introIdx = 0;
  renderIntroCard();
}

/** Sang thẻ tiếp theo, hoặc tới bước cuối (câu hỏi xác minh + đặt tên). */
function nextIntro() {
  if (introIdx < data.quests.intro.cards.length - 1) { introIdx++; renderIntroCard(); }
  else finishIntro();
}

/** Bước cuối intro: ba câu hỏi xác minh và ô đặt tên thám tử. */
function finishIntro() {
  const intro = data.quests.intro;
  introIdx = intro.cards.length - 1;
  renderIntroCard();
  $('intro-phone').hidden = true;
  $('intro-actions').hidden = true;
  $('intro-final').hidden = false;
  $('intro-questions-title').textContent = intro.questionsTitle;
  const ol = $('intro-questions');
  ol.innerHTML = '';
  data.quests.verificationQuestions.forEach(q => ol.append(el('li', null, q)));
  $('intro-start').textContent = intro.start;
  $('intro-name-input').value = data.quests.hero.displayName;
  $('intro-name-input').focus();
}

/** Vào bản đồ (tạo game Phaser lần đầu). */
function startGame(isNew) {
  $('title').hidden = true;
  $('intro').hidden = true;
  bay.stop();
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

// ---------------------------------------------------------------- S10: kết quả

/** Danh hiệu theo điểm (chỉ để chơi). */
function rankFor(score) {
  return data.quests.settings.titles.filter(x => score >= x.min).pop()?.title || '';
}

/** Màn kết quả sau khi thắng boss. */
function showResults() {
  const r = data.quests.results;
  const p = state.progress;
  $('results-title').textContent = r.title;
  const stats = $('results-stats');
  stats.innerHTML = '';
  [[r.rank, rankFor(p.score)], [r.score, p.score], [r.cards, p.evidenceCards.length]].forEach(([k, v]) => {
    const span = el('span', null, `${k}: `);
    span.append(el('strong', null, String(v)));
    stats.append(span);
  });
  $('results-verified-title').textContent = `✓ ${r.verifiedTitle}`;
  $('results-unsure-title').textContent = `? ${r.unsureTitle}`;
  const fill = (id, items) => { const ul = $(id); ul.innerHTML = ''; items.forEach(x => ul.append(el('li', null, x))); };
  fill('results-verified', r.verified);
  fill('results-unsure', r.unsure);
  $('results-takeaway').textContent = r.takeaway;
  $('results-continue').textContent = r.keepPlaying;
  $('results-sources').textContent = r.sources;
  $('results-replay').textContent = r.replay;
  $('results').hidden = false;
  $('results-continue').focus();
}

// ---------------------------------------------------------------- khởi động

/** Gắn sự kiện cho nút và phím. */
function bindEvents() {
  $('title-start').addEventListener('click', startIntro);
  $('intro-next').addEventListener('click', nextIntro);
  $('intro-skip').addEventListener('click', finishIntro);
  $('intro-name').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('intro-name-input').value.replace(/\s+/g, ' ').trim().slice(0, 20) || data.quests.hero.displayName;
    startNewProgress(name, heroLook);
    startGame(true);
  });
  document.querySelectorAll('.look').forEach(b => b.addEventListener('click', () => {
    heroLook = b.dataset.look;
    document.querySelectorAll('.look').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  }));
  $('results-continue').addEventListener('click', () => { $('results').hidden = true; });
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
    if (introOpen()) { if ($('intro-final').hidden) nextIntro(); return; }
    if (dlg.isOpen()) { dlg.advance(); return; }
    game?.scene.getScene('world')?.interact();
  });
  on('backpack', () => { if (!titleOpen() && !introOpen() && !modalOpen()) backpack.toggle(); });
  on('escape', () => {
    if (modalOpen()) return;
    if (introOpen() && $('intro-final').hidden) finishIntro();
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
  document.title = `${t('gameTitle')} · ${data.quests.caseTitle}`;
  $('title-case').textContent = data.quests.caseTitle;
  bay = new Bay($('bay'));
  $('bay').setAttribute('aria-label', t('title.bayAlt'));
  initInput();
  dlg.initDialog();
  backpack.initBackpack(() => game?.scene.getScene('world') || null);
  setOnChange(refreshUi);
  setOnEnding(showResults);
  bindEvents();
  showTitle();
  if (state.lostSave) toast(t('lostSave'));
}

boot();
