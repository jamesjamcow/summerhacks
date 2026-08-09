ALTER TABLE "uploads" ADD COLUMN "room_id" uuid;--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "recipient_clerk_user_id" text;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_room_id_scrapbook_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."scrapbook_rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "uploads_room_recipient_idx" ON "uploads" USING btree ("room_id","recipient_clerk_user_id");--> statement-breakpoint
-- Before room-aware uploads existed, the UI only allowed a member to upload for
-- somebody else. Backfill only where the recipient is unambiguous: the uploader
-- belongs to exactly one scrapbook and that room has exactly one other member.
WITH inferred_recipients AS (
	SELECT
		uploader."clerk_user_id" AS "uploader_clerk_user_id",
		uploader."room_id",
		min(recipient."clerk_user_id") AS "recipient_clerk_user_id"
	FROM "scrapbook_members" AS uploader
	INNER JOIN "scrapbook_members" AS recipient
		ON recipient."room_id" = uploader."room_id"
		AND recipient."clerk_user_id" <> uploader."clerk_user_id"
	WHERE (
		SELECT count(*)
		FROM "scrapbook_members" AS memberships
		WHERE memberships."clerk_user_id" = uploader."clerk_user_id"
	) = 1
	GROUP BY uploader."clerk_user_id", uploader."room_id"
	HAVING count(recipient."clerk_user_id") = 1
)
UPDATE "uploads"
SET
	"room_id" = inferred_recipients."room_id",
	"recipient_clerk_user_id" = inferred_recipients."recipient_clerk_user_id"
FROM inferred_recipients
WHERE "uploads"."room_id" IS NULL
	AND "uploads"."clerk_user_id" = inferred_recipients."uploader_clerk_user_id";
