// Thời tiết và ánh sáng kiểu trinh thám: trời quang / mưa / sương mù / đêm, viền tối quanh khung hình.
// Ban đêm dùng Light2D của Phaser: đèn đường, cửa sổ, màn hình thiết bị và đèn pin quanh người chơi.
// Trong nhà không có hạt mưa (chỉ tối màu và tiếng mưa); ngoài trời có hạt mưa và vệt nước bắn.
import { state, saveSettings } from './state.js';
import { iso } from './iso.js';

export const WEATHERS = ['clear', 'rain', 'fog', 'night'];

/** Buổi trong ngày theo phút (0..1439): ngày 6h–17h, chiều tà / bình minh, đêm 19h–5h. */
export function dayPhase(min) {
  const h = min / 60;
  if (h >= 19 || h < 5) return 'night';
  if (h >= 17 || h < 6) return 'dusk';
  return 'day';
}
const OUTDOOR = new Set(['street', 'city', 'hcm']);
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
  if (!tx.exists('vignette_fog')) {
    // sương mù ngoài trời: tầm nhìn hẹp quanh người chơi
    const c = tx.createCanvas('vignette_fog', 256, 256);
    const ctx = c.getContext();
    const grd = ctx.createRadialGradient(128, 128, 34, 128, 128, 128);
    grd.addColorStop(0, 'rgba(180,192,210,0)');
    grd.addColorStop(0.55, 'rgba(160,172,190,0.55)');
    grd.addColorStop(1, 'rgba(140,152,170,0.95)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 256, 256);
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
  /** targets: lớp bản đồ và sprite nhận ánh sáng ban đêm; extraLights: đèn của props [x, y, màu, bán kính, cường độ]. */
  constructor(scene, targets, extraLights = () => []) {
    this.extraLights = extraLights;
    this.scene = scene;
    this.targets = targets;
    this.outdoor = OUTDOOR.has(scene.mapKey);
    this.webgl = scene.renderer.type === Phaser.WEBGL;
    this.lights = [];
    makeTextures(scene);
    this.tint = scene.add.rectangle(0, 0, 10, 10, 0x000000, 0).setOrigin(0).setScrollFactor(0).setDepth(DEPTH);
    this.fog = scene.add.tileSprite(0, 0, 10, 10, 'fog').setOrigin(0).setScrollFactor(0).setDepth(DEPTH + 1).setVisible(false);
    this.vignette = scene.add.image(0, 0, 'vignette').setOrigin(0).setScrollFactor(0).setDepth(DEPTH + 2);
    this.fogView = scene.add.image(0, 0, 'vignette_fog').setOrigin(0).setScrollFactor(0).setDepth(DEPTH + 2).setVisible(false);
    this.onResize = () => this.layout();
    scene.scale.on('resize', this.onResize);
    scene.events.once('shutdown', () => scene.scale.off('resize', this.onResize));
    this.layout();
    this.phase = dayPhase(state.progress?.clock ?? 960);
    this.set(state.settings.weather || 'clear', false);
  }

  /** Đổi buổi trong ngày (đồng hồ trong game). */
  setTime(phase) {
    if (phase === this.phase) return;
    this.phase = phase;
    this.set(this.global, false);
  }

  /** Ngoài trời đang tối không (đêm theo giờ, hoặc thời tiết "đêm"). */
  get dark() { return this.outdoor && (this.kind === 'night' || this.phase === 'night'); }

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
    this.fogView.setPosition(v.x, v.y).setDisplaySize(v.w, v.h);
    if (this.kind === 'rain' && this.outdoor) this.startRain();
  }

  /**
   * Đổi thời tiết; save = lưu vào cài đặt. Thời tiết chỉ có ở ngoài trời: trong tòa nhà, phòng luôn như trời quang
   * (this.kind = thời tiết đang có hiệu lực ở bản đồ này; this.global = thời tiết chung của thành phố).
   */
  set(kind, save = true) {
    this.global = WEATHERS.includes(kind) ? kind : 'clear';
    if (save) { state.settings.weather = this.global; saveSettings(); }
    this.kind = this.outdoor ? this.global : 'clear';
    const indoorK = this.outdoor ? 1 : 0.5;
    const tints = { clear: [0x000000, 0], rain: [0x1a2a48, 0.28 * indoorK], fog: [0xb8c4d6, 0.14], night: [0x02040c, this.webgl ? 0 : 0.5] };
    let [color, alpha] = tints[this.kind];
    // chiều tà ngoài trời: phủ cam nhạt
    if (this.outdoor && this.phase === 'dusk' && this.kind !== 'night') { color = 0x5a2a1a; alpha = Math.max(alpha, 0.16); }
    this.tint.setFillStyle(color, alpha);
    this.fog.setVisible(this.kind === 'fog').setAlpha(0.55);
    this.fogView.setVisible(this.kind === 'fog');
    this.vignette.setAlpha(this.dark ? 1 : 0.75);
    this.stopRain();
    if (this.kind === 'rain' && this.outdoor) this.startRain();
    this.applyLight();
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
  /**
   * Ánh sáng: ngoài trời bật đèn khi tối (đêm) hoặc chiều tà; trong nhà luôn bật đèn bàn, màn hình, đèn sàn — ban ngày
   * ánh sáng nền sáng (đèn chỉ hắt nhẹ), buổi tối nền tối đi nên đèn nổi rõ.
   */
  applyLight() {
    if (this.outdoor) {
      if (this.dark) return this.setNight(true, 0x39426a);
      if (this.phase === 'dusk') return this.setNight(true, 0x9a8a8a);
      return this.setNight(false);
    }
    const amb = { day: 0xd4d8e4, dusk: 0x9aa0b8, night: 0x6e7898 }[this.phase] || 0xd4d8e4;
    return this.setNight(true, amb);
  }

  /** Bật Light2D đã bật (để sprite mới tạo — xe, NPC — cũng nhận ánh sáng). */
  get lit() { return this.webgl && this.lightsOn; }

  setNight(on, ambient = 0x39426a) {
    const sc = this.scene;
    this.lightsOn = on;
    if (!this.webgl) return;
    this.lights.forEach(l => sc.lights.removeLight(l));
    this.lights = [];
    this.playerLight = null;
    if (!on) {
      sc.lights.disable();
      this.targets().forEach(o => o?.scene && o.resetPipeline?.());
      return;
    }
    sc.lights.enable().setAmbientColor(ambient);
    this.targets().forEach(o => o?.scene && o.setPipeline?.('Light2D'));
    const walls = sc.walls;
    walls.forEachTile(tile => {
      const name = tile.properties?.name;
      const spec = LIGHT_TILES[name];
      if (!spec) return;
      if (/window/.test(name) && (tile.x + tile.y) % 3) return; // chỉ vài ô cửa sổ sáng đèn
      const [color, radius, intensity] = spec;
      const q = iso.P(tile.pixelX + 16, tile.pixelY + 16);
      this.lights.push(sc.lights.addLight(q.x, q.y - 20, radius, color, intensity));
    });
    // đèn của props (đèn đường, cửa sổ sáng, biển hiệu, màn hình)
    for (const [x, y, color, radius, intensity] of this.extraLights()) this.lights.push(sc.lights.addLight(x, y, radius, color, intensity));
    // phòng phát trực tiếp: đèn đỏ trên biển "TRỰC TIẾP" (world.js làm nhấp nháy)
    const lp = iso.P(3.4 * 32, 2.6 * 32);
    this.liveLight = sc.mapKey === 'boss' ? sc.lights.addLight(lp.x, lp.y - 40, 160, 0xff3b4a, 1.2) : null;
    if (this.liveLight) this.lights.push(this.liveLight);
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

/** Thời tiết ngẫu nhiên kế tiếp (khác hiện tại): trời quang hay gặp nhất. */
export function randomWeather(current) {
  // đêm giờ đến từ đồng hồ trong game, nên thời tiết ngẫu nhiên chỉ còn nắng / mưa / sương
  const bag = [['clear', 4], ['rain', 2.5], ['fog', 1.5]].filter(([k]) => k !== current);
  let r = Math.random() * bag.reduce((s, [, w]) => s + w, 0);
  for (const [k, w] of bag) { if ((r -= w) <= 0) return k; }
  return 'clear';
}

/** Hiệu ứng của thời tiết lên người chơi (chỉ ngoài trời). */
export const WEATHER_FX = {
  clear: { speed: 1, chase: 1, pressure: 1 },
  rain: { speed: 0.8, chase: 1, pressure: 1, brake: 1.6 },
  fog: { speed: 1, chase: 1, pressure: 1, hideFar: 140 },
  night: { speed: 1, chase: 1.5, pressure: 1.4 }
};
