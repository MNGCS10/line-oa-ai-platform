# LINE OA AI Business Automation Platform

A generic LINE Official Account AI chatbot + admin dashboard, built as a reusable template
(clinics, restaurants, salons, and other SME service businesses). The seeded test case is
**บ้านเด็ก คลินิกกุมารเวชและพัฒนาการ** (Baan Dek Pediatric & Development Clinic).

Stack: **React (Vite) + tRPC + Express + Drizzle ORM (MySQL)**.

## Structure

```
server/   Express API — tRPC routers, LINE webhook, AI engine, Drizzle schema/migrations
client/   React dashboard (Vite + Tailwind), talks to the API over tRPC
shared/   Types shared between server and client (status enums, business config shape)
```

## Prerequisites

- Node.js 20+
- A MySQL 8 database (local, Docker, or managed)

## Setup

```bash
npm install                       # installs all three workspaces

cp server/.env.example server/.env
# edit server/.env — at minimum set DATABASE_URL and JWT_SECRET

npm run db:generate --workspace=server   # already generated in server/drizzle/
npm run db:migrate                       # applies migrations to your MySQL database
npm run db:seed                          # seeds the Baan Dek test case + an admin login

npm run dev:server   # http://localhost:4000
npm run dev:client   # http://localhost:5173 (proxies /api to the server)
```

Log into the dashboard with the admin account printed by `db:seed`
(`admin@baandekclinic.example` / the password from `SEED_ADMIN_PASSWORD`, default `changeme123`
— **change it immediately** after first login by updating the `users` table, since there's no
self-service password change UI in this build).

## Configuring the LINE Official Account

Per the platform's critical rule, **no LINE token or API key is ever hardcoded** — everything
lives in the `system_settings` / `ai_providers` tables, entered through the dashboard:

1. Create a Messaging API channel in the LINE Developers Console.
2. In **Settings** in the dashboard, paste the Channel Access Token and Channel Secret.
3. Set the webhook URL in the LINE console to `https://<your-domain>/api/webhook/line`.
4. In **Settings**, add at least one AI provider (Anthropic/OpenAI/Google) with its API key,
   add a model, and mark it active — the AI engine won't reply until a model is active.
5. Fill in the business info + AI persona fields (pre-seeded with the Baan Dek test case) —
   this is compiled live into the system prompt on every AI reply, along with the current
   `products` table, so there's never a stale/hardcoded product list.

## Customer appointment booking (LIFF)

The customer-facing booking flow (spec journey step 3: "กรอกฟอร์ม LIFF") lives at
`client/src/pages/LiffBookingPage.tsx`, served at `/liff/book`, and is opened from inside LINE
(e.g. a rich menu button or a link the AI sends in chat):

1. Create a LINE Login channel + LIFF app (endpoint URL: `https://<your-domain>/liff/book`) in
   the LINE Developers Console.
2. In **Settings → LIFF Booking Form**, save the LIFF ID and the LINE Login Channel ID.
3. The page calls `liff.init()`/`liff.login()` client-side, then submits the booking with the
   LIFF ID token (not a client-supplied user id) to `appointments.createPublic`, a public tRPC
   procedure that verifies the token server-side against LINE's `/oauth2/v2.1/verify` endpoint
   (`server/src/line/liff.ts`) before creating the appointment — so a request can't forge
   someone else's LINE identity.
4. On success it pushes a confirmation Flex message to the customer and, if **Settings → LIFF
   Booking Form → LINE userId ของเจ้าของธุรกิจ** is set, notifies the owner of the new booking.
5. `server/src/services/reminders.ts` polls every 30 minutes for confirmed appointments ~24h
   out with no reminder sent yet and pushes one (spec step 4: "ส่ง reminder ล่วงหน้า 1 วัน").

## How a message flows through the system

1. LINE POSTs to `/api/webhook/line`; the raw body is HMAC-SHA256 verified against the
   channel secret before anything else runs (`server/src/line/verify.ts`).
2. `server/src/services/chatPipeline.ts` upserts the LINE user + chat session, stores the
   message, and (unless an admin has paused AI for that session) buffers it for 2 seconds
   so rapid-fire messages get one combined AI reply (`server/src/ai/messageBuffer.ts`).
3. The system prompt is regenerated from `company_info` + active `products` on every call
   (`server/src/ai/systemPrompt.ts`) and sent to whichever AI provider/model is active
   (`server/src/ai/invoke.ts`), with image messages passed through as vision input.
4. The reply is stored and pushed back to LINE (reply token first, push as a fallback).

## Product image uploads

`upload.productImage` stores images to S3 when an S3 config has been saved via
`settings.updateS3Config`; otherwise it falls back to local disk under `server/uploads/`
(served at `/uploads`) so the platform works before a bucket is provisioned.

## Deploying the backend to Railway

`railway.json` at the repo root configures the build/start for Railway's Nixpacks builder.
Because I don't have Railway API access from wherever this was built, you'll need to run these
steps yourself in the Railway dashboard (or CLI):

1. **New Project → Deploy from GitHub repo**, select this repo, branch `main`. Leave
   **Root Directory** as `/` (repo root) — the server depends on the `shared` workspace via
   npm workspaces, which only resolves correctly when installed from the repo root.
2. **Add a MySQL plugin** to the project (New → Database → MySQL). Its Variables tab exposes
   both a decomposed form (`MYSQLHOST`/`MYSQLPORT`/`MYSQLUSER`/`MYSQLPASSWORD`/`MYSQLDATABASE`)
   and a ready-made connection string (`MYSQL_URL`, on Railway's private network — cheaper and
   faster than `MYSQL_PUBLIC_URL` since the server service lives in the same project).
3. On the **server service's Variables** tab, set (infra config only — see note below):
   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | `${{MySQL.MYSQL_URL}}` (Railway's `${{ServiceName.VAR}}` reference syntax — pulls the MySQL plugin's own connection string live; adjust `MySQL` if you renamed that service) |
   | `JWT_SECRET` | a long random string (e.g. `openssl rand -hex 32`) |
   | `CLIENT_ORIGIN` | wherever the React dashboard ends up hosted (CORS origin) — see the next section |
   | `NODE_ENV` | `production` (Railway usually sets this automatically, but confirm it — the session cookie's `Secure`/`SameSite=None` attributes and a few other prod-only behaviors key off this) |

   Leave `PORT` unset — Railway injects it automatically and the server already reads
   `process.env.PORT`. `PUBLIC_BASE_URL` (used only for local-disk upload fallback links) can be
   set once you've generated a public domain in **Settings → Networking**, since you need that
   URL first.
4. Deploy. `railway.json`'s start command runs `db:migrate` before `npm start` on every deploy
   (the migrator is idempotent — safe to re-run), so the schema is applied automatically. Seed
   the Baan Dek test case once via Railway's **Console** tab (an interactive shell in the running
   container) with `npm run db:seed --workspace=server`, or `railway run` from the CLI — it's
   deliberately **not** chained into the deploy start command, since re-running it on every
   deploy could resurrect a seeded admin account you've since changed or deleted.
5. Once the service is live, log into the dashboard as the seeded admin and enter the **real**
   LINE credentials through **Settings** — not as Railway variables. See the next two sections
   for exactly which fields.

**Why LINE secrets aren't in the table above:** this platform's whole design is that
LINE/AI/S3 credentials live in the `system_settings` DB table, entered through the dashboard —
never as env vars, never hardcoded, never in a deploy config that might end up in git history.
Treat any channel secret/access token that ends up outside that Settings form (e.g. pasted into
a terminal, a chat, an env var) as exposed, and rotate it in the LINE Developers Console.

## Deploying the client separately (cross-origin setup)

The dashboard (`client/`) and API (`server/`) are commonly hosted on different platforms —
e.g. client on Vercel, API on Railway, as above. Two things make that work correctly:

1. **`VITE_API_URL`** (client build-time env var, see `client/.env.example`) — set this to the
   API's full origin (e.g. `https://<service>.up.railway.app`) wherever the client is built.
   Leave it unset for local dev / same-origin deploys, where `vite.config.ts`'s dev proxy (or a
   reverse proxy in front of both in production) makes a relative `/api/trpc` path work instead.
2. **Cross-site cookies** — the session cookie (`server/src/routers/auth.ts`) is set with
   `SameSite=None; Secure` whenever `NODE_ENV=production`, since browsers silently refuse to
   send `SameSite=Lax` cookies on cross-origin `fetch` calls at all. This requires HTTPS on both
   sides (true for Vercel/Railway) and the client's tRPC `fetch` to pass `credentials: "include"`
   (already does, in `client/src/lib/trpc.ts`).
3. Update the server's `CLIENT_ORIGIN` env var to the client's real deployed origin once you
   have it — the API's CORS config only allows that one origin (with credentials), not `*`.

If you'd rather host both under one domain (e.g. the server serves the built client as static
files, or a reverse proxy fronts both), none of this is needed — just leave `VITE_API_URL` unset
and use `SameSite=Lax` (skip step 2's env-driven switch, or force `NODE_ENV` handling to `lax`).

## Verification performed in this environment

- `npm run --workspace=server typecheck` and `npm run --workspace=client typecheck` — clean
- `npm run build` (shared → client `vite build` → server `tsc`) — all succeed
- `drizzle-kit generate` — schema compiles, produced `server/drizzle/0000_*.sql` covering all
  13 tables
- Unit-tested `verifyLineSignature` directly (valid/tampered/wrong-secret/missing/garbage
  signature cases all behave correctly)
- Rendered `/login` and `/liff/book` in a real headless browser at desktop and mobile
  viewports — no runtime errors beyond the expected network failures (no backend running)
- **Actually ran the production build**: `node server/dist/index.js` after a clean build boots
  and serves real HTTP traffic (`/api/health`, `auth.me` both responded correctly); a
  DB-touching call failed with a clean `ECONNREFUSED` (no MySQL in this sandbox) instead of a
  module-resolution crash. This caught and fixed a real bug — the initial build used
  `moduleResolution: "Bundler"` and a `shared` package pointing at raw `.ts`, both of which
  work fine under Vite/tsx but silently produce a `dist/` that plain Node can't execute at all.
  Fixed by switching `server`/`shared` to `NodeNext` + explicit `.js` extensions on relative
  imports, and giving `shared` a real compiled build step.

A live MySQL instance still wasn't reachable in this sandbox (outbound Docker image pulls are
blocked), so `db:migrate` / `db:seed` against a real database weren't exercised in this sandbox
directly — **but they have since been verified against a real deploy**: on Railway (server +
MySQL plugin), `db:migrate` created all 13 tables, `db:seed` populated the Baan Dek test case
and admin login, and `/api/health` responded correctly over real HTTPS. The LINE webhook / AI
provider / LIFF flows still need a walkthrough of the spec's Test Acceptance Checklist once
real LINE + AI provider credentials are entered via Settings.

## Reusing this for a different business

Everything in the spec's "Business Configuration" section is data, not code — update it from
the **Settings** page (company info, AI persona) and the **Products** page (catalog), and the
same codebase serves a restaurant, salon, or any other SME service business without touching
the system prompt generation, routers, or schema.
