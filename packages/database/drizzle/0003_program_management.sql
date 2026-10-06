CREATE TABLE "exercise_translations" (
	"exercise_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exercise_translations_exercise_id_locale_pk" PRIMARY KEY("exercise_id","locale"),
	CONSTRAINT "exercise_translations_name_valid" CHECK (length(trim("exercise_translations"."name")) BETWEEN 1 AND 160),
	CONSTRAINT "exercise_translations_locale_valid" CHECK (length("exercise_translations"."locale") BETWEEN 2 AND 35)
);
--> statement-breakpoint
ALTER TABLE "exercise_translations" ADD CONSTRAINT "exercise_translations_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "exercises_custom_name_unique" ON "exercises" USING btree ("created_by_user_id",lower(trim("canonical_name"))) WHERE "exercises"."is_custom" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "programs_single_active_unique" ON "programs" USING btree ("user_id") WHERE "programs"."status" = 'active';
--> statement-breakpoint
CREATE TRIGGER exercise_translations_touch_updated_at BEFORE UPDATE ON public.exercise_translations
FOR EACH ROW EXECUTE FUNCTION public.jimo_touch_updated_at();
