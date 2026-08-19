// Прогон полной партии по сокетам. Запуск: node server/smoke-test.mjs
import { io } from 'socket.io-client';

const URL = 'http://127.0.0.1:3001';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function connect(name) {
  const socket = io(URL, { transports: ['websocket'] });
  const state = { socket, name, room: null };
  socket.on('roomUpdatePrivate', (r) => {
    state.room = r;
  });
  return state;
}

// Часть событий сервер не подтверждает — не ждём ack дольше 300 мс
const emit = (c, ev, data) =>
  new Promise((res) => {
    const t = setTimeout(() => res({}), 300);
    c.socket.emit(ev, data, (r) => {
      clearTimeout(t);
      res(r);
    });
  });

const ok = [];
const fail = [];
function check(label, cond) {
  (cond ? ok : fail).push(label);
  console.log(`${cond ? 'OK  ' : 'FAIL'}  ${label}`);
}

const run = async () => {
  const host = connect('Ведущий');
  await wait(300);
  const created = await emit(host, 'createRoom', { nickname: 'Ведущий' });
  const code = created.room.code;
  check('лобби создано', created.success && !!code);

  const names = ['Аня', 'Борис', 'Вера', 'Глеб', 'Дина', 'Егор'];
  const players = [];
  for (const n of names) {
    const c = connect(n);
    await wait(80);
    const res = await emit(c, 'joinRoom', { code, nickname: n });
    c.id = res.playerId;
    players.push(c);
  }
  await wait(200);
  check('все 6 игроков в лобби', host.room.gamePlayerCount === 6);
  check('можно начинать', host.room.canStart === true);

  // Чат в лобби
  await emit(players[0], 'chat', { text: 'всем привет' });
  await wait(150);
  check('чат в лобби виден всем', players[1].room.chat.some((m) => m.text === 'всем привет'));

  await emit(host, 'startGame');
  await wait(250);
  check('фаза — раздача ролей', host.room.phase === 'roleReveal');
  check('ведущий видит роли', host.room.players.filter((p) => p.role).length === 6);
  check('игрок видит только свою роль', players[0].room.players.filter((p) => p.role).length <= 2);

  check('нельзя в ночь, пока не все готовы', host.room.step.ready === false);
  for (const p of players) await emit(p, 'roleSeen');
  await wait(200);
  check('все посмотрели роли', host.room.step.ready === true);

  await emit(host, 'hostStartNight');
  await wait(200);
  check('началась ночь 1', host.room.phase === 'night' && host.room.dayNumber === 1);
  check('первый ход — мафия', host.room.nightSubPhase === 'mafia');

  const roleOf = (c) => host.room.players.find((p) => p.id === c.id).role;
  const mafia = players.filter((c) => ['mafia', 'don'].includes(roleOf(c)));
  const town = players.filter((c) => !['mafia', 'don'].includes(roleOf(c)));
  check('в игре 2 мафии', mafia.length === 2);
  check('мафия видит своих', mafia[0].room.players.filter((p) => p.isTeammate).length === 1);

  // Ключевой баг: повторное подтверждение
  const victim = town[0];
  const first = await emit(mafia[0], 'nightAction', { targetId: victim.id });
  check('мафия сделала ход', first.success === true);
  const second = await emit(mafia[0], 'nightAction', { targetId: town[1].id });
  check('повторный выбор запрещён', second.success === false);
  await wait(150);
  check('выбор зафиксирован', mafia[0].room.you.actionLocked === true);
  check('мафия видит выбор напарника', !!mafia[1].room.mafiaVotes);

  // Мирный не может ходить
  const intruder = await emit(town[1], 'nightAction', { targetId: victim.id });
  check('мирный не может стрелять', intruder.success === false);

  // Ночной чат
  const townChat = await emit(town[1], 'chat', { text: 'ночью пишу' });
  check('мирному нельзя писать ночью', townChat.success === false);
  await emit(mafia[0], 'chat', { text: 'бьём первого' });
  await wait(150);
  check('мафия видит свой чат', mafia[1].room.chat.some((m) => m.text === 'бьём первого'));
  check('город не видит чат мафии', !town[0].room.chat.some((m) => m.text === 'бьём первого'));

  await emit(mafia[1], 'nightAction', { targetId: victim.id });
  await wait(150);
  check('шаг мафии завершён', host.room.step.ready === true);

  await emit(host, 'hostAdvanceNight');
  await wait(150);
  const don = players.find((c) => roleOf(c) === 'don');
  check('ход дона', host.room.nightSubPhase === 'don');
  const donRes = await emit(don, 'nightAction', { targetId: town[1].id });
  check('дон получил результат проверки', ['sheriff', 'not_sheriff'].includes(donRes.checkResult));

  await emit(host, 'hostAdvanceNight');
  await wait(150);
  const sheriff = players.find((c) => roleOf(c) === 'sheriff');
  check('ход шерифа', host.room.nightSubPhase === 'sheriff');
  const shRes = await emit(sheriff, 'nightAction', { targetId: mafia[0].id });
  check('шериф нашёл мафию', shRes.checkResult === 'mafia');
  await wait(150);
  check('проверка сохранена в истории', sheriff.room.you.checks.length === 1);

  await emit(host, 'hostAdvanceNight');
  await wait(150);
  const doctor = players.find((c) => roleOf(c) === 'doctor');
  check('ход доктора', host.room.nightSubPhase === 'doctor');
  await emit(doctor, 'nightAction', { targetId: town[2] ? town[2].id : doctor.id });

  await emit(host, 'hostAdvanceNight');
  await wait(150);
  check('итоги ночи', host.room.nightSubPhase === 'resolve');

  await emit(host, 'hostResolveNight');
  await wait(200);
  check('наступил день', host.room.phase === 'day');
  const killed = host.room.players.find((p) => !p.alive);
  check('кто-то погиб ночью', !!killed);
  check('роль погибшего открыта всем', !!town[1].room.players.find((p) => !p.alive)?.role);
  check('запущен таймер обсуждения', !!host.room.timer);

  await emit(host, 'hostNextSpeaker');
  await wait(150);
  check('слово передано первому', !!host.room.speaking);

  await emit(host, 'hostStartVoting');
  await wait(150);
  check('идёт голосование', host.room.phase === 'voting');

  const aliveTown = town.filter((c) => c.id !== killed?.id);
  const voters = [...mafia, ...aliveTown];
  const target = mafia[0];
  let voted = 0;
  for (const v of voters) {
    if (v.id === target.id) {
      await emit(v, 'vote', { targetId: aliveTown[0].id });
    } else {
      await emit(v, 'vote', { targetId: target.id });
      voted++;
    }
  }
  const doubleVote = await emit(voters[0], 'vote', { targetId: aliveTown[0].id });
  check('повторный голос запрещён', doubleVote.success === false);
  await wait(200);
  check('голоса видны всем', (host.room.voteTally?.[target.id] || 0) === voted);
  check('все проголосовали', host.room.step.ready === true);

  await emit(host, 'hostResolveVoting');
  await wait(250);
  check(
    'игрок изгнан и началась ночь 2',
    host.room.lastVoteResult.exiledId === target.id &&
      (host.room.phase === 'night' || host.room.phase === 'ended'),
  );
  check('в хронике есть записи', host.room.log.length >= 4);

  // Мёртвые пишут в свой чат
  const deadClient = players.find((c) => c.id === target.id);
  await emit(deadClient, 'chat', { text: 'меня подставили' });
  await wait(150);
  check('чат выбывших скрыт от живых', !aliveTown[0].room.chat.some((m) => m.text === 'меня подставили'));
  check('ведущий видит всё', host.room.chat.some((m) => m.text === 'меня подставили'));

  console.log(`\nПройдено ${ok.length}, провалено ${fail.length}`);
  if (fail.length) console.log('Провалы:\n' + fail.map((f) => ' - ' + f).join('\n'));

  host.socket.close();
  players.forEach((p) => p.socket.close());
  process.exit(fail.length ? 1 : 0);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
