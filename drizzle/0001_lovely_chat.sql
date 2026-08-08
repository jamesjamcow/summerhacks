ALTER TABLE "uploads" ADD COLUMN "processing_status" text DEFAULT 'processing' NOT NULL;--> statement-breakpoint
UPDATE "uploads" SET "processing_status" = 'unprocessed';--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "key_object" text;--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "generated_file_key" text;--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "generated_file_url" text;--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "generated_file_type" text;--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "generated_file_size" integer;--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "generation_error" text;--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "processed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_generated_file_key_unique" UNIQUE("generated_file_key");
