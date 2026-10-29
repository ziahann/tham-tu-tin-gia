// Nhân vật trên bản đồ: hoạt ảnh 4 hướng, NPC đi tuần / dẫn đường / quay mặt khi nói chuyện.

// Sprite sheet: 3 cột (đứng, bước 1, bước 2) x 4 hàng (xuống, trái, phải, lên), mỗi khung 32x48.
export const DIRS = ['down', 'left', 'right', 'up'];
export const idleFrame = dir => DIRS.indexOf(dir) * 3;

/** Tạo hoạt ảnh đi 4 hướng cho một sprite sheet. */
export function makeAnims(scene, key) {
  DIRS.forEach((dir, row) => {
    const k = `${key}-walk-${dir}`;
    if (scene.anims.exists(k)) return;
    scene.anims.create({ key: k, frames: [1, 0, 2, 0].map(c => ({ key, frame: row * 3 + c })), frameRate: 8, repeat: -1 });
  });
}

/** Hướng nhìn theo vectơ (dx, dy). */
export function dirFrom(dx, dy) {
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
}

/** Gắn thân va chạm ở bàn chân (16x10) cho sprite 32x48 gốc ở chân. */
export function feetBody(sprite) {
  sprite.setOrigin(0.5, 1);
  sprite.body.setSize(16, 10);
  sprite.body.setOffset(8, 37);
}

const PATROL_SPEED = 42;
const LEAD_SPEED = 95;
const LEAD_WAIT_DIST = 150; // NPC dẫn đường đứng chờ khi người chơi ở xa hơn
const NOTICE_DIST = 60;     // NPC đi tuần dừng lại khi người chơi gần hơn

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
    this.marker = scene.add.text(x, y - 52, '!', { fontFamily: 'VT323', fontSize: '28px', color: '#f2d36b', stroke: '#0f0e17', strokeThickness: 4 })
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

  /** Quay mặt về một điểm. */
  face(x, y) {
    this.facing = dirFrom(x - this.sprite.x, y - this.sprite.y);
    this.stand();
  }

  /** Đứng yên theo hướng hiện tại. */
  stand() {
    this.sprite.body.setVelocity(0, 0);
    this.sprite.anims.stop();
    this.sprite.setFrame(idleFrame(this.facing));
  }

  /** Cập nhật mỗi khung hình. */
  update(delta, frozen, player) {
    const s = this.sprite;
    s.setDepth(s.y);
    this.marker.setPosition(s.x, s.y - 50 + Math.round(Math.sin(this.scene.time.now / 250) * 2)).setDepth(s.y + 1);
    if (this.talking || frozen || this.mode === 'idle') { this.stand(); return; }
    // Đang đi tuần mà người chơi lại gần: dừng lại, quay sang chờ nói chuyện.
    if (this.mode === 'patrol' && Phaser.Math.Distance.Between(s.x, s.y, player.x, player.y) < NOTICE_DIST) {
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
    this.facing = dirFrom(dx, dy);
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
