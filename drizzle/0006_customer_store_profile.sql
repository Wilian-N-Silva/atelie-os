ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'customer.upsert';--> statement-breakpoint

CREATE TABLE "customers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "name" text NOT NULL,
  "email" text,
  "phone" text,
  "document" text,
  "address" text,
  "number" text,
  "complement" text,
  "district" text,
  "city" text,
  "state_abbr" text,
  "postal_code" text,
  "source" text DEFAULT 'manual' NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "customers" ADD CONSTRAINT "customers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "customers_company_name_idx" ON "customers" USING btree ("company_id","name");--> statement-breakpoint
CREATE INDEX "customers_company_document_idx" ON "customers" USING btree ("company_id","document");--> statement-breakpoint
CREATE INDEX "customers_company_email_idx" ON "customers" USING btree ("company_id","email");--> statement-breakpoint
CREATE INDEX "orders_company_customer_idx" ON "orders" USING btree ("company_id","customer_id");--> statement-breakpoint
