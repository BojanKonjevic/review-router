import { type PrEventJob, redis } from "./queue.js";
import { type Job, Worker } from "bullmq";
import { db } from "./db/index.js";
import { deliveries } from "./schema.js";

async function processor(job: Job<PrEventJob>) {
  const inserted = await db
    .insert(deliveries)
    .values({
      id: job.data.deliveryId,
      payload: JSON.stringify(job.data),
    })
    .onConflictDoNothing();
  if (inserted.count === 0) {
    console.log(job.data);
    return;
  }
}

const worker = new Worker("pr-events", processor, { connection: redis });
