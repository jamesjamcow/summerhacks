import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
