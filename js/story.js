// Cốt truyện: chọn hội thoại khi nói chuyện với NPC, chạy nhiệm vụ trong hội thoại, xem đồ vật, cửa, khu vực.
import { data, t, fill, questById, evidenceById, sceneById, npcById, sourceById, shortCite } from './data.js';
import { state, questState, saveProgress, setFlag, hasFlag, addEvidence, isQuestDone } from './state.js';
import * as dlg from './dialogue.js';
import { matchField, checkCards, isUnlocked, isPlayable, roomStatus, bossStatus, nextQuestIn } from './grading.js';
import { exhibitFor, frameGrid, singleFrame } from './exhibits.js';
import { normalize, containsPhrase } from './text.js';
import { sfx } from './audio.js';
import { toast } from './ui.js';
import { toolWindow, browseContent, deviceSpeaker } from './tools.js';
import { targetMap } from './guide.js';
import { loseCred, easePressure, isLight, roomName, caseOpen, PENALTY } from './obstacles.js';

let world = null;
let busy = false;
let onChange = () => {};

/** Gắn cảnh bản đồ (để NPC dẫn đường, cập nhật cửa). */
export function setWorld(w) { world = w; }

/** Hàm gọi sau mỗi thay đổi tiến độ (cập nhật thanh trên, balo). */
export function setOnChange(fn) { onChange = fn; }

export const isBusy = () => busy;

const matchesFlags = e => (e.requires || []).every(hasFlag) && !(e.excludes || []).some(hasFlag);

/** Mục tương tác đầu tiên khớp điều kiện cho một NPC (hoặc null). */
export function interactionFor(npcId) {
  for (const e of data.npcs.interactions.list) {
    if (e.npc !== npcId || !matchesFlags(e)) continue;
    if (e.quest) {
      const q = questById(e.quest);
      if (!q || isQuestDone(q.id) || !isUnlocked(q)) continue;
    }
    return e;
  }
  return null;
}

/** Các nhiệm vụ đang mở mà NPC này giao (mỗi hồ sơ tối đa một nhiệm vụ, vì trong hồ sơ làm theo thứ tự). */
export function questsFor(npcId) {
  return data.npcs.interactions.list
    .filter(e => e.npc === npcId && e.quest && matchesFlags(e))
    .map(e => questById(e.quest))
    .filter(q => q && isPlayable(q) && !isQuestDone(q.id) && isUnlocked(q));
}

/** NPC giao một nhiệm vụ ('boss' cho Phòng họp). */
export function giverOf(questId) {
  if (questId === 'boss') return 'boss';
  return data.npcs.interactions.list.find(e => e.quest === questId)?.npc || null;
}

/** Phòng (hồ sơ) của nhiệm vụ đang theo dõi, hoặc null. */
export function trackedRoom() {
  const id = state.progress?.tracked;
  if (id === 'boss') return 'S9';
  return id ? questById(id)?.room || null : null;
}

/** Theo dõi một nhiệm vụ (id, 'boss' hoặc null): mũi tên chỉ tới người giao việc. */
export function track(id, quiet = false) {
  state.progress.tracked = id;
  saveProgress();
  if (id && !quiet) {
    sfx('track');
    const title = id === 'boss' ? t('backpack.bossCase') : questById(id)?.title;
    toast(t('dialog.tracking', { title }));
  }
  onChange();
  world?.refresh();
}

/** NPC có việc cốt truyện / nhiệm vụ đang chờ không (để hiện dấu !). */
export function hasStoryFor(npcId) {
  const e = interactionFor(npcId);
  return (!!e && !e.idle) || questsFor(npcId).length > 0;
}

/** Hỏi người chơi muốn làm hồ sơ nào khi NPC có nhiều hồ sơ đang mở; null = để sau. */
async function pickQuest(npcId, room) {
  const list = questsFor(npcId);
  if (list.length <= 1) return list[0] || null;
  const inRoom = room && list.find(q => q.room === room);
  if (inRoom) return inRoom;
  // Hồ sơ đang theo dõi và hồ sơ của phòng đang đứng lên đầu.
  const here = world?.zoneRoom?.();
  const rank = q => (q.id === state.progress.tracked ? 0 : q.room === here ? 1 : 2);
  list.sort((a, b) => rank(a) - rank(b));
  const roomName = id => data.quests.rooms.find(r => r.id === id)?.name || id;
  const c = await dlg.choose([
    ...list.map(q => ({ id: q.id, text: t('dialog.caseOption', { room: roomName(q.room), title: q.title }) })),
    { id: '_later', text: t('dialog.notNow') }
  ], { speaker: npcId, text: t('dialog.pickCase') });
  return c.id === '_later' ? null : questById(c.id);
}

/** Chạy một đoạn hội thoại có giới hạn: khóa điều khiển, mở khung thoại, đóng khi xong. */
async function conversation(partner, body, portrait) {
  if (busy) return;
  busy = true;
  dlg.begin(partner, portrait);
  try { await body(); } finally {
    dlg.end();
    busy = false;
    onChange();
  }
}

/** Phát một cảnh viết sẵn (lời thoại + lựa chọn rẽ nhánh). */
async function playScene(sceneId) {
  let scene = sceneById(sceneId);
  while (scene) {
    for (const line of scene.lines) await dlg.say(line.npc || scene.npc, line.text, { dialogueId: scene.id, lineId: line.id, mood: line.mood });
    if (!scene.choices?.length) return;
    const choice = await dlg.choose(scene.choices.map(c => ({ ...c })));
    (choice.setFlags || []).forEach(setFlag);
    saveProgress();
    if (!choice.next || choice.next === 'end') return;
    scene = sceneById(choice.next);
  }
}

/** Người chơi nói chuyện với NPC. room: vừa bước vào phòng này thì làm luôn hồ sơ của phòng. */
export async function talkTo(npcId, room = null) {
  let lead = null;
  world?.setTalking(npcId, true);
  await conversation(npcId, async () => {
    const e = interactionFor(npcId);
    // Người qua đường: nói lần lượt từng câu (không giao nhiệm vụ)
    // Lần đầu gặp: chào hỏi, làm quen
    const greet = data.npcs.greetings?.[npcId];
    if (greet && !hasFlag(`met_${npcId}`)) {
      for (const g of greet) await dlg.say(g.npc || npcId, g.text, { mood: g.mood });
      setFlag(`met_${npcId}`);
      saveProgress();
    }
    if (npcId === 'amb_guard' && !hasFlag('visitor_card')) {
      await dlg.say(npcId, t('obstacles.guardCard'), { mood: 'happy' });
      setFlag('visitor_card');
      saveProgress();
      sfx('unlock');
      toast(t('obstacles.gotCard'));
      return;
    }
    const amb = data.npcs.ambientLines?.[npcId];
    if (!e && amb) {
      const said = (state.progress.ambientSaid ||= {});
      const i = said[npcId] || 0;
      said[npcId] = i + 1;
      saveProgress();
      await dlg.say(npcId, amb[i % amb.length]);
      return;
    }
    if (!e) return;
    if (e.scene) {
      await playScene(e.scene);
      (e.setFlags || []).forEach(setFlag);
      saveProgress();
      lead = e.lead || null;
      // Cảnh cốt truyện (không phải câu chào thường) xong thì chuyển sang chọn hồ sơ.
      if (e.idle) return;
    }
    await roomIntro(npcId);
    // Nhiệm vụ: làm liên tiếp trong cùng hồ sơ nếu người chơi không dừng giữa chừng.
    let q = await pickQuest(npcId, room);
    while (q) {
      if (state.progress.tracked !== q.id) track(q.id, true);
      if (!(await runQuest(q, npcId))) return;
      const next = nextQuestIn(q.room);
      q = next && giverOf(next.id) === npcId ? next : null;
    }
  });
  world?.setTalking(npcId, false);
  if (lead) world?.npcLead(npcId, lead);
  world?.refresh();
}

// ---------------------------------------------------------------- nhiệm vụ trong hội thoại

/** Chạy một nhiệm vụ; trả về true nếu hoàn thành. */
async function runQuest(q, npc) {
  const qs = questState(q.id);
  if (q.npcIntro && !hasFlag(`intro_${q.id}`)) {
    await playScene(q.npcIntro);
    setFlag(`intro_${q.id}`);
    saveProgress();
  }
  const result = q.steps ? await runSteps(q, qs, npc) : q.mode === 'G2' ? await runCards(q, qs, npc) : await runFields(q, qs, npc);
  saveProgress();
  if (result !== 'done') return false;
  await completeQuest(q, qs, npc);
  return true;
}

/** Mở các nguồn của nhiệm vụ (kèm tóm tắt dự phòng) cho tới khi người chơi đọc xong. */
async function showSources(q, npc, text, ids = q.resources) {
  await dlg.links(ids || [], { speaker: npc, text });
}

/**
 * Menu trợ giúp: gợi ý / mở lại nguồn / hướng dẫn từng bước / để sau / quay lại.
 * field: ô đang hỏi (G1) — gợi ý và hướng dẫn lấy theo từng câu hỏi; không có thì dùng của nhiệm vụ.
 * Trả về 'retry' hoặc 'later'.
 */
async function helpMenu(q, qs, npc, afterWrong, field = null) {
  const hints = field?.hints || q.hints || [];
  const walkthrough = field?.walkthrough || q.walkthrough;
  const resources = field?.resources || q.resources;
  const key = field?.id || '_quest';
  qs.hintsBy ||= {};
  const used = qs.hintsBy[key] || 0;
  const options = [
    { id: 'retry', text: afterWrong ? t('dialog.retry') : t('dialog.backToAnswer') },
    ...(hints.length ? [{ id: 'hint', text: t('dialog.hint', { n: Math.min(used + 1, hints.length), max: hints.length }) }] : []),
    ...(resources?.length ? [{ id: 'sources', text: t('dialog.reopenSources') }] : []),
    ...(walkthrough ? [{ id: 'walk', text: t('dialog.cantFind') }] : []),
    { id: 'later', text: t('dialog.later') }
  ];
  const c = await dlg.choose(options);
  if (c.id === 'hint') {
    if (used >= hints.length) {
      await dlg.say(npc, t('dialog.noMoreHints'));
    } else {
      qs.hintsBy[key] = used + 1;
      qs.hints++; // tổng số gợi ý, dùng để tính điểm
      saveProgress();
      await dlg.say(npc, t('dialog.hintLine', { n: used + 1, max: hints.length, text: hints[used] }));
    }
  } else if (c.id === 'sources') {
    await showSources(q, npc, t('dialog.openSourcesLine'), resources);
  } else if (c.id === 'walk') {
    qs.walkthrough = true;
    saveProgress();
    await dlg.say(npc, t('dialog.walkthrough', { text: walkthrough }));
  } else if (c.id === 'later') {
    await dlg.say(npc, t('dialog.laterLine'));
    return 'later';
  }
  return 'retry';
}

/** Phản ứng khi trả lời: chân dung đổi biểu cảm, bong bóng trên đầu NPC và nhân vật chính ngoài bản đồ. */
function reactTo(npc, kind) {
  dlg.react(kind);
  world?.emote(npc, kind === 'good' ? '♪' : '!');
  world?.emote('hero', kind === 'good' ? '✓' : '?');
}

/**
 * Trả lời sai / một phần: trừ độ tin cậy của hồ sơ. Về 0 thì hồ sơ đặt lại từ đầu: báo cho người chơi và trả về true
 * (nhiệm vụ đang chạy phải dừng ngay).
 */
async function penalize(q, npc, status) {
  return creditHit(q.room, status === 'partial' ? PENALTY.partial : PENALTY.wrong, npc);
}

/** Trừ độ tin cậy của một hồ sơ, hiện thông báo; trả về true nếu hồ sơ vừa bị đặt lại. */
async function creditHit(room, n, speaker = 'system') {
  const res = loseCred(room, n);
  onChange();
  if (res === 'lost') toast(t('obstacles.credLost', { n, room: roomName(room) }));
  if (res !== 'reset') return false;
  await dlg.say(speaker, t('obstacles.caseReset', { room: roomName(room) }), { mood: 'serious' });
  world?.refresh();
  return true;
}

/** G2: chọn các thẻ mệnh đề cần thẩm định. */
async function runCards(q, qs, npc) {
  let picked = qs.answers.picked || [];
  let ask = { speaker: npc, text: q.question };
  for (;;) {
    const r = await dlg.multi(q.cards, { ...ask, picked, submitLabel: q.submitLabel });
    ask = { speaker: npc, text: q.question };
    if (r.help) {
      if (await helpMenu(q, qs, npc, false) === 'later') return 'later';
      continue;
    }
    picked = r.ids;
    qs.answers.picked = picked;
    const res = checkCards(q, picked);
    reactTo(npc, res.status === 'correct' ? 'good' : 'bad');
    if (res.status === 'correct') return 'done';
    qs.fails++;
    saveProgress();
    sfx(res.status === 'partial' ? 'partial' : 'wrong');
    for (const c of res.wrong) {
      await dlg.say(npc, `✗ ${c.text} — ${c.feedback}`);
      if (c.npcReact) await playScene(c.npcReact);
    }
    if (!res.wrong.length && res.missing) await dlg.say(npc, t('dialog.missingCards', { n: res.missing }));
    await dlg.say(npc, `${t(`result.${res.status}`)} ${q.feedback[res.status]}`);
    if (await penalize(q, npc, res.status)) return 'later';
    if (await helpMenu(q, qs, npc, true) === 'later') return 'later';
  }
}

/** G1: mở nguồn, rồi trả lời từng ô do NPC hỏi. */
async function runFields(q, qs, npc) {
  if (!qs.readSources) {
    await dlg.say(npc, q.question);
    if (q.safetyNote) await dlg.say(npc, q.safetyNote);
    await showSources(q, npc, t('dialog.openSourcesLine'));
    qs.readSources = true;
    saveProgress();
  }
  qs.fieldOk ||= {};
  for (const f of q.fields) {
    while (!qs.fieldOk[f.id]) {
      const r = await dlg.input({ speaker: npc, text: f.ask || f.label, label: f.label, placeholder: f.placeholder });
      if (r.help) {
        if (await helpMenu(q, qs, npc, false, f) === 'later') return 'later';
        continue;
      }
      qs.answers[f.id] = r.value;
      const res = matchField(r.value, f.accepts, f.fuzzy !== false);
      reactTo(npc, res !== 'wrong' ? 'good' : 'bad');
      if (res !== 'wrong') {
        qs.fieldOk[f.id] = true;
        saveProgress();
        sfx('partial');
        await dlg.say(npc, res === 'right' ? `✓ ${t('dialog.fieldRight')}` : `✓ ${t('dialog.fieldAlmost', { answer: r.value })}`);
        break;
      }
      qs.fails++;
      saveProgress();
      sfx('wrong');
      await dlg.say(npc, `✗ ${t('dialog.fieldWrong')}`);
      if (await penalize(q, npc, 'wrong')) return 'later';
      if (await helpMenu(q, qs, npc, true, f) === 'later') return 'later';
    }
  }
  return 'done';
}

/** Bước chưa xong đầu tiên của một nhiệm vụ nhiều bước (hoặc null). */
const nextStep = q => q.steps?.find(st => !state.progress.questProgress[q.id]?.stepOk?.[st.id]) || null;

/** Tên thiết bị / NPC để chèn vào lời thoại. */
const deviceName = id => t(`devices.${id}.name`);
const npcName = id => npcById(id)?.name || id;

let activeQuest = null; // nhiệm vụ đang chạy (để thiết bị kho báo mở đúng nguồn)

/**
 * Nhiệm vụ nhiều bước (choice | input | flaws | match...); mỗi bước có tư liệu, gợi ý và hướng dẫn riêng.
 * Bước có `tool` chỉ làm được tại thiết bị đó ở Phòng xác minh: NPC gửi người chơi tới thiết bị, làm xong ở thiết bị
 * thì quay lại NPC. device: thiết bị đang dùng (null = đang nói chuyện với NPC). Trả về 'done' | 'later' | 'tool'.
 */
async function runSteps(q, qs, npc, device = null) {
  qs.stepOk ||= {};
  activeQuest = q;
  const speaker = device ? deviceSpeaker(device) : npc;
  if (!qs.started) {
    await dlg.say(npc, q.question);
    const readable = (q.resources || []).filter(id => sourceById(id)?.urlStatus !== 'tool');
    if (readable.length) await showSources(q, npc, q.safetyNote || t('dialog.openSourcesLine'), readable);
    else if (q.safetyNote) await dlg.say(npc, q.safetyNote);
    qs.started = true;
    saveProgress();
  }
  for (const step of q.steps) {
    if (qs.stepOk[step.id]) continue;
    if ((step.tool || null) !== device) {
      // Bước này phải làm ở nơi khác: tới thiết bị, hoặc quay về báo cáo NPC.
      if (step.tool) await dlg.say(speaker, device ? t('devices.nextDevice', { device: deviceName(step.tool) }) : t('devices.goTo', { device: deviceName(step.tool) }));
      else await dlg.say(speaker, t('devices.reportBack', { npc: npcName(giverOf(q.id) || npc) }), { mood: 'happy' });
      return 'tool';
    }
    while (!qs.stepOk[step.id]) {
      const r = await STEP_RUNNERS[step.type](step, speaker, qs);
      if (r === 'help') {
        if (await helpMenu(q, qs, speaker, false, step) === 'later') return 'later';
        continue;
      }
      if (r === 'again') continue;
      if (r === 'ok') {
        reactTo(speaker, 'good');
        qs.stepOk[step.id] = true;
        easePressure(20);
        saveProgress();
        onChange();
        break;
      }
      qs.fails++;
      saveProgress();
      sfx(r === 'partial' ? 'partial' : 'wrong');
      reactTo(speaker, 'bad');
      if (await penalize(q, speaker, r)) return 'later';
      if (await helpMenu(q, qs, speaker, true, step) === 'later') return 'later';
    }
  }
  if (device) {
    await dlg.say(speaker, t('devices.reportBack', { npc: npcName(giverOf(q.id) || npc) }), { mood: 'happy' });
    return 'tool';
  }
  return 'done';
}

/** Tư liệu của bước; bước làm ở thiết bị thì bọc trong cửa sổ công cụ (kho báo: trình đọc các nguồn của nhiệm vụ). */
function exhibitOf(step) {
  if (!step.tool) return exhibitFor(step);
  const body = document.createElement('div');
  if (step.tool === 'archive') body.append(exhibitFor({ resources: activeQuest?.resources }) || '');
  body.querySelector('details')?.setAttribute('open', '');
  const ex = exhibitFor(step.tool === 'archive' ? { ...step, resources: null } : step);
  if (ex) body.append(ex);
  // bước tương tác (xếp mốc, soi lỗi...) tự dựng cửa sổ công cụ qua toolHost
  return body.childNodes.length ? toolWindow(step.tool, body) : null;
}

/** Chỗ gắn giao diện của bước tùy chỉnh: trong cửa sổ công cụ nếu bước làm ở thiết bị. */
function toolHost(box, step) {
  if (!step.tool) return box;
  const inner = document.createElement('div');
  if (step.tool === 'timeline' && activeQuest?.resources) inner.append(exhibitFor({ resources: activeQuest.resources }));
  box.append(toolWindow(step.tool, inner));
  return inner;
}

/** Hồ sơ đang chờ một thiết bị (bước kế tiếp cần thiết bị này); ưu tiên hồ sơ đang theo dõi. */
export function questForDevice(device) {
  const list = data.quests.quests.filter(q => q.steps && isPlayable(q) && !isQuestDone(q.id) && isUnlocked(q)
    && state.progress.questProgress[q.id]?.started && nextStep(q)?.tool === device);
  return list.find(q => q.id === state.progress.tracked) || list[0] || null;
}

/** Người chơi dùng một thiết bị ở Phòng xác minh. */
export async function useDevice(device) {
  const sp = deviceSpeaker(device);
  const q = questForDevice(device);
  sfx('boot');
  await conversation(sp, async () => {
    // Lần đầu dùng thiết bị: hướng dẫn ngắn cách dùng
    if (!hasFlag(`tut_${device}`)) {
      for (const line of data.ui.devices[device]?.tutorial || []) await dlg.say(sp, line, { mood: 'thinking' });
      setFlag(`tut_${device}`);
      saveProgress();
    }
    if (q) {
      const qs = questState(q.id);
      await dlg.say(sp, `${t('devices.taskLine', { title: q.title })} ${q.question}`, { mood: 'thinking' });
      const r = await runSteps(q, qs, giverOf(q.id), device);
      saveProgress();
      if (r === 'done') await completeQuest(q, qs, giverOf(q.id));
      return;
    }
    const r = await dlg.interactive({ speaker: sp, text: t('devices.browse'), wide: true }, (box, done) => {
      box.append(toolWindow(device, browseContent(device, exhibitFor)), actionRow(
        dlg.makeButton('btn-primary', t('devices.off'), () => done({})),
        dlg.makeButton('btn', t('devices.tutorialAgain'), () => done({ tut: true }))));
    });
    if (r?.tut) for (const line of data.ui.devices[device]?.tutorial || []) await dlg.say(sp, line, { mood: 'thinking' });
  });
  world?.refresh();
}

/**
 * Thang máy của Trụ sở Báo Thanh Niên: chọn tầng. Tầng đang đứng, tầng có hồ sơ đang theo dõi (đặt sẵn con trỏ)
 * và tầng thượng (Phòng họp, mở khi đủ điều kiện boss) được ghi rõ.
 */
export async function useElevator() {
  const floors = data.quests.building?.floors || [];
  const here = world?.mapKey;
  if (here === 'tn_lobby' && !hasFlag('visitor_card')) { await notice(t('obstacles.needCard')); return; }
  const goal = world ? targetMap(world) : null;
  const bossOpen = ['open', 'done'].includes(bossStatus(state.progress.flags));
  let pick = null;
  await conversation('system', async () => {
    const options = floors.map(f => {
      const tags = [f.map === here ? t('elevator.here') : '', f.map === goal ? t('elevator.tracked') : '', f.room === 'S9' && !bossOpen ? t('elevator.locked') : ''].filter(Boolean);
      return { id: f.map, text: `${f.label} · ${f.name}${tags.length ? `  (${tags.join(' · ')})` : ''}`, f };
    });
    options.push({ id: '_stay', text: t('elevator.cancel') });
    const c = await dlg.choose(options, { speaker: 'system', text: t('elevator.ask'), focus: options.findIndex(o => o.id === goal && goal !== here) });
    if (c.id === '_stay' || c.id === here) return;
    if (c.f.room === 'S9' && !bossOpen) { await dlg.say('system', t('elevator.lockedLine')); return; }
    pick = c.f;
  });
  if (!pick) return;
  // thang đang ở tầng khác: chờ một lúc (chế độ Nhẹ thì đi ngay)
  if (!isLight() && Math.random() < 0.5) {
    const other = floors.filter(f => f.map !== here);
    busy = true;
    toast(t('obstacles.elevatorBusy', { n: Phaser.Utils.Array.GetRandom(other)?.label || '' }));
    await new Promise(r => setTimeout(r, 2600));
    busy = false;
  }
  sfx('ding');
  world?.travel(pick.map, pick.spawn || 'spawn_elevator', 'down');
}

/** Mục tiêu dẫn đường của hồ sơ đang theo dõi: { kind: 'npc' | 'device', id } hoặc null. */
export function trackTarget() {
  const id = state.progress?.tracked;
  if (!id) return null;
  const q = questById(id);
  const st = q && state.progress.questProgress[q.id]?.started && nextStep(q);
  if (st?.tool) return { kind: 'device', id: st.tool };
  const npc = giverOf(id);
  return npc ? { kind: 'npc', id: npc } : null;
}

/** Hàng nút cho bước tùy chỉnh. */
function actionRow(...buttons) {
  const row = document.createElement('div');
  row.className = 'row';
  row.append(...buttons);
  return row;
}

/**
 * Dòng thời gian kéo thả: các mốc nằm lẫn lộn phía trên, trục ngày phía dưới (step.slots). Kéo thả mốc vào ô ngày,
 * hoặc bấm mốc rồi bấm ô (điện thoại, bàn phím). Xếp đúng thì vệt "tin sai lan" chạy dọc trục (step.spread).
 */
async function timelineStep(step, npc, qs) {
  const placed = Array(step.slots.length).fill(null);
  const order = shuffled(step.items);
  let picked = null;
  // cửa sổ công cụ (kèm trình đọc báo) do toolHost dựng; không thêm tư liệu lần nữa
  const r = await dlg.interactive({ speaker: npc, text: step.ask, wide: true }, (outer, done, help) => {
    const box = toolHost(outer, step);
    const pool = el('div', 'tl-pool');
    const axis = el('div', 'tl-axis');
    const note = el('p', 'muted tl-note', '');
    const card = it => {
      const c = dlg.makeButton('tl-card', it.text, e => { e?.stopPropagation?.(); picked = picked === it ? null : it; sfx('click'); render(); });
      c.draggable = true;
      c.addEventListener('dragstart', e => { picked = it; e.dataTransfer.setData('text/plain', it.id); });
      c.classList.toggle('is-picked', picked === it);
      return c;
    };
    const put = (i, it) => {
      const old = placed.indexOf(it);
      if (old >= 0) placed[old] = null;
      placed[i] = it;
      picked = null;
      sfx('paper');
      render();
    };
    const render = () => {
      pool.innerHTML = '';
      order.filter(it => !placed.includes(it)).forEach(it => pool.append(card(it)));
      axis.innerHTML = '';
      step.slots.forEach((label, i) => {
        const slot = el('div', 'tl-slot');
        slot.append(el('div', 'tl-date', label));
        const drop = el('div', 'tl-drop');
        drop.tabIndex = 0;
        if (placed[i]) drop.append(card(placed[i]));
        else drop.textContent = t('dialog.timelineDrop');
        const act = () => { if (picked) put(i, picked); };
        drop.addEventListener('click', act);
        drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
        drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('is-over'); });
        drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
        drop.addEventListener('drop', e => {
          e.preventDefault();
          const it = step.items.find(x => x.id === e.dataTransfer.getData('text/plain'));
          if (it) put(i, it);
        });
        slot.append(drop);
        axis.append(slot);
      });
      note.textContent = picked ? t('dialog.timelinePick', { text: picked.text }) : '';
    };
    render();
    box.append(pool, note, axis, actionRow(
      dlg.makeButton('btn-primary', t('dialog.orderSubmit'), () => {
        if (placed.some(x => !x)) { toast(t('dialog.sortMissing')); return; }
        done({ ids: placed.map(it => it.id), log: placed.map((it, i) => `${step.slots[i]}: ${it.text}`).join('\n') });
      }),
      dlg.makeButton('btn', t('dialog.orderReset'), () => { placed.fill(null); picked = null; render(); }),
      dlg.makeButton('btn', t('dialog.help'), help)
    ));
  });
  if (r.help) return 'help';
  qs.answers[step.id] = r.ids;
  const ok = r.ids.filter((id, i) => step.answer[i] === id).length;
  if (ok === step.answer.length) {
    sfx('partial');
    await dlg.interactive({ speaker: npc, text: t('result.correct'), wide: true }, (box, done) => {
      box.append(spreadAxis(step), actionRow(dlg.makeButton('btn-primary', t('dialog.next'), () => done({}))));
    });
    return 'ok';
  }
  await dlg.say(npc, `✗ ${t('dialog.orderWrong', { n: ok, total: step.answer.length })}`);
  return ok > 0 ? 'partial' : 'wrong';
}

/** Trục thời gian đã xếp đúng: vệt đỏ "tin sai lan" chạy từ mốc tin sai tới cuối, mốc đính chính màu xanh. */
function spreadAxis(step) {
  const wrap = el('div', 'tl-result');
  const axis = el('div', 'tl-axis is-done');
  step.answer.forEach((id, i) => {
    const slot = el('div', `tl-slot${step.spread?.fix?.includes(i) ? ' is-fix' : ''}${i === step.spread?.from ? ' is-start' : ''}`);
    slot.append(el('div', 'tl-date', step.slots[i]), el('div', 'tl-card is-static', step.items.find(it => it.id === id).text));
    axis.append(slot);
  });
  wrap.append(axis);
  if (step.spread) {
    const n = step.slots.length;
    const bar = el('div', 'tl-spread', step.spread.label);
    bar.style.left = `${(step.spread.from / n) * 100}%`;
    bar.style.setProperty('--w', `${((n - step.spread.from) / n) * 100}%`);
    wrap.prepend(bar);
    if (step.spread.fixLabel) wrap.append(el('p', 'tl-legend', `■ ${step.spread.fixLabel}`));
  }
  return wrap;
}

// Mỗi loại bước trả về 'ok' | 'partial' | 'wrong' | 'help'.
const STEP_RUNNERS = {
  /** Chọn một đáp án; NPC nhận xét theo lựa chọn. */
  async choice(step, npc) {
    const options = step.options.map(o => ({ id: o.id, text: o.text, o }));
    const c = await dlg.choose([...options, { id: '_help', text: t('dialog.help'), silent: true }],
      { speaker: npc, text: step.ask, exhibit: exhibitOf(step) });
    if (c.id === '_help') return 'help';
    sfx(c.o.correct ? 'partial' : 'wrong');
    await dlg.say(npc, `${c.o.correct ? '✓' : '✗'} ${c.o.feedback}`);
    return c.o.correct ? 'ok' : 'wrong';
  },

  /** Gõ câu trả lời đọc được từ tư liệu. */
  async input(step, npc, qs) {
    const r = await dlg.input({ speaker: npc, text: step.ask, label: step.ask, placeholder: step.placeholder, exhibit: exhibitOf(step) });
    if (r.help) return 'help';
    qs.answers[step.id] = r.value;
    const res = matchField(r.value, step.accepts, step.fuzzy !== false);
    if (res === 'wrong') {
      await dlg.say(npc, `✗ ${t('dialog.fieldWrong')}`);
      return 'wrong';
    }
    sfx('partial');
    await dlg.say(npc, res === 'right' ? `✓ ${t('dialog.fieldRight')}` : `✓ ${t('dialog.fieldAlmost', { answer: r.value })}`);
    return 'ok';
  },

  /** Kính soi lỗi: đánh dấu các khung có dấu hiệu bất thường trên lưới mô phỏng. */
  async flaws(step, npc, qs) {
    const marked = new Set(qs.answers[step.id] || []);
    const r = await dlg.interactive({ speaker: npc, text: step.ask, wide: true }, (outer, done, help) => {
      const box = toolHost(outer, step);
      box.append(frameGrid(step.exhibit, {
        marked,
        onPick: n => { marked.has(n) ? marked.delete(n) : marked.add(n); sfx('click'); }
      }));
      box.append(actionRow(
        dlg.makeButton('btn-primary', t('exhibit.submitMarks'), () => {
          if (!marked.size) { toast(t('exhibit.emptyMarks')); return; }
          const marks = [...marked].sort((a, b) => a - b);
          done({ marks, log: `${t('exhibit.marked')}: ${marks.map(n => t('exhibit.frame', { n })).join(', ')}` });
        }),
        dlg.makeButton('btn', t('dialog.help'), help)
      ));
    });
    if (r.help) return 'help';
    qs.answers[step.id] = r.marks;
    const m = new Set(r.marks);
    let all = true, any = false;
    for (const g of step.groups) {
      if (g.frames.filter(n => m.has(n)).length >= g.min) { any = true; await dlg.say(npc, `✓ ${g.found}`); }
      else { all = false; await dlg.say(npc, `? ${g.missing}`); }
    }
    if (step.bonus && step.bonus.frames.every(n => m.has(n))) await dlg.say(npc, `✓ ${step.bonus.text}`);
    const trapped = step.traps.frames.some(n => m.has(n));
    if (trapped) await dlg.say(npc, `✗ ${step.traps.text}`);
    const known = new Set([...step.groups.flatMap(g => g.frames), ...step.traps.frames]);
    const neutral = r.marks.filter(n => !known.has(n));
    if (neutral.length) await dlg.say(npc, neutral.map(n => fill(step.neutral, { n })).join(' '));
    if (all && !trapped) return 'ok';
    return any ? 'partial' : 'wrong';
  },

  /** Đối chiếu: tìm ô trong lưới là cùng một ảnh với khung mẫu. */
  async match(step, npc) {
    const r = await dlg.interactive({ speaker: npc, text: step.ask, wide: true }, (outer, done, help) => {
      const box = toolHost(outer, step);
      box.append(singleFrame(step.ref.set, step.ref.frame, t('exhibit.ref', { n: step.ref.frame })));
      box.append(frameGrid(step.exhibit, {
        onPick: n => done({ pick: n, log: t('dialog.youPicked', { text: t('exhibit.cell', { n }) }) })
      }));
      box.append(actionRow(dlg.makeButton('btn', t('dialog.help'), help)));
    });
    if (r.help) return 'help';
    if (r.pick === step.answer) {
      sfx('partial');
      await dlg.say(npc, `✓ ${t('dialog.matchRight', { n: r.pick })}`);
      return 'ok';
    }
    await dlg.say(npc, `✗ ${step.wrong?.[r.pick] || t('dialog.matchWrong')}`);
    return 'wrong';
  }
};

/** Xáo trộn một mảng (bản sao). */
const shuffled = arr => arr.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);

/** Tạo phần tử với class và chữ. */
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

Object.assign(STEP_RUNNERS, {
  /** Lời thoại chen ngang (nhiều nhân vật), không cần trả lời. */
  async say(step) {
    for (const line of step.lines) await dlg.say(line.npc, line.text);
    return 'ok';
  },

  /** Chọn nhiều thẻ: đúng khi chọn đủ thẻ đúng và không chọn thẻ sai. */
  async multi(step, npc, qs) {
    const r = await dlg.multi(step.cards, { speaker: npc, text: step.ask, exhibit: exhibitOf(step), picked: qs.answers[step.id] || [] });
    if (r.help) return 'help';
    qs.answers[step.id] = r.ids;
    const res = checkCards(step, r.ids);
    for (const c of res.wrong) await dlg.say(npc, `✗ ${c.text} — ${c.feedback}`);
    if (res.status === 'correct') {
      sfx('partial');
      await dlg.say(npc, t('result.correct'));
      return 'ok';
    }
    if (!res.wrong.length && res.missing) await dlg.say(npc, `? ${t('dialog.multiMissing', { n: res.missing })}`);
    return res.status;
  },

  /** Xếp thứ tự: bấm lần lượt các mốc từ sớm đến muộn. */
  async order(step, npc, qs) {
    if (step.slots) return timelineStep(step, npc, qs);
    const pool = shuffled(step.items);
    const r = await dlg.interactive({ speaker: npc, text: step.ask, exhibit: exhibitOf(step), wide: true }, (outer, done, help) => {
      const box = toolHost(outer, step);
      const seq = [];
      const out = el('ol', 'order-seq');
      const left = el('div', 'order-pool');
      const render = () => {
        out.innerHTML = '';
        seq.forEach(it => out.append(el('li', null, it.text)));
        left.innerHTML = '';
        pool.filter(it => !seq.includes(it)).forEach(it => {
          left.append(dlg.makeButton('btn', it.text, () => { seq.push(it); sfx('click'); render(); }));
        });
        left.querySelector('button')?.focus();
      };
      render();
      box.append(el('p', 'muted', t('dialog.orderPick')), left, out, actionRow(
        dlg.makeButton('btn-primary', t('dialog.orderSubmit'), () => {
          if (seq.length < step.items.length) { toast(t('dialog.sortMissing')); return; }
          done({ ids: seq.map(it => it.id), log: seq.map((it, i) => `${i + 1}. ${it.text}`).join('\n') });
        }),
        dlg.makeButton('btn', t('dialog.orderReset'), () => { seq.length = 0; render(); }),
        dlg.makeButton('btn', t('dialog.help'), help)
      ));
    });
    if (r.help) return 'help';
    qs.answers[step.id] = r.ids;
    const ok = r.ids.filter((id, i) => step.answer[i] === id).length;
    if (ok === step.answer.length) {
      sfx('partial');
      await dlg.say(npc, t('result.correct'));
      return 'ok';
    }
    await dlg.say(npc, `✗ ${t('dialog.orderWrong', { n: ok, total: step.answer.length })}`);
    return ok > 0 ? 'partial' : 'wrong';
  },

  /** Phân nhóm: mỗi mục chọn một nhóm; một mục có thể chấp nhận nhiều nhóm. */
  async sort(step, npc, qs) {
    const choice = { ...(qs.answers[step.id] || {}) };
    const r = await dlg.interactive({ speaker: npc, text: step.ask, exhibit: exhibitOf(step), wide: true }, (box, done, help) => {
      for (const item of step.items) {
        const row = el('div', 'sort-item');
        const btns = el('div', 'sort-cats');
        btns.setAttribute('role', 'group');
        btns.setAttribute('aria-label', item.text);
        const sync = () => btns.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(choice[item.id] === b.dataset.cat)));
        for (const cat of step.categories) {
          const b = dlg.makeButton('', cat.label, () => { choice[item.id] = cat.id; sfx('click'); sync(); });
          b.dataset.cat = cat.id;
          btns.append(b);
        }
        sync();
        row.append(el('p', null, item.text), btns);
        box.append(row);
      }
      box.append(actionRow(
        dlg.makeButton('btn-primary', t('dialog.sortSubmit'), () => {
          if (step.items.some(it => !choice[it.id])) { toast(t('dialog.sortMissing')); return; }
          const label = id => step.categories.find(c => c.id === id).label;
          done({ choice, log: step.items.map(it => `${it.text} → ${label(choice[it.id])}`).join('\n') });
        }),
        dlg.makeButton('btn', t('dialog.help'), help)
      ));
    });
    if (r.help) return 'help';
    qs.answers[step.id] = r.choice;
    let ok = 0;
    for (const item of step.items) {
      if (item.accept.includes(r.choice[item.id])) {
        ok++;
        await dlg.say(npc, t('dialog.sortRight', { item: item.text, feedback: item.feedback }));
      } else {
        await dlg.say(npc, t('dialog.sortWrong', { item: item.text }));
      }
    }
    if (ok === step.items.length) return 'ok';
    return ok > 0 ? 'partial' : 'wrong';
  },

  /** Câu hỏi mở: không chấm đúng sai, chỉ nhận xét các ý đã nêu. */
  async open(step, npc, qs) {
    const r = await dlg.input({ speaker: npc, text: step.ask, label: step.ask, placeholder: step.placeholder });
    if (r.help) return 'help';
    const norm = normalize(r.value);
    if (norm.length < 8) {
      await dlg.say(npc, t('dialog.openShort'));
      return 'again';
    }
    qs.answers[step.id] = r.value;
    const hit = step.ideas.filter(i => i.keywords.some(k => containsPhrase(norm, normalize(k))));
    const miss = step.ideas.filter(i => !hit.includes(i));
    await dlg.say(npc, hit.length ? t('dialog.openIdeas', { list: hit.map(i => i.text).join(', ') }) : t('dialog.openNoIdea'));
    if (miss.length) await dlg.say(npc, t('dialog.openMore', { list: miss.map(i => i.text).join(', ') }));
    return 'ok';
  },

  /** Thẩm vấn: hỏi lần lượt các câu (theo thứ tự tùy chọn), NPC trả lời. */
  async interview(step, npc, qs) {
    const asked = new Set(qs.answers[step.id] || []);
    while (asked.size < step.questions.length) {
      const left = step.questions.filter(x => !asked.has(x.id));
      const c = await dlg.choose([...left.map(x => ({ id: x.id, text: x.text, x })), { id: '_help', text: t('dialog.help'), silent: true }],
        { speaker: npc, text: step.ask });
      if (c.id === '_help') return 'help';
      await dlg.say(npc, c.x.answer);
      asked.add(c.id);
      qs.answers[step.id] = [...asked];
      saveProgress();
    }
    return 'ok';
  }
});

/** Trao huy hiệu kỹ năng của một hồ sơ (phòng) khi khép lại. */
/**
 * Cảnh cắt khi khép hồ sơ: tập hồ sơ trượt vào, con dấu đỏ đóng xuống, huy hiệu bay về nút balo.
 * Bấm để bỏ qua; chế độ giảm chuyển động hiện tĩnh trong chốc lát.
 */
export function caseCutscene(roomId, badge) {
  const room = data.quests.rooms.find(r => r.id === roomId);
  const wrap = document.createElement('div');
  wrap.className = 'case-cut';
  wrap.setAttribute('role', 'status');
  const folder = document.createElement('div');
  folder.className = 'case-folder';
  const tab = Object.assign(document.createElement('div'), { className: 'case-folder-tab', textContent: t('cutscene.file') });
  const title = Object.assign(document.createElement('div'), { className: 'case-folder-title', textContent: room?.name || '' });
  const learned = Object.assign(document.createElement('p'), { className: 'case-folder-text', textContent: badge.learned });
  const stamp = Object.assign(document.createElement('div'), { className: 'case-stamp', textContent: t(room?.boss ? 'cutscene.stampBoss' : 'cutscene.stamp') });
  const img = Object.assign(document.createElement('img'), { className: 'case-badge', src: `assets/badges/${roomId}.png`, alt: '' });
  const cap = Object.assign(document.createElement('div'), { className: 'case-cap', textContent: `${t('backpack.newBadge')}: ${badge.name}` });
  folder.append(tab, title, learned, stamp);
  wrap.append(folder, img, cap, Object.assign(document.createElement('div'), { className: 'case-skip', textContent: t('cutscene.skip') }));
  document.body.append(wrap);
  const fast = state.settings.reduceMotion;
  return new Promise(resolve => {
    const timers = [];
    const finish = () => { timers.forEach(clearTimeout); wrap.remove(); resolve(); };
    wrap.addEventListener('click', finish);
    timers.push(setTimeout(() => { wrap.classList.add('is-stamped'); sfx('stamp'); }, fast ? 0 : 900));
    timers.push(setTimeout(() => { wrap.classList.add('is-badge'); sfx('unlock'); }, fast ? 0 : 1700));
    // huy hiệu bay về nút balo
    timers.push(setTimeout(() => {
      const bp = document.getElementById('btn-backpack')?.getBoundingClientRect();
      if (bp && !fast) {
        const r = img.getBoundingClientRect();
        img.style.transform = `translate(${bp.left + bp.width / 2 - (r.left + r.width / 2)}px, ${bp.top + bp.height / 2 - (r.top + r.height / 2)}px) scale(0.2)`;
        img.style.opacity = '0.2';
      }
    }, fast ? 1500 : 3000));
    timers.push(setTimeout(finish, fast ? 1800 : 3800));
  });
}

async function awardBadge(roomId) {
  const b = data.quests.rooms.find(r => r.id === roomId)?.badge;
  if (!b) return;
  onChange();
  await caseCutscene(roomId, b);
  await dlg.say('system', t('dialog.badge', b));
}

/** Hoàn thành nhiệm vụ: thẻ evidence, kết luận nhỏ, lời kết phòng, huy hiệu khi khép hồ sơ. */
async function completeQuest(q, qs, npc) {
  qs.status = 'done';
  (q.evidenceCards || []).forEach(addEvidence);
  saveProgress();
  onChange();
  sfx('correct');
  await dlg.say(npc, `${t('result.correct')} ${q.feedback.correct}`);
  await dlg.say(npc, t('dialog.conclusion', { text: q.conclusion }));
  for (const ev of (q.evidenceCards || []).map(evidenceById).filter(Boolean)) {
    sfx('unlock');
    toast(t('dialog.newCard', { fact: ev.fact, title: ev.title }));
    await dlg.say('system', t('dialog.newCard', { fact: ev.fact, title: ev.title }));
  }
  world?.emote('hero', '♪');
  const room = q.room;
  if (state.progress.tracked === q.id) track(nextQuestIn(room)?.id || null, true);
  if (roomStatus(room, state.progress.flags) === 'done' && !hasFlag(`done_${room}`)) {
    setFlag(`done_${room}`);
    saveProgress();
    if (sceneById(`${room.toLowerCase()}_done`)) await playScene(`${room.toLowerCase()}_done`);
    await awardBadge(room);
  }
  // Xong mọi hồ sơ bắt buộc: Kẻ Dệt Chuyện xuất hiện, mũi tên chỉ tới Phòng họp.
  if (bossStatus(state.progress.flags) === 'open' && !hasFlag('boss_announced')) {
    setFlag('boss_announced');
    saveProgress();
    await playScene('boss_appears');
    track('boss', true);
  }
}

// ---------------------------------------------------------------- đồ vật, cửa, khu vực

/**
 * Xem một đồ vật trên bản đồ. Đồ vật có nguồn (npc_dialogues.json → inspectSources) mở trình đọc báo
 * để người chơi tự khám phá dữ kiện; chân dung bên phải là hình đồ vật.
 */
export function inspect(key) {
  const lines = data.npcs.inspect?.[key];
  if (!lines) return;
  const sources = data.npcs.inspectSources?.[key];
  const art = sources ? 'obj_paper' : /sign/.test(key) ? 'obj_sign' : null;
  conversation('notes', async () => {
    for (const line of lines) await dlg.say('inspect', line);
    if (sources) await dlg.links(sources, { speaker: 'inspect', text: t('reader.note') });
  }, art);
}

// ---------------------------------------------------------------- cản trở (js/obstacles.js)

/** Thanh hạn chót đầy: Phát Vội gọi giục đăng bài khi chưa kiểm chứng xong. */
export async function deadlineCall(room) {
  if (busy) return;
  sfx('ding');
  await conversation('npc4', async () => {
    await dlg.say('npc4', t('obstacles.deadlineCall', { room: roomName(room) }), { mood: 'surprised' });
    const c = await dlg.choose([
      { id: 'no', text: t('obstacles.deadlineRefuse') },
      { id: 'yes', text: t('obstacles.deadlinePublish') }
    ], { speaker: 'npc4', text: t('obstacles.deadlineCall', { room: roomName(room) }) });
    state.progress.pressure = 0;
    saveProgress();
    if (c.id === 'no') {
      sfx('partial');
      await dlg.say('npc4', t('obstacles.deadlineRefuseLine'), { mood: 'serious' });
    } else {
      sfx('wrong');
      await dlg.say('system', t('obstacles.deadlinePublishLine'));
      await creditHit(room, PENALTY.publish);
    }
  });
}

const shuffle = list => list.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(p => p[1]);

/** Kẻ tung tin bắt kịp (hoặc người chơi tự bắt chuyện): một tin giật tít, chọn điều khiến mình dừng lại. */
export async function rumorEncounter(id) {
  const bank = data.npcs.rumors || [];
  if (!bank.length || busy) return;
  const i = (state.progress.rumorIdx || 0) % bank.length;
  state.progress.rumorIdx = i + 1;
  const r = bank[i];
  const room = trackedRoom();
  world?.setTalking(id, true);
  await conversation(id, async () => {
    await dlg.say(id, t('obstacles.rumorIntro'), { mood: 'happy' });
    await dlg.say(id, r.headline, { mood: 'happy' });
    const opts = shuffle(r.options.map((o, k) => ({ id: String(k), text: o.text })));
    const c = await dlg.choose(opts, { speaker: id, text: t('obstacles.rumorAsk') });
    const o = r.options[+c.id];
    if (o.correct) {
      sfx('correct');
      await dlg.say('system', `✓ ${o.why}`);
      await dlg.say(id, t('obstacles.rumorWin'), { mood: 'serious' });
    } else {
      sfx('wrong');
      await dlg.say('system', `✗ ${o.why}`);
      await dlg.say('system', t('obstacles.rumorLose'));
      if (caseOpen(room)) await creditHit(room, PENALTY.rumor);
    }
    saveProgress();
  });
  world?.setTalking(id, false);
  world?.rumorDone?.(id);
}

/** Manh mối đánh lừa (tờ giấy trên đất): đưa ngay vào hồ sơ thì bị trừ độ tin cậy, kiểm tra trước thì không. */
export function inspectDecoy(id) {
  const d = data.npcs.decoys?.[id];
  if (!d) return;
  conversation('notes', async () => {
    await dlg.say('inspect', `${t('obstacles.decoyTitle')}: ${d.title}`);
    if (hasFlag(`seen_${id}`) || !caseOpen(d.room)) {
      await dlg.say('inspect', `${t('obstacles.decoyDone')} ${d.why}`);
      return;
    }
    const c = await dlg.choose([
      { id: 'add', text: t('obstacles.decoyAdd', { room: roomName(d.room) }) },
      { id: 'check', text: t('obstacles.decoyCheck') }
    ], { speaker: 'inspect', text: t('obstacles.decoyAsk') });
    setFlag(`seen_${id}`);
    saveProgress();
    if (c.id === 'check') {
      sfx('correct');
      await dlg.say('inspect', `✓ ${t('obstacles.decoyChecked')} ${d.why}`);
    } else {
      sfx('wrong');
      await dlg.say('inspect', `✗ ${t('obstacles.decoyAdded')} ${d.why}`);
      await creditHit(d.room, PENALTY.decoy);
    }
  }, 'obj_paper');
  world?.refresh();
}

/**
 * Tới thẳng trận đấu với Kẻ Dệt Chuyện (dùng khi trình chiếu / ôn nhanh): các nhiệm vụ bắt buộc chưa làm được tính là
 * đã khép (nhận thẻ evidence của nhiệm vụ để đủ điều kiện), nhưng không trao huy hiệu của hồ sơ.
 */
export function skipToBoss() {
  for (const id of data.quests.boss.requires.requiredQuests) {
    const q = questById(id);
    const qs = questState(id);
    if (qs.status === 'done') continue;
    qs.status = 'done';
    qs.skipped = true;
    (q?.evidenceCards || []).forEach(addEvidence);
  }
  setFlag('boss_announced');
  setFlag('skipped_to_boss');
  saveProgress();
  track('boss', true);
  onChange();
  world?.travel('boss', 'spawn_from_street', 'up');
}

/** Thông báo một câu của hệ thống (cửa khóa, khu chưa mở...). */
export function notice(text) {
  return conversation('system', () => dlg.say('system', text));
}

/**
 * Người chơi bước vào phòng: không tự bắt chuyện nữa (người chơi phải chủ động nói chuyện với NPC).
 * Lời giới thiệu phòng phát lần đầu người chơi nói chuyện với người phụ trách phòng đó (roomIntro).
 */
export async function onZoneEnter() {}

/** Lời giới thiệu phòng đang đứng (một lần), khi người chơi nói chuyện với người phụ trách phòng. */
async function roomIntro(npcId) {
  // phòng mà NPC này phụ trách (ưu tiên phòng người chơi đang đứng), chưa giới thiệu
  const here = world?.zoneRoom?.();
  const rooms = Object.entries(data.npcs.zoneScenes || {}).filter(([id, z]) => z.thenTalk === npcId && !hasFlag(`zone_${id}`));
  const [roomId, zs] = rooms.find(([id]) => id === here) || rooms[0] || [];
  if (!zs) return;
  setFlag(`zone_${roomId}`);
  saveProgress();
  await playScene(zs.scene);
}

/** Mục tiêu hiện tại (hiện trong balo): nhiệm vụ đang theo dõi. */
export function objective() {
  const id = state.progress?.tracked;
  if (id === 'boss') return t('backpack.bossOpen');
  const q = id && questById(id);
  if (q && !isQuestDone(q.id)) {
    const room = data.quests.rooms.find(r => r.id === q.room);
    const npc = giverOf(q.id);
    return t('backpack.objectiveQuest', { title: q.title, npc: npcById(npc)?.name || npc, place: room?.name || '' });
  }
  const anyOpen = data.quests.rooms.some(r => nextQuestIn(r.id));
  return anyOpen ? t('backpack.objectiveMeetNpc1') : t('backpack.objectiveWait');
}

// ---------------------------------------------------------------- boss

let onEnding = () => {};

/** Hàm gọi khi thắng boss (hiện màn kết quả). */
export function setOnEnding(fn) { onEnding = fn; }

/** Thanh "uy tín lập luận" của boss: số pha còn lại / tổng số pha. */
function bossBar(left, total) {
  const bar = document.getElementById('boss-bar');
  if (left == null) { bar.hidden = true; return; }
  const b = data.quests.boss;
  bar.hidden = false;
  bar.querySelector('.boss-name').textContent = t('boss.barLabel', { name: b.name });
  const meter = bar.querySelector('.boss-meter');
  meter.innerHTML = '';
  for (let i = 0; i < total; i++) meter.append(Object.assign(document.createElement('span'), { className: i < left ? 'on' : '' }));
  meter.setAttribute('aria-label', `${left}/${total}`);
}

/**
 * Trận cuối: buổi đính chính trực tiếp với fanpage ẩn danh "Kẻ Dệt Chuyện" (chỉ hiện qua màn hình).
 * Ba bước, mỗi bước một kiểu chơi: gắn bằng chứng (chọn thẻ), trả lời bình luận (có giờ, lượt chịu sai),
 * viết bài đính chính (chọn câu). Bộ đếm lượt chia sẻ của bài sai tăng dần, tăng vọt khi trả lời sai.
 */
export async function runBoss() {
  const b = data.quests.boss;
  const p = state.progress;
  if (hasFlag('boss_done')) {
    await notice(t('boss.blank'));
    return;
  }
  if (busy) return;
  p.boss ||= { phase: 0, fails: 0, endingB: 0 };
  b.guessCards.forEach(addEvidence);
  saveProgress();
  const shares = bossShares(p.boss.shares || 1200);
  let won = false;
  await conversation('boss', async () => {
    if (!hasFlag('boss_intro')) {
      for (const line of data.npcs.dialogues.boss_intro || []) await dlg.say(line.npc, line.text, { mood: line.npc === 'boss' ? 'smug' : undefined });
      await dlg.say('system', t('boss.guessNote'));
      setFlag('boss_intro');
      saveProgress();
    }
    for (let i = p.boss.phase; i < b.phases.length; i++) {
      const ph = b.phases[i];
      bossBar(b.phases.length - i, b.phases.length);
      await dlg.say('system', t('boss.phase', { n: i + 1, name: ph.name }));
      await dlg.say('boss', ph.claim, { mood: 'smug' });
      await dlg.say('system', ph.howto);
      const run = { cards: bossCards, replies: bossReplies, compose: bossCompose }[ph.mode];
      const ok = await run(ph, shares);
      p.boss.shares = shares.value();
      if (!ok) { p.boss.fails++; saveProgress(); return; } // nói chuyện lại để chơi tiếp bước này
      sfx('correct');
      p.boss.fails = 0;
      p.boss.phase = i + 1;
      saveProgress();
      onChange();
      bossBar(b.phases.length - i - 1, b.phases.length);
      await dlg.say('boss', ph.defeat, { mood: 'cracked' });
      await dlg.say('system', ph.explain);
    }
    shares.stop();
    await dlg.say('system', t('boss.stopped', { n: shares.value().toLocaleString('vi-VN') }));
    // Kết thúc A: trang ẩn danh vẫn không lộ mặt — một khung trống
    await dlg.say('system', t('boss.unmask'));
    dlg.pinMood('boss', 'blank');
    sfx('unlock');
    await dlg.say('system', t('boss.blank'));
    for (const line of data.npcs.dialogues.boss_endings?.A || []) await dlg.say(line.npc, line.text);
    await dlg.say('system', `${b.endings.A.title}: ${b.endings.A.text}`);
    p.evidenceCards = p.evidenceCards.filter(id => !b.guessCards.includes(id));
    setFlag('boss_done');
    saveProgress();
    await awardBadge('S9');
    won = true;
  });
  shares.stop(true);
  bossBar(null);
  world?.refresh();
  if (won) onEnding();
}

/** Bộ đếm lượt chia sẻ của bài sai (nổi trên màn hình): tăng đều theo thời gian, bump(n) khi người chơi sai. */
function bossShares(start) {
  let n = start;
  const box = document.getElementById('boss-shares') || Object.assign(document.createElement('div'), { id: 'boss-shares', className: 'boss-shares' });
  document.body.append(box);
  const show = () => { box.textContent = t('boss.shares', { n: Math.round(n).toLocaleString('vi-VN') }); };
  box.hidden = false;
  show();
  let id = setInterval(() => { n += 3 + Math.random() * 6; show(); }, 700);
  return {
    value: () => Math.round(n),
    bump: k => { n += k; show(); box.classList.remove('is-bump'); void box.offsetWidth; box.classList.add('is-bump'); },
    stop: (hide = false) => { clearInterval(id); id = null; if (hide) box.hidden = true; }
  };
}

/** Đồng hồ đếm ngược nổi trên màn hình. Trả về { left(), stop() }. */
function bossTimer(seconds) {
  const box = document.getElementById('boss-timer') || Object.assign(document.createElement('div'), { id: 'boss-timer', className: 'boss-timer' });
  document.body.append(box);
  const end = Date.now() + seconds * 1000;
  const tick = () => {
    const sLeft = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    box.textContent = t('boss.timer', { s: sLeft });
    box.classList.toggle('is-low', sLeft <= 5);
  };
  tick();
  box.hidden = false;
  const id = setInterval(tick, 250);
  return { left: () => (end - Date.now()) / 1000, stop: () => { clearInterval(id); box.hidden = true; } };
}

/** Kết luận vượt bằng chứng (tiền bạc, danh tính): kết thúc B — nhắc lại rồi làm lại bước này. */
async function bossOverreach() {
  const b = data.quests.boss;
  state.progress.boss.endingB++;
  saveProgress();
  sfx('wrong');
  await dlg.say('boss', data.npcs.dialogues.boss_trap_b?.[0]?.text || b.trapB.feedback, { mood: 'smug' });
  await dlg.say('system', `${b.endings.B.title}: ${b.endings.B.text}`);
  await dlg.say('npc1', b.trapB.feedback);
}

/** Bước 1 — gắn bằng chứng: chọn thẻ đính kèm vào ghi chú kiểm chứng dưới bài sai. */
async function bossCards(ph, shares) {
  const b = data.quests.boss;
  for (;;) {
    const cards = state.progress.evidenceCards.map(evidenceById).filter(Boolean).map(ev => ({ id: ev.id, text: ev.title }));
    const r = await dlg.multi(cards, { speaker: 'boss', text: ph.claim, submitLabel: t('boss.submit') });
    if (r.help) { await dlg.say('npc1', ph.explain); continue; }
    if (r.ids.some(id => b.trapB.cards.includes(id))) { shares.bump(400); await bossOverreach(); continue; }
    const core = r.ids.filter(id => ph.core.includes(id));
    const support = r.ids.filter(id => (ph.support || []).includes(id));
    let msg = null;
    if (!core.length && support.length) msg = ph.soloSupport;
    else if (core.length < ph.min) msg = ph.weak;
    if (!msg) { reactTo('boss', 'good'); return true; }
    sfx('wrong');
    reactTo('boss', 'bad');
    shares.bump(250);
    await dlg.say('boss', msg, { mood: 'smug' });
  }
}

/** Bước 2 — trả lời bình luận: từng bình luận một, chọn câu trả lời có căn cứ trong thời gian ngắn. */
async function bossReplies(ph, shares) {
  let lives = ph.lives;
  for (let k = 0; k < ph.items.length; k++) {
    const it = ph.items[k];
    await dlg.say('boss', it.comment, { mood: 'smug' });
    const opts = shuffle(it.options.map((o, j) => ({ id: String(j), text: o.text })));
    const timer = bossTimer(ph.timer);
    const c = await dlg.choose(opts, { speaker: 'boss', text: `${t('boss.comment', { n: k + 1, total: ph.items.length, lives })}\n${t('boss.pickReply')}` });
    const late = timer.left() <= 0;
    timer.stop();
    if (!late && it.options[+c.id].correct) {
      reactTo('boss', 'good');
      sfx('partial');
      await dlg.say('system', `✓ ${it.why}`);
      continue;
    }
    sfx('wrong');
    reactTo('boss', 'bad');
    shares.bump(300);
    await dlg.say('system', late ? ph.timeout : `✗ ${it.why}`);
    if (--lives <= 0) { await dlg.say('system', ph.outOfLives); return false; }
    k--; // trả lời lại bình luận này
  }
  return true;
}

/** Bước 3 — viết bài đính chính: chọn câu đưa vào bài; thiếu ý chính, vượt bằng chứng hay sai đạo đức đều phải sửa. */
async function bossCompose(ph, shares) {
  let picked = [];
  for (;;) {
    const r = await dlg.multi(ph.items.map(it => ({ id: it.id, text: it.text })), { speaker: 'boss', text: ph.howto, picked, submitLabel: ph.submit });
    if (r.help) { await dlg.say('npc1', ph.explain); continue; }
    picked = r.ids;
    const chosen = ph.items.filter(it => picked.includes(it.id));
    if (chosen.some(it => it.trap === 'overreach')) { shares.bump(400); await bossOverreach(); continue; }
    const bad = chosen.filter(it => it.trap === 'ethics');
    const missing = ph.items.filter(it => it.need && !picked.includes(it.id));
    if (!bad.length && !missing.length) return true;
    sfx('wrong');
    shares.bump(200);
    for (const it of bad) await dlg.say('npc1', `✗ ${it.why}`);
    if (missing.length) await dlg.say('npc1', fill(ph.missing, { list: missing.map(it => `"${it.text}"`).join('; ') }));
  }
}
