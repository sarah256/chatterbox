"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { usePanelRef } from "react-resizable-panels";

import { Sidebar } from "@/components/layout/Sidebar";
import { ThreadPanel } from "@/components/layout/ThreadPanel";
import { WorkspaceHeader } from "@/components/layout/WorkspaceHeader";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useThreadParam } from "@/hooks/useThreadParam";
import { THREAD_PANEL, useUiStore, useUiStoreHydrated } from "@/stores/ui-store";

export function AppShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    void useUiStore.persist.rehydrate();
  }, []);

  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);

  return (
    <div className="flex h-full flex-col">
      <WorkspaceHeader />
      <div className="flex min-h-0 flex-1">
        {!sidebarCollapsed && <Sidebar />}
        <ConversationArea>{children}</ConversationArea>
      </div>
    </div>
  );
}

function ConversationArea({ children }: { children: ReactNode }) {
  const hydrated = useUiStoreHydrated();
  const { threadId, closeThread } = useThreadParam();
  const threadPanelWidth = useUiStore((state) => state.threadPanelWidth);
  const setThreadPanelWidth = useUiStore((state) => state.setThreadPanelWidth);
  const threadPanelRef = usePanelRef();
  const groupRef = useRef<HTMLDivElement | null>(null);
  const groupWidth = useElementWidth(groupRef);

  // Wait for the persisted width so the panel never opens at the default
  // and then jumps.
  const showThread = hydrated && threadId !== null;

  // The thread minimum always holds. When the window is too narrow for both
  // minimums, the channel gives up width first.
  const channelMinWidth =
    groupWidth === null
      ? THREAD_PANEL.minChannelWidth
      : Math.max(
          0,
          Math.min(
            THREAD_PANEL.minChannelWidth,
            groupWidth - THREAD_PANEL.minWidth,
          ),
        );

  function resetThreadPanelWidth() {
    threadPanelRef.current?.resize(THREAD_PANEL.defaultWidth);
    setThreadPanelWidth(THREAD_PANEL.defaultWidth);
  }

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="min-w-0 flex-1"
      elementRef={groupRef}
      onLayoutChanged={(layout, meta) => {
        // Only user drags and arrow keys are saved. Clamping from a narrow
        // window must not overwrite the preferred width.
        const threadPercent = layout.thread;
        if (!meta.isUserInteraction || threadPercent === undefined) return;
        const width = groupRef.current?.getBoundingClientRect().width;
        if (width) setThreadPanelWidth((threadPercent / 100) * width);
      }}
    >
      <ResizablePanel id="channel" minSize={channelMinWidth}>
        <main className="flex h-full min-w-0 flex-col">{children}</main>
      </ResizablePanel>

      {showThread && (
        <>
          <ResizableHandle
            withHandle
            disableDoubleClick
            onDoubleClick={resetThreadPanelWidth}
            aria-label="Resize thread panel"
          />
          <ResizablePanel
            id="thread"
            panelRef={threadPanelRef}
            defaultSize={threadPanelWidth}
            minSize={THREAD_PANEL.minWidth}
            groupResizeBehavior="preserve-pixel-size"
          >
            <ThreadPanel threadId={threadId} onClose={closeThread} />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}

function useElementWidth(ref: RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}
