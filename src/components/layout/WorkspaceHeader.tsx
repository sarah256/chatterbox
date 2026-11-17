"use client";

import { UserButton } from "@clerk/nextjs";
import { MessagesSquare, PanelLeft, Search } from "lucide-react";

import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUiStore } from "@/stores/ui-store";

export function WorkspaceHeader() {
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  return (
    <header className="flex h-11 shrink-0 items-center gap-2 border-b bg-sidebar px-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
            aria-pressed={!sidebarCollapsed}
          >
            <PanelLeft />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
        </TooltipContent>
      </Tooltip>

      <div className="flex items-center gap-2 text-sm font-semibold">
        <MessagesSquare className="size-4 text-primary" />
        Chatterbox
      </div>

      <div className="flex flex-1 justify-center">
        <Button
          variant="outline"
          size="sm"
          className="w-full max-w-md justify-start text-muted-foreground"
          disabled
        >
          <Search />
          Search
        </Button>
      </div>

      <ThemeToggle />
      <div className="flex size-7 items-center justify-center">
        <UserButton />
      </div>
    </header>
  );
}
