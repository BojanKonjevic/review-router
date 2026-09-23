CREATE TABLE "installations" (
	"id" integer PRIMARY KEY NOT NULL,
	"account" text NOT NULL,
	"removed" boolean DEFAULT false NOT NULL
);
