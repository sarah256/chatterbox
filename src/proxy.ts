import { clerkMiddleware } from "@clerk/nextjs/server";

// Attaches Clerk's session to each request. It does not protect anything:
// pages, layouts, and route handlers call auth themselves.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
