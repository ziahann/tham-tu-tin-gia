// Bảng kết quả xuất PDF: dựng một trang báo cáo in được (khổ A4) từ tiến độ lượt chơi, mở hộp thoại in của trình duyệt
// để "Lưu dưới dạng PDF". Không cần thư viện, không gửi dữ liệu đi đâu.
import { data, t, questById, evidenceById } from './data.js';
import { state } from './state.js';
import { earnedBadges, caseProgress } from './grading.js';
import { credOf, CRED_MAX } from './obstacles.js';
import { boardProgress } from './board.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Trạng thái một nhiệm vụ cho báo cáo. */
function questRow(id) {
  const q = questById(id);
  const qs = state.progress.questProgress[id] || {};
  const st = qs.status === 'done' ? (qs.skipped ? t('report.skipped') : t('report.done')) : qs.started ? t('report.inProgress') : t('report.notStarted');
  return `<tr><td>${esc(q?.title || id)}</td><td>${esc(st)}</td><td class="n">${qs.fails || 0}</td><td class="n">${qs.hints || 0}</td></tr>`;
}

/** HTML đầy đủ của báo cáo. */
export function reportHtml() {
  const p = state.progress;
  const flags = p.flags || [];
  const badges = earnedBadges(flags);
  const cp = caseProgress(flags);
  const bp = boardProgress();
  const rooms = data.quests.rooms.filter(r => !r.boss && r.quests?.length);
  const now = new Date();
  const cards = (p.evidenceCards || []).map(evidenceById).filter(ev => ev && !data.quests.boss.guessCards.includes(ev.id));
  const used = new Set([...(p.sourcesOpened || []), ...data.quests.quests.flatMap(q => q.resources || [])]);
  const sources = data.sources.sources.filter(s => !s.internal && used.has(s.id));
  const feed = Object.values(p.feed || {});
  const r = data.quests.results;
  const trust = Math.round(rooms.reduce((s, x) => s + credOf(x.id), 0) / (rooms.length || 1));

  const caseBlocks = rooms.map(room => `
    <section class="case">
      <h3>${esc(room.name)} ${flags.includes(`done_${room.id}`) ? '<span class="ok">✓ ' + esc(t('report.closed')) + '</span>' : ''}</h3>
      <table><thead><tr><th>${esc(t('report.quest'))}</th><th>${esc(t('report.status'))}</th><th class="n">${esc(t('report.fails'))}</th><th class="n">${esc(t('report.hints'))}</th></tr></thead>
      <tbody>${room.quests.map(questRow).join('')}</tbody></table>
      <p class="muted">${esc(t('report.cred'))}: ${credOf(room.id)}/${CRED_MAX}</p>
    </section>`).join('');

  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${esc(t('report.docTitle', { name: p.heroName }))}</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  body { font: 11pt/1.45 "Segoe UI", Arial, sans-serif; color: #1a1a24; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #d8283f; padding-bottom: 8px; margin-bottom: 12px; }
  h1 { font-size: 20pt; margin: 0; color: #2e3170; }
  h2 { font-size: 13pt; color: #d8283f; border-bottom: 1px solid #ccc; padding-bottom: 2px; margin: 18px 0 8px; }
  h3 { font-size: 11pt; margin: 10px 0 4px; }
  .muted { color: #666; font-size: 9.5pt; margin: 2px 0; }
  .ok { color: #1f8a5a; font-weight: normal; font-size: 10pt; }
  .card { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; background: #f6f7fb; border: 1px solid #dde; padding: 10px; }
  .card b { display: block; font-size: 15pt; color: #2e3170; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  th, td { border: 1px solid #ccd; padding: 3px 6px; text-align: left; vertical-align: top; }
  th { background: #eef0f7; }
  td.n, th.n { text-align: center; width: 60px; }
  .badges { display: flex; flex-wrap: wrap; gap: 8px; }
  .badge { width: 31%; border: 1px solid #ccd; padding: 6px; display: flex; gap: 6px; align-items: flex-start; font-size: 9.5pt; }
  .badge img { width: 36px; height: 42px; image-rendering: pixelated; }
  ul { margin: 4px 0; padding-left: 18px; }
  .case { break-inside: avoid; }
  .src li { font-size: 9.5pt; margin-bottom: 3px; }
  footer { margin-top: 18px; border-top: 1px solid #ccc; padding-top: 6px; font-size: 9pt; color: #666; }
</style></head><body>
<header>
  <div><h1>${esc(t('report.title'))}</h1><div class="muted">${esc(t('title.course'))}</div></div>
  <div class="muted" style="text-align:right">${esc(t('report.date'))}: ${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
</header>
<p><b>${esc(t('report.player'))}:</b> ${esc(p.heroName)} · ${esc(t('card.faculty'))}, Trường Đại học Văn Lang</p>
<div class="card">
  <div>${esc(t('report.casesClosed'))}<b>${cp.done}/${cp.total}</b></div>
  <div>${esc(t('report.badges'))}<b>${badges.length}</b></div>
  <div>${esc(t('report.trust'))}<b>${trust}/${CRED_MAX}</b></div>
  <div>${esc(t('report.board'))}<b>${bp.done}/${bp.total}</b></div>
</div>
${flags.includes('skipped_to_boss') ? `<p class="muted">${esc(t('report.skipNote'))}</p>` : ''}

<h2>${esc(t('report.verified'))}</h2>
<ul>${r.verified.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
<h2>${esc(t('report.unsure'))}</h2>
<ul>${r.unsure.map(x => `<li>${esc(x)}</li>`).join('')}</ul>

<h2>${esc(t('report.casesTitle'))}</h2>
${caseBlocks}
<p class="muted">${esc(t('report.finale'))}: ${flags.includes('boss_done') ? esc(t('report.finaleDone')) : esc(t('report.finaleNot'))}${p.boss?.endingB ? ` · ${esc(t('report.endingB', { n: p.boss.endingB }))}` : ''}</p>

<h2>${esc(t('report.badgesTitle'))}</h2>
<div class="badges">${badges.length ? badges.map(b => `<div class="badge"><img src="assets/badges/${b.id}.png" alt=""><div><b>${esc(b.badge.name)}</b><br>${esc(b.badge.learned)}</div></div>`).join('') : `<p class="muted">${esc(t('backpack.noBadges'))}</p>`}</div>

<h2>${esc(t('report.evidence'))}</h2>
${cards.length ? `<ul>${cards.map(ev => `<li><b>${esc(ev.title)}</b> — ${esc(ev.text)}</li>`).join('')}</ul>` : `<p class="muted">${esc(t('backpack.noCards'))}</p>`}

<h2>${esc(t('report.feed'))}</h2>
<p>${esc(t('report.feedLine', { reports: feed.filter(x => x.report).length, notes: feed.filter(x => x.note).length, replies: feed.filter(x => x.reply).length, wrong: feed.reduce((s, x) => s + (x.wrongReport || 0), 0), clicks: feed.reduce((s, x) => s + (x.clicked || 0), 0) }))}</p>

<h2>${esc(t('report.takeaway'))}</h2>
<p>${esc(r.takeaway)}</p>

<h2>${esc(t('report.sources'))}</h2>
<ol class="src">${sources.map(s => `<li>${esc(s.apa)}</li>`).join('')}</ol>

<footer>${esc(t('title.authors'))} · ${esc(t('title.simulatedNote'))} ${esc(t('report.disclaimer'))}</footer>
</body></html>`;
}

/** Mở hộp thoại in (chọn "Lưu dưới dạng PDF"). */
export function exportReport() {
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.append(frame);
  const doc = frame.contentDocument;
  doc.open();
  doc.write(reportHtml().replace('<head>', `<head><base href="${location.href.replace(/[^/]*$/, '')}">`));
  doc.close();
  const go = () => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 2000);
  };
  // chờ ảnh huy hiệu tải xong
  const imgs = [...doc.images];
  Promise.all(imgs.map(i => (i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })))).then(go);
}
