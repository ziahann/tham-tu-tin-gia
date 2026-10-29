// Âm thanh tương tác tạo bằng WebAudio (không dùng file ngoài):
// - hiệu ứng ngắn khi bấm, đúng / sai, mở thiết bị, lật báo, mở cửa;
// - bước chân đổi theo mặt sàn; giọng "bíp" riêng của từng nhân vật khi chữ chạy;
// - âm thanh môi trường liên tục: mưa, gió (sương mù), sóng gần mặt nước, xe cộ gần đường, thỉnh thoảng tiếng còi.
import { state } from './state.js';

let ctx = null;
let fxBus = null;     // nhánh hiệu ứng
let ambBus = null;    // nhánh âm thanh môi trường
let noiseBuf = null;

const sounds = {
  click: [[660, 0.04, 'square']],
  correct: [[523, 0.09, 'triangle'], [784, 0.14, 'triangle']],
  partial: [[523, 0.1, 'triangle'], [587, 0.12, 'triangle']],
  wrong: [[220, 0.18, 'triangle']],
  unlock: [[392, 0.08, 'triangle'], [523, 0.08, 'triangle'], [659, 0.16, 'triangle']],
  scan: [[300, 0.05, 'sawtooth'], [450, 0.05, 'sawtooth'], [600, 0.05, 'sawtooth'], [900, 0.08, 'square']],
  paper: [[1200, 0.02, 'triangle'], [900, 0.03, 'triangle']],
  boot: [[220, 0.06, 'square'], [330, 0.06, 'square'], [660, 0.1, 'square']],
  door: [[180, 0.08, 'triangle'], [140, 0.12, 'triangle']],
  track: [[740, 0.05, 'triangle'], [988, 0.08, 'triangle']],
  ding: [[1319, 0.18, 'sine'], [1047, 0.3, 'sine']]
};

/** Khởi tạo AudioContext (lần đầu có thao tác của người chơi). */
function audio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  fxBus = ctx.createGain(); fxBus.gain.value = 1; fxBus.connect(ctx.destination);
  ambBus = ctx.createGain(); ambBus.gain.value = 1; ambBus.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

const fxOn = () => !state.settings.muted;

/** Phát một chuỗi nốt ngắn (hiệu ứng giao diện). */
function tones(list, vol = 0.06) {
  const c = audio();
  let at = c.currentTime;
  for (const [freq, dur, type] of list) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(gain).connect(fxBus);
    osc.start(at);
    osc.stop(at + dur);
    at += dur * 0.9;
  }
}

/** Một tiếng nhiễu ngắn qua bộ lọc (bước chân, tiếng giấy...). */
function burst({ freq = 800, q = 1, type = 'bandpass', dur = 0.06, vol = 0.12 }) {
  const c = audio();
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain();
  const at = c.currentTime;
  g.gain.setValueAtTime(vol, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(fxBus);
  src.start(at, Math.random() * 1.5, dur + 0.02);
}

/** Phát một hiệu ứng theo tên; bỏ qua nếu đang tắt tiếng. */
export function sfx(name) {
  if (!fxOn() || !sounds[name]) return;
  try { tones(sounds[name]); } catch { /* trình duyệt không hỗ trợ âm thanh */ }
}

// Bước chân theo mặt sàn (tên ô nền dưới chân)
const STEPS = {
  floor_wood: { freq: 320, q: 2, dur: 0.07, vol: 0.16 },
  doorway: { freq: 320, q: 2, dur: 0.07, vol: 0.16 },
  dock: { freq: 200, q: 3, dur: 0.09, vol: 0.2 },
  carpet: { freq: 260, type: 'lowpass', dur: 0.05, vol: 0.1 },
  rug: { freq: 260, type: 'lowpass', dur: 0.05, vol: 0.1 },
  floor_lobby: { freq: 2200, q: 4, dur: 0.035, vol: 0.12 },
  floor_check: { freq: 2200, q: 4, dur: 0.035, vol: 0.12 },
  floor_dark: { freq: 1700, q: 4, dur: 0.04, vol: 0.12 },
  grass: { freq: 3200, type: 'highpass', dur: 0.06, vol: 0.06 },
  gravel: { freq: 2600, type: 'highpass', dur: 0.08, vol: 0.1 },
  void: { freq: 120, q: 6, dur: 0.12, vol: 0.12 }
};
const STEP_DEFAULT = { freq: 1100, q: 2, dur: 0.05, vol: 0.12 }; // vỉa hè, đá, đường

/** Một bước chân; ground: tên ô nền; wet: trời mưa (thêm tiếng lép nhép). */
export function footstep(ground, wet = false) {
  if (!fxOn()) return;
  try {
    burst(STEPS[ground] || STEP_DEFAULT);
    if (wet && !/floor|carpet|rug|doorway|void/.test(ground || '')) burst({ freq: 4200, type: 'highpass', dur: 0.05, vol: 0.05 });
  } catch { /* bỏ qua */ }
}

// Giọng "bíp" khi chữ chạy: mỗi nhân vật một cao độ / dạng sóng
const VOICES = {
  hero: [520, 'triangle'], inspect: [520, 'triangle'], system: [880, 'square'],
  npc1: [600, 'triangle'], npc2: [420, 'square'], npc3: [260, 'triangle'], npc4: [760, 'square'],
  npc5: [820, 'sine'], npc6: [300, 'sawtooth'], boss: [140, 'sawtooth']
};

/** Một tiếng bíp của người đang nói (gọi khi chữ chạy). */
export function voice(id) {
  if (!fxOn()) return;
  let v = VOICES[id];
  if (!v && id?.startsWith('dev_')) v = [980, 'square'];
  if (!v) { let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; v = [300 + (h % 500), ['triangle', 'square', 'sine'][h % 3]]; }
  try { tones([[v[0] * (0.94 + Math.random() * 0.12), 0.03, v[1]]], 0.035); } catch { /* bỏ qua */ }
}

// ---------------------------------------------------------------- âm thanh môi trường

let amb = null;
const AMB_KEYS = ['rain', 'wind', 'waves', 'traffic'];

/** Tạo các vòng lặp nhiễu đã lọc cho từng lớp môi trường (âm lượng 0, chỉnh dần trong setAmbience). */
function startAmbience() {
  const c = audio();
  const layer = (filterType, freq, q, lfoRate = 0, lfoDepth = 0) => {
    const src = c.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.value = 0;
    const mod = c.createGain(); mod.gain.value = 1;
    src.connect(f).connect(mod).connect(g).connect(ambBus);
    if (lfoRate) {
      // sóng / gió: âm lượng lên xuống chậm
      const lfo = c.createOscillator(); lfo.frequency.value = lfoRate;
      const depth = c.createGain(); depth.gain.value = lfoDepth;
      lfo.connect(depth).connect(mod.gain); lfo.start();
    }
    src.start(0, Math.random() * 1.5);
    return { g, f };
  };
  amb = {
    rain: layer('bandpass', 1400, 0.6),
    wind: layer('lowpass', 420, 0.8, 0.13, 0.6),
    waves: layer('lowpass', 520, 0.7, 0.09, 0.8),
    traffic: layer('lowpass', 160, 1.2, 0.5, 0.3),
    hornIn: 15000
  };
}

/**
 * Đặt mức các lớp môi trường (0..1): { rain, wind, waves, traffic, indoor }.
 * Trong nhà: tiếng mưa bị lọc trầm hơn (như nghe qua cửa kính).
 */
export function setAmbience(levels, delta = 0) {
  if (!ctx) return;
  if (state.settings.ambience === false) { if (amb) AMB_KEYS.forEach(k => amb[k].g.gain.setTargetAtTime(0, ctx.currentTime, 0.3)); return; }
  if (!amb) startAmbience();
  const MAX = { rain: 0.09, wind: 0.07, waves: 0.08, traffic: 0.06 };
  for (const k of AMB_KEYS) amb[k].g.gain.setTargetAtTime((levels[k] || 0) * MAX[k], ctx.currentTime, 0.6);
  amb.rain.f.frequency.setTargetAtTime(levels.indoor ? 500 : 1400, ctx.currentTime, 0.4);
  // còi xe thỉnh thoảng khi đứng gần đường
  amb.hornIn -= delta;
  if (amb.hornIn <= 0) {
    amb.hornIn = 14000 + Math.random() * 20000;
    if ((levels.traffic || 0) > 0.4 && fxOn()) tones([[440, 0.09, 'square'], [440, 0.12, 'square']], 0.025);
  }
}

/** Tắt hẳn âm thanh môi trường (ví dụ khi về màn hình chính). */
export function stopAmbience() {
  if (amb && ctx) AMB_KEYS.forEach(k => amb[k].g.gain.setTargetAtTime(0, ctx.currentTime, 0.3));
}
