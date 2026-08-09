-- Some developers joined more than one test room before room-aware uploads
-- shipped. Associate an older upload only with the most recently joined room
-- that already existed when the upload was created, and only when that room has
-- exactly one possible recipient besides the uploader.
WITH inferred_recipients AS (
	SELECT
		upload."id" AS "upload_id",
		chosen_room."room_id",
		recipient."clerk_user_id" AS "recipient_clerk_user_id"
	FROM "uploads" AS upload
	CROSS JOIN LATERAL (
		SELECT membership."room_id"
		FROM "scrapbook_members" AS membership
		WHERE membership."clerk_user_id" = upload."clerk_user_id"
			AND membership."joined_at" <= upload."created_at"
		ORDER BY membership."joined_at" DESC, membership."room_id" DESC
		LIMIT 1
	) AS chosen_room
	CROSS JOIN LATERAL (
		SELECT min(other_member."clerk_user_id") AS "clerk_user_id"
		FROM "scrapbook_members" AS other_member
		WHERE other_member."room_id" = chosen_room."room_id"
			AND other_member."clerk_user_id" <> upload."clerk_user_id"
		HAVING count(*) = 1
	) AS recipient
	WHERE upload."room_id" IS NULL
)
UPDATE "uploads"
SET
	"room_id" = inferred_recipients."room_id",
	"recipient_clerk_user_id" = inferred_recipients."recipient_clerk_user_id"
FROM inferred_recipients
WHERE "uploads"."id" = inferred_recipients."upload_id";
