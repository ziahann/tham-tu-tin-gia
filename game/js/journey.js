// Hành trình: mở đầu ở TP.HCM (phòng trọ → máy tính → điện thoại → tòa soạn), xe khách liên tỉnh TP.HCM ⇄ Hạ Long,
// kết thúc về tòa soạn TP.HCM báo cáo, nhận danh hiệu. Dữ liệu: quests.json → journey. Tiến độ: progress.journey
// (home → seen → called → briefed → halong → return → done; lượt chơi cũ không có trường này = đang ở Hạ Long).
import { data, t, fill, citeLine } from './data.js';
import { state, saveProgress, setFlag, hasFlag } from './state.js';
import * as dlg from './dialogue.js';
import { conversation, track, caseCutscene, getWorld, isBusy } from './story.js';
import { nextQuestIn, earnedBadges, caseProgress } from './grading.js';
import { trustScore } from './backpack.js';
import { sfx } from './audio.js';
import { toast } from './ui.js';

const J = () => data.quests.journey;

/** Chặng hiện tại của hành trình. */
export const stage = () => state.progress?.journey || 'halong';

/** Đặt chặng mới, lưu và vẽ lại mũi tên / thanh trên. */
function setStage(s) {
  state.progress.journey = s;
  saveProgress();
  getWorld()?.refresh();
}

/** Lượt mới: bắt đầu ở phòng trọ. */
export function startJourney() {
  state.progress.journey = 'home';
  state.progress.pos = { map: 'home', spawnName: 'spawn_start' };
  saveProgress();
}

/** Mục tiêu dẫn đường của hành trình (ưu tiên hơn hồ sơ đang theo dõi), hoặc null. */
export function journeyTarget() {
  switch (stage()) {
    case 'home': return { kind: 'spot', id: 'pc_home' };
    case 'seen': return { kind: 'spot', id: 'phone_home' };
    case 'called': return { kind: 'npc', id: 'npc10' };
    case 'briefed': return { kind: 'spot', id: 'bus_hcm' };
    case 'return': return { kind: 'npc', id: 'npc10' };
    default: return null;
  }
}

/** Dòng "đang theo dõi" của hành trình, hoặc null. */
export const journeyGoal = () => J().goal[stage()] || null;

/** Chú Quốc Trung có việc chờ người chơi không (dấu !). */
export const editorWaiting = () => stage() === 'called' || stage() === 'return';

/** Câu nói của một dòng dữ liệu: điền tên nhân vật, nguồn (nếu có). */
async function line(l) {
  const list = l.cite?.length ? citeLine(l.cite) : '';
  const src = list ? `\n${t('journey.pcSource', { list })}` : '';
  await dlg.say(l.npc || 'system', fill(l.text, { hero: state.progress.heroName }) + src, { mood: l.mood });
}
const lines = async list => { for (const l of list || []) await line(l); };

// ---------------------------------------------------------------- mở đầu

/** Vào phòng trọ lần đầu: disclaimer ngắn, hỏi xem mở đầu hay bỏ qua. */
export async function wakeUp() {
  if (stage() !== 'home' || hasFlag('jr_wake')) return;
  setFlag('jr_wake');
  saveProgress();
  let skip = false;
  await conversation('hero', async () => {
    await dlg.say('system', J().disclaimer);
    const c = await dlg.choose([{ id: 'story', text: J().skipStory }, { id: 'skip', text: J().skipJump }], { speaker: 'system', text: J().skipAsk });
    if (c.id === 'skip') { skip = true; return; }
    await lines(J().wake);
  });
  if (skip) skipPrologue();
}

/** Thẻ bài đăng trên màn hình máy tính (bài sai chỉ là khối trừu tượng, không có hình người). */
function feedBoard() {
  const pc = J().pc;
  const box = document.createElement('div');
  box.className = 'pc-feed';
  box.append(Object.assign(document.createElement('div'), { className: 'pc-feed-head', textContent: pc.title }));
  for (const p of pc.posts) {
    const card = document.createElement('div');
    card.className = `pc-post is-${p.kind}`;
    card.append(Object.assign(document.createElement('div'), { className: 'pc-who', textContent: p.who }));
    if (p.pic) {
      const pic = document.createElement('div');
      pic.className = `pc-pic is-${p.pic} sensitive`;
      pic.append(document.createElement('i'));
      card.append(pic);
    }
    card.append(Object.assign(document.createElement('p'), { textContent: p.text }));
    if (p.cite?.length && citeLine(p.cite)) card.append(Object.assign(document.createElement('p'), { className: 'cite', textContent: t('journey.pcSource', { list: citeLine(p.cite) }) }));
    if (p.stat) card.append(Object.assign(document.createElement('div'), { className: 'pc-stat', textContent: p.stat }));
    box.append(card);
  }
  box.append(Object.assign(document.createElement('p'), { className: 'muted small', textContent: pc.note }));
  return box;
}

/** Máy tính trong phòng trọ: lướt bảng tin, chọn cách phản ứng, quyết định đi Hạ Long. */
async function usePc() {
  const pc = J().pc;
  await conversation('hero', async () => {
    let c;
    do {
      c = await dlg.choose(pc.choices.map(x => ({ ...x })), { speaker: 'hero', text: pc.ask, exhibit: feedBoard() });
      if (c.reply) await dlg.say('hero', c.reply, { mood: 'thinking' });
      if (!hasFlag('jr_pc_lines')) { setFlag('jr_pc_lines'); await lines(pc.lines); }
    } while (c.id !== 'go');
    await lines(pc.decide);
  });
  if (stage() === 'home') setStage('seen');
}

/** Điện thoại đầu giường: gọi tòa soạn TP.HCM, được hẹn lên gặp. */
async function usePhone() {
  const s = stage();
  if (s !== 'seen') { await conversation('hero', () => dlg.say('hero', s === 'home' ? J().phoneEarly : J().phoneLater)); return; }
  await conversation('npc10', async () => {
    sfx('ding');
    await dlg.say('system', J().call.ringing);
    await lines(J().call.lines);
    await line(J().call.after);
  });
  setStage('called');
}

/** Gặp chú Quốc Trung ở tòa soạn TP.HCM: giao ba câu hỏi, thẻ cộng tác viên (hoặc nghe báo cáo lúc về). */
export async function talkEditor() {
  const s = stage();
  if (s === 'called') {
    await conversation('npc10', async () => {
      for (const l of J().brief) {
        await line(l);
        if (l.questions) for (const [i, q] of data.quests.verificationQuestions.entries()) await dlg.say('npc10', `${i + 1}. ${q}`);
      }
      setFlag('press_card');
      sfx('unlock');
      toast(J().cardToast);
    });
    setStage('briefed');
    return;
  }
  if (s === 'return') { await report(); return; }
  const idle = J().editorIdle[s === 'seen' ? 'home' : s] || J().editorIdle.halong;
  await conversation('npc10', () => lines(idle));
}

/** Bỏ qua mở đầu: nhận việc luôn, ngồi xe tới Hạ Long. */
export function skipPrologue() {
  if (!['home', 'seen', 'called', 'briefed'].includes(stage())) return;
  setFlag('press_card');
  setFlag('jr_wake');
  state.progress.journey = 'halong';
  state.progress.introBus = true;
  saveProgress();
  getWorld()?.travel('street', 'spawn_bus');
}

/** Đặt chặng Hạ Long khi lên xe (không cần cảnh mở đầu). */
function arriveHalong() {
  if (hasFlag('jr_arrived')) return;
  setFlag('jr_arrived');
  saveProgress();
  // theo dõi sẵn hồ sơ đầu tiên để mũi tên chỉ đường ngay
  track(nextQuestIn(data.quests.rooms[0].id)?.id || null, true);
  toast(t('title.firstHint'), 6000);
}

/** Gọi khi cảnh xuống xe kết thúc ở bản đồ mapKey. */
export function onArrive(mapKey) {
  if (mapKey === 'street') arriveHalong();
}

// ---------------------------------------------------------------- xe khách

/** Hành động tại một điểm (spot) trên bản đồ. */
export async function spotAct(act, obj) {
  if (isBusy()) return;
  if (act === 'pc_home') return usePc();
  if (act === 'phone_home') return usePhone();
  if (act === 'bus') return busStop((obj.properties || []).find(p => p.name === 'to')?.value);
}

/** Trạm xe khách: chọn điểm đến rồi chơi cảnh vẫy xe (world.hailBus). */
async function busStop(to) {
  const b = J().bus;
  const s = stage();
  if (to === 'street' && ['home', 'seen', 'called'].includes(s)) { await conversation('system', () => dlg.say('system', b.locked)); return; }
  let go = false;
  await conversation('system', async () => {
    const c = await dlg.choose([{ id: 'go', text: b.to[to] }, { id: 'no', text: b.cancel }], { speaker: 'system', text: b.ask });
    go = c.id === 'go';
  });
  if (!go) return;
  if (to === 'street' && s === 'briefed') setStage('halong');
  getWorld()?.hailBus(() => travelScreen(to).then(() => {
    state.progress.introBus = true;
    // xe chạy qua đêm: tới nơi là sáng sớm
    state.progress.clock = 7 * 60;
    saveProgress();
    getWorld()?.travel(to, 'spawn_bus', 'down');
  }));
}

/** Màn chuyển cảnh trên xe: tuyến đường, xe chạy qua từng tỉnh thành. Bấm để bỏ qua. */
function travelScreen(to) {
  const b = J().bus;
  const stops = b.route[to];
  const wrap = document.createElement('div');
  wrap.className = 'trip';
  wrap.setAttribute('role', 'status');
  const box = document.createElement('div');
  box.className = 'trip-box';
  box.append(Object.assign(document.createElement('h2'), { textContent: b.travelTitle }));
  const road = document.createElement('div');
  road.className = 'trip-road';
  stops.forEach((name, i) => {
    const st = Object.assign(document.createElement('span'), { className: 'trip-stop', textContent: name });
    st.style.left = `${(i / (stops.length - 1)) * 100}%`;
    road.append(st);
  });
  const bus = Object.assign(document.createElement('i'), { className: 'trip-bus' });
  road.append(bus);
  box.append(road, Object.assign(document.createElement('p'), { textContent: b.travelText[to] }));
  box.append(Object.assign(document.createElement('p'), { className: 'muted small', textContent: t('cutscene.skip') }));
  wrap.append(box);
  document.body.append(wrap);
  const fast = state.settings.reduceMotion;
  return new Promise(resolve => {
    let i = 0, timer = null;
    const finish = () => { clearInterval(timer); wrap.remove(); resolve(); };
    const step = () => {
      bus.style.left = `${(i / (stops.length - 1)) * 100}%`;
      road.querySelectorAll('.trip-stop').forEach((s, k) => s.classList.toggle('is-past', k <= i));
      if (i++ >= stops.length - 1) { clearInterval(timer); setTimeout(finish, 900); }
    };
    wrap.addEventListener('click', finish);
    step();
    timer = setInterval(step, fast ? 150 : 850);
  });
}

// ---------------------------------------------------------------- kết thúc

/** Thắng trận cuối: chú Quốc Trung gọi về báo cáo (thay cho màn kết quả ngay). */
export async function afterBoss() {
  if (stage() === 'done') return false;
  setStage('return');
  await conversation('npc10', () => lines(J().returnCall));
  return true;
}

/** Lượt chơi cũ đã thắng trận cuối nhưng chưa có kết thúc mới: chuyển sang chặng về báo cáo. */
export function migrate() {
  if (!state.progress) return;
  if (hasFlag('boss_done') && !state.progress.journey && !hasFlag('ending_seen')) state.progress.journey = 'return';
}

/** Danh hiệu theo kết quả: số hồ sơ khép, uy tín trung bình, có đi tắt tới boss không. */
export function titleFor() {
  const flags = state.progress.flags;
  const prog = caseProgress(flags), cred = trustScore();
  const skipped = flags.includes('skipped_to_boss');
  return J().titles.find(x => (x.minDone !== 'all' || prog.done >= prog.total) && cred >= (x.minCred || 0) && !(x.noSkip && skipped));
}

let onEnding = () => {};
/** Hàm hiện màn kết quả (main.js). */
export function setOnEnding(fn) { onEnding = fn; }

/** Báo cáo ở tòa soạn: trả lời lại ba câu hỏi xác minh, tổng kết, trao danh hiệu, rồi màn kết quả. */
async function report() {
  const r = J().report;
  let ok = false;
  await conversation('npc10', async () => {
    await lines(r.intro);
    for (const q of r.questions) {
      for (;;) {
        const c = await dlg.choose(q.options.map((o, i) => ({ ...o, id: `o${i}` })), { speaker: 'npc10', text: q.ask });
        if (c.ok) { sfx('correct'); dlg.react('good'); await dlg.say('npc10', q.right, { mood: 'happy' }); break; }
        sfx('wrong'); dlg.react('bad');
        await dlg.say('npc10', q.wrong, { mood: 'serious' });
      }
    }
    const flags = state.progress.flags;
    const prog = caseProgress(flags);
    await dlg.say('npc10', fill(r.sum, { done: prog.done, total: prog.total, badges: earnedBadges(flags).length, cred: trustScore() }));
    await lines(r.award);
    const title = titleFor();
    state.progress.title = { id: title.id, name: title.name };
    saveProgress();
    await caseCutscene('S9', { name: title.name, learned: title.text }, { title: t('journey.titleFile'), stamp: t('journey.titleStamp'), img: `assets/badges/TITLE_${title.id}.png`, cap: t('journey.titleCap', { name: title.name }) });
    await dlg.say('system', t('journey.titleCap', { name: title.name }));
    await lines(r.outro);
    ok = true;
  });
  if (!ok) return;
  setFlag('ending_seen');
  setStage('done');
  onEnding();
}
