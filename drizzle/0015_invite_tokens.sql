ALTER TABLE "pending_invites" ADD COLUMN "token_hash" text;--> statement-breakpoint
CREATE UNIQUE INDEX "pending_invites_token_hash_idx" ON "pending_invites" USING btree ("token_hash");--> statement-breakpoint
