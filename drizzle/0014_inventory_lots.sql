CREATE TABLE "inventory_lots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "item_id" uuid NOT NULL,
  "code" text NOT NULL,
  "lot_type" text DEFAULT 'produced' NOT NULL,
  "status" text DEFAULT 'em_cura' NOT NULL,
  "production_order_id" uuid,
  "source_type" text DEFAULT 'production' NOT NULL,
  "source_id" text,
  "location_id" uuid,
  "initial_qty" numeric(12, 3) DEFAULT '0' NOT NULL,
  "released_qty" numeric(12, 3) DEFAULT '0' NOT NULL,
  "available_qty" numeric(12, 3) DEFAULT '0' NOT NULL,
  "rejected_qty" numeric(12, 3) DEFAULT '0' NOT NULL,
  "quality_status" text DEFAULT 'pending' NOT NULL,
  "quality_reviewed_at" timestamp with time zone,
  "quality_reviewed_by_user_id" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_location_id_inventory_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_quality_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("quality_reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE UNIQUE INDEX "inventory_lots_company_item_code_idx" ON "inventory_lots" USING btree ("company_id","item_id","code");--> statement-breakpoint
CREATE INDEX "inventory_lots_production_idx" ON "inventory_lots" USING btree ("production_order_id");--> statement-breakpoint
CREATE INDEX "inventory_lots_company_status_idx" ON "inventory_lots" USING btree ("company_id","status");--> statement-breakpoint

INSERT INTO "inventory_lots" (
  "company_id",
  "item_id",
  "code",
  "lot_type",
  "status",
  "production_order_id",
  "source_type",
  "source_id",
  "initial_qty",
  "released_qty",
  "available_qty",
  "rejected_qty",
  "quality_status",
  "metadata",
  "created_at",
  "updated_at"
)
SELECT
  "company_id",
  "product_item_id",
  "lot",
  'produced',
  CASE
    WHEN "status" = 'liberada' THEN 'released'
    WHEN "status" = 'bloqueada' THEN 'blocked'
    WHEN "status" = 'finalizada' THEN 'rejected'
    WHEN "status" = 'aguardando_revisao' THEN 'review'
    ELSE 'em_cura'
  END,
  "id",
  'production',
  "id"::text,
  "planned",
  CASE WHEN "status" = 'liberada' THEN "planned" ELSE '0' END,
  CASE WHEN "status" = 'liberada' THEN "planned" ELSE '0' END,
  CASE WHEN "status" = 'finalizada' THEN "planned" ELSE '0' END,
  CASE
    WHEN "status" = 'liberada' THEN 'approved'
    WHEN "status" = 'bloqueada' THEN 'blocked'
    WHEN "status" = 'finalizada' THEN 'loss'
    ELSE 'pending'
  END,
  jsonb_build_object('productionId', "id", 'productionNum', "number", 'productSku', "product_sku"),
  "created_at",
  "updated_at"
FROM "production_orders"
WHERE "product_item_id" IS NOT NULL AND "lot" IS NOT NULL AND trim("lot") <> ''
ON CONFLICT DO NOTHING;
