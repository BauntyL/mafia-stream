import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconClose, IconSend, IconUsers } from './Icons';
import { ChatCensorToggle } from './ChatCensorToggle';
import { useSettings } from '../store/settings';
import { CENSOR_SEND_ERROR, censorChat, isChatBanned } from '../utils/censor';
import type { LobbyState } from '../types';

interface LobbyHallProps {
  open: boolean;
  onClose: () => void;
  lobby: LobbyState;
  me: string;
  onSend: (text: string) => Promise<string | null>;
}

export function LobbyHall({ open, onClose, lobby, me, onSend }: LobbyHallProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatCensor = useSettings((s) => s.chatCensor);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lobby.chat.length, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => inputRef.current?.focus(), 220);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  const send = async () => {
    const value = text.trim();
    if (!value) return;
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
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <motion.button
            type="button"
            aria-label="Закрыть чат"
            className="absolute inset-0 bg-ink-1000/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          <motion.aside
            role="dialog"
            aria-label="Онлайн и общий чат"
            initial={{ x: 28, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 24, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
            className="relative flex h-full w-full max-w-[360px] flex-col border-l border-bone-50/10
              bg-ink-900 shadow-[-32px_0_80px_-40px_rgba(0,0,0,0.95)]"
          >
            <header className="flex shrink-0 items-center justify-between gap-3 px-5 py-4">
              <div>
                <h2 className="font-display text-[20px] leading-tight text-bone-50">Холл</h2>
                <p className="mt-0.5 text-[12px] text-bone-700">Кто на сайте и общий чат</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                className="-mr-1 rounded p-1.5 text-bone-600 transition-colors hover:text-bone-50"
              >
                <IconClose size={18} />
              </button>
            </header>
            <div className="rule shrink-0" />

            <section className="flex min-h-0 max-h-[38%] shrink-0 flex-col">
              <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-3 pb-2">
                <h3 className="eyebrow">Онлайн</h3>
                <span className="flex items-center gap-1.5 text-[12px] text-sage-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-sage-400" />
                  {lobby.count}
                </span>
              </div>
              <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-5 pb-3">
                {lobby.online.length === 0 && (
                  <li className="py-2 text-center text-[13px] text-bone-700">Пока никого нет</li>
                )}
                {lobby.online.map((person) => (
                  <li
                    key={person.nickname}
                    className="flex items-center justify-between gap-3 py-1 text-[13.5px]"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-bone-100">
                      <IconUsers size={12} className="shrink-0 text-bone-700" />
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

            <div className="rule shrink-0" />

            <section className="flex min-h-0 flex-1 flex-col">
              <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-3 pb-2">
                <h3 className="eyebrow">Общий чат</h3>
                <ChatCensorToggle compact />
              </div>

              <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-3">
                {lobby.chat.length === 0 && (
                  <p className="pt-8 text-center text-[13px] text-bone-700">
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
                      <span className="font-medium text-bone-400">
                        {chatCensor ? censorChat(m.authorName) : m.authorName}
                      </span>
                      <span className="ml-2 text-bone-100">{chatCensor ? censorChat(m.text) : m.text}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="shrink-0 border-t border-bone-50/[0.07] p-3">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
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
                    type="button"
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
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
