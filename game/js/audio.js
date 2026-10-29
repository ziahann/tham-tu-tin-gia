// Hiệu ứng âm thanh tạo bằng WebAudio (không dùng file ngoài, không có nhạc nền).
import { state } from './state.js';

let ctx = null;

const sounds = {
  click: [[660, 0.04, 'square']],
  correct: [[523, 0.09, 'triangle'], [784, 0.14, 'triangle']],
  partial: [[523, 0.1, 'triangle'], [587, 0.12, 'triangle']],
  wrong: [[220, 0.18, 'triangle']],
  unlock: [[392, 0.08, 'triangle'], [523, 0.08, 'triangle'], [659, 0.16, 'triangle']]
};

/** Phát một hiệu ứng ngắn, nhỏ tiếng; bỏ qua nếu đang tắt tiếng. */
export function sfx(name) {
  if (state.settings.muted || !sounds[name]) return;
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    let at = ctx.currentTime;
    for (const [freq, dur, type] of sounds[name]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.06, at);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + dur);
      at += dur * 0.9;
    }
  } catch { /* trình duyệt không hỗ trợ âm thanh */ }
}
