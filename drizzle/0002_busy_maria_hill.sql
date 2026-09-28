ALTER TABLE "orders" DROP CONSTRAINT "orders_publicacion_id_publications_id_fk";
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "publicacion_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_publicacion_id_publications_id_fk" FOREIGN KEY ("publicacion_id") REFERENCES "public"."publications"("id") ON DELETE set null ON UPDATE no action;