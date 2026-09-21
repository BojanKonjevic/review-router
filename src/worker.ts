import { type PrEventJob, redis, prEvents, ReconcileJob } from "./queue.js";
import { type Job, Worker } from "bullmq";
import { db } from "./db/index.js";
import { deliveries, pullRequests, repos, reviewers } from "./schema.js";
import { randomUUID } from "node:crypto";
import { eq, and, count } from "drizzle-orm";

async function takeLock(): Promise<string | null> {
  const token = randomUUID();
  const locked = await redis.set("lock:assign", token, "PX", 5000, "NX");
  return locked ? token : null;
}
async function releaseLock(token: string) {
  await redis.eval(
    "if redis.call('get',KEYS[1])==ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end",
    1,
    "lock:assign",
    token,
  );
}

async function processor(job: Job<PrEventJob | ReconcileJob>) {
  if ("kind" in job.data) {
    const token = await takeLock();
    if (!token) throw new Error("Failed to acquire lock");
    try {
      const rows = await db
        .select({
          reviewerId: pullRequests.reviewerId,
          n: count(),
        })
        .from(pullRequests)
        .where(eq(pullRequests.state, "open"))
        .groupBy(pullRequests.reviewerId);
      const loads = new Map(rows.map((r) => [r.reviewerId, r.n]));
      const all = await db.select().from(reviewers);
      for (const r of all) {
        await db
          .update(reviewers)
          .set({ load: loads.get(r.id) ?? 0 })
          .where(eq(reviewers.id, r.id));
      }
    } finally {
      await releaseLock(token);
    }
    return;
  }

  const inserted = await db
    .insert(deliveries)
    .values({
      id: job.data.deliveryId,
      payload: JSON.stringify(job.data),
    })
    .onConflictDoNothing();
  if (inserted.count === 0) {
    return;
  }
  console.log(job.data);
  const token = await takeLock();
  if (!token) throw new Error("Failed to acquire lock");
  try {
    if (job.data.action === "closed") {
      const repo = await db
        .select()
        .from(repos)
        .where(eq(repos.name, job.data.repo));
      if (!repo) throw new Error("Repo not found.");
      const pr = await db
        .select()
        .from(pullRequests)
        .where(
          and(
            eq(pullRequests.repoId, repo[0].id),
            eq(pullRequests.number, job.data.number),
          ),
        );
      if (!pr || !pr[0].reviewerId || pr[0].state === "closed") return;
      await db
        .update(pullRequests)
        .set({ state: "closed" })
        .where(eq(pullRequests.id, pr[0].id));
      const rev = await db
        .select()
        .from(reviewers)
        .where(eq(reviewers.id, pr[0].reviewerId));
      if (rev) {
        await db
          .update(reviewers)
          .set({ load: rev[0].load - 1 })
          .where(eq(reviewers.id, pr[0].reviewerId));
      }
      return;
    }
    const reviewer = await db
      .select()
      .from(reviewers)
      .orderBy(reviewers.load)
      .limit(1);
    if (!reviewer[0]) throw new Error("No reviewers");
    await db
      .update(reviewers)
      .set({ load: reviewer[0].load + 1 })
      .where(eq(reviewers.id, reviewer[0].id));
    const repo = await db
      .select()
      .from(repos)
      .where(eq(repos.name, job.data.repo));
    if (!repo) throw new Error("Repo not found");
    await db
      .insert(pullRequests)
      .values({
        repoId: repo[0].id,
        number: job.data.number,
        title: job.data.title,
        body: job.data.body,
        reviewerId: reviewer[0].id,
      })
      .onConflictDoUpdate({
        target: [pullRequests.repoId, pullRequests.number],
        set: {
          title: job.data.title,
          body: job.data.body,
          reviewerId: reviewer[0].id,
        },
      });
  } finally {
    await releaseLock(token);
  }
}

const worker = new Worker("pr-events", processor, { connection: redis });
await prEvents.upsertJobScheduler(
  "reconcile-schedule",
  { every: 5 * 60 * 1000 },
  { name: "reconcile", data: { kind: "reconcile" } },
);
