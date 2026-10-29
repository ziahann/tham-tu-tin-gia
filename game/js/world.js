// Cảnh bản đồ Phaser: bản đồ Tiled, người chơi đi lại, NPC, cửa phòng, khu vực, gợi ý tương tác.
import { data, t } from './data.js';
import { state, saveProgress, hasFlag } from './state.js';
import { direction } from './input.js';
import { makeAnims, feetBody, dirFrom, idleFrame, Npc } from './actors.js';
import { roomStatus } from './grading.js';
import * as story from './story.js';
import { setPlace } from './hud.js';
import { playMusic } from './music.js';
import { buildGraph, guideTarget, updateTrackLine, GuideArrow } from './guide.js';
import { Weather } from './weather.js';

const SPRITE_IDS = ['npc1', 'npc2', 'npc3', 'npc4', 'npc5', 'npc6', 'boss', 'boss_blank'];
const MAPS = ['office', 'street', 'newsroom', 'cafe', 'agency', 'boss'];
const SPEED = 120;
const BOSS_SCALE = 1.5;

/** File sprite của thám tử theo mẫu người chơi chọn (nam / nữ). */
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
    this.load.image('tiles', 'assets/tiles/tiles.png');
    this.load.spritesheet('hero', `assets/sprites/${heroSprite()}.png`, { frameWidth: 32, frameHeight: 48 });
    SPRITE_IDS.forEach(id => this.load.spritesheet(id, `assets/sprites/${id}.png`, { frameWidth: 32, frameHeight: 48 }));
  }

  /** Nhận bản đồ và điểm xuất hiện khi chuyển cảnh. */
  init(args) {
    this.args = args || {};
  }

  /** Dựng bản đồ, người chơi, NPC, camera. */
  create() {
    const saved = state.progress.pos;
    this.mapKey = this.args.map || (MAPS.includes(saved?.map) ? saved.map : 'office');
    const map = this.map = this.make.tilemap({ key: this.mapKey });
    const tiles = map.addTilesetImage('tiles', 'tiles');
    this.ground = map.createLayer('ground', tiles);
    this.walls = map.createLayer('walls', tiles);
    this.doors = map.createLayer('doors', tiles);
    this.walls.setCollisionByProperty({ collides: true });
    this.doors.setCollisionByProperty({ collides: true });
    ['hero', ...SPRITE_IDS].forEach(id => makeAnims(this, id));

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
    // Thiết bị ở Phòng thám tử: có dấu "!" khi hồ sơ đang chờ thiết bị đó.
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
    const start = (this.args.spawn && this.points[this.args.spawn]) || (saved?.map === this.mapKey && saved.x != null ? saved : fallback);
    this.player = this.physics.add.sprite(start.x, start.y, 'hero', 0);
    feetBody(this.player);
    this.player.setCollideWorldBounds(true);
    this.facing = this.args.spawn ? (this.args.dir || 'down') : saved?.dir || 'up';
    this.savePos();
    this.player.setFrame(idleFrame(this.facing));
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.player, this.doors);

    // NPC
    this.npcs = new Map();
    for (const o of objs.filter(o => o.type === 'npc')) {
      const npc = new Npc(this, o.name, o.x, o.y);
      npc.homePatrol = propOf(o, 'patrol');
      if (o.name === 'boss') {
        npc.sprite.setScale(BOSS_SCALE);
        npc.marker.setVisible(false);
        if (hasFlag('boss_done')) npc.sprite.setTexture('boss_blank', 0);
      }
      this.npcs.set(o.name, npc);
      this.physics.add.collider(this.player, npc.sprite);
      this.placeNpc(o.name);
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
    this.leaving = false;
    this.zoneKey = null;
    if (!state.settings.reduceMotion) cam.fadeIn(250, 15, 14, 23);
    this.target = null;
    buildGraph(this, MAPS);
    this.guide = new GuideArrow(this);
    this.weather = new Weather(this, () => [this.ground, this.walls, this.doors, this.player, ...[...this.npcs.values()].map(n => n.sprite)]);
    this.reduceMotion = state.settings.reduceMotion;
    story.setWorld(this);
    this.refresh();
  }

  /** Lưu vị trí hiện tại (bản đồ, toạ độ, hướng nhìn). */
  savePos() {
    state.progress.pos = { map: this.mapKey, x: Math.round(this.player.x), y: Math.round(this.player.y), dir: this.facing };
    saveProgress();
  }

  /** Chuyển sang bản đồ khác, xuất hiện ở điểm spawn. */
  travel(target, spawn) {
    if (this.leaving) return;
    this.leaving = true;
    this.player.setVelocity(0, 0);
    state.progress.pos = { map: target, spawnName: spawn };
    saveProgress();
    const go = () => this.scene.restart({ map: target, spawn, dir: target === 'street' ? 'down' : 'up' });
    if (state.settings.reduceMotion) { go(); return; }
    this.cameras.main.fadeOut(250, 15, 14, 23);
    this.cameras.main.once('camerafadeoutcomplete', go);
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

  /** Phòng (hồ sơ) của khu vực người chơi đang đứng, hoặc null. */
  zoneRoom() {
    return propOf(this.zones?.find(z => z.name === this.zoneKey) || {}, 'room') || null;
  }

  /**
   * Trạm của NPC (data.npcs.stations): mục có cờ bắt buộc và không gắn phòng thắng trước;
   * rồi tới mục gắn phòng người chơi đang đứng, phòng của hồ sơ đang theo dõi; cuối cùng mục mặc định.
   */
  stationFor(id) {
    const list = (data.npcs.stations?.[id] || []).filter(s => (s.requires || []).every(hasFlag));
    const forced = list.find(s => s.requires?.length && !s.room);
    if (forced) return forced;
    for (const room of [this.zoneRoom(), story.trackedRoom()]) {
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
    return {
      W, H, kind,
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
    if (!this.reduceMotion) this.devices.forEach((d, i) => d.marker.setY(d.obj.y - 2 + Math.round(Math.sin(time / 250 + i) * 2)));

    this.weather.update(delta, this.player);
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
