// Партия целиком на ботах: ведущий кликает, боты играют.
// Запуск при поднятом сервере: node server/bot-test.mjs
import { io } from 'socket.io-client';

const URL = 'http://127.0.0.1:3001';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const socket = io(URL, { transports: ['websocket'] });
let room = null;
socket.on('roomUpdatePrivate', (r) => {
  room = r;
});

const emit = (ev, data) =>
  new Promise((res) => {
    const t = setTimeout(() => res({}), 500);
    socket.emit(ev, data, (r) => {
      clearTimeout(t);
      res(r);
    });
  });

/** Ждём, пока боты доиграют текущий шаг */
async function waitReady(label, limitMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < limitMs) {
    if (room?.step?.ready) return true;
    await wait(200);
  }
  console.log(`ТАЙМАУТ на шаге «${label}»: ${room?.step?.done}/${room?.step?.total}`);
  return false;
}

const run = async () => {
  await wait(300);
  const created = await emit('createRoom', { nickname: 'Ведущий' });
  await wait(300);
  console.log(`Лобби ${created.room.code}`);

  for (let i = 0; i < 8; i++) await emit('addBot');
  await wait(300);
  await emit('updateSettings', {
    settings: { narratorEnabled: false, peacefulFirstNight: false, requireNominations: false },
  });
  console.log(`За столом ботов: ${room.gamePlayerCount}`);

  await emit('startGame');
  await wait(400);
  if (!(await waitReady('роли'))) process.exit(1);
  console.log('Боты посмотрели роли');

  await emit('hostStartNight');
  await wait(300);

  let guard = 0;
  while (room.phase !== 'ended' && guard++ < 60) {
    if (room.phase === 'night') {
      if (room.nightSubPhase === 'resolve') {
        await emit('hostResolveNight');
        console.log(
          room.lastNightResult?.peaceful
            ? `Ночь ${room.dayNumber}: тихо`
            : `Ночь ${room.dayNumber}: убит ${room.lastNightResult?.killedName}`,
        );
      } else {
        if (!(await waitReady(`ночь/${room.nightSubPhase}`))) process.exit(1);
        await emit('hostAdvanceNight');
      }
    } else if (room.phase === 'day') {
      await emit('hostStartVoting');
    } else if (room.phase === 'nominating') {
      if (!(await waitReady('выставление'))) process.exit(1);
      await emit('hostStartVoting');
    } else if (room.phase === 'voting') {
      if (!(await waitReady('голосование'))) process.exit(1);
      await emit('hostResolveVoting');
      const r = room.lastVoteResult;
      console.log(
        r?.exiledName
          ? `Голосование: изгнан ${r.exiledName}`
          : r?.revote
            ? 'Голосование: ничья, переголосовка'
            : 'Голосование: никто не изгнан',
      );
    }
    await wait(350);
  }

  const done = room.phase === 'ended';
  console.log(
    done
      ? `\nПартия доиграна до конца: ${room.winner === 'city' ? 'победа города' : 'победа мафии'}`
      : '\nПартия зациклилась — боты не доиграли',
  );
  console.log(`Сообщений в чате: ${room.chat.length}, записей в хронике: ${room.log.length}`);

  socket.close();
  process.exit(done ? 0 : 1);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
