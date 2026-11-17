"use client";

import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

const THREAD_PARAM = "thread";

// The open thread lives only in the URL. Native history updates keep the
// channel mounted, so opening or closing a thread never refetches the page
// or resets the channel's scroll position.
export function useThreadParam() {
  const searchParams = useSearchParams();
  const threadId = searchParams.get(THREAD_PARAM);

  const setThread = useCallback((id: string | null) => {
    const url = new URL(window.location.href);
    if (id) {
      url.searchParams.set(THREAD_PARAM, id);
    } else {
      url.searchParams.delete(THREAD_PARAM);
    }
    window.history.pushState(null, "", url);
  }, []);

  const openThread = useCallback((id: string) => setThread(id), [setThread]);
  const closeThread = useCallback(() => setThread(null), [setThread]);

  return { threadId, openThread, closeThread };
}
