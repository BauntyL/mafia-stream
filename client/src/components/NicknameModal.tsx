import { useState } from 'react';
import { Modal, Input, Field } from './ui';
import { Button } from './Button';
import { usePlayerStore } from '../store/settings';

interface NicknameModalProps {
  forceOpen?: boolean;
  onConfirm?: (nickname: string) => void;
}

export function NicknameModal({ forceOpen, onConfirm }: NicknameModalProps) {
  const { nickname, setNickname } = usePlayerStore();
  const [input, setInput] = useState(nickname || '');
  const [error, setError] = useState('');
  const open = forceOpen || !nickname;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed.length < 2) {
      setError('Минимум 2 символа');
      return;
    }
    if (trimmed.length > 20) {
      setError('Не больше 20 символов');
      return;
    }
    setNickname(trimmed);
    onConfirm?.(trimmed);
  };

  return (
    <Modal
      open={open}
      title="Представьтесь"
      subtitle="Под этим именем вас увидят за столом и на стриме"
      closable={false}
    >
      <form onSubmit={handleSubmit}>
        <Field label="Никнейм">
          <Input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError('');
            }}
            placeholder="Например, Валерия"
            autoFocus
            maxLength={20}
            invalid={!!error}
          />
        </Field>
        {error && <p className="mt-2 text-[13px] text-blood-300">{error}</p>}
        <Button type="submit" size="lg" className="mt-5 w-full">
          Продолжить
        </Button>
      </form>
    </Modal>
  );
}
