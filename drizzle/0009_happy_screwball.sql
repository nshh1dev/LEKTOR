CREATE TABLE "order_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orden_id" uuid NOT NULL,
	"actor_id" uuid,
	"estado_anterior" varchar(20) NOT NULL,
	"estado_nuevo" varchar(20) NOT NULL,
	"motivo" varchar(200),
	"intervencion_admin" boolean DEFAULT false NOT NULL,
	"fecha_creacion" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_orden_id_orders_id_fk" FOREIGN KEY ("orden_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_events_orden_fecha_idx" ON "order_events" USING btree ("orden_id","fecha_creacion");--> statement-breakpoint
CREATE INDEX "order_events_actor_idx" ON "order_events" USING btree ("actor_id");