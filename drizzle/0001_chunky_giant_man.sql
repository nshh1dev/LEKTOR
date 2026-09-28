CREATE TABLE "book_metadata" (
	"isbn" varchar(20) PRIMARY KEY NOT NULL,
	"titulo" varchar(255),
	"autor" varchar(200),
	"editorial" varchar(200),
	"anio" integer,
	"paginas" integer,
	"portada_url" text,
	"consultado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" uuid NOT NULL,
	"publication_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_id_publication_id_pk" PRIMARY KEY("user_id","publication_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tipo" varchar(40) NOT NULL,
	"titulo" varchar(160) NOT NULL,
	"cuerpo" text,
	"datos" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"leida" boolean DEFAULT false NOT NULL,
	"fecha_creacion" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
UPDATE "orders" SET "metodo_pago" = 'simulado' WHERE "metodo_pago" IS NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "metodo_pago" SET DEFAULT 'simulado';--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "metodo_pago" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "publications" ALTER COLUMN "isbn" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "titulo_snapshot" varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "precio_unitario" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "reserva_expira_en" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "orders" SET "titulo_snapshot" = p."titulo" FROM "publications" p WHERE p."id" = "orders"."publicacion_id" AND "orders"."titulo_snapshot" = '';--> statement-breakpoint
UPDATE "orders" SET "precio_unitario" = "subtotal" WHERE "precio_unitario" = 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" varchar(300);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telefono" varchar(30);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "comuna" varchar(80);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "region" varchar(80);--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_publication_id_publications_id_fk" FOREIGN KEY ("publication_id") REFERENCES "public"."publications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "favorites_user_idx" ON "favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "favorites_publication_idx" ON "favorites" USING btree ("publication_id");--> statement-breakpoint
CREATE INDEX "notifications_user_fecha_idx" ON "notifications" USING btree ("user_id","fecha_creacion");--> statement-breakpoint
CREATE INDEX "notifications_user_leida_idx" ON "notifications" USING btree ("user_id","leida");--> statement-breakpoint
CREATE INDEX "orders_estado_idx" ON "orders" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "orders_reserva_idx" ON "orders" USING btree ("estado","reserva_expira_en");--> statement-breakpoint
CREATE INDEX "publications_editorial_idx" ON "publications" USING btree ("editorial");--> statement-breakpoint
CREATE INDEX "publications_precio_idx" ON "publications" USING btree ("precio");--> statement-breakpoint
CREATE INDEX "publications_estado_idx" ON "publications" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "publications_categoria_precio_idx" ON "publications" USING btree ("categoria","precio");--> statement-breakpoint
CREATE INDEX "publications_isbn_idx" ON "publications" USING btree ("isbn");--> statement-breakpoint
CREATE INDEX "users_rol_idx" ON "users" USING btree ("rol");--> statement-breakpoint
ALTER TABLE "publications" DROP COLUMN "tone";