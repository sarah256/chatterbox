"use client";

import { MessageSquareText, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ThreadPanel({
  threadId,
  onClose,
}: {
  threadId: string;
  onClose: () => void;
}) {
  return (
    <section
      aria-label="Thread"
      className="flex h-full min-w-0 flex-col bg-background"
    >
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <MessageSquareText className="size-4 text-muted-foreground" />
        <h2 className="flex-1 truncate text-sm font-semibold">Thread</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close thread"
            >
              <X />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Close thread</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
        <p>
          Replies in thread{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            {threadId}
          </code>{" "}
          will appear here.
        </p>
      </div>

      <div className="shrink-0 p-3">
        <div className="rounded-xl border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
          Reply…
        </div>
      </div>
    </section>
  );
}
