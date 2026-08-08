import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { ArenaMatchState, ArenaPlayer } from "@/components/arena/arena-types";

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("notes_clerk_user_id_idx").on(table.clerkUserId)],
);

export const uploads = pgTable(
  "uploads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    fileKey: text("file_key").notNull().unique(),
    fileName: text("file_name").notNull(),
    fileUrl: text("file_url").notNull(),
    fileType: text("file_type").notNull(),
    fileSize: integer("file_size").notNull(),
    processingStatus: text("processing_status").default("processing").notNull(),
    keyObject: text("key_object"),
    generatedFileKey: text("generated_file_key").unique(),
    generatedFileUrl: text("generated_file_url"),
    generatedFileType: text("generated_file_type"),
    generatedFileSize: integer("generated_file_size"),
    generationError: text("generation_error"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("uploads_clerk_user_id_idx").on(table.clerkUserId)],
);

export const userAvatars = pgTable("user_avatars", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  sourceFileKey: text("source_file_key").notNull(),
  sourceFileUrl: text("source_file_url").notNull(),
  sourceFileType: text("source_file_type").notNull(),
  sourceFileSize: integer("source_file_size").notNull(),
  processingStatus: text("processing_status").default("processing").notNull(),
  generatedFileKey: text("generated_file_key").unique(),
  generatedFileUrl: text("generated_file_url"),
  generatedFileType: text("generated_file_type"),
  generatedFileSize: integer("generated_file_size"),
  generationError: text("generation_error"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const scrapbookRooms = pgTable(
  "scrapbook_rooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    ownerClerkUserId: text("owner_clerk_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("scrapbook_rooms_code_unique").on(table.code),
    index("scrapbook_rooms_owner_idx").on(table.ownerClerkUserId),
  ],
);

export const scrapbookMembers = pgTable(
  "scrapbook_members",
  {
    roomId: uuid("room_id")
      .notNull()
      .references(() => scrapbookRooms.id, { onDelete: "cascade" }),
    clerkUserId: text("clerk_user_id").notNull(),
    displayName: text("display_name").notNull(),
    initials: text("initials").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.roomId, table.clerkUserId] }),
    index("scrapbook_members_user_idx").on(table.clerkUserId),
  ],
);

export const arenaMatches = pgTable(
  "arena_matches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => scrapbookRooms.id, { onDelete: "cascade" }),
    playerOneClerkUserId: text("player_one_clerk_user_id").notNull(),
    playerTwoClerkUserId: text("player_two_clerk_user_id"),
    playerOne: jsonb("player_one").$type<ArenaPlayer>().notNull(),
    playerTwo: jsonb("player_two").$type<ArenaPlayer>(),
    state: jsonb("state").$type<ArenaMatchState>().notNull(),
    status: text("status").default("waiting").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("arena_matches_room_status_idx").on(table.roomId, table.status),
    index("arena_matches_player_one_idx").on(table.playerOneClerkUserId),
    index("arena_matches_player_two_idx").on(table.playerTwoClerkUserId),
  ],
);
