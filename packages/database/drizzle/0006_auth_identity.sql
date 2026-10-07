ALTER TABLE "users" ADD COLUMN "auth_provider" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_subject" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_initialized_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_auth_identity_unique" UNIQUE("auth_provider","auth_subject");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_auth_identity_valid" CHECK (("users"."auth_provider" IS NULL AND "users"."auth_subject" IS NULL) OR ("users"."auth_provider" IS NOT NULL AND "users"."auth_subject" IS NOT NULL AND length(trim("users"."auth_provider")) BETWEEN 1 AND 64 AND length(trim("users"."auth_subject")) BETWEEN 1 AND 255));