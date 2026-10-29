// Thanh trên: vị trí hiện tại và tiến độ (huy hiệu, hồ sơ đã khép).
import { t } from './data.js';
import { state } from './state.js';
import { earnedBadges, caseProgress } from './grading.js';

/** Hiện tên khu vực đang đứng. */
export function setPlace(text) {
  document.getElementById('hud-place').textContent = text;
}

/** Cập nhật dòng tiến độ: số huy hiệu và số hồ sơ đã khép (thay cho điểm). */
export function updateScore() {
  const flags = state.progress?.flags || [];
  document.getElementById('hud-score').textContent = state.progress
    ? t('progress', { badges: earnedBadges(flags).length, ...caseProgress(flags) }) : '';
}

/** Dòng "đang theo dõi": người giao hồ sơ và nơi gặp. on = có hồ sơ đang theo dõi. */
export function setTrack(text, on) {
  const el = document.getElementById('hud-track');
  el.textContent = text;
  el.classList.toggle('is-off', !on);
}
