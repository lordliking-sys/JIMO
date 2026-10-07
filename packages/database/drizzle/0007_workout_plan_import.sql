CREATE TABLE "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"feature" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"estimated_cost" numeric(14, 8),
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_usage_feature_valid" CHECK ("ai_usage"."feature"='workout_plan_import'),
	CONSTRAINT "ai_usage_status_valid" CHECK ("ai_usage"."status" IN ('started','succeeded','failed','invalid_output','no_program','timeout')),
	CONSTRAINT "ai_usage_tokens_valid" CHECK (("ai_usage"."input_tokens" IS NULL OR "ai_usage"."input_tokens">=0) AND ("ai_usage"."output_tokens" IS NULL OR "ai_usage"."output_tokens">=0)),
	CONSTRAINT "ai_usage_cost_valid" CHECK ("ai_usage"."estimated_cost" IS NULL OR "ai_usage"."estimated_cost">=0)
);
--> statement-breakpoint
CREATE TABLE "import_confirmations" (
	"user_id" uuid NOT NULL,
	"confirmation_key" uuid NOT NULL,
	"import_id" uuid NOT NULL,
	"program_id" uuid,
	"payload_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_confirmations_hash_valid" CHECK (length("import_confirmations"."payload_hash")=64)
);
--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_confirmations" ADD CONSTRAINT "import_confirmations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_confirmations" ADD CONSTRAINT "import_confirmations_import_id_ai_usage_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."ai_usage"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_confirmations" ADD CONSTRAINT "import_confirmations_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_usage_user_feature_created_idx" ON "ai_usage" USING btree ("user_id","feature","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "import_confirmations_user_key_unique" ON "import_confirmations" USING btree ("user_id","confirmation_key");--> statement-breakpoint
CREATE UNIQUE INDEX "import_confirmations_user_import_unique" ON "import_confirmations" USING btree ("user_id","import_id");