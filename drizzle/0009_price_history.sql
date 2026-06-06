ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'price.update';--> statement-breakpoint

CREATE TABLE "price_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "item_id" uuid NOT NULL,
  "price" numeric(12, 2) NOT NULL,
  "previous_price" numeric(12, 2),
  "cost" numeric(12, 4),
  "margin_pct" numeric(6, 2),
  "channel_key" text,
  "actor_user_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "price_history" ADD CONSTRAINT "price_history_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "price_history_company_item_idx" ON "price_history" USING btree ("company_id","item_id","created_at");
