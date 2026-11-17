# Implementation Guide

Companion to [PROPOSAL.md](PROPOSAL.md). The spec chooses the product, stack, schema, and phases. This document says how to lay the repo out and how to build it without weakening the thread-in-a-side-panel model.

No application code belongs in this step. Phases start only after this guide is accepted.

---

## 1. What this product is

A personal, Slack-shaped workspace for talking to LLMs.

Organization is a tree:

```text
Workspace
  └── Project
        └── Channel
              └── Message
                    └── Thread (one level, shown in the right panel)
```

The interface is a persistent three-panel shell: sidebar, channel, thread. Channels hold a chronological conversation with a model. Any message, user or assistant, can open an independent thread in the right panel. The channel stays where it is, including scroll position. Closing the panel returns that width to the channel. Reopening the thread later shows its full history.

The product should feel like a workspace. A single chronological chat with a sidebar of old chats is a different product.

The defining constraint, from the spec: do not compromise the threading architecture. Five tangential discussions from one channel conversation must stay findable. Extra model features wait until that experience works.

### MVP boundary

In scope:

- One personal workspace per Clerk user.
- Projects, channels, messages.
- OpenAI and Anthropic behind one provider interface.
- Streaming replies persisted in PostgreSQL.
- One thread per message, flat replies, right-hand panel.
- Bookmarks, message tags, PostgreSQL full-text search.

Out of scope until explicitly requested:

- Multiple users, shared workspaces, roles.
- Nested threads and conversation trees.
- pgvector and semantic search.
- Background workers.
- Integrations (GitHub, Slack, Linear, Notion, Drive).
- Cross-conversation references.
- User-authored saved notes as a separate object from bookmarks.

---

## 2. Stack

Unchanged from the spec.

| Layer | Choice |
|---|---|
| App | Next.js 16 App Router with Cache Components, TypeScript, one deployable |
| Runtime | Node 22 (`.nvmrc`); shadcn's CLI needs at least 20.18.1 |
| UI | Tailwind, shadcn/ui, Lucide, `next-themes` |
| Data | Neon PostgreSQL over its WebSocket `Pool` driver (the HTTP driver cannot run interactive transactions), Drizzle ORM, migrations in `drizzle/` |
| Auth | Clerk |
| Models | Vercel AI SDK, OpenAI provider, Anthropic provider |
| Client UI state | Zustand |
| Deploy | Vercel |

PostgreSQL is the source of truth. Conversation rows are not shaped around a single vendor. Providers accept a message list and stream chunks. They do not import Drizzle.

Add `next-themes` in phase 1 so light and dark mode are a token choice, not a later retrofit.

Cache Components is on. Anything that reads the request (Clerk's `auth()`, cookies, headers, `useSearchParams`, `usePathname`) must render inside a `<Suspense>` boundary, or `next build` fails. Run `next build` before calling a phase done, because `next dev` does not catch this. The bundled docs in `node_modules/next/dist/docs/` match the installed version and win over memory.

---

## 3. Folder structure

Section 8 of the spec is the component map. This layout is that map, expressed as App Router files, with a server boundary the sketch does not name.

```text
chatterbox/
  PROPOSAL.md
  IMPLEMENTATION.md
  package.json
  tsconfig.json
  next.config.ts
  drizzle.config.ts
  drizzle/                       # generated SQL migrations
  components.json
  .env.example
  .nvmrc
  src/
    proxy.ts                     # clerkMiddleware (middleware.ts before Next.js 16)
    app/
      layout.tsx                 # root html, fonts, theme provider
      (auth)/
        sign-in/[[...sign-in]]/page.tsx
        sign-up/[[...sign-up]]/page.tsx
      (workspace)/
        layout.tsx               # auth gate, ensure workspace, AppShell
        page.tsx                 # redirect to last open channel
        c/[channelId]/page.tsx   # channel; thread is ?thread=
      api/
        workspaces/route.ts
        workspaces/[id]/route.ts
        projects/route.ts
        projects/[id]/route.ts
        channels/route.ts
        channels/[id]/route.ts
        channels/[id]/messages/route.ts
        messages/[id]/route.ts
        messages/[id]/thread/route.ts
        threads/[id]/route.ts
        threads/[id]/messages/route.ts
        bookmarks/route.ts
        bookmarks/[id]/route.ts
        tags/route.ts
        search/route.ts
        ai/chat/route.ts
        ai/threads/[id]/chat/route.ts
        ai/regenerate/route.ts
    components/
      ui/                        # shadcn primitives
      layout/
        AppShell.tsx
        WorkspaceHeader.tsx
        Sidebar.tsx
        SidebarProject.tsx
        SidebarChannel.tsx
        MainPanel.tsx
        ThreadPanel.tsx
      conversation/
        ChannelHeader.tsx
        MessageList.tsx
        MessageItem.tsx
        MessageActions.tsx
        MessageComposer.tsx
        MarkdownRenderer.tsx
        ModelSelector.tsx
      threads/
        ThreadHeader.tsx
        ThreadMessageList.tsx
        ThreadComposer.tsx
        ThreadIndicator.tsx
      organization/
        ProjectList.tsx
        ChannelList.tsx
        TagManager.tsx
        BookmarkList.tsx
        SearchDialog.tsx
    server/
      db/
        index.ts                 # drizzle client
        schema.ts
        queries/                 # all SQL lives here
      ai/
        provider.ts              # AIProvider interface
        providers/openai.ts
        providers/anthropic.ts
        context.ts               # channel vs thread context windows
        models.ts                # allowed model ids
        streaming.ts             # persist-then-stream helpers
      auth/
        permissions.ts           # owner checks, never trust client ids
      search/
        search.ts
      validators/                # zod schemas for route inputs
    lib/
      types/                     # shared, client-safe types
      utils.ts
    hooks/
      useConversation.ts
      useThread.ts
      useStreamingResponse.ts
      useWorkspace.ts
    stores/
      ui-store.ts                # sidebar, panel width, open thread, drafts
```

`src/server` is imported only from route handlers, server components, and other server modules. Client components import types from `src/lib` and call `/api`. `components/ui` is the shadcn directory the spec sketch leaves out.

Drizzle config, migrations, and `.env.example` stay at the repo root. `proxy.ts` sits in `src/` because the app uses a `src` directory; Next.js only reads it next to `app/`.

---

## 4. Layering

Three rules, applied on every phase:

1. React components do not import the database client or run queries.
2. Route handlers parse input with zod, resolve the Clerk user, and authorize before any write. Workspace, project, channel, and message ids from the client are looked up and checked against the owner.
3. Provider modules do not import schema or queries. `server/ai/context.ts` loads rows through `server/db` and hands a plain message array to the provider.

Route handlers stay thin: validate, authorize, call a query or the streaming helper, return the response. Business rules for threads and context live in `server/db` and `server/ai`, where they can be tested without rendering.

Do not add a second HTTP framework, a tRPC layer, or microservices. One Next.js app is the architecture until a concrete limit shows up.

---

## 5. Routing and panel state

The channel is the route. The thread is not.

```text
/c/[channelId]?thread=[threadId]
```

Opening a thread writes the query param. It does not push a new channel route, remount the message list, or reset scroll. Closing the panel removes `thread` and leaves the channel mounted. Switching channels clears the thread param because a thread belongs to one channel.

The workspace home route redirects to the last channel id stored for this browser, or to `#general` when there is none or that channel is gone. Refresh on `/c/:id?thread=:id` restores both.

For the MVP there is one workspace, created on the first authenticated request and owned by the Clerk user id. The header can show its name. A workspace switcher is not a behavior to build yet.

### Default `#general` channel

Every workspace always has at least one channel, so a new user lands somewhere they can type.

- The transaction that creates the workspace also creates a default project named “General” and a channel named `general` inside it.
- Both rows carry `isDefault = true`. They can be renamed, but they cannot be archived or deleted, and the default channel cannot be moved out of the default project. Route handlers reject those operations; the UI hides the actions.
- A unique partial index on `channels(project_id) WHERE is_default` and one on `projects(workspace_id) WHERE is_default` keep it to one of each.
- While the MVP has one workspace per user, a unique index on `workspaces.owner_id` stops two simultaneous first loads from creating two workspaces. The creating insert uses `ON CONFLICT DO NOTHING` and then reads the winner back. That index is relaxed when multiple workspaces arrive.

Sidebar collapse and thread-panel width are local UI preferences (Zustand, persisted in `localStorage`). They are not rows.

### Resizable thread panel

The thread panel is resizable. A vertical drag handle sits on its left edge, between the channel and the thread. Dragging it trades width between the two panels; the sidebar does not move.

- Default width 440px, inside the spec’s 400–500px range.
- Minimum 320px, so the thread composer stays usable.
- Maximum leaves the channel at least 480px wide, so the originating conversation stays readable.
- When the window is too narrow for both minimums, the thread keeps its 320px and the channel gives up width first.
- Double-clicking the handle resets to the default width.
- The handle is keyboard accessible: focusable, left and right arrow keys resize in steps, with a visible focus ring and a `col-resize` cursor on hover.
- The chosen width persists across threads, channel switches, closing and reopening the panel, and browser refresh.
- If the window shrinks below what the stored width allows, clamp the panel for display without overwriting the saved preference.
- Resizing re-lays out the message lists without resetting either panel’s scroll position or interrupting a reply that is streaming.

Use shadcn’s `Resizable` component (built on `react-resizable-panels` v4) for the channel/thread split rather than writing pointer-handling code. v4 takes pixel sizes directly, and the thread panel uses `groupResizeBehavior="preserve-pixel-size"` so a window resize changes the channel, not the thread. The built-in double-click resets to `defaultSize`, which is the saved width, so it is disabled in favor of a handler that resets to 440px.

---

## 6. Data model rules

The spec’s tables stand, with the constraints below made explicit so phase 4 does not invent a second meaning for `parentMessageId`.

### Messages and threads

- `messages.parentMessageId IS NULL` means a top-level channel message.
- A thread row points at exactly one root message (`threads.parentMessageId`), unique, so one thread per message.
- Replies in that thread are `messages` rows whose `parentMessageId` is the root message, not another reply. One level, flat.
- The root message’s `parentMessageId` must be null, and the root must belong to `threads.channelId`.
- Creating a thread does not copy or rewrite channel messages.

Indexes from the spec: `workspaceId`, `projectId`, `channelId`, `parentMessageId`, `createdAt`. When search lands in phase 5, add GIN indexes on generated `tsvector` columns for `messages.content`, `channels.name` plus `description`, and `threads.title`. Bookmarked items are found through their message, so they need no index of their own.

Use transactions when a thread row and its first reply are created together, and when a user message plus a pending assistant row are inserted together.

### Ownership

Every read and write joins back to `workspaces.ownerId = clerkUserId`. `users` are Clerk’s user ids stored as strings. There is no second user table to keep in sync for the MVP.

### Tags and bookmarks

MVP tags attach to messages through `message_tags`. The feature list also names threads, channels, and notes. Those stay future join tables (`channel_tags`, and so on). Do not invent a polymorphic tag target in the first migration.

Bookmarks are the Saved sidebar: unique on `(userId, messageId)`, and they keep the message’s channel, project, and timestamp via the message row. Clicking one navigates to `/c/[channelId]` and scrolls to that message, opening `?thread=` when the message is a reply.

Leave `saved_notes` out of the first migration. That table is a different object: a user-written note that may cite a message. Bookmarks already cover “save this answer.” Add notes only if that second object is actually wanted.

### Edit and regenerate

Edit and regenerate never overwrite a message. They add new messages and leave the originals, and any threads on them, untouched. A thread is never left discussing text that no longer exists.

- **Edit** a user message: insert a new user message with the edited text, then stream a new assistant reply after it. The original user message and its original reply stay where they were.
- **Regenerate** an assistant reply: insert a new assistant message and stream into it. The original reply stays.
- New messages are appended at the end of the same scope (the channel timeline, or that one thread). They carry `revisionOfMessageId` pointing at the message they replace, and the UI labels them “Edited from …” or “Regenerated from …” with a link that scrolls to the original.
- The model context for the new reply is the history up to the original message, with the edited text substituted for an edit. It does not include the messages that came after the original, since those responded to the old version.
- Threads stay on whichever message they were started from. A new version starts with no thread.

Add `revisionOfMessageId: uuid | null` to `messages`, referencing a message in the same channel and scope. The spec’s `editedAt` column is unused under this rule.

Historical `model` and `provider` stay on every row so an old answer can be reconstructed.

### Delete

Deleting a message is a soft delete. Add `deletedAt: timestamp | null` to `messages`.

- The message stays in place as a “Message deleted” placeholder. Its text is hidden in the UI and dropped from search results.
- If the message is a thread root, the thread stays readable. Its indicator, reply count, and right panel all keep working.
- Deleted text is left out of every future model context, including the context of a thread rooted on it. The thread’s own replies still go in.
- Bookmarks on a deleted message drop out of the Saved list.
- Deleting a thread reply works the same way inside the thread.

### Actions that are not MVP

“Reference in another conversation” is a cross-link. It is listed on the hover menu in the spec and again under future features. Do not build it with the first action toolbar. Copy, thread, bookmark, tag, edit, regenerate, and delete are enough.

---

## 7. Streaming and context

Use the Vercel AI SDK streaming protocol only. Route handlers call `streamText` (or the SDK’s equivalent) and return its UI stream response. Do not also invent a custom SSE format.

Flow for a channel send:

1. Authorize the channel.
2. Insert the user message as `completed`.
3. Insert the assistant message as `pending`, with the selected model and provider.
4. Build context from top-level messages in that channel only (`parentMessageId IS NULL`), bounded by a configurable window, plus the channel `systemPrompt`.
5. Stream tokens to the client. On finish, set the assistant row to `completed` and store the full text. On provider error or a user-pressed stop, set `failed`, keep any partial text, and keep the user message. A closed browser tab is not a stop: the server finishes the generation and saves it, so the reply is there after refresh.

Thread send is the same shape, with a different context:

- The root message.
- A bounded window of top-level channel messages that precede the root, so the thread knows what the channel was talking about.
- The thread’s own replies.
- The channel system prompt.

Do not include other threads. Do not send the entire channel history on every request. The window size is a constant in `server/ai/context.ts`, not a per-request guess.

Interrupted generations must leave the user message in place. Retrying a `failed` reply streams again into that same assistant row, since there is no finished answer to preserve. Regenerating a `completed` reply follows section 6 and adds a new message. Neither duplicates the user message.

The composer’s model overrides `channels.defaultModel` for that send. The channel default remains the initial selection.

### One send path

The spec lists both `POST /api/channels/:id/messages` and `POST /api/ai/chat`, and both `POST /api/threads/:id/messages` and `POST /api/ai/threads/:id/chat`. Sending is one operation: the AI routes save the user message, create the pending assistant row, and stream. The two `POST .../messages` routes are not built in the MVP, so a user message cannot be saved without its reply being attempted. The `GET` routes on those paths stay for loading history.

---

## 8. Markdown in messages

User and assistant messages are markdown. `messages.content` stores the source text. The channel list and the thread panel both render it through `MarkdownRenderer`, including while an assistant reply is still streaming.

Render GitHub-flavored markdown: headings, lists, links, tables, blockquotes, inline code, and fenced code blocks. Fenced blocks get syntax highlighting and a copy button. A message that contains a heading, a list, a table, and a code block must look right in the channel, in a thread, and again after refresh.

The composer edits markdown source. The formatted view is the message bubble after send, and the assistant bubble as tokens arrive. An unfinished code fence during streaming must not throw or jump the channel’s scroll position. When the closing fence arrives, the block highlights as usual.

Keep the stored value as markdown so search, copy, and history stay on the source text. Pass that source through a renderer that treats raw HTML as text, so a model reply cannot inject markup into the page. `react-markdown` without raw-HTML passthrough is the expected choice.

---

## 9. Client state

Postgres holds messages, threads, projects, channels, bookmarks, and tags.

Zustand (`stores/ui-store.ts`) holds:

- Sidebar collapsed.
- Thread panel width.
- Draft text keyed by channel id and by thread id, so switching channels does not drop an unsent composer.

The open thread is not in Zustand. The `?thread=` param is its only source of truth, so refresh and back/forward stay consistent.

Server data is fetched from the route handlers (server components for the first paint, client fetches for mutations and streams). Do not mirror the message list into a second store that can drift from the database.

Scroll position of the channel list is component state, preserved because the channel view does not remount when the thread param changes.

---

## 10. Authorization

`src/proxy.ts` runs `clerkMiddleware()` to attach the session. It does not protect routes: Clerk 7 deprecates path matching with `createRouteMatcher`, because path rules can drift from how Next.js routes requests. The `(workspace)` layout renders `RequireUser` (`server/auth/require-user.tsx`), which calls `auth.protect()` inside the layout’s `<Suspense>` boundary and sends signed-out visitors to sign-in. That is a page gate only. Each page that loads data, and each route handler, still authorizes for itself.

Every route then:

1. Reads `auth()` and rejects a missing user id.
2. Loads the target row through an ownership query (`server/auth/permissions.ts` plus `server/db/queries`).
3. Rejects when the workspace owner does not match.

The client never supplies an owner id that is trusted. Creating a project checks the workspace. Creating a channel checks the project. Posting a message checks the channel. Posting a thread reply checks the thread and that the thread’s channel is owned.

---

## 11. Phases

Build one phase at a time. Each phase starts by reading what is already in the repo. Working code stays. Future-phase features stay out.

### Phase 1 — Foundation

- Next.js, TypeScript, Tailwind, shadcn, Lucide, `next-themes`.
- Clerk `proxy.ts` and sign-in routes.
- Neon, Drizzle, initial migration for workspaces, projects, channels, messages, threads. Bookmarks and tags can land in this migration or in phase 5; do not add `saved_notes` yet.
- Empty three-panel shell: fixed sidebar, center panel, collapsible right panel with a resize handle as specified in section 5.

Done when: an authenticated user sees the shell in light and dark mode, the database migrates, and the right panel opens and closes without navigation. Dragging the handle resizes the thread panel within its limits, and the width survives closing the panel and refreshing the browser.

### Phase 2 — Organization

- Lazy-create the personal workspace together with the default General project and `#general` channel (section 5). Migration: `is_default` on projects and channels, their partial unique indexes, and the unique `workspaces.owner_id` index.
- Home route redirects to the last channel, falling back to `#general`.
- Create, rename, reorder, and archive projects and channels. The default project and channel can only be renamed.
- Sidebar tree. Persist expansion and order.
- Channel route and last-channel redirect.

Done when: a brand-new user lands in `#general` after signing up, Engineering / AWS Architecture can be created and survives a refresh, switching channels changes only the center panel, and archiving or deleting `#general` is refused by the API.

### Phase 3 — Channel conversations

- Provider interface, OpenAI, Anthropic, model list.
- Composer, streaming, and `MarkdownRenderer` as specified in section 8.
- Persist user and assistant messages.
- Retry and regenerate, with the edit rule in section 6.

Done when: a channel conversation streams, survives refresh, and a failed generation keeps the user message. A reply with a heading, a list, a table, and a fenced code block renders in the bubble, highlights the code, and still renders after refresh.

### Phase 4 — Threads

This is the priority. Do not start phase 5 while thread behavior is wrong.

- Create a thread from any top-level message, user or assistant. Replies inside a thread do not show “Reply in thread”, because threads are one level.
- Right panel with its own history and composer.
- Highlight the root message in the center list.
- Reply counts on the root. Open and resolved status.
- Context builder from section 7.
- `?thread=` without remounting the channel or jumping its scroll.
- Channel switch closes the thread panel (section 5). A `?thread=` id that does not belong to the current channel is ignored and removed.

Done when: five threads can hang off one channel conversation, each reopens with its own history, and the channel transcript is unchanged by their existence.

### Phase 5 — Retrieval

- Message tags.
- Bookmarks and the Saved sidebar, navigating back to the source message.
- PostgreSQL full-text search across channel names and descriptions, message content (channel and thread replies), thread titles, and bookmarked messages.
- Result click opens the channel and the thread when the hit is a reply.

Done when: a bookmarked, tagged answer can be found by text search after a refresh.

### Phase 6 — Polish

- Keyboard shortcuts.
- Loading, empty, and error states.
- Optimistic UI where a round trip is the only delay.
- Accessibility pass on the shell, composers, and menus.
- Performance pass on message lists.

Done when: the thirteen checks in section 13 of the spec pass, including the five-tangent test.

---

## 12. Tests

Test the logic that is easy to get wrong and expensive to notice in the UI.

- `server/ai/context.ts`: channel window excludes thread replies; thread window includes the root, a bounded parent slice, and only that thread’s replies.
- Authorization queries: a second user’s ids cannot read or write the first user’s channel, message, or thread.
- Thread insert rules: a reply cannot become a nested root; a second thread on the same message fails the unique constraint.
- Edit and regenerate: the original message and its thread are unchanged, and the new reply’s context stops at the original message.
- Delete: a deleted thread root keeps its thread readable, and its text is absent from model context and search.

Route-handler tests can cover validation failures. Browser tests can wait until phase 4’s panel behavior exists.

---

## 13. Recommendations that tighten the spec

These are deliberate differences from [PROPOSAL.md](PROPOSAL.md). Reject any of them before the phase that would lock them in.

| Topic | Spec | This guide |
|---|---|---|
| Background jobs | Redis + Celery, future | Leave a job runner unnamed. Celery is a Python worker and does not fit a Next.js app on Vercel. Pick a JS-native runner only when a real job exists. |
| Saved notes | `saved_notes` table beside bookmarks | Omit from the first schema. Bookmarks are the Saved list. |
| Hover action “Reference in another conversation” | Listed with MVP message actions | Defer. It is the future cross-link feature. |
| Tag targets | Messages, threads, channels, notes | Message tags only, via `message_tags`. |
| Edit and regenerate | “Edit and resend”, “Regenerate”, with an `editedAt` column | Never overwrite. Add new messages linked by `revisionOfMessageId`; originals and their threads stay (section 6). |
| Delete | “Delete” action, no rule given | Soft delete with `deletedAt`. A deleted thread root shows a placeholder and its thread stays readable (section 6). |
| Streaming transport | SSE or the AI SDK protocol | AI SDK protocol only. |
| Workspace creation | `POST /api/workspaces` | Also auto-create the single personal workspace on first authenticated load. |
| Default channel | None; the workspace starts empty | Every workspace starts with a General project holding `#general`. Both can be renamed but never archived or deleted (section 5). |
| Theme | Phase 6 | `next-themes` in phase 1. |
| Thread panel resizing | “Allow resizing the panel if practical” | Required in phase 1, with limits and a persisted width (section 5). |
| Route shape | `/workspace/[workspaceId]/[channelId]` | `/c/[channelId]?thread=` while there is one workspace. |
| Send endpoints | `POST .../messages` and `POST /api/ai/...` both listed | AI routes are the only send path; the `POST .../messages` routes are not built (section 7). |
| Thread roots | “Any message” | Any top-level message. Thread replies cannot start threads, which the spec’s one-level rule implies. |
| Client stores | `workspace-store`, `conversation-store`, `ui-store` | `ui-store` only. Server data is not mirrored into Zustand. |

API paths in section 7 of the spec otherwise stay as listed. The folder tree in section 3 of this guide is the file mapping for those paths.

---

## 14. What not to do during implementation

- Do not build a phase’s features inside an earlier phase because they are nearby in the schema.
- Do not query Postgres from a component.
- Do not let a provider import the database.
- Do not store the message transcript only in the client.
- Do not nest threads, even if the adjacency list could represent it.
- Do not send every channel message, or any unrelated thread, as model context.
- Do not add dependencies for a problem the App Router, Drizzle, Clerk, and the AI SDK already cover.
