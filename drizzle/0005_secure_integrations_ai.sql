ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'shipping.connect';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'shipping.disconnect';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'shipping.quote';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'ai.generate';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'ai.approve';--> statement-breakpoint

CREATE TABLE "integration_credentials" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "provider" text NOT NULL,
  "environment" text DEFAULT 'production' NOT NULL,
  "status" text DEFAULT 'connected' NOT NULL,
  "access_token_encrypted" text,
  "refresh_token_encrypted" text,
  "token_type" text,
  "scope" text,
  "expires_at" timestamp with time zone,
  "connected_by_user_id" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "ai_generations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "generated_by_user_id" text,
  "template_key" text NOT NULL,
  "product_sku" text,
  "product_name" text,
  "prompt" text NOT NULL,
  "output" text NOT NULL,
  "provider" text DEFAULT 'openai' NOT NULL,
  "model" text,
  "status" text DEFAULT 'draft' NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "integration_credentials" ADD CONSTRAINT "integration_credentials_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_credentials" ADD CONSTRAINT "integration_credentials_connected_by_user_id_user_id_fk" FOREIGN KEY ("connected_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_generated_by_user_id_user_id_fk" FOREIGN KEY ("generated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE UNIQUE INDEX "integration_credentials_company_provider_idx" ON "integration_credentials" USING btree ("company_id","provider");--> statement-breakpoint
CREATE INDEX "integration_credentials_company_status_idx" ON "integration_credentials" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "ai_generations_company_created_idx" ON "ai_generations" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_generations_company_template_idx" ON "ai_generations" USING btree ("company_id","template_key");--> statement-breakpoint

UPDATE "company_settings"
SET "settings" = "settings" #- '{shipping,melhorEnvioToken}'
WHERE "settings" #> '{shipping,melhorEnvioToken}' IS NOT NULL;
