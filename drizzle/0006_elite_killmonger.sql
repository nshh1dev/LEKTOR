CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"autor_id" uuid NOT NULL,
	"publicacion_id" uuid NOT NULL,
	"vendedor_id" uuid NOT NULL,
	"puntaje" integer NOT NULL,
	"comentario" varchar(600) NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"respuesta" varchar(400),
	"fecha_creacion" timestamp with time zone DEFAULT now() NOT NULL,
	"editado_en" timestamp with time zone,
	CONSTRAINT "reviews_puntaje_rango" CHECK ("reviews"."puntaje" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "publications" ADD COLUMN "rating_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_autor_id_users_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_publicacion_id_publications_id_fk" FOREIGN KEY ("publicacion_id") REFERENCES "public"."publications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_vendedor_id_users_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_orden_unique" ON "reviews" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "reviews_publicacion_idx" ON "reviews" USING btree ("publicacion_id");--> statement-breakpoint
CREATE INDEX "reviews_vendedor_idx" ON "reviews" USING btree ("vendedor_id");--> statement-breakpoint
CREATE INDEX "reviews_autor_idx" ON "reviews" USING btree ("autor_id");