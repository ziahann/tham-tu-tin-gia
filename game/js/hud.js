// Thanh trên: vị trí hiện tại và điểm.
import { t } from './data.js';
import { state } from './state.js';

/** Hiện tên khu vực đang đứng. */
export function setPlace(text) {
  document.getElementById('hud-place').textContent = text;
}

/** Cập nhật điểm. */
export function updateScore() {
  document.getElementById('hud-score').textContent = state.progress ? `${t('score')}: ${state.progress.score}` : '';
}

/** Dòng "đang theo dõi": người giao hồ sơ và nơi gặp. on = có hồ sơ đang theo dõi. */
export function setTrack(text, on) {
  const el = document.getElementById('hud-track');
  el.textContent = text;
  el.classList.toggle('is-off', !on);
}
