-- IF NOT EXISTS keeps this migration safe for development databases that
-- briefly received the room tables before the upstream avatar migration landed.
CREATE TABLE IF NOT EXISTS "user_avatars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL UNIQUE,
	"source_file_key" text NOT NULL,
	"source_file_url" text NOT NULL,
	"source_file_type" text NOT NULL,
	"source_file_size" integer NOT NULL,
	"processing_status" text DEFAULT 'processing' NOT NULL,
	"generated_file_key" text UNIQUE,
	"generated_file_url" text,
	"generated_file_type" text,
	"generated_file_size" integer,
	"generation_error" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "arena_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"player_one_clerk_user_id" text NOT NULL,
	"player_two_clerk_user_id" text,
	"player_one" jsonb NOT NULL,
	"player_two" jsonb,
	"state" jsonb NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scrapbook_members" (
	"room_id" uuid NOT NULL,
	"clerk_user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"initials" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scrapbook_members_room_id_clerk_user_id_pk" PRIMARY KEY("room_id","clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scrapbook_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"owner_clerk_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'arena_matches_room_id_scrapbook_rooms_id_fk') THEN ALTER TABLE "arena_matches" ADD CONSTRAINT "arena_matches_room_id_scrapbook_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."scrapbook_rooms"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scrapbook_members_room_id_scrapbook_rooms_id_fk') THEN ALTER TABLE "scrapbook_members" ADD CONSTRAINT "scrapbook_members_room_id_scrapbook_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."scrapbook_rooms"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "arena_matches_room_status_idx" ON "arena_matches" USING btree ("room_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "arena_matches_player_one_idx" ON "arena_matches" USING btree ("player_one_clerk_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "arena_matches_player_two_idx" ON "arena_matches" USING btree ("player_two_clerk_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scrapbook_members_user_idx" ON "scrapbook_members" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "scrapbook_rooms_code_unique" ON "scrapbook_rooms" USING btree ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scrapbook_rooms_owner_idx" ON "scrapbook_rooms" USING btree ("owner_clerk_user_id");
