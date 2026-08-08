CREATE TABLE "user_avatars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"source_file_key" text NOT NULL,
	"source_file_url" text NOT NULL,
	"source_file_type" text NOT NULL,
	"source_file_size" integer NOT NULL,
	"processing_status" text DEFAULT 'processing' NOT NULL,
	"generated_file_key" text,
	"generated_file_url" text,
	"generated_file_type" text,
	"generated_file_size" integer,
	"generation_error" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_avatars_clerk_user_id_unique" UNIQUE("clerk_user_id"),
	CONSTRAINT "user_avatars_generated_file_key_unique" UNIQUE("generated_file_key")
);
