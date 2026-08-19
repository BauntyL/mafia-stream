import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import {
  applyBitrate,
  addIce,
  createPeer,
  flushIce,
  getCameraStream,
  isCameraLive,
  subscribeCamera,
} from '../webrtc/session';

interface WatchPayload {
  viewerId: string;
}

interface AnswerPayload {
  viewerId: string;
  sdp: RTCSessionDescriptionInit;
}

interface IcePayload {
  viewerId: string;
  candidate: RTCIceCandidateInit;
}

interface PeerSlot {
  pc: RTCPeerConnection;
  queue: RTCIceCandidateInit[];
}

const peers = new Map<string, PeerSlot>();

function closePeer(viewerId: string) {
  const slot = peers.get(viewerId);
  if (!slot) return;
  slot.pc.close();
  peers.delete(viewerId);
}

function closeAll() {
  for (const id of [...peers.keys()]) closePeer(id);
}

async function attachStream(pc: RTCPeerConnection, stream: MediaStream) {
  const video = stream.getVideoTracks()[0];
  if (!video) return;
  const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
  if (sender) await sender.replaceTrack(video);
  else pc.addTrack(video, stream);
  await applyBitrate(pc);
}

async function publishTo(socket: Socket, viewerId: string) {
  const stream = getCameraStream();
  if (!stream) return;

  closePeer(viewerId);
  const pc = createPeer();
  const queue: RTCIceCandidateInit[] = [];
  peers.set(viewerId, { pc, queue });

  pc.onicecandidate = (ev) => {
    if (ev.candidate) {
      socket.emit('webrtcIce', { viewerId, candidate: ev.candidate.toJSON() });
    }
  };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
      closePeer(viewerId);
    }
  };

  await attachStream(pc, stream);
  const offer = await pc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false });
  await pc.setLocalDescription(offer);
  socket.emit('webrtcOffer', { viewerId, sdp: pc.localDescription });
}

/** Держит раздачу камеры, пока игрок в лобби или в партии. */
export function useCameraPublisher(socket: Socket) {
  useEffect(() => {
    const onWatch = ({ viewerId }: WatchPayload) => {
      publishTo(socket, viewerId);
    };
    const onAnswer = async ({ viewerId, sdp }: AnswerPayload) => {
      const slot = peers.get(viewerId);
      if (!slot) return;
      await slot.pc.setRemoteDescription(sdp);
      await flushIce(slot.pc, slot.queue);
    };
    const onIce = ({ viewerId, candidate }: IcePayload) => {
      const slot = peers.get(viewerId);
      if (slot) addIce(slot.pc, candidate, slot.queue);
    };
    const onLeft = ({ viewerId }: WatchPayload) => closePeer(viewerId);
    const announce = () => {
      if (isCameraLive()) socket.emit('setCamera', { enabled: true });
    };

    socket.on('webrtcWatch', onWatch);
    socket.on('webrtcAnswer', onAnswer);
    socket.on('webrtcIce', onIce);
    socket.on('webrtcViewerLeft', onLeft);
    socket.on('connect', announce);
    announce();

    const unsub = subscribeCamera(() => {
      const live = getCameraStream();
      if (!live) {
        closeAll();
        return;
      }
      peers.forEach((slot) => attachStream(slot.pc, live));
    });

    return () => {
      socket.off('webrtcWatch', onWatch);
      socket.off('webrtcAnswer', onAnswer);
      socket.off('webrtcIce', onIce);
      socket.off('webrtcViewerLeft', onLeft);
      socket.off('connect', announce);
      unsub();
      closeAll();
    };
  }, [socket]);
}
