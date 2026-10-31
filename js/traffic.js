// Xe cộ trên phố: ô tô, xe buýt, xe máy chạy theo làn (object 'lane' trên bản đồ Tiled).
// Xe dừng trước vạch qua đường khi có người đang băng qua và dừng khi gặp xe phía trước. Người chơi đi giữa làn
// ngoài vạch kẻ thì xe không dừng: chạm xe sẽ bị hất về mép đường (chế độ Nhẹ: xe vẫn dừng cho người chơi).
import { isLight } from './obstacles.js';

const propOf = (o, name) => (o.properties || []).find(p => p.name === name)?.value;

export const VEHICLE_SPRITES = [...['car1', 'car2', 'car3', 'car4', 'bus', 'bike1', 'bike2', 'bike3', 'bike4'].flatMap(k => [k, `${k}_e`, `${k}_w`]), 'bus_e_open', 'bus_w_open'];
/** Kích thước bản isometric của xe (xem tools/props.mjs → vehicles): bề rộng mặt nam, cao ảnh gốc, chiều sâu. */
const ISO_SIZE = { car: [96, 50, 40], bus: [240, 84, 56], bike: [50, 50, 8] };
const KINDS = {
  car: [['car1', 110], ['car2', 100], ['car3', 120], ['car4', 105], ['bus', 75]],
  bike: [['bike1', 85], ['bike2', 78], ['bike3', 80], ['bike4', 88]],
  // phố TP.HCM: xe máy là chính
  moto: [['bike1', 85], ['bike2', 78], ['bike3', 80], ['bike4', 88], ['bike1', 82], ['bike3', 76], ['car3', 110], ['bike2', 84], ['bus', 75]],
  mixed: [['car1', 110], ['car2', 100], ['car3', 120], ['car4', 105], ['bus', 75], ['bike1', 85], ['bike2', 78], ['bike3', 80], ['bike4', 88]]
};
const GAP = 26;         // khoảng cách tối thiểu tới xe phía trước
const LOOK = 70;        // tầm nhìn phía trước để dừng xe
const ACCEL = 160;      // gia tốc (px/s²)

export class Traffic {
  constructor(scene, objs, player) {
    this.scene = scene;
    this.player = player;
    this.lanes = objs.filter(o => o.type === 'lane').map(o => ({
      y: o.y + o.height / 2, top: o.y, bottom: o.y + o.height, dir: propOf(o, 'dir') || 1, kind: propOf(o, 'kind') || 'car', timer: 400 + Math.random() * 2500
    }));
    this.crossings = objs.filter(o => o.type === 'crosswalk');
    this.cars = [];
    this.group = scene.physics.add.group({ immovable: true, allowGravity: false });
    scene.physics.add.collider(player, this.group, (_p, car) => this.hit(car));
    // Rải sẵn vài xe để đường không trống lúc vào bản đồ
    for (const lane of this.lanes) for (let i = 0; i < 2; i++) this.spawn(lane, Math.random() * scene.map.widthInPixels);
  }

  /** Sprite xe (để bật ánh sáng ban đêm). */
  sprites() { return this.cars.map(c => c.sprite.view || c.sprite); }

  /** Thêm một xe vào làn; x mặc định ở mép bản đồ phía xe đi tới. */
  spawn(lane, x) {
    const [key, speed] = Phaser.Utils.Array.GetRandom(KINDS[lane.kind]);
    const W = this.scene.map.widthInPixels;
    const sx = x ?? (lane.dir > 0 ? -60 : W + 60);
    // chân xe sát mép ngoài của làn; thân va chạm = chân đế thật (dài x sâu) của xe
    const [fw0, , d0] = ISO_SIZE[key === 'bus' ? 'bus' : key.startsWith('bike') ? 'bike' : 'car'];
    const s = this.group.create(sx, lane.bottom - 4, key).setOrigin(0.5, 1).setFlipX(lane.dir < 0);
    const w = s.width;
    s.body.setSize(fw0 - 8, d0 - 4).setOffset(4, s.height - d0 + 4);
    s.body.pushable = false;
    if (this.scene.weather?.lit) s.setPipeline('Light2D');
    const [fw, fh, d] = ISO_SIZE[key === 'bus' ? 'bus' : key.startsWith('bike') ? 'bike' : 'car'];
    const isoKey = `${key}_${lane.dir > 0 ? 'e' : 'w'}`;
    const tex = this.scene.textures.get(isoKey).getSourceImage();
    this.scene.views?.add(s, { isoTex: { key: isoKey, fw, ay: Math.ceil(d / 2) + fh, h: tex.height, d } });
    const car = { sprite: s, lane, max: speed * (0.9 + Math.random() * 0.2), v: speed, half: w / 2 };
    // không đè lên xe khác lúc rải sẵn
    if (this.cars.some(c => c.lane === lane && Math.abs(c.sprite.x - sx) < c.half + car.half + GAP)) { s.view?.destroy(); s.destroy(); return; }
    this.cars.push(car);
  }

  /** Người chơi chạm xe: hất về mép đường gần nhất (mép của cả lòng đường gồm các làn sát nhau). */
  hit(sprite) {
    if (isLight() || this.crossingWithPlayer()) return;
    const car = this.cars.find(c => c.sprite === sprite);
    if (!car) return;
    const road = this.lanes.filter(l => Math.abs(l.y - car.lane.y) < 4 * 32);
    const top = Math.min(...road.map(l => l.top)), bottom = Math.max(...road.map(l => l.bottom));
    const p = this.player;
    this.scene.knockback?.(p.y < (top + bottom) / 2 ? top - 20 : bottom + 30);
  }

  /** Người chơi có đang ở vạch qua đường nào không. */
  crossingWithPlayer() {
    const { x, y } = this.player;
    return this.crossings.find(c => x > c.x - 8 && x < c.x + c.width + 8 && y > c.y - 4 && y < c.y + c.height + 20);
  }

  /** Mỗi khung hình: sinh xe, tính khoảng trống phía trước, chạy / dừng. */
  update(delta, frozen) {
    const dt = delta / 1000;
    const W = this.scene.map.widthInPixels;
    for (const lane of this.lanes) {
      lane.timer -= delta;
      if (lane.timer <= 0) { lane.timer = 2200 + Math.random() * 4200; this.spawn(lane); }
    }
    const cross = this.crossingWithPlayer();
    const p = this.player;
    for (const car of this.cars) {
      const s = car.sprite, d = car.lane.dir;
      const front = s.x + d * car.half;
      let room = Infinity; // khoảng trống phía trước
      for (const o of this.cars) {
        if (o === car || o.lane !== car.lane) continue;
        const gap = d * (o.sprite.x - s.x) - car.half - o.half;
        if (gap >= -4 && gap < room) room = gap;
      }
      // người chơi đứng trong làn phía trước: xe chỉ nhường khi người chơi ở vạch kẻ (hoặc chế độ Nhẹ)
      if ((cross || isLight()) && p.y > car.lane.top - 4 && p.y < car.lane.bottom + 8) {
        const gap = d * (p.x - front);
        if (gap > -8 && gap < room) room = gap;
      }
      // vạch qua đường có người: dừng trước vạch
      if (cross) {
        const edge = d > 0 ? cross.x - 6 : cross.x + cross.width + 6;
        const gap = d * (edge - front);
        if (gap > -4 && gap < room) room = gap;
      }
      // trời mưa: xe giảm tốc từ xa hơn (phanh dài)
      const look = LOOK * (this.scene.fx?.().brake || 1);
      const target = frozen ? 0 : room < GAP ? 0 : room < look ? car.max * ((room - GAP) / (look - GAP)) : car.max;
      car.v = target < car.v ? target : Math.min(target, car.v + ACCEL * dt);
      s.body.setVelocityX(d * car.v);
    }
    // bỏ xe đã ra khỏi bản đồ
    this.cars = this.cars.filter(c => {
      const out = c.lane.dir > 0 ? c.sprite.x > W + 120 : c.sprite.x < -120;
      if (out) c.sprite.destroy();
      return !out;
    });
  }
}
