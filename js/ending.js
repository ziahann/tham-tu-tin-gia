// Hoạt cảnh kết: nền vịnh, nhắc lại điều đã kiểm chứng, câu kết luận, ghi công cuộn lên. Chữ ở quests.json → ending.
import { data, t } from './data.js';
import { state } from './state.js';
import { Bay } from './bay.js';
import { playMusic } from './music.js';

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

/** Phần nhắc lại: kết thúc chính = ba câu hỏi xác minh + đáp án đúng; bonus = các dấu hiệu mạo danh. */
function recapItems(kind) {
  const q = data.quests;
  if (kind === 'bonus') {
    const b = q.quests.find(x => x.id === 'bonus_impersonation');
    return (b?.conclusion || '').replace(/^[^:]*:\s*/, '').replace(/\.$/, '').split(/,\s*/).filter(Boolean).map(s => ({ a: s[0].toUpperCase() + s.slice(1) }));
  }
  return q.journey.report.questions.map(x => ({ q: x.ask, a: x.options.find(o => o.ok)?.text || '' }));
}

/** Danh sách ghi công lấy từ dữ liệu có sẵn (không viết lại tên, giấy phép). */
function creditsBlock() {
  const E = data.quests.ending, ui = data.ui, src = data.sources;
  const box = el('div', 'endtro-credits');
  box.append(el('h2', 'endtro-game', t('gameTitle')), el('p', 'endtro-case', data.quests.caseTitle));
  const sec = (head, ...lines) => { const s = el('section'); s.append(el('h3', null, head), ...lines.filter(Boolean).map(l => el('p', null, l))); box.append(s); };
  sec(E.credits.authors, ui.sourcesPanel?.authorsList);
  sec(E.credits.course, ui.title?.course);
  sec(E.credits.music, ...(src.music || []).map(m => m.title), 'Kevin MacLeod (incompetech.com) · CC BY 4.0');
  sec(E.credits.art, ui.sourcesPanel?.artNote, ui.sourcesPanel?.artOwn);
  return box;
}

const wait = (ms, signal) => new Promise(res => { const id = setTimeout(res, ms); signal.addEventListener('abort', () => { clearTimeout(id); res(); }, { once: true }); });

/**
 * Phát hoạt cảnh kết. kind: 'main' (sau khi nhận danh hiệu) | 'bonus' (sau khi khép hồ sơ trang mạo danh).
 * Trả về Promise xong khi người chơi bấm "Tiếp tục" hoặc "Bỏ qua". Giảm chuyển động: hiện tất cả cùng lúc.
 */
export function playEndtro(kind = 'main') {
  const E = data.quests.ending, K = E[kind];
  const reduce = !!state.settings.reduceMotion;
  const ctrl = new AbortController();
  const wrap = el('div', `endtro${reduce ? ' is-static' : ''}`);
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.setAttribute('aria-label', K.recapTitle);
  const canvas = el('canvas', 'endtro-bay');
  canvas.setAttribute('aria-hidden', 'true');
  const shade = el('div', 'endtro-shade');
  const stage = el('div', 'endtro-stage');

  const recap = el('section', 'endtro-recap');
  recap.append(el('h2', null, K.recapTitle));
  const list = el('ol');
  recapItems(kind).forEach(({ q, a }) => { const li = el('li'); if (q) li.append(el('b', null, q)); li.append(el('span', null, a)); list.append(li); });
  recap.append(list);
  const concl = el('section', 'endtro-conclusion');
  K.conclusion.forEach(line => concl.append(el('p', null, line)));
  const credits = creditsBlock();
  // màn cuối: tên game + lời cảm ơn, đứng yên giữa màn hình sau khi ghi công cuộn hết
  const final = el('section', 'endtro-final');
  final.append(el('h2', 'endtro-game', t('gameTitle')), el('p', 'endtro-thanks', E.thanks));
  stage.append(recap, concl, credits, final);

  const skip = el('button', 'btn endtro-skip', E.skip);
  skip.type = 'button';
  const close = el('button', 'btn-primary endtro-close', E.close);
  close.type = 'button';
  close.hidden = !reduce;
  const home = el('button', 'btn endtro-home', E.home);
  home.type = 'button';
  home.hidden = !reduce;
  wrap.append(canvas, shade, stage, skip, close, home);
  document.body.append(wrap);

  const bay = new Bay(canvas);
  bay.setScene(K.scene || 'dusk');
  bay.start(); // giảm chuyển động: Bay tự vẽ một khung tĩnh
  playMusic('ending');

  return new Promise(resolve => {
    let ended = false;
    const finish = result => {
      if (ended) return;
      ended = true;
      ctrl.abort();
      document.removeEventListener('keydown', onKey, true);
      bay.stop();
      wrap.classList.add('is-out');
      setTimeout(() => { wrap.remove(); resolve(result); }, reduce ? 0 : 500);
    };
    const onKey = e => {
      if (e.key === 'Escape' || (!close.hidden && (e.key === 'Enter' || e.key === ' '))) { e.preventDefault(); e.stopPropagation(); finish(); }
    };
    document.addEventListener('keydown', onKey, true);
    skip.addEventListener('click', () => finish());
    close.addEventListener('click', () => finish());
    home.addEventListener('click', () => { finish('home'); document.dispatchEvent(new CustomEvent('tfd:home')); });
    if (reduce) { skip.hidden = true; home.hidden = false; close.focus(); return; }
    skip.focus();

    // dòng thời gian của hoạt cảnh (bấm Bỏ qua thì dừng ở bất kỳ bước nào)
    (async () => {
      const s = ctrl.signal;
      await wait(400, s); wrap.classList.add('is-in');
      await wait(900, s); recap.classList.add('is-on');
      for (const li of list.children) { await wait(1600, s); li.classList.add('is-on'); }
      await wait(3200, s); recap.classList.add('is-off');
      await wait(900, s); concl.classList.add('is-on');
      for (const p of concl.children) { await wait(1500, s); p.classList.add('is-on'); }
      await wait(3600, s); concl.classList.add('is-off');
      await wait(900, s); credits.classList.add('is-on');
      await new Promise(res => { credits.addEventListener('animationend', res, { once: true }); s.addEventListener('abort', res, { once: true }); });
      if (s.aborted) return;
      final.classList.add('is-on');
      await wait(900, s);
      if (s.aborted) return;
      skip.hidden = true;
      close.hidden = false;
      home.hidden = false;
      close.focus();
    })();
  });
}
