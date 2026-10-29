// Xe cộ trên phố: ô tô, xe buýt, xe máy chạy theo làn (object 'lane' trên bản đồ Tiled).
// Xe dừng trước vạch qua đường khi có người đang băng qua, dừng khi gặp người chơi hoặc xe phía trước; không gây hại.
const propOf = (o, name) => (o.properties || []).find(p => p.name === name)?.value;

export const VEHICLE_SPRITES = ['car1', 'car2', 'car3', 'car4', 'bus', 'bike1', 'bike2'];
const KINDS = {
  car: [['car1', 110], ['car2', 100], ['car3', 120], ['car4', 105], ['bus', 75]],
  bike: [['bike1', 85], ['bike2', 78]]
};
const GAP = 26;         // khoảng cách tối thiểu tới xe phía trước
const LOOK = 70;        // tầm nhìn phía trước để dừng xe
const ACCEL = 160;      // gia tốc (px/s²)

export class Traffic {
  constructor(scene, objs, player) {
    this.scene = scene;
    this.player = player;
    this.lanes = objs.filter(o => o.type === 'lane').map(o => ({
      y: o.y + o.height / 2, dir: propOf(o, 'dir') || 1, kind: propOf(o, 'kind') || 'car', timer: 400 + Math.random() * 2500
    }));
    this.crossings = objs.filter(o => o.type === 'crosswalk');
    this.cars = [];
    this.group = scene.physics.add.group({ immovable: true, allowGravity: false });
    scene.physics.add.collider(player, this.group);
    // Rải sẵn vài xe để đường không trống lúc vào bản đồ
    for (const lane of this.lanes) for (let i = 0; i < 2; i++) this.spawn(lane, Math.random() * scene.map.widthInPixels);
  }

  /** Sprite xe (để bật ánh sáng ban đêm). */
  sprites() { return this.cars.map(c => c.sprite); }

  /** Thêm một xe vào làn; x mặc định ở mép bản đồ phía xe đi tới. */
  spawn(lane, x) {
    const [key, speed] = Phaser.Utils.Array.GetRandom(KINDS[lane.kind]);
    const W = this.scene.map.widthInPixels;
    const sx = x ?? (lane.dir > 0 ? -60 : W + 60);
    const s = this.group.create(sx, lane.y + 18, key).setOrigin(0.5, 1).setFlipX(lane.dir < 0);
    const w = s.width, h = Math.min(18, s.height * 0.5);
    s.body.setSize(w - 8, h).setOffset(4, s.height - h - 2);
    s.body.pushable = false;
    if (this.scene.weather?.kind === 'night' && this.scene.renderer.type === Phaser.WEBGL) s.setPipeline('Light2D');
    const car = { sprite: s, lane, max: speed * (0.9 + Math.random() * 0.2), v: speed, half: w / 2 };
    // không đè lên xe khác lúc rải sẵn
    if (this.cars.some(c => c.lane === lane && Math.abs(c.sprite.x - sx) < c.half + car.half + GAP)) { s.destroy(); return; }
    this.cars.push(car);
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
      // người chơi đứng trong làn phía trước
      if (Math.abs(p.y - (car.lane.y + 10)) < 26) {
        const gap = d * (p.x - front);
        if (gap > -8 && gap < room) room = gap;
      }
      // vạch qua đường có người: dừng trước vạch
      if (cross) {
        const edge = d > 0 ? cross.x - 6 : cross.x + cross.width + 6;
        const gap = d * (edge - front);
        if (gap > -4 && gap < room) room = gap;
      }
      const target = frozen ? 0 : room < GAP ? 0 : room < LOOK ? car.max * ((room - GAP) / (LOOK - GAP)) : car.max;
      car.v = target < car.v ? target : Math.min(target, car.v + ACCEL * dt);
      s.body.setVelocityX(d * car.v);
      s.setDepth(s.y);
    }
    // bỏ xe đã ra khỏi bản đồ
    this.cars = this.cars.filter(c => {
      const out = c.lane.dir > 0 ? c.sprite.x > W + 120 : c.sprite.x < -120;
      if (out) c.sprite.destroy();
      return !out;
    });
  }
}
