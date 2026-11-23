# ANVAYA

Heritage reconstruction studio and visitor app. One Next.js project serves Studio (`app.anvaya.site`) and the visitor PWA (`anvaya.site/<site>`).

## Setup

```bash
pnpm install
supabase start
supabase db reset
pnpm dev
```

Local Supabase is `http://127.0.0.1:54321`. Copy the keys from `supabase status` into `.env.local`:

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
NEXT_PUBLIC_STUDIO_URL=http://localhost:3000
NEXT_PUBLIC_VISITOR_URL=http://localhost:3000
PREVIEW_TOKEN_SECRET=
```

`PREVIEW_TOKEN_SECRET` is required in production. In development the preview signer falls back to a local secret.

Seed users (development only, password `placeholder`):

- A. Iyer, creator — `a.iyer@anvaya.test`
- R. Mehta, reviewer — `r.mehta@anvaya.test`
- S. Rao, admin — `s.rao@anvaya.test`

The seeded site is Ajanta Cave 1 (image reconstruction). Its text and images are placeholders, not a historical account. Drop hand-authored JPEGs into `public/seed-reconstructions/ajanta-cave-1/`.

## Checks

```bash
pnpm typecheck
pnpm test
pnpm e2e
```

`pnpm e2e` runs `e2e/demo.spec.ts` against the local app and database. It restores the Ajanta Cave 1 cistern and version 1.0 before the script so the demo can publish 1.1 again.

## Deploy

Deploy the same project to Vercel twice, or once with two domains attached:

- `app.anvaya.site` — Studio
- `anvaya.site` — visitor routes

Set the env vars above to the hosted Supabase project. Point `NEXT_PUBLIC_STUDIO_URL` and `NEXT_PUBLIC_VISITOR_URL` at the two domains. Apply `supabase/migrations` before the first request.

## What v1 AR does and does not do

v1 opens the element’s published GLB in the browser. On a phone, Start AR hands that model to Scene Viewer (Android) or Quick Look (iOS, when a USDZ file exists). The confidence label stays on the page. Then/Now changes the model’s opacity in the page. The on-screen instruction is to place the reconstruction on a detected surface.

v1 does not align the model to the real ruin, track an image, or use the device’s location. Those modes are reserved for a later version. A reconstruction is never labelled as fact. Visitors see Well supported, Likely, or Uncertain.
