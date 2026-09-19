import { type PrEventJob, redis } from "./queue.js";
import { Job, Worker } from "bullmq";

async function processor(job: Job<PrEventJob>) {
  console.log(job.data);
  return;
}

const worker = new Worker("pr-events", processor, { connection: redis });
