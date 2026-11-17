import { Suspense } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { ShellFallback } from "@/components/layout/ShellFallback";
import { RequireUser } from "@/server/auth/require-user";

export default function WorkspaceLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <RequireUser>
        <AppShell>{children}</AppShell>
      </RequireUser>
    </Suspense>
  );
}
