// Cảnh bản đồ Phaser: bản đồ Tiled, người chơi đi lại, NPC, cửa phòng, khu vực, gợi ý tương tác.
import { data, t } from './data.js';
import { state, saveProgress, hasFlag } from './state.js';
import { direction } from './input.js';
import { makeAnims, feetBody, dirFrom, idleFrame, Npc, showEmote } from './actors.js';
import { roomStatus } from './grading.js';
import * as story from './story.js';
import { setPlace } from './hud.js';
import { playMusic } from './music.js';
import { buildGraph, guideTarget, updateTrackLine, GuideArrow } from './guide.js';
import { Weather } from './weather.js';
import { Traffic, VEHICLE_SPRITES } from './traffic.js';
import { sfx, footstep, setAmbience } from './audio.js';

const MAPS = ['tn_lobby', 'tn_f2', 'tn_f3', 'tn_f4', 'tn_f5', 'street', 'newsroom', 'cafe', 'agency', 'boss'];
const SPEED = 120;
const MAP_VERSION = 3; // tăng khi sửa bố cục bản đồ: vị trí đã lưu theo bản cũ bị bỏ qua
const BOSS_SCALE = 1.5;

/** Sprite của mọi nhân vật trong npc_dialogues.json (NPC chính, người qua đường, boss) + boss đã gỡ mặt nạ. */
const spriteIds = () => [...new Set([...data.npcs.npcs.map(n => n.sprite || n.id), 'boss', 'boss_blank'])];

/** File sprite của nhân vật chính theo mẫu người chơi chọn (nam / nữ). */
export const heroSprite = () => `hero_${state.progress?.heroLook === 'f' ? 'f' : 'm'}`;

/** Lấy thuộc tính tùy chỉnh của object Tiled. */
const propOf = (o, name) => (o.properties || []).find(p => p.name === name)?.value;

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
    // Chữ trên tường / sàn (biển tầng, tên tòa nhà)
    for (const o of objs.filter(o => o.type === 'label')) {
      this.add.text(o.x, o.y, propOf(o, 'text'), {
        fontFamily: 'VT323', fontSize: `${propOf(o, 'size') || 16}px`, color: propOf(o, 'color') || '#e8ecf2', align: 'center',
        // bảng tên tầng: nền tối có viền như biển gắn tường
        ...(propOf(o, 'plate') ? { backgroundColor: '#0e1015', padding: { x: 8, y: 2 } } : {})
      }).setOrigin(0.5).setDepth(2).setResolution(2);
    }
    // Thiết bị ở Phòng xác minh: có dấu "!" khi hồ sơ đang chờ thiết bị đó.
    this.devices = objs.filter(o => o.type === 'device').map(o => ({
      obj: o,
      id: propOf(o, 'device'),
      marker: this.add.text(o.x + o.width / 2, o.y - 2, '!', { fontFamily: 'VT323', fontSize: '28px', color: '#f2d36b', stroke: '#0f0e17', strokeThickness: 4 })
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
      if (!at || at === this.mapKey) this.spawnNpc(o.name, o.x, o.y, propOf(o, 'patrol'));
    }
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
    cam.startFollow(this.player, true, 0.2, 0.2);
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
    buildGraph(this, MAPS);
    this.guide = new GuideArrow(this);
    this.traffic = objs.some(o => o.type === 'lane') ? new Traffic(this, objs, this.player) : null;
    this.weather = new Weather(this, () => [this.ground, this.walls, this.doors, this.player, ...this.props.map(p => p.img),
      ...[...this.npcs.values()].map(n => n.sprite), ...(this.traffic?.sprites() || [])], () => this.propLights);
    this.reduceMotion = state.settings.reduceMotion;
    story.setWorld(this);
    this.refresh();
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
    const go = () => this.scene.restart({ map: target, spawn, dir: dir || (target === 'street' ? 'down' : 'up') });
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
    if (who === 'hero') showEmote(this, this.player, ch);
    else { const npc = this.npcs.get(who); if (npc) showEmote(this, npc.sprite, ch); }
  }

  /** Gỡ mặt nạ boss: thay sprite bằng khung trống. */
  bossUnmask() {
    const boss = this.npcs?.get('boss');
    if (boss?.sprite.active && this.textures.exists('boss_blank')) boss.sprite.setTexture('boss_blank', 0);
  }

  /** Zoom nguyên lần để pixel đều; thấy khoảng 20x11 ô trên màn hình lớn. */
  fitCamera() {
    const { width, height } = this.scale;
    const cam = this.cameras.main;
    cam.setZoom(Math.max(1, Math.floor(Math.min(width / 640, height / 360))));
    cam.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
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

  /** Tạo NPC trên bản đồ hiện tại (vị trí theo trạm nếu có). */
  spawnNpc(id, x, y, homePatrol) {
    const npc = new Npc(this, id, x, y);
    npc.ambient = !!data.npcs.ambientLines?.[id];
    npc.homePatrol = homePatrol;
    if (id === 'boss') {
      npc.sprite.setScale(BOSS_SCALE);
      npc.marker.setVisible(false);
      if (hasFlag('boss_done')) npc.sprite.setTexture('boss_blank', 0);
    }
    if (this.weather?.kind === 'night' && this.renderer.type === Phaser.WEBGL) npc.sprite.setPipeline('Light2D');
    this.npcs.set(id, npc);
    npc.collider = this.physics.add.collider(this.player, npc.sprite);
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
    updateTrackLine();
  }

  /** Bắt đầu / kết thúc trò chuyện: NPC dừng và quay mặt về người chơi, người chơi nhìn NPC. */
  setTalking(id, talking) {
    const npc = this.npcs.get(id);
    if (!npc) return;
    npc.talking = talking;
    if (talking) {
      npc.face(this.player.x, this.player.y);
      this.facing = dirFrom(npc.sprite.x - this.player.x, npc.sprite.y - this.player.y);
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
    const off = { down: [0, 18], up: [0, -26], left: [-22, -6], right: [22, -6] }[this.facing];
    const fx = this.player.x + off[0], fy = this.player.y + off[1];
    let best = null, bestD = Infinity;
    this.npcs.forEach((npc, id) => {
      const big = npc.sprite.scale > 1; // boss to hơn: tầm nói chuyện rộng hơn
      const d = Phaser.Math.Distance.Between(fx, fy, npc.sprite.x, npc.sprite.y - 12);
      if (d < (big ? 64 : 34) && d < bestD) { best = { kind: 'npc', id, x: npc.sprite.x, y: npc.sprite.y - (big ? 80 : 54) }; bestD = d; }
    });
    if (best) return best;
    const lift = this.elevators.find(o => inRect(o, fx, fy, 6));
    if (lift) return { kind: 'elevator', x: lift.x + lift.width / 2, y: lift.y - 8 };
    const dev = this.devices.find(d => inRect(d.obj, fx, fy, 4));
    if (dev) return { kind: 'device', id: dev.id, x: dev.obj.x + dev.obj.width / 2, y: dev.obj.y - 4 };
    const ins = this.inspects.find(o => inRect(o, fx, fy, 4));
    if (ins) return { kind: 'inspect', key: propOf(ins, 'text'), x: ins.x + ins.width / 2, y: ins.y - 4 };
    const door = this.doorObjs.find(d => inRect(d.obj, fx, fy, 4) && d.status !== 'open' && d.status !== 'done');
    if (door) return { kind: 'door', door, x: door.obj.x + door.obj.width / 2, y: door.obj.y + door.obj.height - 40 };
    const portal = this.portals.find(o => inRect(o, fx, fy, 6));
    if (portal) return { kind: 'portal', portal, x: portal.x + portal.width / 2, y: portal.y - 6 };
    return null;
  }

  /** Người chơi bấm E / Space / A. */
  interact() {
    const tg = this.target;
    if (!tg) return;
    if (tg.kind === 'npc' && tg.id === 'boss') story.runBoss();
    else if (tg.kind === 'npc') story.talkTo(tg.id);
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
    for (const o of objs.filter(o => o.type === 'prop')) {
      const m = meta[o.name];
      if (!m) continue;
      // ox: tâm mặt tiền trong ảnh (tòa nhà giả 3D có mặt hông bên phải nên tâm ảnh lệch khỏi tâm mặt tiền)
      const ox = m.ox ?? 0.5;
      const img = this.add.image(o.x, o.y, 'props', o.name).setOrigin(ox, 1);
      if (propOf(o, 'flip') && !m.building) img.setFlipX(true);
      img.setDepth(m.flat ? 0.5 : m.wall ? o.y - 40 : o.y);
      const left = o.x - m.w * ox, top = o.y - m.h;
      const [bw, bh] = m.base || [0, 0];
      if (bw && bh && !m.flat && !m.wall) {
        const z = this.add.zone(o.x, o.y - bh / 2, bw, bh);
        this.propBodies.add(z);
      }
      const flipped = propOf(o, 'flip') && !m.building;
      (m.lights || []).forEach(([lx, ly, c, r, i]) => this.propLights.push([left + (flipped ? m.w - lx : lx), top + ly, c, r, i]));
      const text = propOf(o, 'sign');
      if (text && m.sign) {
        const sx = left + m.sign.x + m.sign.w / 2, sy = top + m.sign.y + m.sign.h / 2;
        const sub = propOf(o, 'sub');
        this.add.text(sx, sy - (sub ? 6 : 0), text, { fontFamily: 'VT323', fontSize: '20px', color: propOf(o, 'signColor') || '#e8ecf2' })
          .setOrigin(0.5).setDepth(img.depth + 1).setResolution(2);
        if (sub) this.add.text(sx, sy + 9, sub, { fontFamily: 'VT323', fontSize: '11px', color: '#a3adbf' }).setOrigin(0.5).setDepth(img.depth + 1).setResolution(2);
      }
      this.props.push({ img, obj: o, meta: m });
    }
    this.physics.add.collider(this.player, this.propBodies);
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
    const frozen = this.leaving || story.isBusy() || window.uiBlocked?.();
    let { x, y } = frozen ? { x: 0, y: 0 } : direction();
    if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
    this.player.setVelocity(x * SPEED, y * SPEED);
    if (x || y) {
      this.facing = dirFrom(x, y);
      this.player.anims.play(`hero-walk-${this.facing}`, true);
      this.stepIn -= delta;
      if (this.stepIn <= 0) {
        this.stepIn = 300;
        footstep(this.ground.getTileAtWorldXY(this.player.x, this.player.y - 2)?.properties?.name, this.weather?.kind === 'rain');
      }
      if (time - this.lastSave > 1000) {
        this.lastSave = time;
        this.savePos();
      }
    } else {
      this.player.anims.stop();
      this.player.setFrame(idleFrame(this.facing));
    }
    this.player.setDepth(this.player.y);
    this.npcs.forEach(n => n.update(delta, frozen, this.player));
    this.traffic?.update(delta, frozen);
    if (!this.reduceMotion) this.devices.forEach((d, i) => d.marker.setY(d.obj.y - 2 + Math.round(Math.sin(time / 250 + i) * 2)));

    this.weather.update(delta, this.player);
    this.ambIn -= delta;
    if (this.ambIn <= 0) { this.updateAmbience(250 - this.ambIn); this.ambIn = 250; }
    this.guide.draw(this.player, frozen ? null : guideTarget(this), time);
    if (frozen) { this.prompt.setVisible(false); return; }
    this.checkZone();
    const exit = this.exits.find(o => inRect(o, this.player.x, this.player.y));
    if (exit) {
      const target = propOf(exit, 'target');
      if (MAPS.includes(target)) { this.travel(target, propOf(exit, 'spawn')); return; }
      this.player.body.reset(this.player.x, exit.y - 12);
      story.notice(t('dialog.exitBuilding'));
      return;
    }
    this.target = this.findTarget();
    this.prompt.setVisible(!!this.target);
    if (this.target) this.prompt.setPosition(this.target.x, this.target.y);
  }
}
