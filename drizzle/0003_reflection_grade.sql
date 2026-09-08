ALTER TABLE "reflections" ADD COLUMN "grade_score" smallint;
ALTER TABLE "reflections" ADD COLUMN "grade_verdict" text;
ALTER TABLE "reflections" ADD COLUMN "grade_feedback" jsonb;
ALTER TABLE "reflections" ADD COLUMN "graded_at" timestamp with time zone;
