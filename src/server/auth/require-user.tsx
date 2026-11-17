import "server-only";

import { auth } from "@clerk/nextjs/server";
import type { ReactNode } from "react";

// Reads the request, so it must render inside a <Suspense> boundary.
export async function RequireUser({ children }: { children: ReactNode }) {
  await auth.protect();
  return children;
}
