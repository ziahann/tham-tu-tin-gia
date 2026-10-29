// Nhạc nền CC0 (Juhani Junkala, JRPG Music Pack) đổi theo mốc: màn chính, văn phòng, phố, tòa soạn,
// quán cà phê, boss, kết thúc. Phát bằng thẻ <audio> (tải dần), chuyển bài bằng giảm/tăng âm lượng.
import { state } from './state.js';

const VOLUME = 0.35;
const FADE_MS = 700;

let current = null;      // { key, audio }
let wanted = null;       // bài cần phát khi được phép
let unlocked = false;    // trình duyệt chỉ cho phát sau thao tác đầu tiên của người chơi

/** Trình duyệt có phát được OGG Vorbis không. */
export const musicSupported = (() => {
  try { return new Audio().canPlayType('audio/ogg; codecs="vorbis"') !== ''; } catch { return false; }
})();

const enabled = () => musicSupported && state.settings.music !== false;

/** Tăng / giảm âm lượng một thẻ audio tới mức đích, rồi gọi done. */
function fade(audio, to, done) {
  const from = audio.volume;
  const steps = 14;
  let i = 0;
  const timer = setInterval(() => {
    i++;
    audio.volume = Math.max(0, Math.min(1, from + (to - from) * (i / steps)));
    if (i >= steps) { clearInterval(timer); done?.(); }
  }, FADE_MS / steps);
}

/** Dừng bài đang phát (giảm dần). */
function stopCurrent() {
  if (!current) return;
  const { audio } = current;
  current = null;
  fade(audio, 0, () => { audio.pause(); audio.src = ''; });
}

/** Phát bài theo khóa (title | office | street | archive | cafe | boss | ending). */
export function playMusic(key) {
  wanted = key;
  if (!unlocked || !enabled() || !key) return;
  if (current?.key === key) return;
  stopCurrent();
  const audio = new Audio(`assets/audio/${key}.ogg`);
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0;
  current = { key, audio };
  audio.play().then(() => fade(audio, VOLUME)).catch(() => { /* bị chặn hoặc lỗi tải: im lặng */ });
}

/** Gọi ở thao tác đầu tiên của người chơi để được phép phát nhạc. */
export function unlockMusic() {
  if (unlocked) return;
  unlocked = true;
  playMusic(wanted);
}

/** Áp dụng lại cài đặt bật / tắt nhạc. */
export function refreshMusic() {
  if (!enabled()) stopCurrent();
  else playMusic(wanted);
}
