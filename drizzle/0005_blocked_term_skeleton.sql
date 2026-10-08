ALTER TABLE "blocked_terms" ADD COLUMN "skeleton" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX "blocked_terms_skeleton_idx" ON "blocked_terms" USING btree ("skeleton");