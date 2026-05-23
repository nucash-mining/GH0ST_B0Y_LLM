# Deploying GH0ST_B0Y Oracle Web App

## Hosting: Vercel (recommended — free, auto-deploys from GitHub)

Next.js needs a Node.js runtime for API routes and SSR, so static GitHub Pages won't work.
Vercel is the canonical host — it deploys directly from GitHub on every push.

---

### Step 1 — Get a free Postgres database

The production database must be Postgres (SQLite is local-only).

**Option A: Neon (free tier, no credit card)**
1. Go to [neon.tech](https://neon.tech) → Create project
2. Copy the connection string: `postgresql://user:pass@host/dbname?sslmode=require`

**Option B: Vercel Postgres (add after deploying)**
1. In your Vercel project dashboard → Storage → Create Database → Postgres
2. Vercel auto-adds `DATABASE_URL` to your env vars

---

### Step 2 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import `nucash-mining/GH0ST_B0Y_LLM` from GitHub
3. Set **Root Directory** to `webapp`
4. Add these **Environment Variables**:

| Variable | Value |
|---|---|
| `DATABASE_PROVIDER` | `postgresql` |
| `DATABASE_URL` | your Postgres connection string |
| `NEXTAUTH_SECRET` | run `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |
| `STRIPE_SECRET_KEY` | from [dashboard.stripe.com](https://dashboard.stripe.com) |
| `STRIPE_WEBHOOK_SECRET` | from Stripe webhook settings |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | from Stripe dashboard |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | from [cloud.walletconnect.com](https://cloud.walletconnect.com) |
| `PAYMENT_RECEIVER_ADDRESS` | your ETH wallet address |
| `OLLAMA_URL` | URL of your remote Ollama server |
| `NEXT_PUBLIC_CHAIN_ID` | `11155111` (Sepolia) or `1` (mainnet) |

5. Click **Deploy**

After first deploy, run the DB migration:
```
vercel env pull .env.production.local
DATABASE_PROVIDER=postgresql DATABASE_URL="your-url" npx prisma db push
```
Or run it via Vercel's build command (already set in `vercel.json`).

---

### Step 3 — Set up Stripe webhook

1. In Stripe dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://your-app.vercel.app/api/payments/stripe/webhook`
3. Events: `checkout.session.completed`
4. Copy the webhook signing secret → paste as `STRIPE_WEBHOOK_SECRET` in Vercel

---

### Step 4 — Point your domain (optional)

In Vercel project → Domains → Add `oracle.wattxchain.org` or similar.

---

## Future: NVIDIA DGX Air Node Hosting

When DGX Air trial nodes come online, the Ollama server moves off localhost
to each operator's dedicated instance. Update `OLLAMA_URL` per-user or implement
node routing in `src/lib/ollama.ts` to route to the assigned node for each session.

Node operator setup doc: `/webapp/src/app/node-program/page.tsx`
