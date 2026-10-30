// Vịnh Feed: mạng xã hội trong game (tab điện thoại trong balo). Bài đăng xuất hiện / đổi theo tiến độ: bài sai lan lúc
// đầu, khép hồ sơ thì có bài đối chiếu của báo chí. Người chơi xử lý từng bài: báo cáo, viết ghi chú cộng đồng (chọn một
// trong ba bản nháp), trả lời người chia sẻ vô tình, bấm "Điều tra" để theo dõi hồ sơ liên quan.
// Ảnh hưởng tới lối chơi: bài sai chưa xử lý làm "độ lan truyền" tăng → hạn chót đầy nhanh hơn và bài sai ở trận cuối bắt
// đầu với nhiều lượt chia sẻ hơn; ghi chú đúng giảm hạn chót; ghi chú vượt bằng chứng, công kích người chia sẻ, báo cáo
// nhầm bài đúng, bấm link câu tương tác thì mất độ tin cậy của hồ sơ đang làm.
// Tiến độ: progress.feed[id] = { report, note, reply, bad, wrongReport }, progress.feedSeen[id] = phút trong game lúc
// bài hiện ra, progress.feedT = số phút trong game đã trôi. Dữ liệu: npc_dialogues.json → feed.
import { data, t } from './data.js';
import { state, saveProgress, hasFlag } from './state.js';
import { sfx } from './audio.js';
import { toast } from './ui.js';
import { loseCred, easePressure, caseOpen, PENALTY, roomName } from './obstacles.js';
import { track, trackedRoom } from './story.js';
import { nextQuestIn } from './grading.js';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

const fmt = n => Math.round(n).toLocaleString('vi-VN');
const all = flags => (flags || []).every(hasFlag);
const posts = () => data.npcs.feed?.posts || [];
const prog = () => (state.progress.feed ||= {});

/** Bài đang hiện: đủ điều kiện `after` (cờ đã có). */
function visiblePosts() {
  return posts().filter(p => all(p.after));
}

/** Bài sai đã được xử lý xong chưa: trang đăng cần ghi chú cộng đồng, người chia sẻ vô tình cần được trả lời. */
const handled = p => {
  const m = prog()[p.id] || {};
  return p.kind === 'user' ? !!m.reply : !!m.note;
};

/** Bài sai còn đang lan (chưa xử lý). */
const spreading = () => visiblePosts().filter(p => p.fake && !handled(p));

/** Độ lan truyền 0..1 (theo số bài sai đang lan). */
export function feedHeat() {
  const n = spreading().length;
  return Math.min(1, n / 6);
}

/** Hệ số nhân tốc độ thanh hạn chót: tin sai càng lan, tòa soạn càng giục (tối đa ×1,5). */
export function feedPressureRate() {
  return state.progress ? 1 + 0.5 * feedHeat() : 1;
}

/** Lượt chia sẻ bài sai ở đầu trận cuối: tăng theo bài sai còn lan, giảm theo ghi chú đã thêm. */
export function bossStartShares() {
  const notes = Object.values(prog()).filter(m => m.note || m.reply).length;
  return Math.max(400, 1200 + 500 * spreading().length - 150 * notes);
}

/** Lượt chia sẻ: bài sai tăng dần theo thời gian trong game cho tới khi được xử lý thì dừng. */
function sharesOf(p) {
  const base = p.shares || 0;
  if (!p.fake) return base;
  const m = prog()[p.id] || {};
  if (m.frozen) return m.frozen;
  const age = Math.max(0, (state.progress.feedT || 0) - (state.progress.feedSeen?.[p.id] ?? 0));
  return base * (1 + Math.min(2, age / 180));
}

/** Số bài sai chưa xử lý (chấm đỏ trên tab và nút balo). */
export function feedAlerts() {
  return state.progress ? spreading().length : 0;
}

/** Đánh dấu bài mới hiện ra; trả về danh sách bài mới (để báo). Gọi mỗi phút trong game. */
export function feedTick() {
  const p = state.progress;
  if (!p) return [];
  p.feedT = (p.feedT || 0) + 1;
  const seen = (p.feedSeen ||= {});
  const fresh = visiblePosts().filter(x => seen[x.id] == null);
  fresh.forEach(x => { seen[x.id] = p.feedT; });
  if (fresh.length) {
    sfx('click');
    toast(fresh.length === 1 ? t('feed.newOne', { who: fresh[0].author }) : t('feed.newMany', { n: fresh.length }), 4500);
  }
  document.getElementById('btn-backpack')?.classList.toggle('has-alert', feedAlerts() > 0);
  return fresh;
}

/** Hồ sơ chịu trừ độ tin cậy khi xử lý sai trên feed: hồ sơ đang theo dõi, nếu không thì hồ sơ của bài. */
function penalize(post, n, why) {
  const room = [trackedRoom(), post.case].find(caseOpen);
  const r = room ? loseCred(room, n) : null;
  sfx('wrong');
  toast(r === 'reset' ? `${why} ${t('feed.credReset', { room: roomName(room) })}` : r ? `${why} ${t('feed.credLost', { n, room: roomName(room) })}` : why, 7000);
}

/** Ảnh trong bài: khối pixel trừu tượng, ảnh giả gắn nhãn ẢNH GIẢ (không có hình nạn nhân). */
function postArt(kind) {
  const cv = el('canvas', 'feed-art');
  cv.width = 96; cv.height = 54;
  const c = cv.getContext('2d');
  const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  const dark = kind === 'storm' || kind === 'river';
  R(0, 0, 96, 30, dark ? '#3a4458' : '#9fc3e0'); R(0, 30, 96, 24, dark ? '#2a3a4c' : '#3f7899');
  if (kind === 'ship' || kind === 'storm') { R(30, 26, 34, 6, '#e8ecf2'); R(38, 20, 16, 6, '#c9d1dc'); }
  if (kind === 'river') { R(0, 34, 96, 3, '#6a7a8a'); R(20, 30, 40, 5, '#b8a888'); R(28, 26, 14, 4, '#9a8a70'); }
  if (kind === 'grid') for (let i = 0; i < 9; i++) R(8 + (i % 3) * 28, 3 + Math.floor(i / 3) * 17, 24, 14, ['#6b7f99', '#8aa0b8', '#55657a'][i % 3]);
  if (kind === 'karst') { R(10, 12, 16, 20, '#4a6a50'); R(62, 8, 20, 24, '#3a5a44'); }
  if (kind === 'card' || kind === 'text') {
    R(0, 0, 96, 54, kind === 'text' ? '#3a2a3a' : '#22344a');
    R(10, 10, 76, 6, '#e8ecf2'); R(10, 22, 60, 4, '#9fb3c8'); R(10, 32, 66, 4, '#9fb3c8');
    R(10, 42, 40, 4, kind === 'text' ? '#e8a0b0' : '#5fe0a0');
  }
  return cv;
}

/** Dựng Vịnh Feed (phần tử DOM) trong khung điện thoại. */
export function vinhFeed(onChange = () => {}) {
  const F = data.npcs.feed;
  const phone = el('div', 'feed-phone');
  const head = el('div', 'feed-head');
  head.append(el('span', 'feed-logo', F.name), el('span', 'feed-sub', F.tagline));
  const heat = el('div', 'feed-heat');
  const list = el('div', 'feed-list');
  phone.append(head, heat, list);
  let open = null; // bài đang mở bảng chọn: { id, kind: 'note' | 'reply' }

  const showHeat = () => {
    const h = feedHeat();
    heat.innerHTML = '';
    const bar = el('span', 'feed-heat-bar');
    const fill = el('span', 'feed-heat-fill');
    fill.style.width = `${Math.round(h * 100)}%`;
    bar.append(fill);
    heat.classList.toggle('is-hot', h >= 0.5);
    heat.append(el('span', null, t('feed.heat')), bar,
      el('span', 'feed-heat-txt', h > 0 ? t('feed.heatOn', { n: spreading().length, x: feedPressureRate().toFixed(1).replace('.', ',') }) : t('feed.heatOff')));
  };

  const render = () => {
    list.innerHTML = '';
    showHeat();
    const shown = visiblePosts().slice().sort((a, b) => (b.order || 0) - (a.order || 0));
    if (!shown.length) list.append(el('p', 'muted', t('feed.empty')));
    for (const p of shown) list.append(card(p));
  };

  const card = p => {
    const mine = prog()[p.id] || {};
    const c = el('article', `feed-post${p.fake ? ' is-fake' : ''}${p.official ? ' is-official' : ''}${handled(p) && p.fake ? ' is-handled' : ''}`);
    const who = el('div', 'feed-who');
    const av = el('span', 'feed-av', p.author.slice(0, 1));
    if (p.official) av.classList.add('is-official');
    if (p.kind === 'user') av.classList.add('is-user');
    const name = el('strong', null, p.author);
    who.append(av, name);
    if (p.badge) who.append(el('span', 'feed-badge', p.badge));
    who.append(el('span', 'feed-time', p.time));
    c.append(who);
    if (p.kind === 'user' && mine.reply) {
      // người chia sẻ vô tình đã gỡ bài sau khi được nhắc nhẹ
      c.append(el('p', 'feed-gone', p.removed));
      if (p.classify && hasFlag('done_S8')) c.append(el('p', 'feed-class', `${t('feed.classTitle')} ${p.classify}`));
      return c;
    }
    const txt = el('p', 'feed-text', p.text);
    c.append(txt);
    for (const tag of p.tags || []) txt.append(' ', el('span', 'feed-tag', tag));
    if (p.art) {
      const art = el('div', 'feed-media');
      art.append(postArt(p.art));
      if (p.fake && p.artFake) art.append(el('span', 'tag frame-fake', t('exhibit.fakeTag')));
      c.append(art);
    }
    // chú thích "hư cấu" đặt ở chỗ rất khó thấy (thủ pháp có thật của các trang)
    if (p.fine) c.append(el('p', 'feed-fine', p.fine));
    const autoNote = p.noteAfter?.length && all(p.noteAfter);
    if (p.note && (mine.note || autoNote)) c.append(el('div', 'feed-note', `${t('feed.noteTitle')} ${p.note}`));
    if (p.classify && p.fake && hasFlag('done_S8')) c.append(el('p', 'feed-class', `${t('feed.classTitle')} ${p.classify}`));
    const stats = el('div', 'feed-stats');
    const calm = handled(p) || autoNote;
    stats.append(el('span', null, `♥ ${fmt((p.likes || 0) * (calm ? 0.7 : 1))}`), el('span', null, `💬 ${fmt(p.comments_n || 0)}`),
      el('span', null, `↻ ${fmt(sharesOf(p))} ${t('feed.shares')}`));
    if (p.fake) stats.append(el('span', calm ? 'feed-slow' : 'feed-rise', calm ? t('feed.slowed') : t('feed.rising')));
    c.append(stats);
    for (const cmt of p.comments || []) {
      if (!all(cmt.after)) continue;
      const line = el('p', `feed-comment${cmt.tip ? ' is-tip' : ''}`);
      line.append(el('b', null, `${cmt.who}: `));
      if (cmt.link) {
        const a = el('button', 'feed-link', cmt.text);
        a.type = 'button';
        a.addEventListener('click', () => baitLink(p));
        line.append(a);
      } else line.append(cmt.text);
      c.append(line);
    }
    if (mine.bad) c.append(el('p', 'feed-comment is-angry', mine.bad));
    c.append(actions(p, mine));
    if (open?.id === p.id) c.append(picker(p, open.kind));
    return c;
  };

  const btn = (label, onClick, disabled = false, title = '') => {
    const b = el('button', 'btn-small', label);
    b.type = 'button';
    b.disabled = disabled;
    if (title) b.title = title;
    b.addEventListener('click', onClick);
    return b;
  };

  const actions = (p, mine) => {
    const row = el('div', 'feed-actions');
    // Báo cáo: bài nào cũng bấm được — báo cáo nhầm bài đúng sẽ bị nhắc
    row.append(btn(mine.report ? t('feed.reported') : t('feed.report'), () => report(p), !!mine.report));
    if (p.fake && p.kind !== 'user') {
      const ready = all(p.noteNeeds);
      row.append(btn(mine.note ? t('feed.noted') : t('feed.addNote'), () => toggle(p, 'note'), !!mine.note || !ready, ready ? '' : t('feed.noteLocked')));
    }
    if (p.kind === 'user') {
      const ready = all(p.replyNeeds);
      row.append(btn(t('feed.reply'), () => toggle(p, 'reply'), !ready, ready ? '' : t('feed.replyLocked')));
    }
    // Điều tra: theo dõi nhiệm vụ tiếp theo của hồ sơ liên quan (khi hồ sơ còn mở)
    if (p.fake && p.case && caseOpen(p.case) && nextQuestIn(p.case)) {
      row.append(btn(t('feed.investigate'), () => { track(nextQuestIn(p.case).id); onChange(); }, false, t('feed.investigateHint', { room: roomName(p.case) })));
    }
    const wrap = el('div');
    wrap.append(row);
    if (p.fake && !handled(p)) {
      const need = p.kind === 'user' ? p.replyNeeds : p.noteNeeds;
      if (!all(need)) wrap.append(el('p', 'feed-hint', t(p.kind === 'user' ? 'feed.replyLocked' : 'feed.noteLocked')));
    }
    return wrap;
  };

  const toggle = (p, kind) => {
    open = open?.id === p.id && open.kind === kind ? null : { id: p.id, kind };
    sfx('click');
    render();
  };

  /** Bảng chọn bản nháp: ghi chú cộng đồng (trang đăng) hoặc lời trả lời (người chia sẻ). */
  const picker = (p, kind) => {
    const box = el('div', 'feed-pick');
    box.append(el('p', 'feed-pick-ask', t(kind === 'note' ? 'feed.pickNote' : 'feed.pickReply')));
    const opts = (kind === 'note' ? p.noteOptions : p.replyOptions) || [];
    for (const o of opts) box.append(btn(o.text, () => choose(p, kind, o)));
    return box;
  };

  const choose = (p, kind, o) => {
    const m = (prog()[p.id] ||= {});
    open = null;
    if (o.ok) {
      m[kind] = true;
      m.frozen = Math.round(sharesOf(p));
      delete m.bad;
      easePressure(25);
      sfx(kind === 'note' ? 'partial' : 'correct');
      toast(`${t(kind === 'note' ? 'feed.noteDone' : 'feed.replyDone')} ${o.why || ''}`, 6000);
    } else if (o.vague) {
      sfx('click');
      toast(`${t('feed.vague')} ${o.why}`, 6000);
    } else {
      if (o.backlash) m.bad = o.backlash;
      penalize(p, PENALTY.rumor, `${t(kind === 'note' ? 'feed.noteBad' : 'feed.replyBad')} ${o.why}`);
    }
    saveProgress();
    render();
    onChange();
  };

  const report = p => {
    const m = (prog()[p.id] ||= {});
    if (p.fake) {
      m.report = true;
      sfx('click');
      toast(p.kind === 'user' ? t('feed.reportUser') : t('feed.reportDone'), 5000);
    } else {
      m.wrongReport = (m.wrongReport || 0) + 1;
      penalize(p, PENALTY.rumor, p.reportWrong || t('feed.reportWrong'));
    }
    saveProgress();
    render();
    onChange();
  };

  /** Bấm link "Xem tiếp / Đoạn kết" trong bình luận của trang: mất độ tin cậy và được nhắc. */
  const baitLink = p => {
    const m = (prog()[p.id] ||= {});
    m.clicked = (m.clicked || 0) + 1;
    saveProgress();
    penalize(p, PENALTY.partial, t('feed.bait'));
  };

  render();
  return phone;
}
