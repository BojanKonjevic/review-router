CREATE TABLE "reviewers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reviewers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"load" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "reviewers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "pull_requests" ADD COLUMN "reviewer_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_reviewer_id_reviewers_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."reviewers"("id") ON DELETE no action ON UPDATE no action;