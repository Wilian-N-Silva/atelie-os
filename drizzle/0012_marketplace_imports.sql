ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'import.run';--> statement-breakpoint

CREATE TABLE "channel_sku_mappings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "channel_key" text NOT NULL,
  "external_sku" text NOT NULL,
  "item_id" uuid,
  "external_title" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "import_orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "channel_key" text NOT NULL,
  "external_order_id" text NOT NULL,
  "buyer_name" text DEFAULT '' NOT NULL,
  "buyer_email" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "error_reason" text,
  "total" numeric(12, 2) DEFAULT '0' NOT NULL,
  "raw_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_order_id" uuid,
  "created_by_user_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "channel_sku_mappings" ADD CONSTRAINT "channel_sku_mappings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_sku_mappings" ADD CONSTRAINT "channel_sku_mappings_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_orders" ADD CONSTRAINT "import_orders_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_orders" ADD CONSTRAINT "import_orders_created_order_id_orders_id_fk" FOREIGN KEY ("created_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_orders" ADD CONSTRAINT "import_orders_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE UNIQUE INDEX "channel_sku_mappings_company_channel_sku_idx" ON "channel_sku_mappings" USING btree ("company_id","channel_key","external_sku");--> statement-breakpoint
CREATE UNIQUE INDEX "import_orders_company_external_idx" ON "import_orders" USING btree ("company_id","channel_key","external_order_id");--> statement-breakpoint
CREATE INDEX "import_orders_company_status_idx" ON "import_orders" USING btree ("company_id","status");
