const visitors = new Map();
const chat = [];
const lastSent = new Map();

const CHAT_LIMIT = 120;
const HALL = 'site_hall';

let counter = 0;
function nextId() {
  counter += 1;
  return `l${Date.now().toString(36)}${counter.toString(36)}`;
}

export { HALL as LOBBY_HALL };

export function setVisitor(socketId, nickname, where = 'hall') {
  const name = String(nickname || '').trim().slice(0, 20);
  if (name.length < 2) return { error: 'Введите никнейм' };
  visitors.set(socketId, {
    nickname: name,
    where: where === 'table' ? 'table' : 'hall',
  });
  return { success: true };
}

export function removeVisitor(socketId) {
  visitors.delete(socketId);
  lastSent.delete(socketId);
}

export function addLobbyChat(socketId, rawText) {
  const visitor = visitors.get(socketId);
  if (!visitor) return { error: 'Сначала представьтесь' };

  const now = Date.now();
  const recent = (lastSent.get(socketId) || []).filter((t) => now - t < 8000);
  if (recent.length >= 6) return { error: 'Слишком быстро. Подождите секунду' };
  recent.push(now);
  lastSent.set(socketId, recent);

  const text = String(rawText || '').trim().slice(0, 300);
  if (!text) return { error: 'Пустое сообщение' };

  const message = {
    id: nextId(),
    at: now,
    authorName: visitor.nickname,
    text,
  };
  chat.push(message);
  if (chat.length > CHAT_LIMIT) chat.splice(0, chat.length - CHAT_LIMIT);
  return { success: true, message };
}

export function lobbySnapshot() {
  const unique = new Map();
  for (const v of visitors.values()) {
    const prev = unique.get(v.nickname);
    if (!prev || (prev.where === 'hall' && v.where === 'table')) {
      unique.set(v.nickname, v);
    }
  }
  const online = [...unique.values()].sort((a, b) =>
    a.nickname.localeCompare(b.nickname, 'ru'),
  );
  return {
    online,
    count: online.length,
    chat: chat.slice(-80),
  };
}
