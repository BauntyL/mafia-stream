import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { addIce, createPeer, flushIce } from '../webrtc/session';

interface OfferPayload {
  playerId: string;
  sdp: RTCSessionDescriptionInit;
}

interface IcePayload {
  playerId: string;
  candidate: RTCIceCandidateInit;
}

interface PeerSlot {
  pc: RTCPeerConnection;
  queue: RTCIceCandidateInit[];
}

/** Принимает камеры игроков на экране OBS. */
export function useCameraViewer(socket: Socket, playerIds: string[]) {
  const [streams, setStreams] = useState<Record<string, MediaStream>>({});
  const peers = useRef(new Map<string, PeerSlot>());
  const wanted = useRef(new Set<string>());
  const retries = useRef(new Map<string, number>());

  useEffect(() => {
    wanted.current = new Set(playerIds);

    const drop = (playerId: string) => {
      const slot = peers.current.get(playerId);
      if (slot) {
        slot.pc.close();
        peers.current.delete(playerId);
      }
      retries.current.delete(playerId);
      setStreams((prev) => {
        if (!prev[playerId]) return prev;
        const next = { ...prev };
        delete next[playerId];
        return next;
      });
    };

    const watch = (playerId: string) => {
      if (peers.current.has(playerId)) return;
      socket.emit('webrtcWatch', { playerId });
      window.setTimeout(() => {
        if (!wanted.current.has(playerId) || peers.current.has(playerId)) return;
        socket.emit('webrtcWatch', { playerId });
      }, 2000);
    };

    const onOffer = async ({ playerId, sdp }: OfferPayload) => {
      if (!wanted.current.has(playerId)) return;

      const prev = peers.current.get(playerId);
      prev?.pc.close();

      const pc = createPeer();
      const queue: RTCIceCandidateInit[] = [];
      peers.current.set(playerId, { pc, queue });

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          socket.emit('webrtcIce', { playerId, candidate: ev.candidate.toJSON() });
        }
      };
      pc.ontrack = (ev) => {
        const media = ev.streams[0] || new MediaStream([ev.track]);
        setStreams((prev) => ({ ...prev, [playerId]: media }));
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') retries.current.delete(playerId);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          drop(playerId);
          if (!wanted.current.has(playerId)) return;
          const n = (retries.current.get(playerId) || 0) + 1;
          retries.current.set(playerId, n);
          if (n <= 4) window.setTimeout(() => watch(playerId), 1200 * n);
        }
      };

      await pc.setRemoteDescription(sdp);
      await flushIce(pc, queue);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtcAnswer', { playerId, sdp: pc.localDescription });
    };

    const onIce = ({ playerId, candidate }: IcePayload) => {
      const slot = peers.current.get(playerId);
      if (slot) addIce(slot.pc, candidate, slot.queue);
    };

    socket.on('webrtcOffer', onOffer);
    socket.on('webrtcIce', onIce);

    const restart = () => {
      peers.current.forEach((slot) => slot.pc.close());
      peers.current.clear();
      setStreams({});
      playerIds.forEach(watch);
    };
    socket.on('connect', restart);

    playerIds.forEach(watch);
    for (const id of [...peers.current.keys()]) {
      if (!wanted.current.has(id)) drop(id);
    }

    return () => {
      socket.off('webrtcOffer', onOffer);
      socket.off('webrtcIce', onIce);
      socket.off('connect', restart);
    };
  }, [socket, playerIds.join('|')]);

  useEffect(() => {
    return () => {
      peers.current.forEach((slot) => slot.pc.close());
      peers.current.clear();
    };
  }, []);

  return streams;
}
