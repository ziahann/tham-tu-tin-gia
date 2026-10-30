// Thanh trên: vị trí hiện tại và tiến độ (huy hiệu, hồ sơ đã khép).
import { t } from './data.js';
import { state } from './state.js';
import { earnedBadges, caseProgress } from './grading.js';
import { credOf, pressure, caseOpen, isLight, CRED_MAX } from './obstacles.js';
import { questById } from './data.js';

/** Hiện tên khu vực đang đứng. */
export function setPlace(text) {
  document.getElementById('hud-place').textContent = text;
}

/** Cập nhật dòng tiến độ: số huy hiệu và số hồ sơ đã khép (thay cho điểm). */
export function updateScore() {
  const flags = state.progress?.flags || [];
  document.getElementById('hud-score').textContent = state.progress
    ? t('progress', { badges: earnedBadges(flags).length, ...caseProgress(flags) }) : '';
  updateMeters();
}

/** Giờ trong game trên thanh trên (biểu tượng theo buổi). */
export function showClock() {
  const box = document.getElementById('hud-clock');
  const m = state.progress?.clock;
  if (!box || m == null) return;
  const h = Math.floor(m / 60), mm = m % 60;
  const icon = h >= 19 || h < 5 ? '☾' : h >= 17 || h < 6 ? '◐' : '☀';
  box.textContent = `${icon} ${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Thanh độ tin cậy (hồ sơ đang theo dõi) và thanh hạn chót; ẩn khi không có hồ sơ đang làm. */
export function updateMeters() {
  const box = document.getElementById('hud-meters');
  if (!box) return;
  const id = state.progress?.tracked;
  const room = id && id !== 'boss' ? questById(id)?.room : null;
  const on = caseOpen(room);
  box.hidden = !on;
  if (!on) return;
  const cred = credOf(room), p = Math.round(pressure());
  const set = (sel, v, warn) => {
    const m = box.querySelector(sel);
    m.querySelector('i').style.width = `${v}%`;
    m.classList.toggle('is-warn', warn);
  };
  set('.meter-cred', (cred / CRED_MAX) * 100, cred <= 30);
  set('.meter-press', p, p >= 75);
  box.querySelector('.meter-press').hidden = isLight();
  box.querySelector('.meter-cred').title = `${t('obstacles.credTitle')} (${cred}/${CRED_MAX})`;
}

/** Dòng "đang theo dõi": người giao hồ sơ và nơi gặp. on = có hồ sơ đang theo dõi. */
export function setTrack(text, on) {
  const el = document.getElementById('hud-track');
  el.textContent = text;
  el.classList.toggle('is-off', !on);
}
