// Vịnh Feed: mạng xã hội trong game (tab điện thoại trong balo). Bài đăng xuất hiện / đổi theo tiến độ: bài sai lan lúc
// đầu, khép hồ sơ thì có ghi chú cộng đồng và bài đính chính, lượt chia sẻ bài sai chững lại. Người chơi có thể
// báo cáo bài sai và thêm ghi chú cộng đồng — mỗi bài một lần, lưu ở progress.feed. Dữ liệu: npc_dialogues.json → feed.
import { data, t } from './data.js';
import { state, saveProgress, hasFlag } from './state.js';
import { sfx } from './audio.js';
import { toast } from './ui.js';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

const fmt = n => Math.round(n).toLocaleString('vi-VN');

/** Bài đang hiện: đủ điều kiện `after` (cờ đã có) và chưa bị `until` (cờ) ẩn đi. */
function visiblePosts() {
  return (data.npcs.feed?.posts || []).filter(p => (p.after || []).every(hasFlag) && !(p.until || []).some(hasFlag));
}

/** Lượt chia sẻ: bài sai chững lại theo số hồ sơ đã khép có liên quan. */
function sharesOf(post) {
  const s = post.shares || 0;
  if (!post.fake) return s;
  const slow = (post.slowedBy || []).filter(hasFlag).length;
  return s * (1 + 0.6 * (post.slowedBy?.length || 0)) - s * 0.5 * slow;
}

/** Số bài sai chưa xử lý (để hiện chấm đỏ trên tab). */
export function feedAlerts() {
  const done = state.progress?.feed || {};
  return visiblePosts().filter(p => p.fake && !(done[p.id]?.report && done[p.id]?.note)).length;
}

/** Ảnh trong bài: khối pixel trừu tượng, ảnh giả gắn nhãn ẢNH GIẢ (không có hình nạn nhân). */
function postArt(kind) {
  const cv = el('canvas', 'feed-art');
  cv.width = 96; cv.height = 54;
  const c = cv.getContext('2d');
  const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  R(0, 0, 96, 30, kind === 'storm' ? '#3a4458' : '#9fc3e0'); R(0, 30, 96, 24, kind === 'storm' ? '#2a3a4c' : '#3f7899');
  if (kind === 'ship' || kind === 'storm') { R(30, 26, 34, 6, '#e8ecf2'); R(38, 20, 16, 6, '#c9d1dc'); }
  if (kind === 'karst') { R(10, 12, 16, 20, '#4a6a50'); R(62, 8, 20, 24, '#3a5a44'); }
  if (kind === 'card') { R(0, 0, 96, 54, '#22344a'); R(10, 10, 76, 6, '#e8ecf2'); R(10, 22, 60, 4, '#9fb3c8'); R(10, 32, 66, 4, '#9fb3c8'); R(10, 42, 40, 4, '#5fe0a0'); }
  return cv;
}

/** Dựng Vịnh Feed (phần tử DOM) trong khung điện thoại. */
export function vinhFeed(onChange = () => {}) {
  const F = data.npcs.feed;
  const prog = (state.progress.feed ||= {});
  const phone = el('div', 'feed-phone');
  const head = el('div', 'feed-head');
  head.append(el('span', 'feed-logo', F.name), el('span', 'feed-sub', F.tagline));
  const list = el('div', 'feed-list');
  phone.append(head, list);

  const render = () => {
    list.innerHTML = '';
    const posts = visiblePosts().slice().sort((a, b) => (b.order || 0) - (a.order || 0));
    if (!posts.length) list.append(el('p', 'muted', t('feed.empty')));
    for (const p of posts) {
      const mine = prog[p.id] || {};
      const card = el('article', `feed-post${p.fake ? ' is-fake' : ''}${p.official ? ' is-official' : ''}`);
      const who = el('div', 'feed-who');
      const av = el('span', 'feed-av', p.author.slice(0, 1));
      if (p.official) av.classList.add('is-official');
      who.append(av, el('strong', null, p.author), el('span', 'feed-time', p.time));
      card.append(who, el('p', 'feed-text', p.text));
      if (p.art) {
        const art = el('div', 'feed-media');
        art.append(postArt(p.art));
        if (p.fake) art.append(el('span', 'tag frame-fake', t('exhibit.fakeTag')));
        card.append(art);
      }
      // ghi chú cộng đồng: hiện khi người chơi đã thêm, hoặc khi hồ sơ liên quan đã khép
      const noted = mine.note || (p.noteAfter || []).every(hasFlag) && p.noteAfter?.length;
      if (p.note && noted) card.append(el('div', 'feed-note', `${t('feed.noteTitle')} ${p.note}`));
      const stats = el('div', 'feed-stats');
      stats.append(el('span', null, `♥ ${fmt((p.likes || 0) * (noted ? 0.7 : 1))}`), el('span', null, `↻ ${fmt(sharesOf(p) * (mine.report ? 0.85 : 1))} ${t('feed.shares')}`));
      if (p.fake && noted) stats.append(el('span', 'feed-slow', t('feed.slowed')));
      card.append(stats);
      for (const cmt of p.comments || []) if ((cmt.after || []).every(hasFlag)) card.append(el('p', 'feed-comment', `${cmt.who}: ${cmt.text}`));
      if (p.fake) {
        const row = el('div', 'feed-actions');
        const rep = el('button', 'btn-small', mine.report ? t('feed.reported') : t('feed.report'));
        rep.type = 'button';
        rep.disabled = !!mine.report;
        rep.addEventListener('click', () => act(p, 'report'));
        const nb = el('button', 'btn-small', mine.note ? t('feed.noted') : t('feed.addNote'));
        nb.type = 'button';
        nb.disabled = !!mine.note || !(p.noteNeeds || []).every(hasFlag);
        if (nb.disabled && !mine.note) nb.title = t('feed.noteLocked');
        nb.addEventListener('click', () => act(p, 'note'));
        row.append(rep, nb);
        card.append(row);
        if (!mine.note && !(p.noteNeeds || []).every(hasFlag)) card.append(el('p', 'feed-hint', t('feed.noteLocked')));
      }
      list.append(card);
    }
  };

  const act = (p, kind) => {
    prog[p.id] ||= {};
    prog[p.id][kind] = true;
    saveProgress();
    sfx(kind === 'report' ? 'click' : 'partial');
    toast(kind === 'report' ? t('feed.reportDone') : `${t('feed.noteDone')} ${p.note}`, 5000);
    render();
    onChange();
  };

  render();
  return phone;
}
