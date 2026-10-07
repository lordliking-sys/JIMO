CREATE TABLE "sync_operations" (
	"operation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"operation_type" text NOT NULL,
	"sequence" integer NOT NULL,
	"payload_hash" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sync_operations_sequence_valid" CHECK ("sync_operations"."sequence">0),
	CONSTRAINT "sync_operations_type_valid" CHECK ("sync_operations"."operation_type" IN ('START_WORKOUT','COMPLETE_SET','UPDATE_SET','SKIP_SET','COMPLETE_WORKOUT','CANCEL_WORKOUT'))
);
--> statement-breakpoint
ALTER TABLE "sync_operations" ADD CONSTRAINT "sync_operations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_operations" ADD CONSTRAINT "sync_operations_session_id_workout_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sync_operations_user_operation_unique" ON "sync_operations" USING btree ("user_id","operation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sync_operations_session_sequence_unique" ON "sync_operations" USING btree ("user_id","session_id","sequence");--> statement-breakpoint
CREATE INDEX "sync_operations_session_idx" ON "sync_operations" USING btree ("session_id");