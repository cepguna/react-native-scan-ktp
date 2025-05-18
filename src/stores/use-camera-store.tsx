import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

import { zustandStorage } from '@/lib/storage';

export const STEP_USER = {
  personalData: 0,
  selectRole: 1,
  selectSkill: 2,
  uploadPersonalData: 3,
  done: 4,
};

interface UserState {
  ktp: any;
  ktpUri: any;
  face: any;
  faceUri: any;
  setFace: (data: any) => void;
  setFaceUri: (data: any) => void;
  setKtp: (data: any) => void;
  setKtpUri: (data: any) => void;
  clear: () => void;
}

export const useCameraStore = create<UserState>()(
  devtools(
    persist(
      (set) => ({
        ktp: undefined,
        ktpUri: undefined,
        face: undefined,
        faceUri: undefined,
        setKtp: (data) => set((state) => ({ ...state, ktp: data })),
        setKtpUri: (data) => set((state) => ({ ...state, ktpUri: data })),
        setFace: (data) => set((state) => ({ ...state, face: data })),
        setFaceUri: (data) => set((state) => ({ ...state, faceUri: data })),
        clear: () =>
          set(() => ({
            me: {
              name: '',
              id: '',
              phone: '',
            },
            fullMe: undefined,
            ktp: undefined,
            face: undefined,
            onboardingStatus: 'personalData',
            onboarding: {
              personalData: {
                name: '',
                address: '',
                sex: '',
              },
              selectSkill: {
                skillOwner: [],
                skillUser: [],
              },
              selectRole: {
                isOwner: false,
                isWorker: false,
              },
            },
          })),
      }),
      {
        name: 'camera-storage',
        storage: createJSONStorage(() => zustandStorage),
      }
    )
  )
);
