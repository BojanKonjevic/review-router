# review-router

A GitHub App that assigns PR reviewers fairly by load. Webhook in, fast ack, real work in a queued job, correct under duplicates and concurrent opens.

Three guarantees: idempotent deliveries (one delivery id handled once, redeliveries are no-ops), fair assignment under races (Redis lock around pick-plus-increment), and drift correction (reconcile job recomputes loads from open PRs every 5 minutes).

## Run it

```sh
cp .env.example .env   # fill in app credentials
docker compose up -d   # postgres + redis
pnpm install
pnpm exec drizzle-kit migrate
pnpm dev
```

Point the app webhook at `/webhooks/github`. Only `opened`, `reopened`, `synchronize`, and `closed` are queued, everything else is acked and ignored (review activity must never re-trigger assignment).

## Layout

- `src/index.ts` — webhook receiver, HMAC check, fast ack into the queue
- `src/worker.ts` — assignment, close handling, reconcile
- `src/queue.ts` — BullMQ queue over Redis
- `src/github.ts` — app JWT, cached install tokens, review requests
- `src/schema.ts` — Drizzle schema (repos, PRs, reviewers, deliveries, installations)
