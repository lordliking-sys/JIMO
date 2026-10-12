ALTER TABLE "program_exercises" ADD COLUMN "workout_mode" varchar(16) DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "program_exercises" ADD COLUMN "emom_interval_seconds" integer;--> statement-breakpoint
ALTER TABLE "program_exercises" ADD COLUMN "set_targets" jsonb;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD COLUMN "workout_mode_snapshot" varchar(16) DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD COLUMN "emom_interval_seconds_snapshot" integer;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD COLUMN "emom_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD COLUMN "target_rest_seconds" integer;--> statement-breakpoint
ALTER TABLE "program_exercises" ADD CONSTRAINT "program_exercises_mode_valid" CHECK ("program_exercises"."workout_mode" IN ('standard','pyramid','emom'));--> statement-breakpoint
ALTER TABLE "program_exercises" ADD CONSTRAINT "program_exercises_interval_valid" CHECK (("program_exercises"."workout_mode" = 'emom' AND ("program_exercises"."emom_interval_seconds" IS NULL OR "program_exercises"."emom_interval_seconds" BETWEEN 5 AND 3600)) OR ("program_exercises"."workout_mode" <> 'emom' AND "program_exercises"."emom_interval_seconds" IS NULL));--> statement-breakpoint
ALTER TABLE "program_exercises" ADD CONSTRAINT "program_exercises_set_targets_valid" CHECK (("program_exercises"."workout_mode" = 'pyramid' AND "program_exercises"."set_targets" IS NOT NULL AND jsonb_typeof("program_exercises"."set_targets") = 'array' AND jsonb_array_length("program_exercises"."set_targets") = "program_exercises"."target_sets") OR ("program_exercises"."workout_mode" <> 'pyramid' AND "program_exercises"."set_targets" IS NULL));--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_mode_valid" CHECK ("workout_exercises"."workout_mode_snapshot" IN ('standard','pyramid','emom'));--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_interval_valid" CHECK (("workout_exercises"."workout_mode_snapshot" = 'emom' AND ("workout_exercises"."emom_interval_seconds_snapshot" IS NULL OR "workout_exercises"."emom_interval_seconds_snapshot" BETWEEN 5 AND 3600)) OR ("workout_exercises"."workout_mode_snapshot" <> 'emom' AND "workout_exercises"."emom_interval_seconds_snapshot" IS NULL AND "workout_exercises"."emom_started_at" IS NULL));--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_target_rest_valid" CHECK ("workout_sets"."target_rest_seconds" IS NULL OR "workout_sets"."target_rest_seconds" BETWEEN 0 AND 86400);
--> statement-breakpoint
ALTER TABLE "sync_operations" DROP CONSTRAINT "sync_operations_type_valid";
--> statement-breakpoint
ALTER TABLE "sync_operations" ADD CONSTRAINT "sync_operations_type_valid" CHECK ("sync_operations"."operation_type" IN ('START_WORKOUT','START_EMOM','COMPLETE_SET','UPDATE_SET','SKIP_SET','COMPLETE_WORKOUT','CANCEL_WORKOUT'));
