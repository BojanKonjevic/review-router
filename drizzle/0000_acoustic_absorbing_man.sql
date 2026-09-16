CREATE TABLE "deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"payload" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pull_requests" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "pull_requests_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"repo_id" integer NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pull_requests_repo_id_number_unique" UNIQUE("repo_id","number")
);
--> statement-breakpoint
CREATE TABLE "repos" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "repos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	CONSTRAINT "repos_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE no action ON UPDATE no action;
