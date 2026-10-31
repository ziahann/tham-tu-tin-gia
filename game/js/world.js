// Cảnh bản đồ Phaser: bản đồ Tiled, người chơi đi lại, NPC, cửa phòng, khu vực, gợi ý tương tác.
// Logic chạy trên lưới vuông; hiển thị isometric qua js/iso.js (sprite vật lý ẩn, ảnh hiển thị đặt theo phép chiếu).
import { data, t } from './data.js';
import { state, saveProgress, hasFlag } from './state.js';
import { direction } from './input.js';
import { makeAnims, feetBody, dirFrom, idleFrame, Npc, showEmote, nameTag } from './actors.js';
import { roomStatus } from './grading.js';
import * as story from './story.js';
import * as journey from './journey.js';
import * as dlg from './dialogue.js';
import { setPlace, updateMeters } from './hud.js';
import { tickPressure, isLight, caseOpen } from './obstacles.js';
import { feedPressureRate } from './feed.js';
import { buildGrid, findPath } from './pathfind.js';
import { playMusic } from './music.js';
import { buildGraph, guideTarget, updateTrackLine, GuideArrow } from './guide.js';
import { Weather, WEATHER_FX } from './weather.js';
import { Traffic, VEHICLE_SPRITES } from './traffic.js';
import { sfx, footstep, setAmbience } from './audio.js';
import { iso, setupIso, buildGround, buildWalls, ViewLayer, fadeOccluders, shearedText, WALL_H } from './iso.js';

const MAPS = ['tn_lobby', 'tn_f2', 'tn_f3', 'tn_f4', 'tn_f5', 'street', 'newsroom', 'cafe', 'agency', 'office2', 'clinic', 'cafe2', 'boss', 'home', 'hcm', 'tn_hcm'];
const CITY_MAPS = new Set(['street', 'hcm']); // phố ngoài trời: nền kéo dài ra ngoài bản đồ, ra khỏi nhà nhìn xuống
const SPEED = 120;
const MAP_VERSION = 11;
// Xe buýt (tools/props.mjs → bus): mũi xe bên phải ảnh nhìn ngang 240 px; cửa lên ở đầu xe, cửa xuống ở giữa thân.
// Xe chạy làn đông (bus_e) dọc vỉa hè nam nên mặt có cửa quay về phía người chơi. Toạ độ x cửa = bus.x − 120 + cột.
const BUS_FRONT_DOOR = 216, BUS_MID_DOOR = 122;
const busIso = scene => ({ fw: 240, ay: 28 + 84, h: scene.textures.get('bus_e').getSourceImage().height, d: 56 }); // tăng khi sửa bố cục bản đồ: vị trí đã lưu theo bản cũ bị bỏ qua

/** Sprite của mọi nhân vật trong npc_dialogues.json (NPC chính, người qua đường, boss) + boss đã gỡ mặt nạ. */
const spriteIds = () => [...new Set([...data.npcs.npcs.map(n => n.sprite || n.id), 'boss', 'boss_blank'])];

/** File sprite của nhân vật chính theo mẫu người chơi chọn (nam / nữ). */
export const heroSprite = () => `hero_${state.progress?.heroLook === 'f' ? 'f' : 'm'}`;

/** Lấy thuộc tính tùy chỉnh của object Tiled. */
const propOf = (o, name) => (o.properties || []).find(p => p.name === name)?.value;

/** Hiện một dòng thông báo ngắn (không chặn điều khiển). */
const toastLater = text => import('./ui.js').then(m => m.toast(text));

/** Điểm có nằm trong hình chữ nhật của object Tiled không. */
const inRect = (o, x, y, pad = 0) => x >= o.x - pad && x <= o.x + o.width + pad && y >= o.y - pad && y <= o.y + o.height + pad;

export class WorldScene extends Phaser.Scene {
  constructor() { super('world'); }

  /** Tải bản đồ, tileset, sprite. */
  preload() {
    MAPS.forEach(key => this.load.tilemapTiledJSON(key, `maps/${key}.json`));
    this.load.atlas('props', 'assets/props/props.png', 'assets/props/props.json');
    this.load.json('propsMeta', 'assets/props/props_meta.json');
    this.load.image('tiles', 'assets/tiles/tiles.png');
    this.load.spritesheet('tilesheet', 'assets/tiles/tiles.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('isoground', 'assets/iso/ground.png', { frameWidth: 64, frameHeight: 32 });
    this.load.spritesheet('isowalls', 'assets/iso/walls.png', { frameWidth: 64, frameHeight: 32 + WALL_H });
    this.load.spritesheet('hero', `assets/sprites/${heroSprite()}.png`, { frameWidth: 32, frameHeight: 48 });
    spriteIds().forEach(id => this.load.spritesheet(id, `assets/sprites/${id}.png`, { frameWidth: 32, frameHeight: 48 }));
    VEHICLE_SPRITES.forEach(id => this.load.image(id, `assets/sprites/${id}.png`));
  }

  /** Nhận bản đồ và điểm xuất hiện khi chuyển cảnh. */
  init(args) {
    this.args = args || {};
  }

  /** Dựng bản đồ, người chơi, NPC, camera. */
  create() {
    const saved = state.progress.pos?.v === MAP_VERSION || state.progress.pos?.spawnName ? state.progress.pos : null;
    this.mapKey = this.args.map || (MAPS.includes(saved?.map) ? saved.map : 'tn_lobby');
    const map = this.map = this.make.tilemap({ key: this.mapKey });
    const tiles = map.addTilesetImage('tiles', 'tiles');
    this.ground = map.createLayer('ground', tiles);
    this.walls = map.createLayer('walls', tiles);
    this.doors = map.createLayer('doors', tiles);
    this.walls.setCollisionByProperty({ collides: true });
    this.doors.setCollisionByProperty({ collides: true });
    ['hero', ...spriteIds()].forEach(id => makeAnims(this, id));
    // Hiển thị isometric: lớp tilemap chỉ để va chạm / tra cứu; nền và tường vẽ lại theo phép chiếu
    this.isoSize = setupIso(map.widthInPixels, map.heightInPixels);
    [this.ground, this.walls, this.doors].forEach(l => l.setVisible(false));
    this.groundRTs = buildGround(this, map, this.ground, this.walls, CITY_MAPS.has(this.mapKey));
    this.wallImgs = buildWalls(this, map, this.walls);
    this.views = new ViewLayer(this);

    const objs = map.getObjectLayer('objects').objects;
    this.paths = {};
    this.points = {};
    for (const o of objs) {
      if (o.polyline) this.paths[o.name] = o.polyline.map(p => ({ x: o.x + p.x, y: o.y + p.y }));
      if (o.point) this.points[o.name] = { x: o.x, y: o.y };
    }
    this.zones = objs.filter(o => o.type === 'zone');
    this.exits = objs.filter(o => o.type === 'exit');
    this.portals = objs.filter(o => o.type === 'portal');
    this.inspects = objs.filter(o => o.type === 'inspect');
    this.elevators = objs.filter(o => o.type === 'elevator');
    // điểm hành động của hành trình: máy tính, điện thoại ở phòng trọ, trạm xe khách (journey.js)
    this.spots = objs.filter(o => o.type === 'spot');
    // Manh mối đánh lừa: dấu "?" nổi trên tờ giấy khi hồ sơ của nó còn đang làm
    this.decoys = objs.filter(o => o.type === 'decoy').map(o => ({
      obj: o,
      id: propOf(o, 'decoy'),
      lift: propOf(o, 'lift') || 22,
      marker: this.add.text(iso.P(o.x + o.width / 2, o.y + o.height / 2).x, iso.P(o.x + o.width / 2, o.y + o.height / 2).y - (propOf(o, 'lift') || 22), '?', { fontFamily: 'VT323', fontSize: '24px', color: '#e8ecf2', stroke: '#0f0e17', strokeThickness: 4 })
        .setOrigin(0.5, 1).setDepth(100000).setVisible(false)
    }));
    // Chữ trên tường / sàn (biển tầng, tên tòa nhà)
    for (const o of objs.filter(o => o.type === 'label')) {
      // chữ vẽ cắt xiên nằm trên mặt tường (bảng tên tầng: nền tối)
      const tx = shearedText(this, String(propOf(o, 'text')).split('\n'), { size: propOf(o, 'size') || 16, color: propOf(o, 'color') || '#e8ecf2', plate: !!propOf(o, 'plate') });
      const make = (x, y) => this.add.image(x - tx.w / 2, y - tx.w / 4, tx.key).setOrigin(0, (tx.h0 / 2) / tx.h);
      this.sliceOnWall(make, o.x, o.y, o.x - tx.w / 2);
    }
    // Thiết bị ở Phòng xác minh: có dấu "!" khi hồ sơ đang chờ thiết bị đó.
    this.devices = objs.filter(o => o.type === 'device').map(o => ({
      obj: o,
      id: propOf(o, 'device'),
      marker: this.add.text(iso.P(o.x + o.width / 2, o.y).x, iso.P(o.x + o.width / 2, o.y).y - 40, '!', { fontFamily: 'VT323', fontSize: '28px', color: '#f2d36b', stroke: '#0f0e17', strokeThickness: 4 })
        .setOrigin(0.5, 1).setDepth(100000).setVisible(false)
    }));
    this.doorObjs = objs.filter(o => o.type === 'door').map(o => ({
      obj: o,
      room: propOf(o, 'room'),
      tiles: this.tilesIn(o)
    }));

    // Người chơi: điểm xuất hiện khi chuyển cảnh, vị trí đã lưu, hoặc điểm bắt đầu.
    const fallback = this.points.spawn_start || Object.entries(this.points).find(([k]) => k.startsWith('spawn'))?.[1];
    const resume = saved?.map === this.mapKey && (saved.x != null ? saved : this.points[saved.spawnName]);
    const start = (this.args.spawn && this.points[this.args.spawn]) || resume || fallback;
    this.player = this.physics.add.sprite(start.x, start.y, 'hero', 0);
    feetBody(this.player);
    this.player.setCollideWorldBounds(true);
    this.views.add(this.player);
    this.player.tag = nameTag(this, state.progress.heroName || '', 'hero');
    this.player.on('destroy', () => this.player.tag?.destroy());
    this.facing = this.args.spawn ? (this.args.dir || 'down') : saved?.dir || 'up';
    this.savePos();
    this.player.setFrame(idleFrame(this.facing));
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.player, this.doors);
    this.buildProps(objs);

    // NPC: theo object trên bản đồ, hoặc theo trạm có `map` (Tuệ Lâm, Khải đứng ở tầng của hồ sơ)
    this.npcs = new Map();
    this.spawnZoneRoom = propOf(this.zones.find(z => inRect(z, start.x, start.y - 4)) || {}, 'room') || null;
    for (const o of objs.filter(o => o.type === 'npc')) {
      const at = this.npcMapOf(o.name);
      if (!at || at === this.mapKey) {
        const npc = this.spawnNpc(o.name, o.x, o.y, propOf(o, 'patrol'));
        // tư thế: ngồi (ghế, bàn) và hướng nhìn mặc định; nhóm trò chuyện
        if (propOf(o, 'pose') === 'sit') npc.pose = 'sit';
        if (propOf(o, 'face')) npc.restDir = propOf(o, 'face');
        npc.chat = propOf(o, 'chat') || null;
        npc.rest();
      }
    }
    this.buildChats();
    for (const id of Object.keys(data.npcs.stations || {})) {
      if (this.npcMapOf(id) === this.mapKey && !this.npcs.has(id)) this.spawnNpc(id, 0, 0, null);
    }

    // Gợi ý tương tác (phím E / nút A)
    const key = window.matchMedia('(pointer: coarse)').matches ? 'A' : 'E';
    const bg = this.add.rectangle(0, 0, 18, 18, 0xf4eedc).setStrokeStyle(2, 0x0f0e17);
    const label = this.add.text(0, 0, key, { fontFamily: 'VT323', fontSize: '18px', color: '#0f0e17' }).setOrigin(0.5);
    this.prompt = this.add.container(0, 0, [bg, label]).setDepth(100000).setVisible(false);

    // Camera
    const cam = this.cameras.main;
    cam.startFollow(this.player.view, true, 0.2, 0.2);

    // Nháy chuột / chạm vào nền để đi tới; vào người / đồ vật thì đi tới rồi tương tác (Cài đặt → tắt được)
    this.walkPath = null;
    this.grid = null;
    this.input.on('pointerdown', p => this.onClick(p));
    cam.setRoundPixels(true);
    this.fitCamera();
    this.scale.on('resize', () => this.fitCamera());

    this.mapMusic = propOf({ properties: map.properties }, 'music');
    playMusic(this.mapMusic);
    this.lastSave = 0;
    this.stepIn = 0;
    this.ambIn = 0;
    // mép nước gần nhất (để nghe tiếng sóng) và trục đường (tiếng xe)
    let waterY = Infinity;
    this.ground.forEachTile(t => { if (t.properties?.name === 'water' && t.pixelY < waterY) waterY = t.pixelY; });
    this.waterY = waterY;
    const lanes = objs.filter(o => o.type === 'lane');
    this.laneYs = lanes.map(o => o.y + o.height / 2);
    this.leaving = false;
    this.zoneKey = null;
    if (!state.settings.reduceMotion) cam.fadeIn(250, 15, 14, 23);
    this.target = null;
    this.inShot = false;
    document.body.classList.remove('is-cine');
    buildGraph(this, MAPS);
    this.guide = new GuideArrow(this);
    this.traffic = objs.some(o => o.type === 'lane') ? new Traffic(this, objs, this.player) : null;
    this.weather = new Weather(this, () => [...this.groundRTs, ...this.wallImgs, ...this.views.views(), ...this.props.map(p => p.img), ...this.propExtras],
      () => this.propLights);
    this.occluders = [...this.wallImgs.filter(w => w.tall), ...this.props.filter(p => !p.meta.flat && !p.meta.wall).flatMap(p => p.parts || [p.img])];
    this.reduceMotion = state.settings.reduceMotion;
    story.setWorld(this);
    this.refresh();
    if (state.progress.introBus && this.points.spawn_bus) this.busIntro();
    else if (this.mapKey === 'home') this.time.delayedCall(500, () => journey.wakeUp());
  }

  /**
   * Cảnh mở đầu lượt mới: xe buýt chạy vào trạm trước Trụ sở Báo Thanh Niên, nhân vật xuống xe, xe đi tiếp.
   * Bấm chuột / phím bất kỳ để bỏ qua. Chế độ giảm chuyển động: bỏ qua luôn.
   */
  busIntro() {
    const done = () => {
      if (!this.cutscene) return;
      this.cutscene = false;
      this.tweens.killTweensOf(this.player);
      // xe buýt đang chạy đi thì để nó chạy hết; bỏ qua cảnh thì xóa luôn
      if (!leaving) { this.tweens.killTweensOf(bus); bus.destroy(); }
      bars.forEach(b => b.destroy());
      cap.destroy();
      this.player.view.setAlpha(1);
      this.player.body.reset(spawn.x, spawn.y);
      this.cameras.main.startFollow(this.player.view, true, 0.2, 0.2);
      delete state.progress.introBus;
      this.savePos();
      window.removeEventListener('keydown', skip);
      journey.onArrive(this.mapKey);
    };
    let leaving = false;
    const skip = () => done();
    const spawn = this.points.spawn_bus || { x: this.player.x, y: this.player.y };
    if (this.reduceMotion) { delete state.progress.introBus; saveProgress(); journey.onArrive(this.mapKey); return; }
    this.cutscene = true;
    // xe buýt diễn: chạy làn đông sát vỉa hè nam (cửa xe quay về vỉa hè), dừng để cửa xuống (giữa thân) ngay trước trạm
    const lane = this.traffic?.lanes.find(l => l.dir > 0 && Math.abs(l.bottom - spawn.y) < 100);
    const by = lane ? lane.bottom - 4 : spawn.y - 50;
    const stopX = spawn.x + 120 - BUS_MID_DOOR;
    const bus = this.add.sprite(stopX - 900, by, 'bus').setOrigin(0.5, 1);
    this.views.add(bus, { isoTex: { key: 'bus_e', ...busIso(this) } });
    // dọn xe cùng làn để không chồng lên xe buýt
    if (lane) this.traffic.cars.filter(c => c.lane === lane).forEach(c => { c.sprite.destroy(); });
    if (lane) this.traffic.cars = this.traffic.cars.filter(c => c.lane !== lane);
    this.player.view.setAlpha(0);
    this.player.body.reset(spawn.x, by - 2);
    const cam = this.cameras.main;
    cam.startFollow(bus.view, true, 0.08, 0.08);
    // khung điện ảnh + dòng chú thích
    const { width: w, height: h } = this.scale;
    const bars = [this.add.rectangle(0, 0, w, 54, 0x05060a).setOrigin(0), this.add.rectangle(0, h - 54, w, 54, 0x05060a).setOrigin(0)];
    bars.forEach(b => b.setScrollFactor(0).setDepth(200000));
    const cap = this.add.text(w / 2, h - 27, data.quests.journey.bus.arrive[this.mapKey] || '', { fontFamily: 'VT323', fontSize: '22px', color: '#e8ecf2', align: 'center' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(200001);
    this.time.delayedCall(400, () => window.addEventListener('keydown', skip, { once: true }));
    this.input.once('pointerdown', skip);
    this.tweens.add({
      targets: bus, x: stopX, duration: 4200, ease: 'Sine.easeOut',
      onComplete: () => {
        if (!this.cutscene) return;
        sfx('ding');
        // cửa giữa mở, nhân vật bước xuống vỉa hè, cửa đóng rồi xe chạy tiếp
        bus.view.setTexture('bus_e_open');
        sfx('door');
        this.player.view.setAlpha(1);
        cam.startFollow(this.player.view, true, 0.1, 0.1);
        this.player.anims.play('hero-walk-down', true);
        this.tweens.add({
          targets: this.player, y: spawn.y, x: spawn.x, duration: 900, delay: 500,
          onComplete: () => {
            if (!this.cutscene) return;
            this.player.anims.stop();
            this.facing = 'down';
            this.player.setFrame(idleFrame('down'));
            leaving = true;
            this.time.delayedCall(400, () => bus.active && bus.view?.setTexture('bus_e'));
            this.tweens.add({ targets: bus, x: this.map.widthInPixels + 400, duration: 5200, delay: 900, ease: 'Sine.easeIn', onComplete: () => bus.destroy() });
            this.time.delayedCall(1800, done);
          }
        });
      }
    });
  }

  /**
   * Cảnh đón xe khách ở trạm: xe chạy tới, khi xe vào gần thì bấm E / A (hoặc chạm) để vẫy. Vẫy kịp: xe dừng, nhân vật lên xe,
   * xe chạy đi rồi gọi onBoard(). Lỡ nhịp: xe chạy qua, chuyến sau tới (không phạt). Giảm chuyển động: lên xe luôn.
   */
  hailBus(onBoard) {
    const spawn = this.points.spawn_bus;
    if (!spawn || this.cutscene) return;
    if (this.reduceMotion) { onBoard(); return; }
    const J = data.quests.journey.bus;
    this.cutscene = true;
    this.walkPath = null;
    this.player.setVelocity(0, 0);
    this.player.body.reset(spawn.x, spawn.y);
    this.facing = 'up';
    this.player.anims.stop();
    this.player.setFrame(idleFrame('up'));
    // xe tới từ phía tây trên làn đông sát vỉa hè; dừng để cửa lên (đầu xe) ngay trước chỗ người chơi đứng
    const lane = this.traffic?.lanes.find(l => l.dir > 0 && Math.abs(l.bottom - spawn.y) < 100);
    const by = lane ? lane.bottom - 4 : spawn.y - 50;
    const stopX = spawn.x + 120 - BUS_FRONT_DOOR;
    if (lane) { this.traffic.cars.filter(c => c.lane === lane).forEach(c => c.sprite.destroy()); this.traffic.cars = this.traffic.cars.filter(c => c.lane !== lane); }
    const { width: w, height: h } = this.scale;
    const bars = [this.add.rectangle(0, 0, w, 54, 0x05060a).setOrigin(0), this.add.rectangle(0, h - 54, w, 54, 0x05060a).setOrigin(0)];
    bars.forEach(b => b.setScrollFactor(0).setDepth(200000));
    const cap = this.add.text(w / 2, h - 27, J.wait, { fontFamily: 'VT323', fontSize: '22px', color: '#e8ecf2', align: 'center' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(200001);
    const say = (text, color = '#e8ecf2') => cap.setText(text).setColor(color);
    let bus = null, near = false, hailed = false, tw = null;
    const tap = () => this.hailFn?.();
    this.input.on('pointerdown', tap);
    const cleanup = () => {
      this.hailFn = null;
      this.input.off('pointerdown', tap);
      bars.forEach(b => b.destroy());
      cap.destroy();
    };
    const board = () => {
      say(J.stop, '#7fe3ff');
      // cửa trước mở, nhân vật bước lên bậc cửa, cửa đóng, xe chạy về phía đông
      bus.view.setTexture('bus_e_open');
      sfx('door');
      this.player.anims.play('hero-walk-up', true);
      this.tweens.add({
        targets: this.player, x: spawn.x, y: by + 2, duration: 800, delay: 400,
        onComplete: () => {
          this.player.anims.stop();
          this.player.view.setAlpha(0);
          this.time.delayedCall(350, () => { if (bus?.active) bus.view.setTexture('bus_e'); sfx('door'); });
          this.cameras.main.startFollow(bus.view, true, 0.08, 0.08);
          this.tweens.add({ targets: bus, x: stopX + 900, duration: 3000, delay: 700, ease: 'Sine.easeIn' });
          // fade(..., force): camera còn giữ trạng thái "đã xong" của lần sáng dần lúc vào bản đồ, fadeOut thường sẽ bị bỏ qua
          let left = false;
          const leave = () => { if (left) return; left = true; cleanup(); this.cutscene = false; onBoard(); };
          this.time.delayedCall(1800, () => {
            this.cameras.main.fade(500, 5, 6, 10, true);
            this.time.delayedCall(650, leave);
          });
        }
      });
    };
    this.hailFn = () => {
      if (hailed || !bus) return;
      if (!near) { say(J.early, '#a3adbf'); return; }
      hailed = true;
      sfx('ding');
      this.emote?.('hero', '!');
      tw?.stop();
      this.tweens.add({ targets: bus, x: stopX, duration: Math.max(500, (stopX - bus.x) * 2.2), ease: 'Sine.easeOut', onComplete: board });
    };
    const run = () => {
      near = false;
      bus = this.add.sprite(stopX - 1000, by, 'bus').setOrigin(0.5, 1);
      this.views.add(bus, { isoTex: { key: 'bus_e', ...busIso(this) } });
      say(J.wait);
      tw = this.tweens.add({
        targets: bus, x: stopX + 900, duration: 6200,
        onUpdate: () => {
          const n = bus.x > stopX - 460 && bus.x < stopX - 30;
          if (n !== near) { near = n; say(n ? J.now : J.wait, n ? '#ffc857' : '#e8ecf2'); }
        },
        onComplete: () => {
          if (hailed) return;
          say(J.missed, '#ff8a8a');
          bus.destroy();
          bus = null;
          this.time.delayedCall(1400, run);
        }
      });
    };
    this.time.delayedCall(600, run);
  }

  /** Lưu vị trí hiện tại (bản đồ, toạ độ, hướng nhìn). */
  savePos() {
    state.progress.pos = { map: this.mapKey, x: Math.round(this.player.x), y: Math.round(this.player.y), dir: this.facing, v: MAP_VERSION };
    saveProgress();
  }

  /** Chuyển sang bản đồ khác, xuất hiện ở điểm spawn. */
  travel(target, spawn, dir) {
    if (this.leaving) return;
    this.leaving = true;
    this.player.setVelocity(0, 0);
    sfx('door');
    state.progress.pos = { map: target, spawnName: spawn };
    saveProgress();
    const go = () => this.scene.restart({ map: target, spawn, dir: dir || (CITY_MAPS.has(target) ? 'down' : 'up') });
    if (state.settings.reduceMotion) { go(); return; }
    this.cameras.main.fadeOut(250, 15, 14, 23);
    this.cameras.main.once('camerafadeoutcomplete', go);
  }

  /** Âm thanh môi trường theo thời tiết và vị trí: mưa, gió, sóng gần mặt nước, xe gần đường. */
  updateAmbience(delta) {
    const kind = this.weather?.kind;
    const out = this.weather?.outdoor;
    const near = (d, range) => Math.max(0, Math.min(1, 1 - d / range));
    setAmbience({
      rain: kind === 'rain' ? (out ? 1 : 0.55) : 0,
      wind: kind === 'fog' ? (out ? 0.9 : 0.25) : out ? 0.2 : 0,
      waves: out && this.waterY < Infinity ? near(Math.max(0, this.waterY - this.player.y), 520) : 0,
      traffic: this.laneYs.length ? near(Math.min(...this.laneYs.map(y => Math.abs(this.player.y - y))), 380) * Math.min(1, (this.traffic?.cars.length || 0) / 4) : 0,
      indoor: !out
    }, delta);
  }

  /** Bong bóng biểu cảm trên đầu nhân vật chính ('hero') hoặc một NPC. */
  emote(who, ch) {
    if (who === 'hero') showEmote(this, this.player.view, ch);
    else { const npc = this.npcs.get(who); if (npc) showEmote(this, npc.sprite.view || npc.sprite, ch); }
  }

  /**
   * Đồ / chữ gắn trên tường bắc: cắt thành cột rộng 32 px, mỗi cột có độ sâu ngay trên khối tường cùng cột,
   * nên không bao giờ che người đứng trước tường. make() tạo một bản (ảnh hoặc chữ) đã đặt vị trí; lx, ly: toạ độ logic.
   */
  sliceOnWall(make, lx, ly, leftLX = null) {
    // hàng tường trước cùng của cột này (ô tường cuối cùng trước khi gặp sàn): đồ dán lên mặt nam của nó
    const tx = Math.max(0, Math.min(this.map.width - 1, Math.floor(lx / 32)));
    let ty = Math.max(0, Math.floor(ly / 32));
    while (ty < this.map.height && this.walls.getTileAt(tx, ty)) ty++;
    const faceY = ty * 32;
    const lift = Math.max(0, faceY - ly) * (WALL_H / 64); // độ cao trên tường (tường 2 ô ≈ WALL_H px)
    const p = iso.P(lx, faceY);
    const first = make(p.x, p.y - lift);
    const w = first.width;
    // ảnh cắt xiên: 1 px ngang trên màn hình = 1 px logic dọc tường; mép trái ứng với leftLX
    const left = leftLX ?? lx - w * first.originX;
    // cắt đúng ranh giới ô (mỗi phần nằm gọn trên mặt của một khối tường, độ sâu ngay trên khối đó)
    const parts = [];
    for (let cx = 0; cx < w;) {
      const lxAt = left + cx;
      const next = Math.min(w, (Math.floor(lxAt / 32) + 1) * 32 - left);
      const o = cx === 0 ? first : make(p.x, p.y - lift);
      o.setCrop(cx, 0, next - cx, o.height);
      o.setDepth(iso.depth(Math.floor(lxAt / 32) * 32 + 16, faceY - 16) + 2);
      parts.push(o);
      cx = next;
    }
    return parts;
  }


  /** Zoom nguyên lần để pixel đều; thấy khoảng 20x11 ô trên màn hình lớn. */
  fitCamera() {
    const { width, height } = this.scale;
    const cam = this.cameras.main;
    // ô thoi rộng 64 px: zoom theo bước 0,5 để vẫn nét
    cam.setZoom(Math.max(1, Math.floor(Math.min(width / 900, height / 500) * 2) / 2));
    // phòng nhỏ hơn khung hình: nới biên đều hai phía để phòng nằm giữa màn hình (không dồn sang trái / lên trên)
    const vw = width / cam.zoom, vh = height / cam.zoom;
    const bw = this.isoSize.width, bh = this.isoSize.height + 560;
    const bx = Math.min(0, (bw - vw) / 2), by = Math.min(-480, -480 + (bh - vh) / 2);
    cam.setBounds(bx, by, Math.max(bw, vw), Math.max(bh, vh));
  }

  /** Các ô của lớp cửa nằm trong một object (để gỡ / đặt lại khi khóa mở). */
  tilesIn(o) {
    const list = [];
    const x0 = Math.floor(o.x / 32), y0 = Math.floor(o.y / 32);
    for (let ty = y0; ty < y0 + Math.round(o.height / 32); ty++) {
      for (let tx = x0; tx < x0 + Math.round(o.width / 32); tx++) {
        const tile = this.doors.getTileAt(tx, ty);
        if (tile) list.push({ tx, ty, index: tile.index });
      }
    }
    return list;
  }

  /** Phòng (hồ sơ) của khu vực người chơi đang đứng (lúc mới vào bản đồ: khu vực ở điểm xuất hiện), hoặc null. */
  zoneRoom() {
    if (this.zoneKey == null) return this.spawnZoneRoom || null;
    return propOf(this.zones?.find(z => z.name === this.zoneKey) || {}, 'room') || null;
  }

  /**
   * Nhóm NPC trò chuyện với nhau (object npc có thuộc tính chat cùng mã): quay mặt vào nhau, thỉnh thoảng bật câu nói ngắn.
   * Nhóm có dữ liệu nghe lén (npc_dialogues.json → chats[mã].eavesdrop) hiện dấu "…" xanh khi chưa nghe; đứng gần
   * (không sát) rồi bấm E để nghe lén (story.eavesdrop).
   */
  buildChats() {
    const groups = new Map();
    this.npcs.forEach((npc, id) => { if (npc.chat) { if (!groups.has(npc.chat)) groups.set(npc.chat, []); groups.get(npc.chat).push(id); } });
    this.chats = [...groups].map(([id, members]) => {
      const sp = members.map(m => this.npcs.get(m).sprite);
      const cx = sp.reduce((a, s) => a + s.x, 0) / sp.length, cy = sp.reduce((a, s) => a + s.y, 0) / sp.length;
      members.forEach(m => {
        const npc = this.npcs.get(m);
        const other = members.find(o => o !== m);
        if (!npc.restDir && other) { const o = this.npcs.get(other).sprite; npc.restAt = { x: o.x, y: o.y }; }
        npc.rest();
      });
      const info = data.npcs.chats?.[id] || {};
      const p = iso.P(cx, cy);
      const mark = this.add.text(p.x, p.y - 84, '…', { fontFamily: 'VT323', fontSize: '28px', color: '#7fe3ff', stroke: '#0f0e17', strokeThickness: 4 })
        .setOrigin(0.5, 1).setDepth(100000).setVisible(false);
      return { id, members, x: cx, y: cy, info, mark, bubbleIn: 1500 + Math.random() * 2000, turn: 0 };
    });
  }

  /** Nhóm còn chờ được nghe lén (chưa nghe, đủ điều kiện cờ). */
  canEavesdrop(g) {
    const e = g.info.eavesdrop;
    return !!e && !hasFlag(`heard_${g.id}`) && (e.requires || []).every(hasFlag) && g.members.every(m => !this.npcs.get(m)?.talking);
  }

  /** Câu nói ngắn luân phiên trong nhóm trò chuyện (chỉ khi người chơi ở gần). */
  updateChats(delta, frozen) {
    for (const g of this.chats || []) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, g.x, g.y);
      g.mark.setVisible(!frozen && this.canEavesdrop(g) && d < 360);
      if (g.mark.visible && !this.reduceMotion) g.mark.setY(iso.P(g.x, g.y).y - 84 + Math.round(Math.sin(this.time.now / 260) * 2));
      if (frozen || d > 420) continue;
      g.bubbleIn -= delta;
      if (g.bubbleIn > 0) continue;
      g.bubbleIn = 2600 + Math.random() * 1800;
      const who = this.npcs.get(g.members[g.turn++ % g.members.length]);
      const lines = g.info.bubbles || data.npcs.chatBubbles || ['…'];
      if (who && !who.talking) showEmote(this, who.sprite.view || who.sprite, Phaser.Utils.Array.GetRandom(lines), 2000, true);
    }
  }

  /**
   * Góc máy cho cảnh đặc biệt: thôi bám theo nhân vật, lia và đẩy cận vào trung tâm các mục tiêu ('hero', mã NPC hoặc
   * điểm logic {x, y}), hiện hai dải đen điện ảnh. Trả về hàm trả góc máy về như cũ (Promise). Giảm chuyển động: bỏ qua.
   */
  shot(targets, { zoom = 1.5, dur = 700, lift = 24 } = {}) {
    const cam = this.cameras.main;
    const done = () => Promise.resolve();
    if (this.reduceMotion || this.inShot) return done;
    const pts = targets.map(tg => tg === 'hero' ? this.player : typeof tg === 'string' ? this.npcs.get(tg)?.sprite : tg).filter(Boolean);
    if (!pts.length) return done;
    const lx = pts.reduce((a, s) => a + s.x, 0) / pts.length, ly = pts.reduce((a, s) => a + s.y, 0) / pts.length;
    const p = iso.P(lx, ly);
    const base = cam.zoom;
    this.inShot = true;
    document.body.classList.add('is-cine');
    cam.stopFollow();
    cam.pan(p.x, p.y - lift, dur, 'Sine.easeInOut');
    cam.zoomTo(base * zoom, dur, 'Sine.easeInOut');
    return () => new Promise(resolve => {
      document.body.classList.remove('is-cine');
      if (!this.scene.isActive()) { resolve(); return; }
      const pv = this.player.view;
      cam.zoomTo(base, dur * 0.8, 'Sine.easeInOut');
      cam.pan(pv.x, pv.y, dur * 0.8, 'Sine.easeInOut', true, (c, prog) => {
        if (prog < 1) return;
        cam.startFollow(pv, true, 0.2, 0.2);
        this.inShot = false;
        resolve();
      });
    });
  }

  /** Tạo NPC trên bản đồ hiện tại (vị trí theo trạm nếu có). */
  spawnNpc(id, x, y, homePatrol) {
    const npc = new Npc(this, id, x, y);
    npc.ambient = !!data.npcs.ambientLines?.[id];
    npc.chaser = !!data.npcs.npcs.find(n => n.id === id)?.rumor;
    npc.homePatrol = homePatrol;
    if (id === 'boss') npc.marker.setVisible(false);
    // tên trên đầu (trừ Kẻ Dệt Chuyện: fanpage ẩn danh, không có hình trên bản đồ)
    const info = data.npcs.npcs.find(n => n.id === id);
    if (info && id !== 'boss') npc.tag = nameTag(this, info.name, npc.chaser ? 'rumor' : id.startsWith('amb_') ? 'amb' : 'story');
    if (this.weather?.lit) npc.sprite.setPipeline('Light2D');
    this.npcs.set(id, npc);
    npc.collider = this.physics.add.collider(this.player, npc.sprite);
    this.views.add(npc.sprite);
    // Kẻ Dệt Chuyện là fanpage ẩn danh: không có hình người trên bản đồ, chỉ hiện trên màn hình (chân dung trong khung thoại)
    if (id === 'boss') npc.sprite.view.setVisible(false);
    this.placeNpc(id);
    return npc;
  }

  /** Bỏ NPC khỏi bản đồ hiện tại (khi họ chuyển sang tầng khác). */
  removeNpc(id) {
    const npc = this.npcs.get(id);
    if (!npc) return;
    npc.collider?.destroy();
    npc.sprite.destroy();
    npc.marker.destroy();
    npc.tag?.destroy();
    this.npcs.delete(id);
  }

  /**
   * Bản đồ (tầng) NPC đang đứng theo trạm có `map`, hoặc null nếu NPC chỉ theo object của bản đồ.
   * preferTracked: ưu tiên phòng của hồ sơ đang theo dõi (để dẫn đường tới nơi NPC sẽ đứng).
   */
  npcMapOf(id, preferTracked = false) {
    const list = data.npcs.stations?.[id];
    if (!Array.isArray(list) || !list.some(s => s.map)) return null;
    return this.stationFor(id, preferTracked)?.map || null;
  }

  /**
   * Trạm của NPC (data.npcs.stations): mục có cờ bắt buộc và không gắn phòng thắng trước;
   * rồi tới mục gắn phòng người chơi đang đứng, phòng của hồ sơ đang theo dõi; cuối cùng mục mặc định.
   */
  stationFor(id, preferTracked = false) {
    const all = data.npcs.stations?.[id];
    if (!Array.isArray(all)) return null;
    const list = all.filter(s => (s.requires || []).every(hasFlag));
    const forced = list.find(s => s.requires?.length && !s.room);
    if (forced) return forced;
    const rooms = preferTracked ? [story.trackedRoom(), this.zoneRoom()] : [this.zoneRoom(), story.trackedRoom()];
    for (const room of rooms) {
      const s = room && list.find(x => x.room === room);
      if (s) return s;
    }
    return list.find(s => !s.room) || null;
  }

  /** Đặt NPC theo trạm hiện tại hoặc vị trí gốc trên bản đồ. */
  placeNpc(id) {
    const npc = this.npcs.get(id);
    const st = this.stationFor(id);
    npc.stationKey = st?.station || 'home';
    if (st && this.points[st.station]) {
      npc.teleport(this.points[st.station]);
      npc.patrol(this.paths[st.patrol]);
    } else {
      npc.patrol(this.paths[npc.homePatrol]);
    }
  }

  /** NPC chuyển sang trạm mới khi tiến độ đổi (trừ khi đang dẫn đường hoặc đang nói chuyện). */
  updateStations() {
    // NPC đổi tầng: xuất hiện / rời khỏi bản đồ hiện tại
    for (const id of Object.keys(data.npcs.stations || {})) {
      const at = this.npcMapOf(id);
      if (!at) continue;
      if (at === this.mapKey && !this.npcs.has(id)) this.spawnNpc(id, 0, 0, null);
      else if (at !== this.mapKey && this.npcs.has(id) && !this.npcs.get(id).talking) this.removeNpc(id);
    }
    this.npcs.forEach((npc, id) => {
      if (npc.mode === 'lead' || npc.talking) return;
      if ((this.stationFor(id)?.station || 'home') !== npc.stationKey) this.placeNpc(id);
    });
  }

  /** Cập nhật cửa phòng và dấu ! sau mỗi thay đổi tiến độ. */
  refresh() {
    for (const d of this.doorObjs) {
      const st = roomStatus(d.room, state.progress.flags);
      const open = st === 'open' || st === 'done';
      d.status = st;
      for (const { tx, ty, index } of d.tiles) {
        if (open) this.doors.removeTileAt(tx, ty);
        else if (!this.doors.getTileAt(tx, ty)) this.doors.putTileAt(index, tx, ty);
      }
    }
    this.doors.setCollisionByProperty({ collides: true });
    this.grid = null; // cửa đổi trạng thái: dựng lại lưới tìm đường khi cần
    this.updateStations();
    // Dấu trên đầu NPC: vàng "!" = có việc; xanh "▼" = người giao hồ sơ đang theo dõi.
    const tgt = story.trackTarget();
    const trackedNpc = tgt?.kind === 'npc' ? tgt.id : null;
    this.npcs.forEach((npc, id) => {
      const isTracked = id === trackedNpc;
      npc.marker.setText(isTracked ? '▼' : '!').setColor(isTracked ? '#7fe3ff' : '#f2d36b');
      npc.marker.setVisible(id !== 'boss' && (isTracked || story.hasStoryFor(id)));
    });
    const tt = story.trackTarget();
    this.devices.forEach(d => {
      const isTracked = tt?.kind === 'device' && tt.id === d.id;
      d.marker.setText(isTracked ? '▼' : '!').setColor(isTracked ? '#7fe3ff' : '#f2d36b');
      d.marker.setVisible(!!story.questForDevice(d.id));
    });
    this.decoys?.forEach(d => d.marker.setVisible(!hasFlag(`seen_${d.id}`) && caseOpen(data.npcs.decoys?.[d.id]?.room)));
    updateMeters();
    updateTrackLine();
  }

  /** Toạ độ màn hình (isometric) → toạ độ logic trên nền. */
  toLogical(X, Y) {
    const a = X - iso.ox;
    return { x: (a + 2 * Y) / 2, y: (2 * Y - a) / 2 };
  }

  /** Thứ có thể tương tác tại điểm bấm (cùng dạng với findTarget), hoặc null. */
  clickTarget(X, Y, lx, ly) {
    let hit = null;
    this.npcs.forEach((npc, id) => {
      const v = npc.sprite.view;
      if (!hit && v?.visible && v.getBounds().contains(X, Y)) hit = { kind: 'npc', id, x: npc.sprite.x, y: npc.sprite.y };
    });
    if (hit) return hit;
    const PAD = 14;
    const at = (o, extra) => ({ x: o.x + o.width / 2, y: o.y + o.height, ...extra });
    const lift = this.elevators.find(o => inRect(o, lx, ly, PAD));
    if (lift) return at(lift, { kind: 'elevator' });
    const dev = this.devices.find(d => inRect(d.obj, lx, ly, PAD));
    if (dev) return at(dev.obj, { kind: 'device', id: dev.id });
    const dc = this.decoys.find(d => inRect(d.obj, lx, ly, PAD));
    if (dc) return at(dc.obj, { kind: 'decoy', id: dc.id });
    const spot = this.spots.find(o => inRect(o, lx, ly, PAD));
    if (spot) return at(spot, { kind: 'spot', obj: spot });
    const ins = this.inspects.find(o => inRect(o, lx, ly, 4));
    if (ins) return at(ins, { kind: 'inspect', key: propOf(ins, 'text') });
    const portal = this.portals.find(o => inRect(o, lx, ly, PAD));
    if (portal) return at(portal, { kind: 'portal', portal });
    return null;
  }

  /** Người chơi nháy chuột / chạm vào bản đồ. */
  onClick(p) {
    if (state.settings.clickMove === false || this.leaving || this.cutscene || (story.isBusy() && !dlg.isMinimized()) || window.uiBlocked?.()) return;
    const { x: lx, y: ly } = this.toLogical(p.worldX, p.worldY);
    const goal = this.clickTarget(p.worldX, p.worldY, lx, ly);
    // đi tới trước mặt đồ vật (phía nam vùng tương tác), tới cạnh NPC
    const dest = goal ? { x: goal.x, y: goal.kind === 'npc' ? goal.y + 20 : goal.y + 14 } : { x: lx, y: ly };
    this.grid ||= buildGrid(this.map, [this.walls, this.doors], this.propBodies.getChildren().map(b => b.body));
    const path = findPath(this.grid, this.player.x, this.player.y, dest.x, dest.y);
    this.showClickMark(dest, !!path);
    if (!path) { this.walkPath = null; return; }
    this.walkPath = path;
    this.walkGoal = goal;
    this.walkBest = Infinity;
    this.walkCheck = this.time.now;
  }

  /** Dấu nhỏ ở điểm đến (đỏ = không tới được). */
  showClickMark(d, ok) {
    const q = iso.P(d.x, d.y);
    const g = this.add.ellipse(q.x, q.y, 22, 11).setStrokeStyle(2, ok ? 0xf2d36b : 0xc8323c).setDepth(-4);
    this.tweens.add({ targets: g, scale: 0.4, alpha: 0, duration: 550, onComplete: () => g.destroy() });
  }

  /** Đi theo đường đã tìm: trả về hướng màn hình (x, y) cho khung hình này, hoặc null khi xong / kẹt. */
  followPath(time) {
    const p = this.player;
    const g = this.walkGoal;
    // tới gần thứ cần tương tác: dừng, quay mặt, tương tác
    if (g && Phaser.Math.Distance.Between(p.x, p.y, g.x, g.y) < (g.kind === 'npc' ? 34 : 26)) return this.arriveGoal();
    let wp = this.walkPath[0];
    if (Math.hypot(wp.x - p.x, wp.y - p.y) < 5) {
      this.walkPath.shift();
      if (!this.walkPath.length) return this.arriveGoal();
      wp = this.walkPath[0];
    }
    // kẹt (NPC, xe chắn đường): bỏ
    const left = this.walkPath.reduce((s, w, i, a) => s + (i ? Math.hypot(w.x - a[i - 1].x, w.y - a[i - 1].y) : Math.hypot(w.x - p.x, w.y - p.y)), 0);
    if (left < this.walkBest - 4) { this.walkBest = left; this.walkCheck = time; }
    else if (time - this.walkCheck > 900) { this.walkPath = null; return null; }
    const sd = iso.toScreenDir(wp.x - p.x, wp.y - p.y);
    const l = Math.hypot(sd.x, sd.y) || 1;
    return { x: sd.x / l, y: sd.y / l };
  }

  /** Tới nơi: nếu bấm vào người / đồ vật thì quay mặt về đó và tương tác. */
  arriveGoal() {
    const g = this.walkGoal;
    this.walkPath = null;
    this.walkGoal = null;
    if (!g) return null;
    const sd = iso.toScreenDir(g.x - this.player.x, g.kind === 'npc' ? g.y - this.player.y : -1);
    this.facing = dirFrom(sd.x, sd.y);
    this.player.setFrame(idleFrame(this.facing));
    this.target = g;
    this.interact();
    return null;
  }

  /** Kẻ tung tin bắt kịp người chơi. */
  onCaught(id) {
    if (story.isBusy() || window.uiBlocked?.()) return;
    story.rumorEncounter(id);
  }

  /** Kẻ tung tin được đuổi theo không (chế độ Nhẹ: không). */
  canChase() { return !isLight(); }

  /** Hiệu ứng thời tiết đang có ở bản đồ này (trong nhà: không có). */
  fx() { return WEATHER_FX[this.weather?.dark ? 'night' : this.weather?.kind] || WEATHER_FX.clear; }

  /** Xong lượt gặp kẻ tung tin: một lúc sau mới đuổi tiếp. */
  rumorDone(id) {
    const npc = this.npcs.get(id);
    if (npc) npc.cool = 25000;
  }

  /** Người chơi đi giữa làn xe (không ở vạch kẻ) bị xe hất về mép đường gần nhất. */
  knockback(toY) {
    if (this.time.now < (this.stunUntil || 0)) return;
    this.stunUntil = this.time.now + 700;
    this.player.body.reset(this.player.x, toY);
    this.player.setVelocity(0, 0);
    this.cameras.main.shake(180, 0.006);
    sfx('wrong');
    if (this.time.now > (this.carHitToast || 0)) { this.carHitToast = this.time.now + 8000; toastLater(t('obstacles.carHit')); }
  }

  /** Bắt đầu / kết thúc trò chuyện: NPC dừng và quay mặt về người chơi, người chơi nhìn NPC. */
  setTalking(id, talking) {
    const npc = this.npcs.get(id);
    if (!npc) return;
    npc.talking = talking;
    if (!talking) { npc.rest(); return; }
    if (talking) {
      npc.face(this.player.x, this.player.y);
      const d = iso.toScreenDir(npc.sprite.x - this.player.x, npc.sprite.y - this.player.y);
      this.facing = dirFrom(d.x, d.y);
      this.player.setFrame(idleFrame(this.facing));
    }
  }

  /** NPC đi trước dẫn đường, tới nơi thì đứng ở trạm của mình. */
  npcLead(id, pathName) {
    const npc = this.npcs.get(id);
    const route = this.paths[pathName];
    if (!npc || !route) return;
    npc.teleport(route[0]);
    npc.lead(route, () => { this.placeNpc(id); this.refresh(); });
  }

  /** Thứ người chơi đang nhìn vào (NPC, đồ vật, cửa). */
  findTarget() {
    // điểm phía trước theo hướng nhìn trên màn hình, đổi về toạ độ logic (đi chéo vẫn trúng)
    const sd = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[this.facing];
    const ld = iso.toLogicalDir(sd[0], sd[1]);
    const len = Math.hypot(ld.x, ld.y) || 1;
    const fx = this.player.x + (ld.x / len) * 20, fy = this.player.y - 6 + (ld.y / len) * 20;
    let best = null, bestD = Infinity;
    // kết quả mang toạ độ logic (x, y); gợi ý E được chiếu khi vẽ
    this.npcs.forEach((npc, id) => {
      const big = npc.sprite.scale > 1; // boss to hơn: tầm nói chuyện rộng hơn
      const d = Phaser.Math.Distance.Between(fx, fy, npc.sprite.x, npc.sprite.y - 6);
      if (d < (big ? 70 : 40) && d < bestD) { best = { kind: 'npc', id, x: npc.sprite.x, y: npc.sprite.y, lift: big ? 84 : 58 }; bestD = d; }
    });
    if (best) return best;
    // nhóm đang trò chuyện ở gần (không sát): nghe lén
    const g = (this.chats || []).find(g => this.canEavesdrop(g) && Phaser.Math.Distance.Between(this.player.x, this.player.y, g.x, g.y) < 120);
    if (g) return { kind: 'eaves', id: g.id, x: g.x, y: g.y, lift: 112 };
    const PAD = 10;
    const lift = this.elevators.find(o => inRect(o, fx, fy, PAD));
    if (lift) return { kind: 'elevator', x: lift.x + lift.width / 2, y: lift.y + lift.height, lift: 70 };
    const dev = this.devices.find(d => inRect(d.obj, fx, fy, PAD));
    if (dev) return { kind: 'device', id: dev.id, x: dev.obj.x + dev.obj.width / 2, y: dev.obj.y + dev.obj.height, lift: 50 };
    const dc = this.decoys.find(d => inRect(d.obj, fx, fy, PAD));
    if (dc) return { kind: 'decoy', id: dc.id, x: dc.obj.x + dc.obj.width / 2, y: dc.obj.y + dc.obj.height, lift: 36 };
    const spot = this.spots.find(o => inRect(o, fx, fy, PAD));
    if (spot) return { kind: 'spot', obj: spot, x: spot.x + spot.width / 2, y: spot.y + spot.height, lift: 50 };
    const ins = this.inspects.find(o => inRect(o, fx, fy, PAD));
    if (ins) return { kind: 'inspect', key: propOf(ins, 'text'), x: ins.x + ins.width / 2, y: ins.y + ins.height, lift: 40 };
    const door = this.doorObjs.find(d => inRect(d.obj, fx, fy, PAD) && d.status !== 'open' && d.status !== 'done');
    if (door) return { kind: 'door', door, x: door.obj.x + door.obj.width / 2, y: door.obj.y + door.obj.height, lift: 40 };
    const portal = this.portals.find(o => inRect(o, fx, fy, PAD));
    if (portal) return { kind: 'portal', portal, x: portal.x + portal.width / 2, y: portal.y + portal.height, lift: 40 };
    return null;
  }

  /** Người chơi bấm E / Space / A. */
  interact() {
    if (this.hailFn) { this.hailFn(); return; }
    const tg = this.target;
    if (!tg) return;
    if (tg.kind === 'spot') journey.spotAct(propOf(tg.obj, 'act'), tg.obj);
    else if (tg.kind === 'npc' && tg.id === 'npc10') journey.talkEditor();
    else if (tg.kind === 'npc' && tg.id === 'boss') story.runBoss();
    else if (tg.kind === 'npc' && this.npcs.get(tg.id)?.chaser) story.rumorEncounter(tg.id);
    else if (tg.kind === 'npc') story.talkTo(tg.id);
    else if (tg.kind === 'decoy') story.inspectDecoy(tg.id);
    else if (tg.kind === 'eaves') story.eavesdrop(tg.id);
    else if (tg.kind === 'portal') {
      const room = propOf(tg.portal, 'room');
      const st = roomStatus(room, state.progress.flags);
      if (st === 'open' || st === 'done') this.travel(propOf(tg.portal, 'target'), propOf(tg.portal, 'spawn'));
      else story.notice(t('dialog.bossLocked'));
    }
    else if (tg.kind === 'inspect') story.inspect(tg.key);
    else if (tg.kind === 'device') story.useDevice(tg.id);
    else if (tg.kind === 'elevator') story.useElevator();
    else if (tg.kind === 'door') {
      const room = data.quests.rooms.find(r => r.id === tg.door.room);
      story.notice(tg.door.status === 'locked' ? t('dialog.doorLocked') : t('dialog.doorBuilding', { room: room?.name || '' }));
    }
  }

  /** Khu vực đang đứng: đổi nhãn vị trí và phát lời giới thiệu phòng lần đầu. */
  checkZone() {
    const { x, y } = this.player;
    const zone = this.zones.find(z => inRect(z, x, y - 4));
    const key = zone?.name || null;
    if (key === this.zoneKey) return;
    this.zoneKey = key;
    this.updateStations();
    const room = propOf(zone || {}, 'room');
    const area = propOf(zone || {}, 'area');
    const label = room ? data.quests.rooms.find(r => r.id === room)?.name : data.quests.areas?.[area];
    setPlace(label || propOf({ properties: this.map.properties }, 'label') || '');
    this.placeLabel = label;
    if (room) story.onZoneEnter(room);
  }

  /**
   * Đạo cụ (object 'prop', tên = khóa trong atlas props): ảnh gốc ở chân, depth theo đáy để người đi trước / sau,
   * va chạm chỉ ở chân đế (props_meta.json → base). Prop phẳng (thảm) nằm dưới chân; prop dán tường không va chạm.
   * Thuộc tính sign / sub: chữ trên bảng hiệu tòa nhà.
   */
  buildProps(objs) {
    const meta = this.cache.json.get('propsMeta') || {};
    this.props = [];
    this.propLights = [];
    this.propBodies = this.physics.add.staticGroup();
    this.propExtras = [];
    for (const o of objs.filter(o => o.type === 'prop')) {
      const m = meta[o.name];
      if (!m) continue;
      // ox: tâm mặt tiền trong ảnh (tòa nhà giả 3D có mặt hông bên phải nên tâm ảnh lệch khỏi tâm mặt tiền)
      const mirror = propOf(o, 'flip') && !m.building;
      const ox = mirror ? 1 - (m.ox ?? 0.5) : m.ox ?? 0.5;
      const [bw, bh] = m.base || [0, 0];
      // vị trí hiển thị: chân đồ vật chiếu isometric; đồ phẳng (thảm) nằm sát nền; đồ dán tường đặt trên mặt tường
      const p = iso.P(o.x, o.y);
      const make = (x, y) => { const im = this.add.image(x, y, 'props', o.name).setOrigin(ox, 1); if (mirror) im.setFlipX(true); return im; };
      // đồ dán tường: dùng bản cắt xiên <khóa>@iso; điểm neo là chân mép trái, nằm trên mặt tường
      const isoKey = `${o.name}@iso`, im2 = meta[isoKey];
      const makeWall = (x, y) => this.add.image(x - m.w * ox, y - (m.w * ox) / 2, 'props', isoKey).setOrigin(0, im2.h0 / im2.h);
      // khối isometric: <khóa>@iso (đồ vật, tàu; tàu quay ngược: @isoW) hoặc chính khóa (tòa nhà có meta.iso)
      const east = propOf(o, 'face') === 'e' && meta[`${o.name}@isoE`];
      const isoName = east ? `${o.name}@isoE` : mirror && meta[`${o.name}@isoW`] ? `${o.name}@isoW` : meta[`${o.name}@iso`]?.iso ? `${o.name}@iso` : m.iso ? o.name : null;
      const im = isoName ? meta[isoName] : null;
      let img, left, top, lights = m.lights, parts = null;
      if (m.wall) {
        const parts = this.sliceOnWall(im2 ? makeWall : make, o.x, o.y, o.x - m.w * ox);
        img = parts[0]; this.propExtras.push(...parts.slice(1));
        left = img.x; top = img.y - img.height * img.originY; lights = [];
      } else if (im?.iso.east) {
        // quay mặt về đông: (o.x, o.y) = giữa mép trước (phía đông); góc bắc của mép trước ứng với mép phải ảnh
        const q = iso.P(o.x, o.y - im.iso.fw / 2);
        img = this.add.image(q.x, q.y, 'props', isoName).setOrigin(1, im.iso.ay / im.h);
        img.setDepth(iso.depth(o.x - im.iso.d / 2, o.y));
        left = q.x - im.w; top = q.y - im.iso.ay; lights = [];
        parts = this.sliceIso(img, im, o.x + o.y - im.iso.fw / 2, true, left, top);
      } else if (im) {
        const q = iso.P(o.x - im.iso.fw / 2, o.y);
        img = this.add.image(q.x, q.y, 'props', isoName).setOrigin(0, im.iso.ay / im.h);
        img.setDepth(iso.depth(o.x, o.y - im.iso.d / 2));
        left = q.x; top = q.y - im.iso.ay; lights = im.lights;
        parts = this.sliceIso(img, im, o.x - im.iso.fw / 2 + o.y, false, left, top);
      } else if (m.flat && meta[`${o.name}@flat`]) {
        // thảm: góc tây bắc của thảm (logic) ứng với điểm (cao, 0) của ảnh
        const fm = meta[`${o.name}@flat`];
        const q = iso.P(o.x - fm.fw / 2, o.y - fm.fh);
        img = this.add.image(q.x - fm.fh, q.y, 'props', `${o.name}@flat`).setOrigin(0).setDepth(-5);
        left = img.x; top = img.y;
      } else {
        img = make(p.x, p.y); img.setDepth(m.flat ? -5 : iso.depth(o.x, o.y - (bh || 16) / 2));
        left = img.x - m.w * ox; top = img.y - m.h;
      }
      if (bw && bh && !m.flat && !m.wall) {
        // chân đế: quay về đông thì đổi chiều (sâu theo x, dài theo y)
        const z = east ? this.add.zone(o.x - bh / 2, o.y, bh, bw) : this.add.zone(o.x, o.y - bh / 2, bw, bh);
        this.propBodies.add(z);
      }
      (lights || []).forEach(([lx, ly, c, r, i]) => this.propLights.push([left + lx, top + ly, c, r, i]));
      // biển hiệu tòa nhà: chữ cắt xiên nằm đúng trên mặt tiền
      const text = propOf(o, 'sign');
      const sg = im?.sign || m.sign;
      if (text && sg) {
        const tx = shearedText(this, [text], { size: 20, color: propOf(o, 'signColor') || '#e8ecf2', sub: propOf(o, 'sub'), fixed: { w: sg.w, h: sg.h } });
        this.add.image(left + sg.x, top + sg.y, tx.key).setOrigin(0).setDepth(Math.max(...(parts || [img]).map(p => p.depth)) + 1);
      }
      if (parts) this.propExtras.push(...parts.slice(1));
      this.props.push({ img, obj: o, meta: m, parts });
    }
    this.physics.add.collider(this.player, this.propBodies);
  }

  /**
   * Cắt khối isometric rộng thành các cột 16 px, mỗi cột một độ sâu riêng: độ sâu = điểm gần người xem nhất của cột
   * (mặt trước hoặc mặt hông). Người đứng trước / sau một đầu quầy dài, tòa nhà... được vẽ đúng thứ tự.
   * base = x + y của góc neo (góc tây nam mặt trước; quay về đông: góc bắc mép trước); east: ảnh neo ở mép phải.
   */
  sliceIso(img, im, base, east, left, top) {
    const W = im.w, H = im.h, fw = im.iso.fw, STEP = 16;
    img.cropBounds = new Phaser.Geom.Rectangle(left, top, W, H);
    if (W <= 40) return [img];
    const parts = [];
    for (let c = 0; c < W; c += STEP) {
      const w = Math.min(STEP, W - c);
      const part = c === 0 ? img : this.add.image(img.x, img.y, img.texture.key, img.frame.name).setOrigin(img.originX, img.originY);
      part.setCrop(c, 0, w, H);
      const cc = east ? W - (c + w / 2) : c + w / 2;
      part.setDepth(base + (cc < fw ? cc : 2 * fw - cc) - 1);
      part.cropBounds = new Phaser.Geom.Rectangle(left + c, top, w, H);
      parts.push(part);
    }
    return parts;
  }

  /** Dữ liệu cho bản đồ nhỏ trong balo. */
  getMinimap() {
    const { width: W, height: H } = this.map;
    const kind = (x, y) => {
      const d = this.doors.getTileAt(x, y);
      if (d) return 'door';
      const w = this.walls.getTileAt(x, y);
      if (w) return w.properties.name?.startsWith('wall') || w.properties.name === 'window' || w.properties.name === 'pinboard' ? 'wall' : 'furniture';
      return 'floor';
    };
    // chân đế props: tòa nhà / đồ đạc
    const solid = new Set();
    for (const p of this.props) {
      const [bw, bh] = p.meta.base || [0, 0];
      if (!bw || p.meta.flat || p.meta.wall) continue;
      for (let ty = Math.floor((p.obj.y - bh) / 32); ty <= Math.floor((p.obj.y - 1) / 32); ty++) {
        for (let tx = Math.floor((p.obj.x - bw / 2) / 32); tx <= Math.floor((p.obj.x + bw / 2 - 1) / 32); tx++) solid.add(`${tx},${ty}`);
      }
    }
    const tileKind = kind;
    const kind2 = (x, y) => { const k = tileKind(x, y); return k === 'floor' && solid.has(`${x},${y}`) ? 'furniture' : k; };
    return {
      W, H, kind: kind2,
      player: { x: this.player.x / 32, y: this.player.y / 32 },
      npcs: [...this.npcs.values()].map(n => ({ x: n.sprite.x / 32, y: n.sprite.y / 32 })),
      place: this.placeLabel || ''
    };
  }

  /** Vòng lặp mỗi khung hình. */
  update(time, delta) {
    // đang trò chuyện mà thu nhỏ khung thoại: vẫn đi lại được
    const talking = story.isBusy() && !dlg.isMinimized();
    const frozen = this.leaving || this.cutscene || talking || window.uiBlocked?.() || time < (this.stunUntil || 0);
    let { x, y } = frozen ? { x: 0, y: 0 } : direction();
    if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
    // đi theo đường nháy chuột (bấm phím thì hủy)
    if (x || y || frozen) { if (x || y) this.walkPath = null; }
    else if (this.walkPath) ({ x, y } = this.followPath(time) || { x: 0, y: 0 });
    // phím theo hướng màn hình → vận tốc logic (lên màn hình = lùi chéo về tây bắc trên lưới)
    const lv = iso.toLogicalDir(x, y);
    const ll = Math.hypot(lv.x, lv.y) || 1;
    const sp = Math.hypot(x, y) * SPEED * this.fx().speed;
    this.player.setVelocity((lv.x / ll) * sp, (lv.y / ll) * sp);
    if (x || y) {
      this.facing = dirFrom(x, y);
      this.player.anims.play(`hero-walk-${this.facing}`, true);
      this.stepIn -= delta;
      if (this.stepIn <= 0) {
        this.stepIn = 300;
        footstep(this.ground.getTileAtWorldXY(this.player.x, this.player.y - 2)?.properties?.name, this.weather?.kind === 'rain');
      }
      const room = story.trackedRoom();
      if (tickPressure(delta * this.fx().pressure * feedPressureRate(), room)) story.deadlineCall(room);
      if (time - this.lastSave > 1000) {
        this.lastSave = time;
        this.savePos();
      }
    } else {
      this.player.anims.stop();
      this.player.setFrame(idleFrame(this.facing));
    }
    this.npcs.forEach(n => n.update(delta, frozen, this.player));
    this.updateChats(delta, frozen);
    const far = this.fx().hideFar;
    this.npcs.forEach(n => { if (n.chaser && n.sprite.view) n.sprite.view.setAlpha(far && Phaser.Math.Distance.Between(n.sprite.x, n.sprite.y, this.player.x, this.player.y) > far ? 0.25 : 1); });
    this.traffic?.update(delta, frozen);
    this.views.sync();
    this.npcs.forEach(n => n.syncTag(this.player));
    const pv = this.player.view;
    if (this.player.tag) this.player.tag.setPosition(pv.x, pv.y - 50 * (pv.scaleY || 1)).setVisible(pv.visible && pv.alpha > 0.5);
    fadeOccluders(this.occluders, this.player.view);
    if (!this.reduceMotion) this.devices.forEach((d, i) => d.marker.setY(iso.P(d.obj.x + d.obj.width / 2, d.obj.y).y - 40 + Math.round(Math.sin(time / 250 + i) * 2)));

    this.weather.update(delta, this.player.view);
    if (this.mapKey === 'boss' && this.weather.liveLight) this.weather.liveLight.setIntensity(0.6 + 0.9 * (Math.sin(time / 280) > 0 ? 1 : 0.25));
    this.ambIn -= delta;
    if (this.ambIn <= 0) { this.updateAmbience(250 - this.ambIn); this.ambIn = 250; updateMeters(); }
    if (!this.reduceMotion) this.decoys.forEach((d, i) => d.marker.setY(iso.P(d.obj.x + d.obj.width / 2, d.obj.y + d.obj.height / 2).y - d.lift + Math.round(Math.sin(time / 300 + i) * 2)));
    const gt = frozen ? null : guideTarget(this);
    this.guide.draw(this.player.view, gt && { ...iso.P(gt.x, gt.y), here: gt.here }, time);
    if (frozen) { this.prompt.setVisible(false); return; }
    this.checkZone();
    const exit = this.exits.find(o => inRect(o, this.player.x, this.player.y));
    const lockedRoom = exit && propOf(exit, 'room');
    if (lockedRoom && !['open', 'done'].includes(roomStatus(lockedRoom, state.progress.flags))) {
      this.player.body.reset(this.player.x, exit.y + exit.height + 14);
      story.notice(t('boss.locked'));
      return;
    }
    if (exit) {
      const target = propOf(exit, 'target');
      if (MAPS.includes(target)) { this.travel(target, propOf(exit, 'spawn')); return; }
      this.player.body.reset(this.player.x, exit.y - 12);
      story.notice(t('dialog.exitBuilding'));
      return;
    }
    this.target = this.findTarget();
    this.prompt.setVisible(!!this.target);
    if (this.target) { const p = iso.P(this.target.x, this.target.y); this.prompt.setPosition(p.x, p.y - (this.target.lift || 40)); }
  }
}
