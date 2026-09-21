import { integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

export const repos = pgTable("repos", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
});

export const pullRequests = pgTable(
  "pull_requests",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    reviewerId: integer("reviewer_id")
      .notNull()
      .references(() => reviewers.id),
    repoId: integer("repo_id")
      .notNull()
      .references(() => repos.id),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    state: text("state").notNull().default("open"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.repoId, t.number)],
);

export const deliveries = pgTable("deliveries", {
  id: text("id").primaryKey(),
  payload: text("payload").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reviewers = pgTable("reviewers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  load: integer("load").notNull().default(0),
});
