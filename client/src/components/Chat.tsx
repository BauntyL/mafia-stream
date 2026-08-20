import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconSend, IconBan } from './Icons';
import { ChatCensorToggle } from './ChatCensorToggle';
import { useSettings } from '../store/settings';
import { CENSOR_SEND_ERROR, censorChat, isChatBanned } from '../utils/censor';
import type { ChatChannel, Player, RoomState } from '../types';

interface ChatProps {
  room: RoomState;
  me: Player | undefined;
  onSend: (text: string) => Promise<string | null>;
  className?: string;
}

const CHANNEL_STYLE: Record<ChatChannel, { name: string; text: string; dot: string }> = {
  all: { name: 'text-bone-400', text: 'text-bone-100', dot: 'bg-bone-50/30' },
  mafia: { name: 'text-blood-400', text: 'text-blood-100', dot: 'bg-blood-500' },
  dead: { name: 'text-steel-300/70', text: 'text-steel-300/90', dot: 'bg-steel-300/60' },
  system: { name: 'text-brass-300', text: 'text-brass-300/90', dot: 'bg-brass-400' },
};

function resolveChannel(room: RoomState, me: Player | undefined): {
  channel: ChatChannel | null;
  label: string;
  blocked?: string;
} {
  if (!me) return { channel: null, label: '', blocked: 'Вы не за столом' };
  if (!room.settings.chatEnabled) return { channel: null, label: '', blocked: 'Чат выключен ведущим' };
  if (me.isHost) return { channel: 'all', label: 'Говорит ведущий' };
  if (!me.alive) return { channel: 'dead', label: 'Комната выбывших' };
  if (room.phase === 'roleReveal') return { channel: null, label: '', blocked: 'Дождитесь начала игры' };
  if (room.phase === 'night') {
    if (me.role === 'mafia' || me.role === 'don') {
      return { channel: 'mafia', label: 'Тайный чат мафии' };
    }
    return { channel: null, label: '', blocked: 'Ночью город спит' };
  }
  return { channel: 'all', label: 'Общий стол' };
}

export function Chat({ room, me, onSend, className }: ChatProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const chatCensor = useSettings((s) => s.chatCensor);

  const { channel, label, blocked } = useMemo(() => resolveChannel(room, me), [room, me]);
  const messages = room.chat;

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const send = async () => {
    const value = text.trim();
    if (!value || !channel) return;
    if (chatCensor && isChatBanned(value)) {
      setError(CENSOR_SEND_ERROR);
      window.setTimeout(() => setError(null), 2500);
      return;
    }
    setText('');
    const err = await onSend(value);
    if (err) {
      setError(err);
      window.setTimeout(() => setError(null), 2500);
    }
  };

  return (
    <section
      className={`panel flex flex-col overflow-hidden bg-ink-900 ${className ?? 'h-[320px] lg:h-[min(420px,50vh)]'}`}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 px-5 pt-4 pb-3">
        <h3 className="eyebrow">Чат</h3>
        <div className="flex items-center gap-2">
          {channel && (
            <span className="flex items-center gap-2 text-[11px] text-bone-600">
              <span className={`h-1.5 w-1.5 rounded-full ${CHANNEL_STYLE[channel].dot}`} />
              {label}
            </span>
          )}
          <ChatCensorToggle compact />
        </div>
      </header>
      <div className="rule shrink-0" />

      <div ref={listRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <p className="pt-6 text-center text-[13px] text-bone-700">
            Пока тихо. Здесь можно играть даже без голосовой связи.
          </p>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m) => {
            const style = CHANNEL_STYLE[m.channel];
            if (m.system) {
              return (
                <motion.p
                  key={m.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-1 text-center text-[12px] italic text-brass-300/75"
                >
                  {m.text}
                </motion.p>
              );
            }
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[13.5px] leading-snug"
              >
                <span className={`font-medium ${style.name}`}>
                  {m.authorSlot ? (
                    <span className="mr-1 font-mono text-[11px] tnum text-bone-700">
                      {String(m.authorSlot).padStart(2, '0')}
                    </span>
                  ) : null}
                  {m.isHost ? 'Ведущий' : chatCensor ? censorChat(m.authorName) : m.authorName}
                  {m.channel === 'mafia' && <span className="ml-1.5 text-[10px] uppercase tracking-[0.16em]">мафия</span>}
                  {m.channel === 'dead' && <span className="ml-1.5 text-[10px] uppercase tracking-[0.16em]">выбыл</span>}
                </span>
                <span className={`ml-2 ${style.text}`}>{chatCensor ? censorChat(m.text) : m.text}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="shrink-0 border-t border-bone-50/[0.07] p-3">
        {blocked ? (
          <div className="flex items-center justify-center gap-2 py-2 text-[13px] text-bone-700">
            <IconBan size={14} />
            {blocked}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              maxLength={300}
              placeholder={channel === 'mafia' ? 'Сообщение своим…' : 'Написать…'}
              className="h-10 min-w-0 flex-1 rounded-[7px] border border-bone-50/12 bg-ink-1000/60 px-3.5
                text-[14px] text-bone-50 placeholder:text-bone-700 transition-colors
                focus:border-bone-50/30 focus:outline-none"
            />
            <button
              onClick={send}
              disabled={!text.trim()}
              aria-label="Отправить"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[7px]
                border border-bone-50/12 text-bone-400 transition-colors
                hover:border-bone-50/25 hover:text-bone-50 disabled:opacity-30"
            >
              <IconSend size={16} />
            </button>
          </div>
        )}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-2 text-center text-[12px] text-blood-300"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
