ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'recipe.test_create';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'recipe.test_submit';--> statement-breakpoint

CREATE TABLE "recipe_tests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "recipe_version_id" uuid NOT NULL,
  "code" text NOT NULL,
  "seq" integer DEFAULT 1 NOT NULL,
  "batch_qty" integer DEFAULT 1 NOT NULL,
  "status" text DEFAULT 'pendente' NOT NULL,
  "criteria" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "note" text DEFAULT '' NOT NULL,
  "tested_at" timestamp with time zone,
  "tested_by_user_id" text,
  "created_by_user_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "recipe_tests" ADD CONSTRAINT "recipe_tests_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_tests" ADD CONSTRAINT "recipe_tests_recipe_version_id_recipe_versions_id_fk" FOREIGN KEY ("recipe_version_id") REFERENCES "public"."recipe_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_tests" ADD CONSTRAINT "recipe_tests_tested_by_user_id_user_id_fk" FOREIGN KEY ("tested_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_tests" ADD CONSTRAINT "recipe_tests_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE UNIQUE INDEX "recipe_tests_company_code_idx" ON "recipe_tests" USING btree ("company_id","code");--> statement-breakpoint
CREATE INDEX "recipe_tests_version_idx" ON "recipe_tests" USING btree ("recipe_version_id");
