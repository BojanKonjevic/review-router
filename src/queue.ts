import "dotenv/config";
import { Queue } from "bullmq";
import { Redis } from "ioredis";

if (!process.env.REDIS_URL) throw new Error("REDIS_URL is not defined");
export const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});
export const prEvents = new Queue<PrEventJob>("pr-events", {
  connection: redis,
});

export interface PrEventJob {
  deliveryId: string;
  event: string;
  repo: string;
  number: number;
  title: string;
  action: string;
  body: string | null;
}
