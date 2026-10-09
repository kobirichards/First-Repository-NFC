CREATE TABLE "checkout_session" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"cart_id" text,
	"user_id" text,
	"currency" "currency" NOT NULL,
	"lines" jsonb NOT NULL,
	"subtotal" integer NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"order_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkout_session" ADD CONSTRAINT "checkout_session_cart_id_cart_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."cart"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_session" ADD CONSTRAINT "checkout_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_session" ADD CONSTRAINT "checkout_session_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checkout_session_user_id_index" ON "checkout_session" USING btree ("user_id");