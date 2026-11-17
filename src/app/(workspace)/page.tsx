import { MainPanel } from "@/components/layout/MainPanel";

import { ThreadPreviewButton } from "./thread-preview-button";

export default function WorkspaceHomePage() {
  return (
    <MainPanel title="welcome" description="Your personal AI workspace">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-24 text-center">
        <h2 className="text-lg font-semibold">No channels yet</h2>
        <p className="text-sm text-muted-foreground">
          Projects and channels will live in the sidebar. Any message in a
          channel can branch into its own thread, shown in a panel on the
          right.
        </p>
        <ThreadPreviewButton />
      </div>
    </MainPanel>
  );
}
