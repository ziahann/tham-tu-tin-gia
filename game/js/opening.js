// Hoạt cảnh mở đầu khi bấm "Bắt đầu": tự chạy, người chơi không cần thao tác, có nút Bỏ qua. Chữ ở quests.json → opening.
import { data, t } from './data.js';
import { state } from './state.js';
import { Bay } from './bay.js';

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const wait = (ms, signal) => new Promise(res => { const id = setTimeout(res, ms); signal.addEventListener('abort', () => { clearTimeout(id); res(); }, { once: true }); });

/** Dựng một cảnh theo `kind`: feed (bài đăng lan truyền), tags, hero (nhân vật đi vào), title; mặc định chỉ có chữ. */
function beatNode(b) {
  const s = el('section', `opening-beat opening-${b.kind || 'text'}`);
  if (b.date) s.append(el('p', 'opening-date', b.date));
  if (b.kind === 'feed') {
    const box = el('div', 'opening-posts');
    b.posts.forEach((p, i) => {
      const post = el('div', 'opening-post');
      post.style.setProperty('--i', i);
      const tile = el('div', 'opening-tile');
      tile.append(el('span', null, p.stamp));
      const body = el('div', 'opening-post-body');
      const bar = el('div', 'opening-share');
      bar.append(el('i'), el('span', null, b.share));
      body.append(el('p', null, p.text), bar);
      post.append(tile, body);
      box.append(post);
    });
    s.append(box);
  }
  if (b.kind === 'tags') {
    const box = el('div', 'opening-tags');
    b.tags.forEach((text, i) => { const tag = el('span', null, text); tag.style.setProperty('--i', i); box.append(tag); });
    s.append(box);
  }
  if (b.kind === 'hero') {
    const box = el('div', 'opening-heroes');
    ['hero_f', 'hero_m'].forEach(id => { const h = el('div', 'opening-hero'); h.style.backgroundImage = `url(assets/sprites/${id}.png)`; box.append(h); });
    s.append(box);
  }
  if (b.kind === 'title') s.append(el('h1', 'opening-name', t('gameTitle')));
  b.lines.forEach(line => s.append(el('p', 'opening-line', line)));
  return s;
}

/**
 * Phát hoạt cảnh mở đầu. Promise xong khi hết cảnh cuối hoặc khi bấm Bỏ qua / Esc.
 * Giảm chuyển động: xếp tĩnh mọi cảnh, chờ người chơi bấm Tiếp tục.
 */
export function playOpening() {
  const O = data.quests.opening, E = data.quests.ending;
  const reduce = !!state.settings.reduceMotion;
  const ctrl = new AbortController();
  const wrap = el('div', `endtro opening${reduce ? ' is-static' : ''}`);
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.setAttribute('aria-label', t('gameTitle'));
  const canvas = el('canvas', 'endtro-bay');
  canvas.setAttribute('aria-hidden', 'true');
  const stage = el('div', 'endtro-stage');
  const beats = O.beats.map(beatNode);
  stage.append(...beats);
  const skip = el('button', 'btn endtro-skip', reduce ? E.close : E.skip);
  skip.type = 'button';
  wrap.append(canvas, el('div', 'endtro-shade'), stage, skip);
  document.body.append(wrap);

  const bay = new Bay(canvas);
  bay.setScene(O.beats[0].scene);
  bay.start();

  return new Promise(resolve => {
    let ended = false;
    const finish = () => {
      if (ended) return;
      ended = true;
      ctrl.abort();
      document.removeEventListener('keydown', onKey, true);
      bay.stop();
      wrap.classList.add('is-out');
      setTimeout(() => { wrap.remove(); resolve(); }, reduce ? 0 : 500);
    };
    const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(); } };
    document.addEventListener('keydown', onKey, true);
    skip.addEventListener('click', finish);
    skip.focus();
    if (reduce) return;

    (async () => {
      const s = ctrl.signal;
      await wait(300, s); wrap.classList.add('is-in');
      await wait(700, s);
      for (const [i, node] of beats.entries()) {
        if (s.aborted) return;
        bay.setScene(O.beats[i].scene);
        node.classList.add('is-on');
        await wait(O.beats[i].ms, s);
        if (i < beats.length - 1) { node.classList.add('is-off'); await wait(800, s); }
      }
      finish();
    })();
  });
}
