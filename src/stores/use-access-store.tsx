import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

import { zustandStorage } from '@/lib/storage';

interface AccessState {
  camera: {
    hasPermission: boolean;
    isActive: boolean;
  };
  setCamera: (data: AccessState['camera']) => void;
}

export const useAccessStore = create<AccessState>()(
  devtools(
    persist(
      (set) => ({
        camera: {
          hasPermission: false,
          isActive: true,
        },
        setCamera: (camera) => set((state) => ({ ...state, camera })),
      }),
      {
        name: 'access-storage',
        storage: createJSONStorage(() => zustandStorage),
      }
    )
  )
);
