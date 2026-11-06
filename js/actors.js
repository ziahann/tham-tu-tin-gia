// Nhân vật trên bản đồ: hoạt ảnh 4 hướng, NPC đi tuần / dẫn đường / quay mặt khi nói chuyện.
// Vị trí logic trên lưới vuông; hướng nhìn tính theo hướng trên màn hình isometric (js/iso.js).
import { iso } from './iso.js';

// Sprite sheet LPC (tools/lpc.mjs): 9 cột (đứng + 8 bước) x 4 hàng (xuống, trái, phải, lên), mỗi khung 64x64,
// bàn chân ở y = 62; hàng 5 = ngồi xuống / phải / trái, hàng 6 cột 0 = ngồi quay lưng.
export const DIRS = ['down', 'left', 'right', 'up'];
export const FRAME = 64;
const COLS = 9;
const FEET_Y = 62;
// khoảng từ bàn chân tới đỉnh đầu (đo trên sprite LPC)
export const HEAD_TOP = 48;
export const idleFrame = dir => DIRS.indexOf(dir) * COLS;
export const SIT_FRAME = { down: 36, right: 37, left: 38, up: 45 };

/** Tạo hoạt ảnh đi 4 hướng cho một sprite sheet. */
export function makeAnims(scene, key) {
  DIRS.forEach((dir, row) => {
    const k = `${key}-walk-${dir}`;
    if (scene.anims.exists(k)) return;
    scene.anims.create({ key: k, frames: [1, 2, 3, 4, 5, 6, 7, 8].map(c => ({ key, frame: row * COLS + c })), frameRate: 12, repeat: -1 });
  });
}

/** Điểm (X, Y) trên màn hình có trúng thân nhân vật đứng ở (vx, vy) — gốc ở bàn chân, hộp 28 x (HEAD_TOP + 2), bỏ phần khung trong suốt. */
export const hitsActor = (vx, vy, X, Y, scale = 1) => Math.abs(X - vx) <= 14 * scale && Y <= vy && Y >= vy - (HEAD_TOP + 2) * scale;

/** Hướng nhìn theo vectơ (dx, dy). */
export function dirFrom(dx, dy) {
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
}

/** Gắn thân va chạm ở bàn chân (16x10) cho sprite LPC 64x64, gốc ở bàn chân. */
export function feetBody(sprite) {
  sprite.setOrigin(0.5, FEET_Y / FRAME);
  sprite.body.setSize(16, 10);
  sprite.body.setOffset(24, FEET_Y - 10);
}

const EMOTE_LIFT = 26; // cao hơn nhãn tên để không che chữ
/**
 * Bong bóng biểu cảm (! ? … ♪) hoặc câu nói ngắn (small) nổi trên đầu một sprite trong ms mili giây.
 * Có `tag` thì bám ngay trên nhãn tên (nhãn có thể bị đẩy lên khi chồng nhãn khác).
 */
export function showEmote(scene, sprite, ch, ms = 1500, small = false, tag = null) {
  const at = () => tag?.visible ? tag.y - tag.height - 2 : sprite.y - HEAD_TOP - EMOTE_LIFT;
  // '…' của phông VT323 chỉ là một vạch nhỏ, trông như ô trống
  const t = scene.add.text(sprite.x, at(), ch === '…' ? '...' : ch, {
    fontFamily: 'VT323', fontSize: small ? '16px' : '22px', color: '#0a0e18', backgroundColor: '#e8ecf2', padding: { x: 5, y: 0 }
  }).setOrigin(0.5, 1).setDepth(100002);
  const follow = () => { if (t.active) t.setPosition(sprite.x, at()); };
  const end = () => { scene.events.off('update', follow); t.destroy(); if (sprite.emoteEnd === end) sprite.emoteEnd = null; };
  sprite.emoteEnd?.(); // mỗi người một bong bóng: cái mới thay cái cũ
  sprite.emoteEnd = end;
  scene.events.on('update', follow);
  scene.tweens.add({ targets: t, y: '-=4', duration: 200, yoyo: true });
  scene.time.delayedCall(ms, end);
}

/**
 * Nhãn tên nổi trên đầu (người chơi, NPC). kind: 'hero' (xanh ngọc), 'story' (vàng: người giao hồ sơ),
 * 'rumor' (đỏ: kẻ tung tin), mặc định trắng xám (người qua đường).
 */
export function nameTag(scene, text, kind) {
  const color = { hero: '#7fe3ff', story: '#f2d36b', rumor: '#ff8a8a' }[kind] || '#d6dbe4';
  return scene.add.text(0, 0, text, { fontFamily: 'VT323', fontSize: '15px', color, stroke: '#0f0e17', strokeThickness: 3 })
    .setOrigin(0.5, 1).setDepth(99990).setResolution(2);
}

/** Đẩy nhãn tên chồng nhau lên trên: nhãn gần máy (y lớn) giữ chỗ, nhãn phía sau nhích lên. */
export function declutterTags(tags) {
  const placed = [];
  for (const t of tags.filter(t => t?.visible).sort((a, b) => b.y - a.y)) {
    for (let guard = 0; guard < 6; guard++) {
      const hit = placed.find(p => Math.abs(p.x - t.x) < (p.width + t.width) / 2 + 4 && Math.abs(p.y - t.y) < t.height);
      if (!hit) break;
      t.y = hit.y - t.height - 1;
    }
    placed.push(t);
  }
}

const EMOTES = ['…', '♪', '?', '!'];
const PATROL_SPEED = 42;
const LEAD_SPEED = 95;
const LEAD_WAIT_DIST = 150; // NPC dẫn đường đứng chờ khi người chơi ở xa hơn
const NOTICE_DIST = 60;     // NPC đi tuần dừng lại khi người chơi gần hơn
const CHASE_DIST = 170;    // kẻ tung tin thấy người chơi trong tầm này thì đuổi theo
const CHASE_SPEED = 92;    // chậm hơn người chơi (120): chạy được nếu để ý
const CATCH_DIST = 30;

export class Npc {
  constructor(scene, id, x, y) {
    this.scene = scene;
    this.id = id;
    this.sprite = scene.physics.add.sprite(x, y, id, 0);
    feetBody(this.sprite);
    this.sprite.body.setImmovable(true);
    this.sprite.body.pushable = false;
    this.facing = 'down';
    this.route = null;
    this.mode = 'idle';
    this.idx = 0;
    this.step = 1;
    this.wait = 0;
    this.talking = false;
    this.ambient = false;
    this.emoteIn = 4000 + Math.random() * 8000; // người qua đường thỉnh thoảng hiện biểu cảm
    this.marker = scene.add.text(x, y - HEAD_TOP - 6, '!', { fontFamily: 'VT323', fontSize: '28px', color: '#f2d36b', stroke: '#0f0e17', strokeThickness: 4 })
      .setOrigin(0.5, 1).setVisible(false);
  }

  /** Đặt NPC tại một điểm. */
  teleport(p) {
    this.sprite.body.reset(p.x, p.y);
  }

  /** Đi tuần qua lại theo một đường (ping-pong), dừng ở hai đầu. */
  patrol(route) {
    this.route = route && route.length ? route : null;
    this.mode = this.route ? 'patrol' : 'idle';
    this.idx = 0;
    this.step = 1;
    this.wait = 600;
  }

  /** Đi trước dẫn đường theo route, chờ khi người chơi tụt lại; gọi onDone khi tới nơi. */
  lead(route, onDone) {
    this.route = route;
    this.mode = 'lead';
    this.idx = 0;
    this.wait = 0;
    this.onDone = onDone;
  }

  /** Quay mặt về một điểm (toạ độ logic). */
  face(x, y) {
    const d = iso.toScreenDir(x - this.sprite.x, y - this.sprite.y);
    this.facing = dirFrom(d.x, d.y);
    this.stand();
  }

  /** Đứng yên (hoặc ngồi, nếu NPC có tư thế ngồi) theo hướng hiện tại. */
  stand() {
    this.sprite.body.setVelocity(0, 0);
    this.sprite.anims.stop();
    this.sprite.setFrame(this.pose === 'sit' ? SIT_FRAME[this.facing] : idleFrame(this.facing));
  }

  /** Quay về hướng mặc định của NPC đứng yên (ngồi trên ghế, hoặc nhìn người cùng trò chuyện). */
  rest() {
    if (this.restAt) this.face(this.restAt.x, this.restAt.y);
    else if (this.restDir) { this.facing = this.restDir; this.stand(); }
  }

  /** Đặt nhãn tên và dấu ! theo hình hiển thị (gọi sau khi đồng bộ hình isometric). */
  syncTag(player) {
    const v = this.sprite.view || this.sprite;
    const top = v.y - (HEAD_TOP + 4) * (v.scaleY || 1);
    // chỉ hiện tên người ở gần (đỡ rối, không lộ tên người đứng khuất sau nhà ở xa)
    const near = !player || Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, player.x, player.y) < 380;
    if (this.tag) this.tag.setPosition(v.x, top).setVisible(near && v.visible && v.alpha > 0.5);
    this.marker.setPosition(v.x, top - (this.tag ? 14 : 0) + Math.round(Math.sin(this.scene.time.now / 250) * 2)).setDepth(100000);
  }

  /** Cập nhật mỗi khung hình. */
  update(delta, frozen, player) {
    const s = this.sprite;
    const v = s.view || s;
    this.marker.setPosition(v.x, v.y - (HEAD_TOP + 4) * (v.scaleY || 1) - (this.tag ? 14 : 0) + Math.round(Math.sin(this.scene.time.now / 250) * 2)).setDepth(100000);
    if (this.ambient && !frozen && !this.talking) {
      this.emoteIn -= delta;
      if (this.emoteIn <= 0) { this.emoteIn = 7000 + Math.random() * 9000; showEmote(this.scene, s.view || s, Phaser.Utils.Array.GetRandom(EMOTES), 1500, false, this.tag); }
    }
    if (this.talking || frozen || this.mode === 'idle') { this.stand(); return; }
    // Kẻ tung tin: thấy người chơi thì đuổi theo; bắt kịp thì chặn lại "mời" xem tin giật tít
    if (this.chaser) {
      this.cool = Math.max(0, (this.cool || 0) - delta);
      const d = Phaser.Math.Distance.Between(s.x, s.y, player.x, player.y);
      if (!this.cool && this.scene.canChase?.() && d < CHASE_DIST * (this.scene.fx?.().chase || 1)) {
        if (d < CATCH_DIST) { this.cool = 25000; this.face(player.x, player.y); this.scene.onCaught?.(this.id); return; }
        const dx = player.x - s.x, dy = player.y - s.y;
        s.body.setVelocity((dx / d) * CHASE_SPEED, (dy / d) * CHASE_SPEED);
        const sd = iso.toScreenDir(dx, dy);
        this.facing = dirFrom(sd.x, sd.y);
        s.anims.play(`${this.id}-walk-${this.facing}`, true);
        return;
      }
    }
    // Đang đi tuần mà người chơi lại gần: dừng lại, quay sang chờ nói chuyện.
    if (this.mode === 'patrol' && !this.chaser && Phaser.Math.Distance.Between(s.x, s.y, player.x, player.y) < NOTICE_DIST) {
      this.face(player.x, player.y);
      return;
    }
    if (this.mode === 'lead' && Phaser.Math.Distance.Between(s.x, s.y, player.x, player.y) > LEAD_WAIT_DIST) {
      this.face(player.x, player.y);
      return;
    }
    if (this.wait > 0) { this.wait -= delta; this.stand(); return; }
    const target = this.route[this.idx];
    const dx = target.x - s.x, dy = target.y - s.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) { this.arrive(); return; }
    const speed = this.mode === 'lead' ? LEAD_SPEED : PATROL_SPEED;
    s.body.setVelocity((dx / dist) * speed, (dy / dist) * speed);
    const sd = iso.toScreenDir(dx, dy);
    this.facing = dirFrom(sd.x, sd.y);
    s.anims.play(`${this.id}-walk-${this.facing}`, true);
  }

  /** Tới một điểm trên đường: sang điểm kế tiếp, đảo chiều, hoặc kết thúc dẫn đường. */
  arrive() {
    this.sprite.body.reset(this.route[this.idx].x, this.route[this.idx].y);
    if (this.mode === 'lead') {
      this.idx++;
      if (this.idx >= this.route.length) {
        this.mode = 'idle';
        this.stand();
        this.onDone?.();
      }
      return;
    }
    const next = this.idx + this.step;
    if (next < 0 || next >= this.route.length) {
      this.step = -this.step;
      this.wait = 1800;
    }
    this.idx = Math.max(0, Math.min(this.route.length - 1, this.idx + this.step));
  }
}
