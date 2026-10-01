CREATE TABLE "conversacion_mensajes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversacion_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"mensaje" text NOT NULL,
	"fecha_creacion" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publicacion_id" uuid NOT NULL,
	"comprador_id" uuid NOT NULL,
	"vendedor_id" uuid NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversacion_mensajes" ADD CONSTRAINT "conversacion_mensajes_conversacion_id_conversaciones_id_fk" FOREIGN KEY ("conversacion_id") REFERENCES "public"."conversaciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversacion_mensajes" ADD CONSTRAINT "conversacion_mensajes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_publicacion_id_publications_id_fk" FOREIGN KEY ("publicacion_id") REFERENCES "public"."publications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_comprador_id_users_id_fk" FOREIGN KEY ("comprador_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_vendedor_id_users_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversacion_mensajes_hilo_idx" ON "conversacion_mensajes" USING btree ("conversacion_id","fecha_creacion");--> statement-breakpoint
CREATE INDEX "conversacion_mensajes_usuario_idx" ON "conversacion_mensajes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversaciones_publicacion_comprador_idx" ON "conversaciones" USING btree ("publicacion_id","comprador_id");--> statement-breakpoint
CREATE INDEX "conversaciones_comprador_idx" ON "conversaciones" USING btree ("comprador_id");--> statement-breakpoint
CREATE INDEX "conversaciones_vendedor_idx" ON "conversaciones" USING btree ("vendedor_id");--> statement-breakpoint
CREATE INDEX "conversaciones_actualizado_idx" ON "conversaciones" USING btree ("actualizado_en");