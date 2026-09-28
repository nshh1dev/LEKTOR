CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comprador_id" uuid NOT NULL,
	"vendedor_id" uuid NOT NULL,
	"publicacion_id" uuid NOT NULL,
	"cantidad" integer DEFAULT 1 NOT NULL,
	"subtotal" integer NOT NULL,
	"envio" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"metodo_pago" varchar(40),
	"datos_despacho" jsonb,
	"estado" varchar(20) DEFAULT 'reservada' NOT NULL,
	"fecha_creacion" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"autor" varchar(200) NOT NULL,
	"editorial" varchar(200) NOT NULL,
	"volumen" integer,
	"categoria" varchar(50) NOT NULL,
	"condicion" varchar(60) NOT NULL,
	"precio" integer NOT NULL,
	"stock" integer DEFAULT 1 NOT NULL,
	"stock_minimo" integer DEFAULT 0 NOT NULL,
	"isbn" varchar(30),
	"descripcion" text,
	"fotos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"estado" varchar(20) DEFAULT 'activa' NOT NULL,
	"tone" varchar(120),
	"rating" numeric(2, 1),
	"vendedor_id" uuid NOT NULL,
	"fecha_publicacion" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" varchar(128) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"nombre" varchar(120) NOT NULL,
	"rol" varchar(20) DEFAULT 'lector' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"avatar_url" text,
	"fecha_creacion" timestamp with time zone DEFAULT now() NOT NULL,
	"ultimo_acceso" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_comprador_id_users_id_fk" FOREIGN KEY ("comprador_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_vendedor_id_users_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_publicacion_id_publications_id_fk" FOREIGN KEY ("publicacion_id") REFERENCES "public"."publications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_vendedor_id_users_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_comprador_idx" ON "orders" USING btree ("comprador_id");--> statement-breakpoint
CREATE INDEX "orders_vendedor_idx" ON "orders" USING btree ("vendedor_id");--> statement-breakpoint
CREATE INDEX "publications_titulo_idx" ON "publications" USING btree ("titulo");--> statement-breakpoint
CREATE INDEX "publications_categoria_idx" ON "publications" USING btree ("categoria");--> statement-breakpoint
CREATE INDEX "publications_vendedor_idx" ON "publications" USING btree ("vendedor_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");