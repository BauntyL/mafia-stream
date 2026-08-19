import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import { Panel, Input, Field, Badge } from './ui';
import { IconCamera, IconCheck, IconLink } from './Icons';
import { buildVdoPushUrl, buildVdoViewUrl, generateStreamId, parseVdoUrl } from '../utils/vdo';
import { useSocket } from '../hooks/useSocket';

interface CameraSetupProps {
  roomCode: string;
  playerId: string;
  hasCamera: boolean;
}

const QUALITY_OPTIONS = [
  { value: '360', label: '360p', hint: 'слабый ПК' },
  { value: '720', label: '720p', hint: 'рекомендуется' },
  { value: '1080', label: '1080p', hint: 'мощный ПК' },
];

export function CameraSetup({ roomCode, playerId, hasCamera }: CameraSetupProps) {
  const { emit } = useSocket();
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [manualUrl, setManualUrl] = useState('');
  const [quality, setQuality] = useState('720');
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');

  const streamId = generateStreamId(roomCode, playerId);
  const pushUrl = buildVdoPushUrl(roomCode, streamId, quality);
  const viewUrl = buildVdoViewUrl(streamId, roomCode);

  const handleAuto = async () => {
    setError('');
    setActive(true);
    await emit('setCamera', { streamId, viewUrl });
  };

  const handleManual = async () => {
    if (!manualUrl.includes('vdo.ninja')) {
      setError('Нужна ссылка с vdo.ninja');
      return;
    }
    const parsed = parseVdoUrl(manualUrl);
    setError('');
    const finalId = parsed.streamId || streamId;
    const finalView = parsed.viewUrl.includes('view=')
      ? parsed.viewUrl
      : buildVdoViewUrl(finalId, roomCode);
    setActive(true);
    await emit('setCamera', { streamId: finalId, viewUrl: finalView });
  };

  const handleDisable = async () => {
    setActive(false);
    setManualUrl('');
    await emit('setCamera', { streamId: null, viewUrl: null });
  };

  return (
    <Panel
      title="Камера"
      action={
        hasCamera ? (
          <Badge tone="sage" icon={<IconCheck size={12} />}>
            Подключена
          </Badge>
        ) : (
          <Badge>Не подключена</Badge>
        )
      }
    >
      <p className="text-[13px] leading-relaxed text-bone-600">
        Видео идёт через VDO.Ninja — ставить ничего не нужно, только разрешите доступ к камере.
        Без камеры тоже можно играть: на стриме вместо вас будет портрет.
      </p>

      <div className="mt-4 inline-flex rounded-[7px] border border-bone-50/10 bg-ink-1000/50 p-0.5">
        {(
          [
            { id: 'auto', label: 'Автоматически' },
            { id: 'manual', label: 'Своя ссылка' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`relative rounded-[5px] px-3.5 py-1.5 text-[13px] transition-colors
              ${mode === tab.id ? 'text-bone-50' : 'text-bone-600 hover:text-bone-400'}`}
          >
            {mode === tab.id && (
              <motion.span
                layoutId="cam-tab"
                className="absolute inset-0 rounded-[5px] border border-bone-50/12 bg-bone-50/[0.07]"
                transition={{ type: 'spring', stiffness: 450, damping: 38 }}
              />
            )}
            <span className="relative">{tab.label}</span>
          </button>
        ))}
      </div>

      {mode === 'auto' ? (
        <div className="mt-4 space-y-4">
          <div>
            <span className="eyebrow mb-2 block">Качество</span>
            <div className="grid grid-cols-3 gap-2">
              {QUALITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setQuality(opt.value)}
                  className={`rounded-[7px] border px-2 py-2.5 text-center transition-colors
                    ${
                      quality === opt.value
                        ? 'border-bone-50/25 bg-bone-50/[0.07] text-bone-50'
                        : 'border-bone-50/10 text-bone-600 hover:border-bone-50/18 hover:text-bone-400'
                    }`}
                >
                  <span className="block text-[13px] font-medium">{opt.label}</span>
                  <span className="mt-0.5 block text-[10px] text-bone-700">{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleAuto}
            variant={hasCamera ? 'secondary' : 'primary'}
            className="w-full"
            icon={<IconCamera size={16} />}
          >
            {hasCamera ? 'Перенастроить камеру' : 'Включить камеру'}
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <Field label="Ссылка VDO.Ninja" hint="Например, https://vdo.ninja/?push=my-stream">
            <Input
              value={manualUrl}
              onChange={(e) => {
                setManualUrl(e.target.value);
                setError('');
              }}
              placeholder="https://vdo.ninja/?push=..."
              invalid={!!error}
            />
          </Field>
          <Button onClick={handleManual} variant="secondary" className="w-full" icon={<IconLink size={16} />}>
            Сохранить ссылку
          </Button>
        </div>
      )}

      {error && <p className="mt-3 text-[13px] text-blood-300">{error}</p>}

      {hasCamera && (
        <button
          onClick={handleDisable}
          className="mt-3 text-[12.5px] text-bone-700 underline-offset-4 transition-colors hover:text-bone-400 hover:underline"
        >
          Играть без камеры
        </button>
      )}

      <AnimatePresence>
        {(active || hasCamera) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-5 space-y-2">
              <span className="eyebrow block">Предпросмотр</span>
              <div className="overflow-hidden rounded-[8px] border border-bone-50/10 bg-ink-1000">
                <div className="aspect-video">
                  <iframe
                    src={active && mode === 'auto' ? pushUrl : viewUrl}
                    className="h-full w-full border-0"
                    allow="autoplay; camera; microphone; display-capture"
                    title="Предпросмотр камеры"
                  />
                </div>
              </div>
              <p className="text-xs text-bone-700">
                Разрешите доступ к камере в окне выше — картинка сразу появится на стриме.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Panel>
  );
}
