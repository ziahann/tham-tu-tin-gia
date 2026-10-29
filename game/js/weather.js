// Thời tiết và ánh sáng kiểu trinh thám: trời quang / mưa / sương mù / đêm, viền tối quanh khung hình.
// Ban đêm dùng Light2D của Phaser: đèn đường, cửa sổ, màn hình thiết bị và đèn pin quanh người chơi.
// Trong nhà không có hạt mưa (chỉ tối màu và tiếng mưa); ngoài trời có hạt mưa và vệt nước bắn.
import { state, saveSettings } from './state.js';

export const WEATHERS = ['clear', 'rain', 'fog', 'night'];
const OUTDOOR = new Set(['street', 'city']);
const DEPTH = 200000;

// Ô phát sáng ban đêm: màu, bán kính, cường độ
const LIGHT_TILES = {
  lamp: [0xffd28a, 170, 1.6],
  facade_window: [0x9ec8ff, 60, 0.7],
  window: [0x9ec8ff, 70, 0.6],
  shop_door: [0xffc27a, 70, 0.9],
  signboard: [0xff9fd0, 70, 0.8],
  dev_pc: [0x7fe3ff, 80, 1.1],
  dev_monitors: [0x7fa8ff, 90, 1.1],
  dev_detector: [0x7fe3ff, 70, 1.0],
  dev_reader: [0xffe2a0, 60, 0.9],
  desk: [0xffe2a0, 60, 0.6],
  frame: [0xb28cff, 60, 0.8]
};

/** Tạo các texture dùng chung: giọt mưa, vệt nước bắn, sương, viền tối. */
function makeTextures(scene) {
  const tx = scene.textures;
  if (!tx.exists('raindrop')) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xcfe0ff, 0.8).fillRect(0, 0, 1, 9).generateTexture('raindrop', 1, 9);
    g.clear().lineStyle(1, 0xcfe0ff, 0.9).strokeEllipse(4, 2, 7, 3).generateTexture('splash', 8, 4);
    g.destroy();
  }
  if (!tx.exists('fog')) {
    const c = tx.createCanvas('fog', 256, 256);
    const ctx = c.getContext();
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 26; i++) {
      const x = rnd() * 256, y = rnd() * 256, r = 30 + rnd() * 60;
      // vẽ lặp ở 9 vị trí để ghép liền khi lát gạch
      for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) {
        const grd = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
        grd.addColorStop(0, 'rgba(210,220,235,0.55)');
        grd.addColorStop(1, 'rgba(210,220,235,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
      }
    }
    c.refresh();
  }
  if (!tx.exists('vignette')) {
    const c = tx.createCanvas('vignette', 256, 256);
    const ctx = c.getContext();
    const grd = ctx.createRadialGradient(128, 128, 70, 128, 128, 182);
    grd.addColorStop(0, 'rgba(4,7,14,0)');
    grd.addColorStop(1, 'rgba(4,7,14,0.7)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 256, 256);
    c.refresh();
  }
}

export class Weather {
  /** targets: lớp bản đồ và sprite nhận ánh sáng ban đêm. */
  constructor(scene, targets) {
    this.scene = scene;
    this.targets = targets;
    this.outdoor = OUTDOOR.has(scene.mapKey);
    this.webgl = scene.renderer.type === Phaser.WEBGL;
    this.lights = [];
    makeTextures(scene);
    this.tint = scene.add.rectangle(0, 0, 10, 10, 0x000000, 0).setOrigin(0).setScrollFactor(0).setDepth(DEPTH);
    this.fog = scene.add.tileSprite(0, 0, 10, 10, 'fog').setOrigin(0).setScrollFactor(0).setDepth(DEPTH + 1).setVisible(false);
    this.vignette = scene.add.image(0, 0, 'vignette').setOrigin(0).setScrollFactor(0).setDepth(DEPTH + 2);
    this.onResize = () => this.layout();
    scene.scale.on('resize', this.onResize);
    scene.events.once('shutdown', () => scene.scale.off('resize', this.onResize));
    this.layout();
    this.set(state.settings.weather || 'clear', false);
  }

  /** Khung che phủ màn hình theo zoom camera (vật có scrollFactor 0 vẫn bị phóng quanh tâm camera). */
  view() {
    const { width: w, height: h } = this.scene.scale;
    const z = this.scene.cameras.main.zoom;
    return { x: w / 2 - w / (2 * z), y: h / 2 - h / (2 * z), w: w / z, h: h / z };
  }

  /** Đặt lại kích thước lớp phủ khi đổi cỡ cửa sổ. */
  layout() {
    const v = this.view();
    this.tint.setPosition(v.x, v.y).setSize(v.w, v.h);
    this.fog.setPosition(v.x, v.y).setSize(v.w, v.h);
    this.vignette.setPosition(v.x, v.y).setDisplaySize(v.w, v.h);
    if (this.kind === 'rain' && this.outdoor) this.startRain();
  }

  /** Đổi thời tiết; save = lưu vào cài đặt. */
  set(kind, save = true) {
    this.kind = WEATHERS.includes(kind) ? kind : 'clear';
    if (save) { state.settings.weather = this.kind; saveSettings(); }
    const indoorK = this.outdoor ? 1 : 0.5;
    const tints = { clear: [0x000000, 0], rain: [0x1a2a48, 0.28 * indoorK], fog: [0xb8c4d6, 0.14], night: [0x02040c, this.webgl ? 0 : 0.5] };
    const [color, alpha] = tints[this.kind];
    this.tint.setFillStyle(color, alpha);
    this.fog.setVisible(this.kind === 'fog').setAlpha(this.outdoor ? 0.55 : 0.22);
    this.vignette.setAlpha(this.kind === 'night' ? 1 : 0.75);
    this.stopRain();
    if (this.kind === 'rain' && this.outdoor) this.startRain();
    this.setNight(this.kind === 'night');
  }

  /** Hạt mưa rơi xiên (cố định theo màn hình) và vệt nước bắn trên mặt đất (theo thế giới). */
  startRain() {
    this.stopRain();
    const sc = this.scene;
    const v = this.view();
    const few = state.settings.reduceMotion;
    this.rain = sc.add.particles(0, 0, 'raindrop', {
      x: { min: v.x - 40, max: v.x + v.w + 40 }, y: v.y - 12,
      speedY: { min: 420, max: 560 }, speedX: -70, rotate: 8,
      lifespan: Math.ceil((v.h + 30) / 420 * 1000),
      quantity: few ? 1 : 3, frequency: few ? 60 : 18, alpha: { start: 0.75, end: 0.45 }
    }).setScrollFactor(0).setDepth(DEPTH + 1);
    const cam = sc.cameras.main;
    this.splash = sc.add.particles(0, 0, 'splash', {
      x: { onEmit: () => cam.worldView.x + Math.random() * cam.worldView.width },
      y: { onEmit: () => cam.worldView.y + Math.random() * cam.worldView.height },
      lifespan: 280, scale: { start: 0.4, end: 1.3 }, alpha: { start: 0.7, end: 0 },
      quantity: 1, frequency: few ? 120 : 30
    }).setDepth(1);
  }

  stopRain() {
    this.rain?.destroy(); this.rain = null;
    this.splash?.destroy(); this.splash = null;
  }

  /** Bật / tắt ánh sáng ban đêm (Light2D): đèn theo ô phát sáng và đèn quanh người chơi. */
  setNight(on) {
    const sc = this.scene;
    if (!this.webgl) return;
    this.lights.forEach(l => sc.lights.removeLight(l));
    this.lights = [];
    this.playerLight = null;
    if (!on) {
      sc.lights.disable();
      this.targets().forEach(o => o.resetPipeline?.());
      return;
    }
    sc.lights.enable().setAmbientColor(this.outdoor ? 0x39426a : 0x6e7898);
    this.targets().forEach(o => o.setPipeline?.('Light2D'));
    const walls = sc.walls;
    walls.forEachTile(tile => {
      const name = tile.properties?.name;
      const spec = LIGHT_TILES[name];
      if (!spec) return;
      if (/window/.test(name) && (tile.x + tile.y) % 3) return; // chỉ vài ô cửa sổ sáng đèn
      const [color, radius, intensity] = spec;
      this.lights.push(sc.lights.addLight(tile.pixelX + 16, tile.pixelY + 16, radius, color, intensity));
    });
    this.playerLight = sc.lights.addLight(0, 0, this.outdoor ? 120 : 150, 0xfff0d0, this.outdoor ? 0.9 : 0.6);
    this.lights.push(this.playerLight);
  }

  /** Mỗi khung hình: sương trôi, đèn theo người chơi. */
  update(delta, player) {
    if (this.kind === 'fog' && !state.settings.reduceMotion) {
      this.fog.tilePositionX += delta * 0.012;
      this.fog.tilePositionY += delta * 0.004;
    }
    if (this.playerLight) this.playerLight.setPosition(player.x, player.y - 20);
  }
}

/** Thời tiết kế tiếp trong vòng (cho nút trên thanh trên / phím T). */
export const nextWeather = kind => WEATHERS[(WEATHERS.indexOf(kind) + 1) % WEATHERS.length];
