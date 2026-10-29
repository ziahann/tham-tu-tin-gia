// Cốt truyện: chọn hội thoại khi nói chuyện với NPC, chạy nhiệm vụ trong hội thoại, xem đồ vật, cửa, khu vực.
import { data, t, questById, evidenceById, sceneById, npcById, sourceById, shortCite } from './data.js';
import { state, questState, saveProgress, setFlag, hasFlag, addEvidence, isQuestDone } from './state.js';
import * as dlg from './dialogue.js';
import { matchField, checkCards, questPoints, isUnlocked, roomStatus } from './grading.js';
import { sfx } from './audio.js';
import { toast } from './ui.js';

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

/** NPC có việc cốt truyện / nhiệm vụ đang chờ không (để hiện dấu !). */
export function hasStoryFor(npcId) {
  const e = interactionFor(npcId);
  return !!e && !e.idle;
}

/** Chạy một đoạn hội thoại có giới hạn: khóa điều khiển, mở khung thoại, đóng khi xong. */
async function conversation(partner, body) {
  if (busy) return;
  busy = true;
  dlg.begin(partner);
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
    for (const line of scene.lines) await dlg.say(scene.npc, line.text, { dialogueId: scene.id, lineId: line.id });
    if (!scene.choices?.length) return;
    const choice = await dlg.choose(scene.choices.map(c => ({ ...c })));
    (choice.setFlags || []).forEach(setFlag);
    saveProgress();
    if (!choice.next || choice.next === 'end') return;
    scene = sceneById(choice.next);
  }
}

/** Người chơi nói chuyện với NPC. */
export async function talkTo(npcId) {
  let lead = null;
  world?.setTalking(npcId, true);
  await conversation(npcId, async () => {
    let e = interactionFor(npcId);
    if (!e) return;
    if (e.scene) {
      await playScene(e.scene);
      (e.setFlags || []).forEach(setFlag);
      saveProgress();
      lead = e.lead || null;
      return;
    }
    // Nhiệm vụ: làm liên tiếp các nhiệm vụ của cùng NPC nếu người chơi không dừng giữa chừng.
    while (e?.quest) {
      const done = await runQuest(questById(e.quest), npcId);
      if (!done) return;
      e = interactionFor(npcId);
      if (e?.scene && !e.quest) return;
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
  const result = q.mode === 'G2' ? await runCards(q, qs, npc) : await runFields(q, qs, npc);
  saveProgress();
  if (result !== 'done') return false;
  await completeQuest(q, qs, npc);
  return true;
}

/** Menu trợ giúp: gợi ý / hướng dẫn từng bước / để sau / quay lại. Trả về 'retry' hoặc 'later'. */
async function helpMenu(q, qs, npc, afterWrong) {
  const options = [
    { id: 'retry', text: afterWrong ? t('dialog.retry') : t('dialog.backToAnswer') },
    { id: 'hint', text: t('dialog.hint', { n: Math.min(qs.hints + 1, q.hints.length) }) },
    ...(q.walkthrough ? [{ id: 'walk', text: t('dialog.cantFind') }] : []),
    { id: 'later', text: t('dialog.later') }
  ];
  const c = await dlg.choose(options);
  if (c.id === 'hint') {
    if (qs.hints >= q.hints.length) {
      await dlg.say(npc, t('dialog.noMoreHints'));
    } else {
      qs.hints++;
      saveProgress();
      await dlg.say(npc, t('dialog.hintLine', { n: qs.hints, text: q.hints[qs.hints - 1] }));
    }
  } else if (c.id === 'walk') {
    qs.walkthrough = true;
    saveProgress();
    await dlg.say(npc, t('dialog.walkthrough', { text: q.walkthrough }));
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

/** Tóm tắt dự phòng: các dữ kiện mà nhiệm vụ trao, kèm nguồn. */
const backupText = q => (q.evidenceCards || []).map(evidenceById).filter(Boolean)
  .map(ev => `${ev.text} (${ev.sources.map(s => shortCite(sourceById(s))).join('; ')})`).join(' ');

/** G1: mở nguồn, rồi trả lời từng ô do NPC hỏi. */
async function runFields(q, qs, npc) {
  if (!qs.readSources) {
    await dlg.say(npc, q.question);
    if (q.safetyNote) await dlg.say(npc, q.safetyNote);
    for (;;) {
      const r = await dlg.links(q.resources || [], { speaker: npc, text: t('dialog.openSourcesLine') });
      if (!r.backup) break;
      await dlg.say(npc, t('dialog.backupLine', { text: backupText(q) }));
    }
    qs.readSources = true;
    saveProgress();
  }
  qs.fieldOk ||= {};
  for (const f of q.fields) {
    while (!qs.fieldOk[f.id]) {
      const r = await dlg.input({ speaker: npc, text: f.ask || f.label, label: f.label, placeholder: f.placeholder });
      if (r.help) {
        if (await helpMenu(q, qs, npc, false) === 'later') return 'later';
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
      if (await helpMenu(q, qs, npc, true) === 'later') return 'later';
    }
  }
  return 'done';
}

/** Hoàn thành nhiệm vụ: điểm, thẻ evidence, kết luận nhỏ, lời kết phòng. */
async function completeQuest(q, qs, npc) {
  const points = questPoints(qs);
  qs.status = 'done';
  qs.points = points;
  state.progress.score += points;
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
  await dlg.say('system', t('dialog.points', { n: points }));
  const room = q.room;
  if (roomStatus(room, state.progress.flags) === 'done' && !hasFlag(`done_${room}`)) {
    setFlag(`done_${room}`);
    saveProgress();
    if (sceneById(`${room.toLowerCase()}_done`)) await playScene(`${room.toLowerCase()}_done`);
  }
}

// ---------------------------------------------------------------- đồ vật, cửa, khu vực

/** Xem một đồ vật trên bản đồ. */
export function inspect(key) {
  const lines = data.npcs.inspect?.[key];
  if (!lines) return;
  conversation('notes', async () => {
    for (const line of lines) await dlg.say('inspect', line);
  });
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
  if (zs.thenTalk && interactionFor(zs.thenTalk)) await talkTo(zs.thenTalk);
}

/** Mục tiêu hiện tại (hiện trong balo). */
export function objective() {
  if (!hasFlag('s1_done')) return t('backpack.objectiveMeetNpc1');
  for (const e of data.npcs.interactions.list) {
    if (!e.quest || interactionFor(e.npc) !== e) continue;
    const q = questById(e.quest);
    const room = data.quests.rooms.find(r => r.id === q.room);
    return t('backpack.objectiveQuest', { title: q.title, npc: npcById(e.npc)?.name || e.npc, place: room?.name || '' });
  }
  return t('backpack.objectiveWait');
}
