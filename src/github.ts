import "dotenv/config";
import jwt from "jsonwebtoken";
import { readFileSync } from "node:fs";
import { redis } from "./queue.js";

export function mintJWT(): string {
  const GITHUB_APP_ID = process.env.GITHUB_APP_ID;
  const GITHUB_PRIVATE_KEY_PATH = process.env.GITHUB_APP_KEY_PATH;
  if (typeof GITHUB_PRIVATE_KEY_PATH !== "string") {
    throw new Error("Invalid private key path.");
  }
  const GITHUB_PRIVATE_KEY = readFileSync(GITHUB_PRIVATE_KEY_PATH, "utf-8");
  if (!GITHUB_APP_ID || !GITHUB_PRIVATE_KEY) {
    throw new Error("GITHUB_APP_ID or GITHUB_PRIVATE_KEY not found.");
  }
  return jwt.sign({ iss: GITHUB_APP_ID }, GITHUB_PRIVATE_KEY, {
    algorithm: "RS256",
    expiresIn: "9m",
  });
}

export async function getInstallToken(installationId: number): Promise<string> {
  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mintJWT()}`,
        Accept: "application/vnd.github+json",
      },
    },
  );
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status}`);
  }
  const data = await res.json();
  return data.token as string;
}

export async function requestReview(
  repo: string,
  number: number,
  reviewer: string,
  token: string,
): Promise<void> {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/pulls/${number}/requested_reviewers`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({ reviewers: [reviewer] }),
    },
  );
  if (!res.ok) {
    throw new Error(`Request review failed: ${res.status}`);
  }
}

export async function getCachedInstallToken(
  installationId: number,
): Promise<string> {
  const token = await redis.get(`gh:token:${installationId}`);
  if (token) return token;
  const newToken = await getInstallToken(installationId);
  await redis.set(`gh:token:${installationId}`, newToken, "PX", 50 * 60 * 1000);
  return newToken;
}
