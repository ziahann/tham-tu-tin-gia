// Cảnh bản đồ Phaser: bản đồ Tiled, người chơi đi lại, NPC, cửa phòng, khu vực, gợi ý tương tác.
import { data, t } from './data.js';
import { state, saveProgress, hasFlag } from './state.js';
import { direction } from './input.js';
import { makeAnims, feetBody, dirFrom, idleFrame, Npc } from './actors.js';
import { roomStatus } from './grading.js';
import * as story from './story.js';
import { setPlace } from './hud.js';

const SPRITE_IDS = ['hero', 'npc1', 'npc2', 'npc3', 'npc4', 'npc5', 'npc6'];
const SPEED = 120;
const MAP_KEY = 'office';

/** Lấy thuộc tính tùy chỉnh của object Tiled. */
const propOf = (o, name) => (o.properties || []).find(p => p.name === name)?.value;

/** Điểm có nằm trong hình chữ nhật của object Tiled không. */
const inRect = (o, x, y, pad = 0) => x >= o.x - pad && x <= o.x + o.width + pad && y >= o.y - pad && y <= o.y + o.height + pad;

export class WorldScene extends Phaser.Scene {
  constructor() { super('world'); }

  /** Tải bản đồ, tileset, sprite. */
  preload() {
    this.load.tilemapTiledJSON(MAP_KEY, `maps/${MAP_KEY}.json`);
    this.load.image('tiles-office', 'assets/tiles/office.png');
    SPRITE_IDS.forEach(id => this.load.spritesheet(id, `assets/sprites/${id}.png`, { frameWidth: 32, frameHeight: 48 }));
  }

  /** Dựng bản đồ, người chơi, NPC, camera. */
  create() {
    const map = this.map = this.make.tilemap({ key: MAP_KEY });
    const tiles = map.addTilesetImage('office', 'tiles-office');
    map.createLayer('ground', tiles);
    this.walls = map.createLayer('walls', tiles);
    this.doors = map.createLayer('doors', tiles);
    this.walls.setCollisionByProperty({ collides: true });
    this.doors.setCollisionByProperty({ collides: true });
    SPRITE_IDS.forEach(id => makeAnims(this, id));

    const objs = map.getObjectLayer('objects').objects;
    this.paths = {};
    this.points = {};
    for (const o of objs) {
      if (o.polyline) this.paths[o.name] = o.polyline.map(p => ({ x: o.x + p.x, y: o.y + p.y }));
      if (o.point) this.points[o.name] = { x: o.x, y: o.y };
    }
    this.zones = objs.filter(o => o.type === 'zone');
    this.exits = objs.filter(o => o.type === 'exit');
    this.inspects = objs.filter(o => o.type === 'inspect');
    this.doorObjs = objs.filter(o => o.type === 'door').map(o => ({
      obj: o,
      room: propOf(o, 'room'),
      tiles: this.tilesIn(o)
    }));

    // Người chơi
    const saved = state.progress.pos;
    const start = saved?.map === MAP_KEY ? saved : this.points.spawn_start;
    this.player = this.physics.add.sprite(start.x, start.y, 'hero', 0);
    feetBody(this.player);
    this.player.setCollideWorldBounds(true);
    this.facing = saved?.dir || 'up';
    this.player.setFrame(idleFrame(this.facing));
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.player, this.doors);

    // NPC
    this.npcs = new Map();
    for (const o of objs.filter(o => o.type === 'npc')) {
      const npc = new Npc(this, o.name, o.x, o.y);
      npc.homePatrol = propOf(o, 'patrol');
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

    this.lastSave = 0;
    this.zoneKey = null;
    this.target = null;
    story.setWorld(this);
    this.refresh();
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

  /** Đặt NPC theo trạm hiện tại (data.npcs.stations) hoặc vị trí gốc trên bản đồ. */
  placeNpc(id) {
    const npc = this.npcs.get(id);
    const st = (data.npcs.stations?.[id] || []).find(s => (s.requires || []).every(hasFlag));
    if (st) {
      npc.teleport(this.points[st.station]);
      npc.patrol(this.paths[st.patrol]);
    } else {
      npc.patrol(this.paths[npc.homePatrol]);
    }
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
    this.npcs.forEach((npc, id) => npc.marker.setVisible(story.hasStoryFor(id)));
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
    let best = null, bestD = 34;
    this.npcs.forEach((npc, id) => {
      const d = Phaser.Math.Distance.Between(fx, fy, npc.sprite.x, npc.sprite.y - 12);
      if (d < bestD) { best = { kind: 'npc', id, x: npc.sprite.x, y: npc.sprite.y - 54 }; bestD = d; }
    });
    if (best) return best;
    const ins = this.inspects.find(o => inRect(o, fx, fy, 4));
    if (ins) return { kind: 'inspect', key: propOf(ins, 'text'), x: ins.x + ins.width / 2, y: ins.y - 4 };
    const door = this.doorObjs.find(d => inRect(d.obj, fx, fy, 4) && d.status !== 'open' && d.status !== 'done');
    if (door) return { kind: 'door', door, x: door.obj.x + door.obj.width / 2, y: door.obj.y + door.obj.height - 40 };
    return null;
  }

  /** Người chơi bấm E / Space / A. */
  interact() {
    const tg = this.target;
    if (!tg) return;
    if (tg.kind === 'npc') story.talkTo(tg.id);
    else if (tg.kind === 'inspect') story.inspect(tg.key);
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
    const frozen = story.isBusy() || window.uiBlocked?.();
    let { x, y } = frozen ? { x: 0, y: 0 } : direction();
    if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
    this.player.setVelocity(x * SPEED, y * SPEED);
    if (x || y) {
      this.facing = dirFrom(x, y);
      this.player.anims.play(`hero-walk-${this.facing}`, true);
      if (time - this.lastSave > 1000) {
        this.lastSave = time;
        state.progress.pos = { map: MAP_KEY, x: Math.round(this.player.x), y: Math.round(this.player.y), dir: this.facing };
        saveProgress();
      }
    } else {
      this.player.anims.stop();
      this.player.setFrame(idleFrame(this.facing));
    }
    this.player.setDepth(this.player.y);
    this.npcs.forEach(n => n.update(delta, frozen, this.player));

    if (frozen) { this.prompt.setVisible(false); return; }
    this.checkZone();
    const exit = this.exits.find(o => inRect(o, this.player.x, this.player.y));
    if (exit) {
      this.player.body.reset(this.player.x, exit.y - 12);
      this.facing = 'up';
      story.notice(t('dialog.exitBuilding'));
      return;
    }
    this.target = this.findTarget();
    this.prompt.setVisible(!!this.target);
    if (this.target) this.prompt.setPosition(this.target.x, this.target.y);
  }
}
