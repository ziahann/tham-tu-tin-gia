// Bàn phím + phím ảo: hướng đi đang giữ và các sự kiện hành động (E/Space/Enter, B, J, T, Esc).

const held = new Set();
// cần điều khiển ảo: hướng 8 phía {x, y}, mỗi trục -1 / 0 / 1
let stick = { x: 0, y: 0 };
const listeners = {};

const KEY_DIR = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right'
};

/** Đăng ký hàm nghe sự kiện: action | backpack | cases | weather | escape. */
export function on(name, fn) {
  (listeners[name] ||= []).push(fn);
}

/** Phát sự kiện tới các hàm nghe. */
export function emit(name) {
  (listeners[name] || []).forEach(fn => fn());
}

/** Người chơi đang gõ chữ (ô nhập): mọi phím thuộc về ô nhập. */
const isTextTarget = t => t instanceof HTMLElement && (t.matches('input, textarea, select') || t.isContentEditable);
/** Đang focus một nút / link: Space, Enter để trình duyệt bấm nút; phím đi lại và E vẫn điều khiển game. */
const isButtonTarget = t => t instanceof HTMLElement && t.matches('button, a, summary');

/** Hướng di chuyển hiện tại {x, y} trong khoảng -1..1. */
export function direction() {
  const has = d => held.has(d);
  return {
    x: Math.sign((has('right') ? 1 : 0) - (has('left') ? 1 : 0) + stick.x),
    y: Math.sign((has('down') ? 1 : 0) - (has('up') ? 1 : 0) + stick.y)
  };
}

/** Bỏ mọi phím đang giữ (khi mở hội thoại, đổi tab...). */
export function releaseAll() {
  held.clear();
  stick = { x: 0, y: 0 };
  document.querySelector('.stick-knob')?.style.removeProperty('transform');
}

/** Gắn sự kiện bàn phím và phím ảo. */
export function initInput() {
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') { emit('escape'); return; }
    if (isTextTarget(e.target)) return;
    const d = KEY_DIR[e.code];
    if (d) { held.add(d); e.preventDefault(); return; }
    if (e.repeat) return;
    const onButton = isButtonTarget(e.target);
    if (e.code === 'KeyE' || (!onButton && (e.code === 'Space' || e.code === 'Enter'))) { e.preventDefault(); emit('action'); }
    else if (e.code === 'KeyB') { emit('backpack'); }
    else if (e.code === 'KeyJ') { emit('cases'); }
  });
  window.addEventListener('keyup', e => {
    const d = KEY_DIR[e.code];
    if (d) held.delete(d);
  });
  window.addEventListener('blur', releaseAll);
  // Bấm chuột vào nút ngoài khung thoại (thanh trên, balo): bỏ focus để phím quay về điều khiển nhân vật.
  document.addEventListener('click', e => {
    const b = e.target instanceof Element && e.target.closest('button, summary');
    if (b && e.detail > 0 && !b.closest('#dialog, #modal, #intro, #title, #results')) b.blur();
  });

  const touch = document.getElementById('touch');
  if (window.matchMedia('(pointer: coarse)').matches) touch.hidden = false;
  initStick(document.getElementById('stick'));
  document.getElementById('touch-a').addEventListener('pointerdown', e => { e.preventDefault(); emit('action'); });
}

/** Cần điều khiển ảo: kéo núm theo 8 hướng (mỗi hướng một góc 45°), giữa vòng là vùng chết. */
function initStick(pad) {
  const knob = pad.querySelector('.stick-knob');
  let id = null;
  const move = e => {
    const r = pad.getBoundingClientRect();
    const R = r.width / 2;
    let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R);
    const len = Math.hypot(dx, dy);
    if (len > R) { dx *= R / len; dy *= R / len; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    if (len < R * 0.28) { stick = { x: 0, y: 0 }; return; }
    const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4); // bắt về bội số 45°
    stick = { x: Math.round(Math.cos(a)), y: Math.round(Math.sin(a)) };
  };
  const end = e => {
    if (e.pointerId !== id) return;
    id = null;
    stick = { x: 0, y: 0 };
    knob.style.removeProperty('transform');
    pad.classList.remove('is-on');
  };
  pad.addEventListener('pointerdown', e => {
    e.preventDefault();
    id = e.pointerId;
    pad.setPointerCapture(id);
    pad.classList.add('is-on');
    move(e);
  });
  pad.addEventListener('pointermove', e => { if (e.pointerId === id) { e.preventDefault(); move(e); } });
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);
}

/** Điện thoại: vào toàn màn hình và khóa hướng ngang (Android; iOS không cho khóa, chỉ hiện lời nhắc xoay ngang). */
export function lockLandscape() {
  if (!window.matchMedia('(pointer: coarse)').matches) return;
  const el = document.documentElement;
  const full = el.requestFullscreen && !document.fullscreenElement ? el.requestFullscreen({ navigationUI: 'hide' }) : Promise.resolve();
  full.catch(() => {}).then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
}
