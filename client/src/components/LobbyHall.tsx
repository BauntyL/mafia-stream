import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconSend, IconUsers } from './Icons';
import type { LobbyState } from '../types';

interface LobbyHallProps {
  lobby: LobbyState;
  me: string;
  onSend: (text: string) => Promise<string | null>;
}

export function LobbyHall({ lobby, me, onSend }: LobbyHallProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lobby.chat.length]);

  const send = async () => {
    const value = text.trim();
    if (!value) return;
    setText('');
    const err = await onSend(value);
    if (err) {
      setError(err);
      window.setTimeout(() => setError(null), 2500);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="panel overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
          <h3 className="eyebrow">Онлайн</h3>
          <span className="flex items-center gap-1.5 text-[12px] text-sage-400">
            <span className="h-1.5 w-1.5 rounded-full bg-sage-400" />
            {lobby.count}
          </span>
        </header>
        <div className="rule" />
        <ul className="max-h-[168px] space-y-1 overflow-y-auto px-5 py-3">
          {lobby.online.length === 0 && (
            <li className="py-3 text-center text-[13px] text-bone-700">Пока никого нет</li>
          )}
          {lobby.online.map((person) => (
            <li
              key={person.nickname}
              className="flex items-center justify-between gap-3 py-1 text-[14px]"
            >
              <span className="flex min-w-0 items-center gap-2 text-bone-100">
                <IconUsers size={13} className="shrink-0 text-bone-700" />
                <span className="truncate">
                  {person.nickname}
                  {person.nickname === me ? (
                    <span className="ml-1.5 text-[11px] text-bone-700">вы</span>
                  ) : null}
                </span>
              </span>
              <span className="shrink-0 text-[11px] text-bone-700">
                {person.where === 'table' ? 'за столом' : 'в холле'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel flex h-[340px] flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-3 px-5 pt-4 pb-3">
          <h3 className="eyebrow">Общий чат</h3>
          <span className="text-[11px] text-bone-700">весь сайт</span>
        </header>
        <div className="rule shrink-0" />

        <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {lobby.chat.length === 0 && (
            <p className="pt-6 text-center text-[13px] text-bone-700">
              Напишите первым. Здесь все, кто сейчас на сайте.
            </p>
          )}
          <AnimatePresence initial={false}>
            {lobby.chat.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[13.5px] leading-snug"
              >
                <span className="font-medium text-bone-400">{m.authorName}</span>
                <span className="ml-2 text-bone-100">{m.text}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="shrink-0 border-t border-bone-50/[0.07] p-3">
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
              placeholder="Написать…"
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
    </div>
  );
}
