// Thanh trên: vị trí hiện tại và tiến độ (huy hiệu, hồ sơ đã khép).
import { t } from './data.js';
import { state } from './state.js';
import { earnedBadges, caseProgress } from './grading.js';
import { credScore, pressure, caseOpen, isLight, CRED_MAX } from './obstacles.js';
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

/** Thanh độ tin cậy (chung cả game, luôn hiện) và thanh hạn chót (chỉ khi đang làm hồ sơ, không có ở chế độ Nhẹ). */
export function updateMeters() {
  const box = document.getElementById('hud-meters');
  if (!box) return;
  box.hidden = !state.progress;
  if (!state.progress) return;
  const id = state.progress.tracked;
  const on = caseOpen(id && id !== 'boss' ? questById(id)?.room : null);
  const cred = credScore(), p = Math.round(pressure());
  const set = (sel, v, warn) => {
    const m = box.querySelector(sel);
    m.querySelector('i').style.width = `${v}%`;
    m.classList.toggle('is-warn', warn);
  };
  set('.meter-cred', (cred / CRED_MAX) * 100, cred < 30);
  const press = box.querySelector('.meter-press');
  press.hidden = !on || isLight();
  if (!press.hidden) set('.meter-press', p, p >= 75);
  box.querySelector('.meter-cred').title = `${t('obstacles.credTitle')} (${cred}/${CRED_MAX})`;
}

/** Đặt chữ thanh theo dõi trên cùng. */
export function setTrack(text, on) {
  const el = document.getElementById('hud-track');
  el.textContent = text;
  el.classList.toggle('is-off', !on);
}
