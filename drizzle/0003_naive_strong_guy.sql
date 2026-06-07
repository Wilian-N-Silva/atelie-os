ALTER TYPE "public"."audit_action" ADD VALUE 'recipe.create' BEFORE 'stock.adjust';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'recipe.update' BEFORE 'stock.adjust';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'production.create' BEFORE 'stock.adjust';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'production.update' BEFORE 'stock.adjust';--> statement-breakpoint
CREATE TABLE "production_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"code" text NOT NULL,
	"number" text NOT NULL,
	"product_item_id" uuid,
	"product_sku" text NOT NULL,
	"product_name" text NOT NULL,
	"recipe_version_id" uuid,
	"recipe_name" text NOT NULL,
	"recipe_version" text NOT NULL,
	"planned" numeric(12, 3) DEFAULT '0' NOT NULL,
	"status" text NOT NULL,
	"planned_date_label" text DEFAULT 'a definir' NOT NULL,
	"responsible" text DEFAULT '' NOT NULL,
	"progress" integer,
	"lot" text,
	"cure_until" text,
	"cure_day_left" integer,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_by_user_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_version_id" uuid NOT NULL,
	"item_id" uuid,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"quantity" numeric(12, 4) NOT NULL,
	"unit" text DEFAULT 'un' NOT NULL,
	"loss" numeric(6, 2) DEFAULT '0' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"version" text NOT NULL,
	"status" text DEFAULT 'rascunho' NOT NULL,
	"yield_qty" numeric(12, 3) DEFAULT '1' NOT NULL,
	"yield_unit" text DEFAULT 'unidade' NOT NULL,
	"cure_days" integer DEFAULT 0 NOT NULL,
	"tests" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"product_item_id" uuid,
	"product_sku" text NOT NULL,
	"product_name" text NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_product_item_id_items_id_fk" FOREIGN KEY ("product_item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_recipe_version_id_recipe_versions_id_fk" FOREIGN KEY ("recipe_version_id") REFERENCES "public"."recipe_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_components" ADD CONSTRAINT "recipe_components_recipe_version_id_recipe_versions_id_fk" FOREIGN KEY ("recipe_version_id") REFERENCES "public"."recipe_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_components" ADD CONSTRAINT "recipe_components_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_versions" ADD CONSTRAINT "recipe_versions_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_product_item_id_items_id_fk" FOREIGN KEY ("product_item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "production_orders_company_code_idx" ON "production_orders" USING btree ("company_id","code");--> statement-breakpoint
CREATE INDEX "production_orders_company_status_idx" ON "production_orders" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "recipe_components_version_idx" ON "recipe_components" USING btree ("recipe_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_versions_recipe_version_idx" ON "recipe_versions" USING btree ("recipe_id","version");--> statement-breakpoint
CREATE INDEX "recipes_company_product_idx" ON "recipes" USING btree ("company_id","product_sku");