CREATE TABLE "scrapbook_match_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"match_id" uuid NOT NULL,
	"page_number" integer NOT NULL,
	"winner_clerk_user_id" text NOT NULL,
	"winner_name" text NOT NULL,
	"result_reason" text NOT NULL,
	"players" jsonb NOT NULL,
	"memories" jsonb NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scrapbook_match_pages" ADD CONSTRAINT "scrapbook_match_pages_room_id_scrapbook_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."scrapbook_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "scrapbook_match_pages_match_unique" ON "scrapbook_match_pages" USING btree ("match_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scrapbook_match_pages_room_page_unique" ON "scrapbook_match_pages" USING btree ("room_id","page_number");--> statement-breakpoint
CREATE INDEX "scrapbook_match_pages_room_idx" ON "scrapbook_match_pages" USING btree ("room_id");