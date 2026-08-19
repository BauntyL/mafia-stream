import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  musicVolume: number;
  sfxVolume: number;
  animationsEnabled: boolean;
  roleHidden: boolean;
  setMusicVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  setAnimationsEnabled: (v: boolean) => void;
  setRoleHidden: (v: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      musicVolume: 0.35,
      sfxVolume: 0.5,
      animationsEnabled: true,
      roleHidden: false,
      setMusicVolume: (musicVolume) => set({ musicVolume }),
      setSfxVolume: (sfxVolume) => set({ sfxVolume }),
      setAnimationsEnabled: (animationsEnabled) => set({ animationsEnabled }),
      setRoleHidden: (roleHidden) => set({ roleHidden }),
    }),
    {
      name: 'mafia-settings',
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as SettingsState;
        if (version < 2 && state.musicVolume === 0) {
          return { ...state, musicVolume: 0.35 };
        }
        return state;
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
