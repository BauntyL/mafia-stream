import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import { Panel, Badge } from './ui';
import { IconCamera, IconCameraOff, IconCheck } from './Icons';
import { useSocket } from '../hooks/useSocket';
import {
  CAMERA_QUALITY,
  getCameraDeviceId,
  getCameraQuality,
  getCameraStream,
  isCameraLive,
  listCameras,
  startCamera,
  stopCamera,
  subscribeCamera,
  type CameraQuality,
} from '../webrtc/session';

interface CameraSetupProps {
  hasCamera: boolean;
  compact?: boolean;
}

export function CameraSetup({ hasCamera, compact }: CameraSetupProps) {
  const { emit } = useSocket();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [quality, setQuality] = useState<CameraQuality>(getCameraQuality());
  const [deviceId, setDeviceId] = useState(getCameraDeviceId() || '');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [live, setLive] = useState(isCameraLive());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return subscribeCamera(() => setLive(isCameraLive()));
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = getCameraStream();
    el.play().catch(() => undefined);
  }, [live]);

  useEffect(() => {
    if (live && !hasCamera) emit('setCamera', { enabled: true });
  }, [live, hasCamera, emit]);

  const refreshDevices = async () => {
    try {
      const list = await listCameras();
      setDevices(list);
      if (!deviceId && list[0]?.deviceId) setDeviceId(list[0].deviceId);
    } catch {
      /* без разрешения список придёт пустым */
    }
  };

  const enable = async (nextQuality = quality, nextDevice = deviceId) => {
    setBusy(true);
    setError('');
    try {
      await startCamera({ quality: nextQuality, deviceId: nextDevice || undefined });
      await emit('setCamera', { enabled: true });
      await refreshDevices();
      const el = videoRef.current;
      if (el) {
        el.srcObject = getCameraStream();
        await el.play().catch(() => undefined);
      }
    } catch (err) {
      stopCamera();
      await emit('setCamera', { enabled: false });
      const name = err instanceof Error ? err.name : '';
      setError(
        name === 'NotAllowedError'
          ? 'Браузер не дал доступ к камере. Разрешите её в настройках сайта.'
          : name === 'NotFoundError'
            ? 'Камера не найдена. Можно играть и без неё — на стриме будет портрет.'
            : 'Не удалось включить камеру. Можно играть без неё.',
      );
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    stopCamera();
    await emit('setCamera', { enabled: false });
    setError('');
  };

  const body = (
    <>
      {!compact && (
        <p className="text-[13px] leading-relaxed text-bone-600">
          Камера идёт напрямую с этого сайта на экран OBS — без VDO.Ninja и лишних вкладок.
          Без камеры тоже можно играть: на стриме вместо вас будет портрет.
        </p>
      )}

      <div className={compact ? '' : 'mt-4'}>
        <span className="eyebrow mb-2 block">Качество</span>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(CAMERA_QUALITY) as CameraQuality[]).map((id) => {
            const opt = CAMERA_QUALITY[id];
            return (
              <button
                key={id}
                disabled={busy}
                onClick={() => {
                  setQuality(id);
                  if (live) enable(id, deviceId);
                }}
                className={`rounded-[7px] border px-2 py-2.5 text-center transition-colors
                  ${
                    quality === id
                      ? 'border-bone-50/25 bg-bone-50/[0.07] text-bone-50'
                      : 'border-bone-50/10 text-bone-600 hover:border-bone-50/18 hover:text-bone-400'
                  }`}
              >
                <span className="block text-[13px] font-medium">{opt.label}</span>
                <span className="mt-0.5 block text-[10px] text-bone-700">{opt.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      {devices.length > 1 && (
        <label className="mt-3 block">
          <span className="eyebrow mb-2 block">Какая камера</span>
          <select
            value={deviceId}
            disabled={busy}
            onChange={(e) => {
              const id = e.target.value;
              setDeviceId(id);
              if (live) enable(quality, id);
            }}
            className="h-10 w-full rounded-[7px] border border-bone-50/12 bg-ink-1000/60 px-3
              text-[13px] text-bone-50 focus:border-bone-50/30 focus:outline-none"
          >
            {devices.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Камера ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
      )}

      <Button
        onClick={() => (live ? disable() : enable())}
        variant={live ? 'secondary' : 'primary'}
        className="mt-4 w-full"
        disabled={busy}
        icon={live ? <IconCameraOff size={16} /> : <IconCamera size={16} />}
      >
        {busy ? 'Подключаем…' : live ? 'Выключить камеру' : 'Включить камеру'}
      </Button>

      {error && <p className="mt-3 text-[13px] text-blood-300">{error}</p>}

      <AnimatePresence>
        {live && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-2">
              <span className="eyebrow block">Предпросмотр</span>
              <div className="overflow-hidden rounded-[8px] border border-bone-50/10 bg-ink-1000">
                <video
                  ref={videoRef}
                  className="aspect-video w-full -scale-x-100 object-cover"
                  autoPlay
                  muted
                  playsInline
                />
              </div>
              <p className="text-xs text-bone-700">
                Если картинка есть здесь, она уже идёт на экран OBS.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  if (compact) return <div>{body}</div>;

  return (
    <Panel
      title="Камера"
      action={
        live || hasCamera ? (
          <Badge tone="sage" icon={<IconCheck size={12} />}>
            В эфире
          </Badge>
        ) : (
          <Badge>Выключена</Badge>
        )
      }
    >
      {body}
    </Panel>
  );
}
