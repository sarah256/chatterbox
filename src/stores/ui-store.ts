"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const THREAD_PANEL = {
  defaultWidth: 440,
  minWidth: 320,
  minChannelWidth: 480,
} as const;

type UiState = {
  sidebarCollapsed: boolean;
  threadPanelWidth: number;
  toggleSidebar: () => void;
  setThreadPanelWidth: (width: number) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      threadPanelWidth: THREAD_PANEL.defaultWidth,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setThreadPanelWidth: (width) =>
        set({
          threadPanelWidth: Math.max(THREAD_PANEL.minWidth, Math.round(width)),
        }),
    }),
    {
      name: "chatterbox-ui",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ sidebarCollapsed, threadPanelWidth }) => ({
        sidebarCollapsed,
        threadPanelWidth,
      }),
      // Rehydrated from AppShell after mount so the server render and the
      // first client render agree.
      skipHydration: true,
    },
  ),
);

function subscribeToHydration(onChange: () => void) {
  return useUiStore.persist.onFinishHydration(onChange);
}

export function useUiStoreHydrated() {
  return useSyncExternalStore(
    subscribeToHydration,
    () => useUiStore.persist.hasHydrated(),
    () => false,
  );
}
