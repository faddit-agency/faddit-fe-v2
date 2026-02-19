import { create, StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';

type AppStateCreator<T extends object> = StateCreator<T, [['zustand/devtools', never]], []>;

export const createAppStore = <T extends object>(
  storeName: string,
  stateCreator: AppStateCreator<T>,
) =>
  create<T>()(
    devtools(stateCreator, {
      name: storeName,
      enabled: true,
    }),
  );
