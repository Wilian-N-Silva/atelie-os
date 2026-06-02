ALTER TYPE "public"."audit_action" ADD VALUE 'item.create' BEFORE 'stock.adjust';--> statement-breakpoint
ALTER TYPE "public"."audit_action" ADD VALUE 'item.update' BEFORE 'stock.adjust';