CREATE TYPE "public"."load_mode" AS ENUM('bodyweight', 'weighted', 'external', 'assisted');--> statement-breakpoint
CREATE TYPE "public"."locale_preference" AS ENUM('system', 'it', 'en');--> statement-breakpoint
CREATE TYPE "public"."program_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."set_status" AS ENUM('pending', 'completed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."tracking_mode" AS ENUM('reps', 'duration');--> statement-breakpoint
CREATE TYPE "public"."unit_system" AS ENUM('metric', 'imperial');--> statement-breakpoint
CREATE TYPE "public"."workout_status" AS ENUM('in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text,
	"locale" "locale_preference" DEFAULT 'system' NOT NULL,
	"unit_system" "unit_system" DEFAULT 'metric' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_display_name_valid" CHECK ("users"."display_name" IS NULL OR length(trim("users"."display_name")) BETWEEN 1 AND 120)
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_user_id" uuid,
	"canonical_name" text NOT NULL,
	"slug" text,
	"is_custom" boolean DEFAULT false NOT NULL,
	"tracking_mode" "tracking_mode" DEFAULT 'reps' NOT NULL,
	"default_load_mode" "load_mode",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exercises_name_valid" CHECK (length(trim("exercises"."canonical_name")) BETWEEN 1 AND 160),
	CONSTRAINT "exercises_owner_consistent" CHECK (("exercises"."is_custom" AND "exercises"."created_by_user_id" IS NOT NULL) OR (NOT "exercises"."is_custom" AND "exercises"."created_by_user_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "program_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"name" text NOT NULL,
	"day_of_week" integer,
	"position" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "program_days_name_valid" CHECK (length(trim("program_days"."name")) BETWEEN 1 AND 160),
	CONSTRAINT "program_days_weekday_valid" CHECK ("program_days"."day_of_week" IS NULL OR "program_days"."day_of_week" BETWEEN 1 AND 7),
	CONSTRAINT "program_days_position_valid" CHECK ("program_days"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "program_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_day_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"load_mode" "load_mode" NOT NULL,
	"target_sets" integer NOT NULL,
	"target_reps" integer,
	"target_rep_min" integer,
	"target_rep_max" integer,
	"target_duration_seconds" integer,
	"target_load_kg" numeric(9, 2),
	"target_assistance_kg" numeric(9, 2),
	"target_rpe" numeric(3, 1),
	"rest_seconds" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "program_exercises_position_valid" CHECK ("program_exercises"."position" >= 0),
	CONSTRAINT "program_exercises_sets_valid" CHECK ("program_exercises"."target_sets" > 0),
	CONSTRAINT "program_exercises_rest_valid" CHECK ("program_exercises"."rest_seconds" IS NULL OR "program_exercises"."rest_seconds" >= 0),
	CONSTRAINT "program_exercises_load_mode_valid" CHECK (("program_exercises"."load_mode" = 'bodyweight' AND "program_exercises"."target_load_kg" IS NULL AND "program_exercises"."target_assistance_kg" IS NULL) OR ("program_exercises"."load_mode" IN ('weighted', 'external') AND "program_exercises"."target_assistance_kg" IS NULL) OR ("program_exercises"."load_mode" = 'assisted' AND "program_exercises"."target_load_kg" IS NULL)),
	CONSTRAINT "program_exercises_reps_valid" CHECK (("program_exercises"."target_reps" IS NULL OR "program_exercises"."target_reps" >= 0) AND ("program_exercises"."target_rep_min" IS NULL OR "program_exercises"."target_rep_min" >= 0) AND ("program_exercises"."target_rep_max" IS NULL OR "program_exercises"."target_rep_max" >= 0)),
	CONSTRAINT "program_exercises_rep_range_valid" CHECK (("program_exercises"."target_rep_min" IS NULL AND "program_exercises"."target_rep_max" IS NULL) OR ("program_exercises"."target_rep_min" IS NOT NULL AND "program_exercises"."target_rep_max" IS NOT NULL AND "program_exercises"."target_rep_min" <= "program_exercises"."target_rep_max" AND "program_exercises"."target_reps" IS NULL)),
	CONSTRAINT "program_exercises_tracking_target_valid" CHECK ("program_exercises"."target_duration_seconds" IS NULL OR ("program_exercises"."target_duration_seconds" > 0 AND "program_exercises"."target_reps" IS NULL AND "program_exercises"."target_rep_min" IS NULL AND "program_exercises"."target_rep_max" IS NULL)),
	CONSTRAINT "program_exercises_kg_valid" CHECK (("program_exercises"."target_load_kg" IS NULL OR "program_exercises"."target_load_kg" >= 0) AND ("program_exercises"."target_assistance_kg" IS NULL OR "program_exercises"."target_assistance_kg" >= 0)),
	CONSTRAINT "program_exercises_rpe_valid" CHECK ("program_exercises"."target_rpe" IS NULL OR "program_exercises"."target_rpe" BETWEEN 1 AND 10),
	CONSTRAINT "program_exercises_load_exclusive" CHECK ("program_exercises"."target_load_kg" IS NULL OR "program_exercises"."target_assistance_kg" IS NULL)
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"duration_weeks" integer,
	"status" "program_status" DEFAULT 'draft' NOT NULL,
	"starts_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "programs_name_valid" CHECK (length(trim("programs"."name")) BETWEEN 1 AND 160),
	CONSTRAINT "programs_duration_valid" CHECK ("programs"."duration_weeks" IS NULL OR "programs"."duration_weeks" > 0)
);
--> statement-breakpoint
CREATE TABLE "workout_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_session_id" uuid NOT NULL,
	"program_exercise_id" uuid,
	"exercise_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"exercise_name_snapshot" text NOT NULL,
	"tracking_mode_snapshot" "tracking_mode" NOT NULL,
	"load_mode_snapshot" "load_mode" NOT NULL,
	"rest_seconds_snapshot" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workout_exercises_position_valid" CHECK ("workout_exercises"."position" >= 0),
	CONSTRAINT "workout_exercises_name_valid" CHECK (length(trim("workout_exercises"."exercise_name_snapshot")) BETWEEN 1 AND 160),
	CONSTRAINT "workout_exercises_rest_valid" CHECK ("workout_exercises"."rest_seconds_snapshot" IS NULL OR "workout_exercises"."rest_seconds_snapshot" >= 0)
);
--> statement-breakpoint
CREATE TABLE "workout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"program_id" uuid,
	"program_day_id" uuid,
	"name" text NOT NULL,
	"status" "workout_status" DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workout_sessions_name_valid" CHECK (length(trim("workout_sessions"."name")) BETWEEN 1 AND 160),
	CONSTRAINT "workout_sessions_completion_valid" CHECK (("workout_sessions"."completed_at" IS NULL OR "workout_sessions"."completed_at" >= "workout_sessions"."started_at") AND ("workout_sessions"."status" <> 'completed' OR "workout_sessions"."completed_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "workout_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_exercise_id" uuid NOT NULL,
	"set_number" integer NOT NULL,
	"status" "set_status" DEFAULT 'pending' NOT NULL,
	"target_reps" integer,
	"target_rep_min" integer,
	"target_rep_max" integer,
	"target_duration_seconds" integer,
	"target_load_kg" numeric(9, 2),
	"target_assistance_kg" numeric(9, 2),
	"target_rpe" numeric(3, 1),
	"actual_reps" integer,
	"actual_duration_seconds" integer,
	"actual_load_kg" numeric(9, 2),
	"actual_assistance_kg" numeric(9, 2),
	"actual_rpe" numeric(3, 1),
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workout_sets_number_valid" CHECK ("workout_sets"."set_number" > 0),
	CONSTRAINT "workout_sets_actual_reps_valid" CHECK ("workout_sets"."actual_reps" IS NULL OR "workout_sets"."actual_reps" >= 0),
	CONSTRAINT "workout_sets_actual_duration_valid" CHECK ("workout_sets"."actual_duration_seconds" IS NULL OR ("workout_sets"."actual_duration_seconds" > 0 AND "workout_sets"."actual_reps" IS NULL)),
	CONSTRAINT "workout_sets_actual_kg_valid" CHECK (("workout_sets"."actual_load_kg" IS NULL OR "workout_sets"."actual_load_kg" >= 0) AND ("workout_sets"."actual_assistance_kg" IS NULL OR "workout_sets"."actual_assistance_kg" >= 0)),
	CONSTRAINT "workout_sets_actual_load_exclusive" CHECK ("workout_sets"."actual_load_kg" IS NULL OR "workout_sets"."actual_assistance_kg" IS NULL),
	CONSTRAINT "workout_sets_actual_rpe_valid" CHECK ("workout_sets"."actual_rpe" IS NULL OR "workout_sets"."actual_rpe" BETWEEN 1 AND 10),
	CONSTRAINT "workout_sets_completion_valid" CHECK ("workout_sets"."status" <> 'completed' OR "workout_sets"."completed_at" IS NOT NULL),
	CONSTRAINT "workout_sets_reps_valid" CHECK (("workout_sets"."target_reps" IS NULL OR "workout_sets"."target_reps" >= 0) AND ("workout_sets"."target_rep_min" IS NULL OR "workout_sets"."target_rep_min" >= 0) AND ("workout_sets"."target_rep_max" IS NULL OR "workout_sets"."target_rep_max" >= 0)),
	CONSTRAINT "workout_sets_rep_range_valid" CHECK (("workout_sets"."target_rep_min" IS NULL AND "workout_sets"."target_rep_max" IS NULL) OR ("workout_sets"."target_rep_min" IS NOT NULL AND "workout_sets"."target_rep_max" IS NOT NULL AND "workout_sets"."target_rep_min" <= "workout_sets"."target_rep_max" AND "workout_sets"."target_reps" IS NULL)),
	CONSTRAINT "workout_sets_tracking_target_valid" CHECK ("workout_sets"."target_duration_seconds" IS NULL OR ("workout_sets"."target_duration_seconds" > 0 AND "workout_sets"."target_reps" IS NULL AND "workout_sets"."target_rep_min" IS NULL AND "workout_sets"."target_rep_max" IS NULL)),
	CONSTRAINT "workout_sets_kg_valid" CHECK (("workout_sets"."target_load_kg" IS NULL OR "workout_sets"."target_load_kg" >= 0) AND ("workout_sets"."target_assistance_kg" IS NULL OR "workout_sets"."target_assistance_kg" >= 0)),
	CONSTRAINT "workout_sets_rpe_valid" CHECK ("workout_sets"."target_rpe" IS NULL OR "workout_sets"."target_rpe" BETWEEN 1 AND 10),
	CONSTRAINT "workout_sets_load_exclusive" CHECK ("workout_sets"."target_load_kg" IS NULL OR "workout_sets"."target_assistance_kg" IS NULL)
);
--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_days" ADD CONSTRAINT "program_days_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_exercises" ADD CONSTRAINT "program_exercises_program_day_id_program_days_id_fk" FOREIGN KEY ("program_day_id") REFERENCES "public"."program_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_exercises" ADD CONSTRAINT "program_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_workout_session_id_workout_sessions_id_fk" FOREIGN KEY ("workout_session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_program_exercise_id_program_exercises_id_fk" FOREIGN KEY ("program_exercise_id") REFERENCES "public"."program_exercises"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_program_day_id_program_days_id_fk" FOREIGN KEY ("program_day_id") REFERENCES "public"."program_days"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_workout_exercise_id_workout_exercises_id_fk" FOREIGN KEY ("workout_exercise_id") REFERENCES "public"."workout_exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exercises_owner_idx" ON "exercises" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exercises_system_slug_unique" ON "exercises" USING btree ("slug") WHERE "exercises"."is_custom" = false;--> statement-breakpoint
CREATE UNIQUE INDEX "exercises_custom_slug_unique" ON "exercises" USING btree ("created_by_user_id","slug") WHERE "exercises"."is_custom" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "program_days_position_unique" ON "program_days" USING btree ("program_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "program_exercises_position_unique" ON "program_exercises" USING btree ("program_day_id","position");--> statement-breakpoint
CREATE INDEX "program_exercises_exercise_idx" ON "program_exercises" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "programs_user_idx" ON "programs" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_exercises_position_unique" ON "workout_exercises" USING btree ("workout_session_id","position");--> statement-breakpoint
CREATE INDEX "workout_exercises_exercise_idx" ON "workout_exercises" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "workout_exercises_source_idx" ON "workout_exercises" USING btree ("program_exercise_id");--> statement-breakpoint
CREATE INDEX "workout_sessions_user_idx" ON "workout_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workout_sessions_started_idx" ON "workout_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "workout_sessions_program_idx" ON "workout_sessions" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "workout_sessions_day_idx" ON "workout_sessions" USING btree ("program_day_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_sets_number_unique" ON "workout_sets" USING btree ("workout_exercise_id","set_number");