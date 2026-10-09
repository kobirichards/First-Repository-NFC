DROP INDEX "audit_event_entity_type_entity_id_index";--> statement-breakpoint
DROP INDEX "enquiry_status_index";--> statement-breakpoint
DROP INDEX "order_user_id_index";--> statement-breakpoint
DROP INDEX "order_status_index";--> statement-breakpoint
CREATE INDEX "artwork_proof_status_created_at_index" ON "artwork_proof" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "audit_event_entity_type_entity_id_created_at_index" ON "audit_event" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_event_actor_id_index" ON "audit_event" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "card_order_item_id_index" ON "card" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "card_status_created_at_index" ON "card" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "card_created_at_index" ON "card" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "card_batch_created_at_index" ON "card_batch" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "cart_updated_at_index" ON "cart" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "cart_item_product_id_index" ON "cart_item" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "checkout_session_status_created_at_index" ON "checkout_session" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "daily_stat_card_id_day_index" ON "daily_stat" USING btree ("card_id","day");--> statement-breakpoint
CREATE INDEX "daily_stat_profile_id_day_index" ON "daily_stat" USING btree ("profile_id","day");--> statement-breakpoint
CREATE INDEX "enquiry_status_created_at_index" ON "enquiry" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "enquiry_created_at_index" ON "enquiry" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "order_user_id_created_at_index" ON "order" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "order_status_created_at_index" ON "order" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "order_created_at_index" ON "order" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_created_at_index" ON "user" USING btree ("created_at");