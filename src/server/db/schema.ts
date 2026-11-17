import {
  type AnyPgColumn,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const messageRole = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
]);

export const messageStatus = pgEnum("message_status", [
  "pending",
  "streaming",
  "completed",
  "failed",
]);

export const threadStatus = pgEnum("thread_status", ["open", "resolved"]);

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    name: text("name").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("workspaces_owner_id_idx").on(t.ownerId)],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    position: integer("position").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("projects_workspace_id_idx").on(t.workspaceId, t.position)],
);

export const channels = pgTable(
  "channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    systemPrompt: text("system_prompt"),
    defaultModel: text("default_model"),
    position: integer("position").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("channels_project_id_idx").on(t.projectId, t.position)],
);

// A null parentMessageId is a top-level channel message. A non-null value
// makes the row a reply in the thread rooted at that top-level message.
// Replies never point at other replies: threads are one level deep.
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    parentMessageId: uuid("parent_message_id").references(
      (): AnyPgColumn => messages.id,
      { onDelete: "cascade" },
    ),
    revisionOfMessageId: uuid("revision_of_message_id").references(
      (): AnyPgColumn => messages.id,
      { onDelete: "set null" },
    ),
    role: messageRole("role").notNull(),
    content: text("content").notNull().default(""),
    model: text("model"),
    provider: text("provider"),
    status: messageStatus("status").notNull().default("completed"),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("messages_channel_id_created_at_idx").on(t.channelId, t.createdAt),
    index("messages_parent_message_id_created_at_idx").on(
      t.parentMessageId,
      t.createdAt,
    ),
  ],
);

export const threads = pgTable(
  "threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    parentMessageId: uuid("parent_message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    title: text("title"),
    status: threadStatus("status").notNull().default("open"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("threads_parent_message_id_key").on(t.parentMessageId),
    index("threads_channel_id_idx").on(t.channelId),
  ],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("tags_workspace_id_name_key").on(t.workspaceId, t.name)],
);

export const messageTags = pgTable(
  "message_tags",
  {
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.messageId, t.tagId] }),
    index("message_tags_tag_id_idx").on(t.tagId),
  ],
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("bookmarks_user_id_message_id_key").on(t.userId, t.messageId),
  ],
);
