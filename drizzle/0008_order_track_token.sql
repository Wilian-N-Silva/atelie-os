ALTER TABLE "orders" ADD COLUMN "track_token" text;--> statement-breakpoint
UPDATE "orders" SET "track_token" = replace(gen_random_uuid()::text, '-', '') WHERE "track_token" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "orders_track_token_idx" ON "orders" USING btree ("track_token");
