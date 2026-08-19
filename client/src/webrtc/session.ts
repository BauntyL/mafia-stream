export type CameraQuality = '360' | '720' | '1080';

export const CAMERA_QUALITY: Record<
  CameraQuality,
  { width: number; height: number; frameRate: number; bitrate: number; label: string; hint: string }
> = {
  '360': { width: 640, height: 360, frameRate: 24, bitrate: 500_000, label: '360p', hint: 'слабый ПК' },
  '720': { width: 1280, height: 720, frameRate: 24, bitrate: 900_000, label: '720p', hint: 'рекомендуется' },
  '1080': { width: 1920, height: 1080, frameRate: 24, bitrate: 1_600_000, label: '1080p', hint: 'мощный ПК' },
};

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  { urls: 'stun:stun.cloudflare.com:3478' },
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turns:openrelay.metered.ca:443',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

type Listener = () => void;

let stream: MediaStream | null = null;
let quality: CameraQuality = '720';
let deviceId: string | undefined;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribeCamera(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getCameraStream() {
  return stream;
}

export function getCameraQuality() {
  return quality;
}

export function getCameraDeviceId() {
  return deviceId;
}

export function isCameraLive() {
  return Boolean(stream?.getVideoTracks().some((t) => t.readyState === 'live'));
}

export async function listCameras(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === 'videoinput');
}

export async function startCamera(opts: { quality: CameraQuality; deviceId?: string }) {
  const q = CAMERA_QUALITY[opts.quality];
  const next = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      deviceId: opts.deviceId ? { exact: opts.deviceId } : undefined,
      width: { ideal: q.width },
      height: { ideal: q.height },
      frameRate: { ideal: q.frameRate, max: 30 },
      facingMode: opts.deviceId ? undefined : 'user',
    },
  });

  stream?.getTracks().forEach((t) => t.stop());
  stream = next;
  quality = opts.quality;
  deviceId = opts.deviceId || next.getVideoTracks()[0]?.getSettings().deviceId;
  notify();
  return next;
}

export function stopCamera() {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  notify();
}

export function createPeer(): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers: ICE_SERVERS, bundlePolicy: 'max-bundle' });
}

export async function applyBitrate(pc: RTCPeerConnection) {
  const bps = CAMERA_QUALITY[quality].bitrate;
  for (const sender of pc.getSenders()) {
    if (sender.track?.kind !== 'video') continue;
    const params = sender.getParameters();
    if (!params.encodings?.length) params.encodings = [{}];
    params.encodings.forEach((enc) => {
      enc.maxBitrate = bps;
      enc.maxFramerate = CAMERA_QUALITY[quality].frameRate;
    });
    try {
      await sender.setParameters(params);
    } catch {
      /* Safari может не принять параметры до первого кадра */
    }
  }
}

export async function addIce(
  pc: RTCPeerConnection,
  candidate: RTCIceCandidateInit | null,
  queue: RTCIceCandidateInit[],
) {
  if (!candidate) return;
  if (!pc.remoteDescription) {
    queue.push(candidate);
    return;
  }
  try {
    await pc.addIceCandidate(candidate);
  } catch {
    /* устаревший кандидат после пересоздания соединения */
  }
}

export async function flushIce(pc: RTCPeerConnection, queue: RTCIceCandidateInit[]) {
  const pending = queue.splice(0, queue.length);
  for (const c of pending) {
    try {
      await pc.addIceCandidate(c);
    } catch {
      /* ignore */
    }
  }
}
