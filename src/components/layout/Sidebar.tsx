import { Bookmark, FolderPlus, Search, Settings } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export function Sidebar() {
  return (
    <aside
      aria-label="Workspace navigation"
      className="flex w-[250px] shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground"
    >
      <div className="flex h-12 items-center border-b px-4 text-sm font-semibold">
        Personal workspace
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <nav className="flex flex-col gap-4 p-2">
          <SidebarSection title="Projects">
            <p className="px-2 py-1 text-xs text-muted-foreground">
              No projects yet.
            </p>
            <SidebarItem icon={FolderPlus} disabled>
              New project
            </SidebarItem>
          </SidebarSection>

          <SidebarSection title="Library">
            <SidebarItem icon={Bookmark} disabled>
              Saved
            </SidebarItem>
            <SidebarItem icon={Search} disabled>
              Search
            </SidebarItem>
          </SidebarSection>
        </nav>
      </ScrollArea>

      <div className="border-t p-2">
        <SidebarItem icon={Settings} disabled>
          Settings
        </SidebarItem>
      </div>
    </aside>
  );
}

function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-0.5">
      <h2 className="px-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function SidebarItem({
  icon: Icon,
  children,
  disabled,
}: {
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="justify-start text-sidebar-foreground"
      disabled={disabled}
    >
      <Icon className="size-4" />
      {children}
    </Button>
  );
}
