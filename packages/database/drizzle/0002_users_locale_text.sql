ALTER TABLE "users" ALTER COLUMN "locale" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "locale" SET DATA TYPE text USING "locale"::text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "locale" SET DEFAULT 'system';--> statement-breakpoint
DROP TYPE "public"."locale_preference";
