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
        qs.stepOk[step.id] = true;
        saveProgress();
        break;
      }
      qs.fails++;
      saveProgress();
      sfx(r === 'partial' ? 'partial' : 'wrong');
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
    if (q) {
      const qs = questState(q.id);
      await dlg.say(sp, `${t('devices.taskLine', { title: q.title })} ${q.question}`, { mood: 'thinking' });
      const r = await runSteps(q, qs, giverOf(q.id), device);
      saveProgress();
      if (r === 'done') await completeQuest(q, qs, giverOf(q.id));
      return;
    }
    await dlg.interactive({ speaker: sp, text: t('devices.browse'), wide: true }, (box, done) => {
      box.append(toolWindow(device, browseContent(device, exhibitFor)), actionRow(dlg.makeButton('btn-primary', t('devices.off'), () => done({}))));
    });
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
  if (pick) { sfx('ding'); world?.travel(pick.map, pick.spawn || 'spawn_elevator', 'down'); }
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
async function awardBadge(roomId) {
  const b = data.quests.rooms.find(r => r.id === roomId)?.badge;
  if (!b) return;
  sfx('unlock');
  onChange();
  toast(t('dialog.badge', { name: b.name, learned: '' }));
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

/** Thông báo một câu của hệ thống (cửa khóa, khu chưa mở...). */
export function notice(text) {
  return conversation('system', () => dlg.say('system', text));
}

/** Người chơi bước vào phòng lần đầu: phát lời giới thiệu, rồi NPC tiếp lời nếu có. */
export async function onZoneEnter(roomId) {
  const zs = data.npcs.zoneScenes?.[roomId];
  if (!zs || hasFlag(`zone_${roomId}`) || busy) return;
  setFlag(`zone_${roomId}`);
  saveProgress();
  const scene = sceneById(zs.scene);
  await conversation(scene.npc, () => playScene(zs.scene));
  if (zs.thenTalk && interactionFor(zs.thenTalk)) await talkTo(zs.thenTalk, roomId);
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

/** Chấm một pha: trả về { ok, trap, msg } theo thẻ đã chọn. */
function judgePhase(ph, picked) {
  const b = data.quests.boss;
  if (picked.some(id => b.trapB.cards.includes(id))) return { trap: true };
  const core = picked.filter(id => ph.core.includes(id));
  const support = picked.filter(id => (ph.support || []).includes(id));
  if (!core.length && support.length && ph.soloSupport) return { msg: ph.soloSupport };
  if (core.length < ph.min) return { msg: ph.weak };
  if (ph.need && !ph.need.every(id => picked.includes(id))) return { msg: ph.missingLimit };
  return { ok: true };
}

/** Đối đầu Kẻ Dệt Chuyện: 3 pha, mỗi pha chọn thẻ evidence để phản bác. */
export async function runBoss() {
  const b = data.quests.boss;
  const p = state.progress;
  if (hasFlag('boss_done')) {
    await notice(t('boss.blank'));
    return;
  }
  p.boss ||= { phase: 0, fails: 0, endingB: 0 };
  b.guessCards.forEach(addEvidence);
  saveProgress();
  let won = false;
  await conversation('boss', async () => {
    if (!hasFlag('boss_intro')) {
      await playScene('boss_intro');
      await dlg.say('system', t('boss.guessNote'));
      setFlag('boss_intro');
      saveProgress();
    }
    for (let i = p.boss.phase; i < b.phases.length; i++) {
      const ph = b.phases[i];
      bossBar(b.phases.length - i, b.phases.length);
      await dlg.say('system', t('boss.phase', { n: i + 1, name: ph.name }));
      for (;;) {
        const cards = p.evidenceCards.map(evidenceById).filter(Boolean).map(ev => ({ id: ev.id, text: `${ev.fact} · ${ev.title}` }));
        const r = await dlg.multi(cards, { speaker: 'boss', text: ph.claim, submitLabel: t('boss.submit') });
        if (r.help) { await dlg.say('npc1', ph.explain); continue; }
        const res = judgePhase(ph, r.ids);
        if (res.trap) {
          p.boss.endingB++;
          saveProgress();
          sfx('wrong');
          await dlg.say('boss', data.npcs.dialogues.boss_trap_b?.[0]?.text || b.trapB.feedback, { mood: 'smug' });
          await dlg.say('system', `${b.endings.B.title}: ${b.endings.B.text}`);
          await dlg.say('npc1', b.trapB.feedback);
          continue;
        }
        if (!res.ok) {
          p.boss.fails++;
          saveProgress();
          sfx('wrong');
          await dlg.say('boss', res.msg, { mood: 'smug' });
          continue;
        }
        sfx('correct');
        p.boss.fails = 0;
        p.boss.phase = i + 1;
        saveProgress();
        onChange();
        bossBar(b.phases.length - i - 1, b.phases.length);
        await dlg.say('boss', ph.defeat, { mood: 'cracked' });
        await dlg.say('system', ph.explain);
        break;
      }
    }
    // Kết thúc A: gỡ mặt nạ — gương mặt trống
    await dlg.say('system', t('boss.unmask'));
    world?.bossUnmask();
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
  bossBar(null);
  world?.refresh();
  if (won) onEnding();
}
