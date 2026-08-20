import { useCallback, useEffect, useState } from 'react';
import type { LobbyState } from '../types';
import { useSocket } from './useSocket';

const EMPTY: LobbyState = { online: [], count: 0, chat: [] };

export function useLobby(nickname: string | null, where: 'hall' | 'table') {
  const { socket, emit, connected } = useSocket();
  const [lobby, setLobby] = useState<LobbyState>(EMPTY);

  useEffect(() => {
    if (!nickname || !connected) return;

    const onState = (data: LobbyState) => setLobby(data);
    socket.on('lobbyState', onState);

    emit<{ success: boolean; lobby?: LobbyState }>('hello', { nickname, where }).then((result) => {
      if (result?.lobby) setLobby(result.lobby);
    });

    return () => {
      socket.off('lobbyState', onState);
    };
  }, [nickname, connected, where, emit, socket]);

  const send = useCallback(
    async (text: string): Promise<string | null> => {
      const result = await emit<{ success: boolean; error?: string }>('lobbyChat', { text });
      return result?.success ? null : result?.error || 'Сообщение не отправлено';
    },
    [emit],
  );

  return { lobby, send, connected };
}
