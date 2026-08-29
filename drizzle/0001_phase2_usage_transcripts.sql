CREATE TYPE "public"."reflection_mode" AS ENUM('typed', 'spoken');--> statement-breakpoint
CREATE TYPE "public"."usage_kind" AS ENUM('groq', 'elevenlabs');--> statement-breakpoint
CREATE TABLE "reflection_transcripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"session_id" uuid,
	"text" text NOT NULL,
	"duration_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" "usage_kind" NOT NULL,
	"units" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reflections" ADD COLUMN "input_mode" "reflection_mode" DEFAULT 'typed' NOT NULL;--> statement-breakpoint
ALTER TABLE "reflection_transcripts" ADD CONSTRAINT "reflection_transcripts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reflection_transcripts" ADD CONSTRAINT "reflection_transcripts_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reflection_transcripts_user_created_idx" ON "reflection_transcripts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "usage_events_user_kind_created_idx" ON "usage_events" USING btree ("user_id","kind","created_at");