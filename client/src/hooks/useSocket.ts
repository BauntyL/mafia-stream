import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { RoomState } from '../types';

const SOCKET_URL = import.meta.env.PROD ? window.location.origin : 'http://localhost:3001';

let globalSocket: Socket | null = null;

function getSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io(SOCKET_URL, { autoConnect: false, transports: ['websocket', 'polling'] });
  }
  return globalSocket;
}

export function useSocket() {
  const socketRef = useRef<Socket>(getSocket());
  const [connected, setConnected] = useState(socketRef.current.connected);
  const [room, setRoom] = useState<RoomState | null>(null);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket.connected) socket.connect();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onRoomUpdate = (data: RoomState) => setRoom(data);
    const onRoomUpdatePrivate = (data: RoomState) => setRoom(data);
    const onRoomUpdateOverlay = (data: RoomState) => setRoom(data);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('roomUpdate', onRoomUpdate);
    socket.on('roomUpdatePrivate', onRoomUpdatePrivate);
    socket.on('roomUpdateOverlay', onRoomUpdateOverlay);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('roomUpdate', onRoomUpdate);
      socket.off('roomUpdatePrivate', onRoomUpdatePrivate);
      socket.off('roomUpdateOverlay', onRoomUpdateOverlay);
    };
  }, []);

  const emit = useCallback(<T,>(event: string, data?: unknown): Promise<T> => {
    return new Promise((resolve) => {
      socketRef.current.emit(event, data, resolve);
    });
  }, []);

  return { socket: socketRef.current, connected, room, setRoom, emit };
}

export function useOverlaySocket(code: string) {
  const socketRef = useRef<Socket>(getSocket());
  const [room, setRoom] = useState<RoomState | null>(null);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket.connected) socket.connect();

    const onOverlay = (data: RoomState) => setRoom(data);
    socket.on('roomUpdateOverlay', onOverlay);
    socket.emit('joinOverlay', { code });

    return () => {
      socket.off('roomUpdateOverlay', onOverlay);
    };
  }, [code]);

  return { room };
}
