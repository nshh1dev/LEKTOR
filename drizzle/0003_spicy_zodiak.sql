CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publicacion_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tipo" varchar(20) DEFAULT 'entrada' NOT NULL,
	"cantidad" integer NOT NULL,
	"stock_anterior" integer NOT NULL,
	"stock_resultante" integer NOT NULL,
	"motivo" varchar(200),
	"fecha_creacion" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_publicacion_id_publications_id_fk" FOREIGN KEY ("publicacion_id") REFERENCES "public"."publications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stock_movements_publicacion_idx" ON "stock_movements" USING btree ("publicacion_id");--> statement-breakpoint
CREATE INDEX "stock_movements_fecha_idx" ON "stock_movements" USING btree ("fecha_creacion");--> statement-breakpoint
CREATE INDEX "stock_movements_usuario_idx" ON "stock_movements" USING btree ("usuario_id");