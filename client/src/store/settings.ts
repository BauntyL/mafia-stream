import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  musicVolume: number;
  sfxVolume: number;
  animationsEnabled: boolean;
  roleHidden: boolean;
  chatCensor: boolean;
  setMusicVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  setAnimationsEnabled: (v: boolean) => void;
  setRoleHidden: (v: boolean) => void;
  setChatCensor: (v: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      musicVolume: 0.1,
      sfxVolume: 0.5,
      animationsEnabled: true,
      roleHidden: false,
      chatCensor: true,
      setMusicVolume: (musicVolume) => set({ musicVolume }),
      setSfxVolume: (sfxVolume) => set({ sfxVolume }),
      setAnimationsEnabled: (animationsEnabled) => set({ animationsEnabled }),
      setRoleHidden: (roleHidden) => set({ roleHidden }),
      setChatCensor: (chatCensor) => set({ chatCensor }),
    }),
    {
      name: 'mafia-settings',
      version: 4,
      migrate: (persisted, version) => {
        const state = persisted as SettingsState;
        let next = state;
        if (version < 3) {
          next = { ...next, musicVolume: 0.1 };
        }
        if (version < 4) {
          next = { ...next, chatCensor: true };
        }
        return next;
      },
    }
  )
);

interface PlayerState {
  nickname: string | null;
  playerId: string | null;
  roomCode: string | null;
  setNickname: (nickname: string) => void;
  setPlayer: (playerId: string, roomCode: string) => void;
  clear: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      nickname: null,
      playerId: null,
      roomCode: null,
      setNickname: (nickname) => set({ nickname }),
      setPlayer: (playerId, roomCode) => set({ playerId, roomCode }),
      clear: () => set({ playerId: null, roomCode: null }),
    }),
    { name: 'mafia-player' }
  )
);
