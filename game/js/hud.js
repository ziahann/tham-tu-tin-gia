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
