# AI Conversation Workspace — Product & Engineering Plan

## 1. Product Vision

Build a Slack-inspired workspace for interacting with LLMs.

The application should combine:
- Slack's visual layout, channels, message interactions, and threaded conversations.
- Notion's organization, search, and knowledge management.
- Git-style branching, where any message can become the starting point for a separate discussion.
- Modern AI chat functionality, including streaming, model selection, and persistent conversation context.

### Core product principle

**Conversations should be organized around topics, not trapped in chronological chat histories.**

Users should be able to explore tangents, ask follow-up questions, reference old discussions, and save useful information without derailing their primary conversation.

This is a personal AI workspace initially. Design the data model so multi-user collaboration can be added later, but do not build collaboration functionality into the MVP.

---

# 2. Technology Stack

Use the following stack:

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router) |
| Language | TypeScript |
| UI | Shadcn UI + Tailwind CSS |
| Icons | Lucide |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Authentication | Clerk |
| AI providers | OpenAI + Anthropic |
| AI streaming | Vercel AI SDK |
| Vector search | pgvector (future phase) |
| Background jobs | Redis + Celery (future phase) |
| Deployment | Vercel + Neon PostgreSQL |

### Architecture principles

- Keep the frontend and backend in one Next.js application initially.
- Use server-side API routes for AI interactions.
- Implement an abstraction layer around LLM providers.
- Do not couple conversation storage to a specific AI provider.
- Use PostgreSQL as the source of truth.
- Design for multiple model providers from the beginning.
- Avoid microservices until there is a concrete need.

---

# 3. Application Layout & UX

## 3.1 Overall layout

The application should feel very similar to Slack.

Use a persistent three-panel layout:

```text
┌─────────────────────────────────────────────────────────────────────┐
│  Logo / Workspace Selector                    Search      Profile  │
├──────────────┬──────────────────────────────┬───────────────────────┤
│              │                              │                       │
│  WORKSPACE   │  # AWS ARCHITECTURE           │  THREAD               │
│              │                              │                       │
│  Projects    │  [Main conversation]         │  Lambda pricing       │
│              │                              │                       │
│  Engineering │  You: Should we use Lambda   │  You: What about      │
│    # AWS     │  or ECS for this workload?   │  concurrency costs?  │
│    # System  │                              │                       │
│              │  AI: I'd recommend Lambda... │  AI: Lambda charges   │
│  Personal    │                              │  based on requests... │
│    # Ideas   │  [Branch into thread]        │                       │
│              │                              │  [Reply...]           │
│  Career      │  You: What about monitoring?│                       │
│              │                              │                       │
│  Saved       │  [Message composer]          │                       │
│  Search      │                              │                       │
│              │                              │                       │
└──────────────┴──────────────────────────────┴───────────────────────┘
```

### Panel behavior

**Left sidebar**
- Fixed-width sidebar, approximately 250px.
- Workspace selector at the top.
- Expandable project sections.
- Channels nested under projects.
- Saved messages and bookmarks.
- Search.
- Settings.
- Ability to collapse the sidebar.

**Center panel**
- Displays the active channel.
- Slack-style message layout.
- Channel name and description at the top.
- Messages displayed chronologically.
- AI and user messages visually differentiated.
- Message actions available on hover.
- Persistent message composer at the bottom.

**Right panel**
- Opens when a user starts or selects a thread.
- Approximately 400–500px wide.
- Original conversation remains visible.
- Thread has its own message history and composer.
- Close button returns the full width to the main conversation.
- Allow resizing the panel if practical.

The right panel should not navigate away from the channel.

When a thread is open, visually highlight the original message in the center panel.

## 3.2 Visual design

Use Slack as the primary visual inspiration, but create an original design identity.

Design requirements:
- Desktop-first.
- Clean, modern SaaS interface.
- Dark mode and light mode.
- Dense but readable information layout.
- Subtle borders and dividers.
- Rounded message composers and interactive controls.
- Smooth transitions when opening and closing threads.
- Minimal unnecessary whitespace.
- Consistent typography.

Avoid making the interface look like a traditional ChatGPT clone.

The application should feel like a workspace, not a chatbot.

---

# 4. Organization Hierarchy

Use the following hierarchy:

```text
Workspace
  ├── Project
  │     ├── Channel
  │     │     ├── Message
  │     │     │     ├── Thread
  │     │     │     │     └── Replies
  │     │     │     └── Bookmarks
  │     │     └── Message
  │     └── Channel
  └── Project
```

### Workspace

The top-level container.

For the MVP, each user has one personal workspace.

Future functionality:
- Multiple workspaces.
- Shared workspaces.
- Team membership.

### Projects

Projects group related channels.

Examples:
- Engineering
- Career
- Personal
- Startup Ideas
- Research

Users can create, rename, reorder, and archive projects.

### Channels

Channels are the primary place for conversations.

Examples:
- # aws-architecture
- # system-design
- # interview-prep
- # product-ideas
- # random

A channel contains a chronological sequence of messages.

Each channel should have:
- Name.
- Description.
- Project association.
- Default AI model.
- Optional system instructions.
- Created date.

### Threads

Threads are independent conversations attached to a specific message.

Users should be able to create a thread from any message, whether it originated from the user or the AI.

A thread maintains:
- Reference to its parent message.
- Its own message history.
- Its own context.
- Its own optional title.
- Open/resolved status.

A thread should be displayed in the right-side panel.

Threads should not create new channels.

For the MVP, support one level of branching. Do not implement arbitrarily nested threads yet.

---

# 5. Core Features

## 5.1 AI conversations

Users can interact with an AI inside any channel.

Requirements:
- Streaming responses.
- Markdown rendering.
- Code syntax highlighting.
- Copy message.
- Retry response.
- Edit and resend user messages.
- Regenerate AI response.
- Model selector.
- Persistent conversation history.

Support OpenAI and Anthropic initially.

Create a provider abstraction:

```typescript
interface AIProvider {
  generateResponse(params: {
    messages: AIMessage[];
    model: string;
    systemPrompt?: string;
  }): AsyncIterable<AIStreamChunk>;
}
```

Provider implementations should be independent of the conversation database.

## 5.2 Message interactions

Every message should support a contextual action menu.

Actions:
- Reply in thread.
- Bookmark.
- Add tags.
- Copy.
- Edit (user messages only).
- Regenerate (AI messages only).
- Delete.
- Reference in another conversation.

Show the action toolbar on hover to keep the interface clean.

Display a thread indicator beneath messages that have active threads.

Example:

```text
AI Assistant

Lambda is probably the better choice for bursty workloads.

[Reply in thread] [Bookmark] [More]

3 replies · Last reply 5 minutes ago
```

Clicking the thread indicator opens the right-side thread panel.

## 5.3 Thread functionality

This is the most important feature of the application.

Users should be able to:
1. Hover over any message.
2. Select "Reply in thread".
3. Open the thread in the right-side panel.
4. Continue discussing the topic independently.
5. Close the panel and return to the original conversation.
6. Reopen the thread later.

### Thread context

When starting a thread, the AI should receive:

- The original message.
- Relevant parent conversation history.
- The thread's own message history.
- The channel's system instructions.

Do not automatically send the entire channel history on every request.

Use a configurable context window.

Important: The original conversation should remain unchanged when a thread is created.

## 5.4 Tags

Support user-defined tags.

Tags should be applicable to:
- Messages.
- Threads.
- Channels.
- Saved notes.

Example tags:
- Architecture
- Important
- Follow-up
- Research
- Learning
- Decision

Allow filtering and searching by tags.

## 5.5 Bookmarks and saved messages

Users should be able to save individual messages.

Create a dedicated Saved section in the sidebar.

Saved messages should retain:
- Original channel.
- Original project.
- Parent conversation reference.
- Original timestamp.

Clicking a saved message should navigate to the original message and highlight it.

## 5.6 Search

Implement full-text search across:
- Channels.
- Messages.
- Threads.
- Saved items.

Search results should include:
- Message content.
- Channel name.
- Project name.
- Message author.
- Timestamp.

Clicking a result should navigate directly to the message, including opening its thread panel when applicable.

Use PostgreSQL full-text search initially.

Semantic search with pgvector is a future feature.

---

# 6. Database Schema

Use Drizzle ORM and PostgreSQL.

Create the following tables.

## users

Managed by Clerk. Store the Clerk user ID as the external identifier.

## workspaces

```typescript
id: uuid
ownerId: string
name: string
createdAt: timestamp
updatedAt: timestamp
```

## projects

```typescript
id: uuid
workspaceId: uuid
name: string
description: text | null
position: integer
archivedAt: timestamp | null
createdAt: timestamp
updatedAt: timestamp
```

## channels

```typescript
id: uuid
projectId: uuid
name: string
description: text | null
systemPrompt: text | null
defaultModel: string | null
position: integer
archivedAt: timestamp | null
createdAt: timestamp
updatedAt: timestamp
```

## messages

This is the central table.

```typescript
id: uuid
channelId: uuid
parentMessageId: uuid | null
role: enum('user', 'assistant', 'system')
content: text
model: string | null
provider: string | null
status: enum('pending', 'streaming', 'completed', 'failed')
editedAt: timestamp | null
createdAt: timestamp
updatedAt: timestamp
```

`parentMessageId` references another message.

- NULL means a top-level channel message.
- A non-NULL value means the message belongs to a thread.

This gives us a simple adjacency-list structure.

Use a database constraint or application validation to ensure parent messages belong to the same channel and are valid thread roots.

## threads

```typescript
id: uuid
channelId: uuid
parentMessageId: uuid
title: string | null
status: enum('open', 'resolved')
createdAt: timestamp
updatedAt: timestamp
```

A thread represents the discussion attached to a root message.

The thread's replies are stored in the messages table using parentMessageId.

Add a unique constraint on parentMessageId if only one thread per root message is supported.

## tags

```typescript
id: uuid
workspaceId: uuid
name: string
color: string | null
createdAt: timestamp
```

## message_tags

```typescript
messageId: uuid
tagId: uuid
createdAt: timestamp
```

## bookmarks

```typescript
id: uuid
userId: string
messageId: uuid
createdAt: timestamp
```

Add a unique constraint on userId + messageId.

## saved_notes

```typescript
id: uuid
workspaceId: uuid
userId: string
title: string
content: text
sourceMessageId: uuid | null
createdAt: timestamp
updatedAt: timestamp
```

## Important database considerations

- Use UUIDs for internal entity IDs.
- Add indexes for workspaceId, projectId, channelId, parentMessageId, and createdAt.
- Index message content for PostgreSQL full-text search.
- Use database transactions for operations that create related records.
- Enforce user ownership through server-side authorization.
- Never trust workspace or user IDs supplied by the frontend without validating access.

---

# 7. API Design

Use Next.js route handlers initially.

### Workspaces

```text
GET    /api/workspaces
POST   /api/workspaces
GET    /api/workspaces/:id
PATCH  /api/workspaces/:id
```

### Projects

```text
GET    /api/projects
POST   /api/projects
PATCH  /api/projects/:id
DELETE /api/projects/:id
```

### Channels

```text
GET    /api/channels/:id
POST   /api/channels
PATCH  /api/channels/:id
DELETE /api/channels/:id
```

### Messages

```text
GET    /api/channels/:id/messages
POST   /api/channels/:id/messages
PATCH  /api/messages/:id
DELETE /api/messages/:id
```

### Threads

```text
GET    /api/messages/:id/thread
POST   /api/messages/:id/thread
GET    /api/threads/:id/messages
POST   /api/threads/:id/messages
PATCH  /api/threads/:id
```

### Search

```text
GET /api/search?q=...
```

### Bookmarks

```text
GET    /api/bookmarks
POST   /api/bookmarks
DELETE /api/bookmarks/:id
```

### AI

```text
POST /api/ai/chat
POST /api/ai/threads/:id/chat
POST /api/ai/regenerate
```

AI endpoints should support streaming responses.

Use Server-Sent Events or the Vercel AI SDK streaming protocol.

Persist completed responses to PostgreSQL.

Handle failed or interrupted generations without losing the user's message.

---

# 8. Frontend Component Structure

Organize the application into reusable components.

```text
src/
  app/
    (app)/
      layout.tsx
      workspace/
        page.tsx
        [workspaceId]/
          [channelId]/
            page.tsx

    api/
      workspaces/
      projects/
      channels/
      messages/
      threads/
      search/
      ai/

  components/
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

  lib/
    db/
      schema.ts
      index.ts

    ai/
      providers/
        openai.ts
        anthropic.ts
      provider.ts
      context-builder.ts
      streaming.ts

    auth/
      permissions.ts

    search/
      search.ts

  hooks/
    useConversation.ts
    useThread.ts
    useStreamingResponse.ts
    useWorkspace.ts

  stores/
    workspace-store.ts
    conversation-store.ts
    ui-store.ts

  types/
    conversation.ts
    thread.ts
    workspace.ts
```

Use Zustand for client-side UI state where appropriate.

Use server state fetching and mutations consistently. Avoid maintaining duplicate sources of truth.

---

# 9. Implementation Phases

Implement in small, independently testable phases.

Do not attempt to build the entire application in one pass.

## Phase 1: Application foundation

- Initialize Next.js and TypeScript.
- Configure Tailwind and Shadcn.
- Configure Clerk authentication.
- Set up Neon PostgreSQL.
- Configure Drizzle ORM and migrations.
- Create the initial database schema.
- Create the main application shell.
- Implement the three-panel layout.
- Add responsive panel resizing and collapse behavior.

**Deliverable:** A working application with authentication, database connectivity, and the Slack-inspired layout.

## Phase 2: Organization

- Create workspace.
- Create projects.
- Create channels.
- Implement nested sidebar navigation.
- Support channel creation, editing, and archiving.
- Persist sidebar expansion and ordering.
- Implement project and channel switching.

**Deliverable:** A fully navigable workspace with persistent organization.

## Phase 3: AI conversations

- Implement OpenAI provider.
- Implement Anthropic provider.
- Create provider abstraction.
- Implement model selection.
- Build message composer.
- Implement streaming responses.
- Persist user and AI messages.
- Add Markdown and code rendering.
- Implement retry and regenerate.

**Deliverable:** Fully functional AI conversations inside channels.

## Phase 4: Threading (highest priority)

- Implement thread creation from any message.
- Build the right-side thread panel.
- Implement parent message highlighting.
- Implement thread-specific message history.
- Implement thread-specific AI context.
- Allow users to close and reopen threads.
- Display reply counts on parent messages.
- Support resolved/open states.
- Ensure switching between channels correctly handles open threads.

**Deliverable:** Users can branch off any message and continue an independent discussion without interrupting the main conversation.

## Phase 5: Organization enhancements

- Implement tags.
- Implement bookmarks.
- Implement saved messages.
- Implement search.
- Add message navigation from search results.
- Add filters for channels, tags, and projects.

**Deliverable:** Users can organize and retrieve previous conversations.

## Phase 6: Polish

- Dark and light themes.
- Keyboard shortcuts.
- Loading and empty states.
- Error handling.
- Optimistic UI where appropriate.
- Conversation persistence.
- Responsive layout.
- Accessibility.
- Performance improvements.

**Deliverable:** A polished personal AI workspace ready for everyday use.

---

# 10. Important UX Details

These are important and should not be overlooked.

### Thread navigation

- Opening a thread must not change the active channel.
- Closing a thread must not reset the main conversation's scroll position.
- Switching between threads should not reload the entire channel.
- Highlight the originating message.
- Allow direct navigation from a thread to its parent message.

### Message rendering

- Markdown must render correctly.
- Code blocks need syntax highlighting and copy buttons.
- Long responses should be readable.
- Message actions should appear on hover.
- Streaming responses should update without jumping the scroll position.

### Context management

- Thread context should be distinct from channel context.
- Include the originating message and relevant parent discussion.
- Do not send unrelated threads to the LLM.
- Preserve model and provider information for historical messages.
- Store enough information to reconstruct the context of a previous discussion.

### Persistence

- Switching channels should not lose draft messages.
- Closing a thread should not delete its state.
- Refreshing the browser should restore the last active channel.
- Persist message history immediately.
- Handle interrupted AI generations gracefully.

---

# 11. Future Features (Not MVP)

Keep these in mind when designing the architecture, but do not implement them yet.

### AI knowledge management

- Semantic search across conversations.
- Automatically generated conversation summaries.
- Project-level knowledge bases.
- Automatically extracted decisions.
- Cross-conversation references.
- AI-assisted tagging.
- Ask questions across an entire project.

### Advanced conversation management

- Nested threads.
- Branching conversation trees.
- Compare responses from different models.
- Move threads between channels.
- Merge threads back into parent discussions.
- Export conversations.

### Collaboration

- Multiple users in a workspace.
- Shared channels.
- User mentions.
- AI participants.
- Shared bookmarks.
- Permissions and roles.

### Integrations

- GitHub.
- Slack.
- Linear.
- Notion.
- Google Drive.

---

# 12. Cursor Implementation Instructions

Follow these instructions throughout development.

1. Implement one phase at a time.
2. Before implementing a phase, inspect the existing codebase and identify what already exists.
3. Do not unnecessarily rewrite working code.
4. Use strict TypeScript types.
5. Keep database queries out of React components.
6. Keep LLM provider logic separate from business logic.
7. Use reusable Shadcn components.
8. Validate all API inputs.
9. Enforce authorization on every server-side operation.
10. Write migrations for database changes.
11. Add tests for critical database operations, API routes, and thread context construction.
12. Keep components reasonably small and focused.
13. Do not introduce unnecessary dependencies.
14. Avoid premature microservice architecture.
15. Do not implement future-phase features without explicitly being asked.

### Most important implementation constraint

Do not compromise the threading architecture.

The ability to branch off an individual message and open that discussion in a persistent side panel is the defining feature of this product.

Prioritize getting that experience right over adding more AI features.

---

# 13. Definition of MVP Success

The MVP is complete when I can:

1. Create a project called Engineering.
2. Create a channel called AWS Architecture.
3. Start an AI conversation in that channel.
4. Receive a streaming AI response.
5. Click any message and start a thread.
6. Have the thread open in a right-side panel.
7. Continue the thread without affecting the main conversation.
8. Close the panel and continue the original discussion.
9. Reopen the thread later and see its complete history.
10. Bookmark an important answer.
11. Tag a message.
12. Search for an answer I discussed previously.
13. Refresh the application and find everything in the same state.

**The ultimate test:** I should be able to have five different tangential discussions stemming from one original AI conversation without losing track of any of them.

That's the product.