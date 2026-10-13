# ANVAYA — Cursor build brief for the working platform

> Save as `CLAUDE.md` at the repo root. Cursor Agent reads it as project rules. Tasks are in §10; send one per Agent run and commit after each. This brief supersedes the prototype brief (`ANVAYA-CURSOR.md`): same visual language and rules, now with a real backend, auth, storage, and a deployable visitor PWA.

---

## 0. Cursor setup (do once, before T0)

Add these MCP servers in Cursor → Settings → MCP (`~/.cursor/mcp.json`). The agent must use them; the tasks say when.

```json
{
  "mcpServers": {
    "figma": { "url": "http://127.0.0.1:3845/mcp" },
    "supabase": { "command": "npx", "args": ["-y", "@supabase/mcp-server-supabase@latest", "--project-ref=<PROJECT_REF>"], "env": { "SUPABASE_ACCESS_TOKEN": "<token>" } },
    "context7": { "command": "npx", "args": ["-y", "@upstash/context7-mcp"] },
    "playwright": { "command": "npx", "args": ["-y", "@playwright/mcp@latest"] }
  }
}
```

- **figma** — Figma's Dev Mode MCP server. Enable it in the Figma desktop app (Preferences → Enable Dev Mode MCP Server), keep the ANVAYA file open, select a frame, and the agent can call `get_design_context` / `get_screenshot` / `get_variable_defs` for the selected node or a pasted node URL. This is how the agent reads your 14 screens and your token variables directly; no PNG exports needed.
- **supabase** — lets the agent create tables, run migrations, inspect RLS and read logs. Create the project first at supabase.com (free tier is fine).
- **context7** — current docs for Next.js, Supabase, framer-motion, model-viewer, so it doesn't hallucinate APIs.
- **playwright** — the agent opens the running app, takes screenshots and compares them with Figma. Required for the "match the design" loop.

No Cursor "skills" are needed. Rules live in this file; a `.cursor/rules/` folder is optional. Keep Cursor on a Claude model for Agent runs.

---

## 1. What we are building

ANVAYA is a heritage AR authoring platform (M.Des thesis, IIT Hyderabad). Two surfaces, one codebase:

- **Studio** — `app.anvaya.site` — desktop web app where a site team documents a heritage site, links evidence to reconstructed elements, rates element-level confidence, runs expert review, publishes versions, and keeps an archive.
- **Visitor** — `anvaya.site/<site-slug>` — mobile PWA opened by scanning a QR at the site: AR reconstruction with a visible confidence label, "How do we know?", stories, Then/Now, about + feedback. Works signed-out.

Non-negotiables (enforced in the database and the API, not only the UI):
1. Every reconstructed element has a confidence level, always visible to visitors.
2. **High confidence requires ≥1 linked source** (DB trigger refuses the write).
3. A creator cannot approve their own review; only an Owner/Admin can publish (RLS + policy functions).
4. Publishing writes an immutable version snapshot; the visitor app reads snapshots only.
5. Reconstruction is never labelled as fact. Visitor wording: Well supported / Likely / Uncertain.
6. No invented historical content: seed data is explicitly placeholder (Kanheri Caves, Cave 3, c. 200 CE).

## 2. Stack (fixed)

| Layer | Choice |
|---|---|
| App | Next.js 15 (App Router, TypeScript), one repo, two route groups `(studio)` and `(visitor)` |
| UI | Tailwind 3 + CSS variables, framer-motion, lucide-react, Radix primitives (dialog, popover, tooltip, slider, toggle) |
| 3D / AR | `@google/model-viewer` for visitor AR (Scene Viewer on Android, Quick Look on iOS via USDZ, WebXR where available); `@react-three/fiber` + drei for the Studio scene builder and in-page previews |
| Data | Supabase: Postgres, Auth (email magic link + Google), Storage, Realtime for review comments, Edge Functions for snapshot/publish and USDZ conversion hooks |
| Data layer | Drizzle ORM + generated types; server actions for mutations; `@tanstack/react-query` on the client |
| Validation | zod schemas shared by forms, server actions and edge functions |
| QR | `qrcode` (server-rendered SVG/PNG) |
| Tests | vitest (rules), Playwright (demo script in §12) |
| Deploy | Vercel (two domains → same app), Supabase cloud |

Dev loop for every task: `pnpm dev` runs clean · `pnpm typecheck` · `pnpm test` · `pnpm lint` · `git commit -m "<task>: <summary>"`.

## 3. Visual language — Bio Sites editor (Figma is the source of truth)

Read tokens from Figma variables via the figma MCP (`get_variable_defs`) and generate `src/styles/tokens.css`. If a variable is missing, use these:

| Token | Light | Dark |
|---|---|---|
| page / surface / surface-2 | #F6F6F4 / #FFFFFF / #F0EFEC | #1C1C1C / #262626 / #2F2F2F |
| border | #E6E4DF | #353535 |
| text-1 / 2 / 3 | #111111 / #6B6B6B / #9A9A9A | #F5F5F5 / #A0A0A0 / #6F6F6F |
| primary / on-primary | #000000 / #FFFFFF | #FFFFFF / #000000 |
| accent / accent-bg | #4A5A2A / #EEF1E6 | #8FA05A / #2A3120 |
| conf-high / bg | #2E7D4F / #E6F4EC | #2E7D4F / #1F3A2B |
| conf-medium / bg | #B7791F / #FBF1DC | #B7791F / #3A2E14 |
| conf-low / bg | #C0392B / #FBE5E1 | #C0392B / #3F1F1B |
| review / bg | #2F5FD1 / #E7EDFB | #2F5FD1 / #1E2A47 |
| shadow-card / float | 0 8 32 rgba(0,0,0,.06) / 0 16 48 rgba(0,0,0,.12) | .40 / .60 |

Type: Inter (Display 40/48 300 · H1 32/40 · H2 24/32 500 · H3 18/26 500 · Body 15/24 · Small 13/20 · Label 11/16 500 uppercase .08em). Playfair Display only for visitor site titles. Radii: card 12 · button 8 · pill 999 · sheet 32 · phone 32. Gradient blobs only on dashboard "Create" card, empty states, publish success.

Layout: floating 72px rail (24px inset, radius 40); in-site top bar with site switcher, nine step pills (Overview → Archive), black Update button; body 50/50 content column (max 600) / preview panel with phone frame rendering the live visitor app in-tree. Below 1100px rail docks to bottom, preview hides. Visitor: dark default, glass pills, draggable bottom sheet, 52px buttons, safe-area insets.

### Micro-interactions (framer-motion, spring 400/30, all off under `prefers-reduced-motion`)
1 card hover lift · 2 selected pill/tab background slides via shared `layoutId` · 3 button press scale .98 · 4 toggle/segmented spring · 5 preview phone cross-fade + "Updated" glass toast on data change · 6 modal scale .96→1, step progress animates · 7 confidence chip pulses 1.06 on successful change · 8 toast pill from bottom · 9 visitor sheet `drag="y"` with snap points · 10 Then/Now slider drives mesh opacity live · 11 route transition fade/slide 8px · 12 theme 200ms colour transition · 13 skeleton shimmer while data loads · 14 optimistic updates with rollback toast on error.

## 4. Components

Build `src/components/ui`, `studio`, `visitor`, `three` first. Names match the Figma components; the agent must `get_design_context` for the "Components" page before writing them.

**ui/** Button · Chip.Confidence (level × audience, glass) · Chip.Status · Chip.Neutral · Pill · Field (input/textarea/select; card/flat) · Card · Row · IconTile · Toggle · Segmented · Avatar · ConfidenceBar · ProgressBar · Notice · Modal · TileOption · Toast · Tooltip · Skeleton · EmptyState (with blobs).
**studio/** Rail (+account menu) · Topbar · StepTabs · PreviewPanel · PhoneFrame · MapCard/MapPin · TreeNode · EvidenceCard · FloatingToolbar · VersionCard · DiffList · CommentThread · UploadDropzone (Storage) · MemberRow.
**visitor/** GlassButton · TopNav · ThenNowSlider · Sheet · VButton · VRow · ActionGrid · VCard · FactRow · SourceRow · AltReading · FooterNote · Rating · StoryPlayer · OfflineBanner.
**three/** SceneBuilder (R3F: loads element GLBs from Storage, orbit, pick, confidence tint, dashed edges, Then/Now opacity, gizmo move/rotate/scale, anchor points) · ModelViewerAR (wraps `<model-viewer>` with `ar`, `ar-modes="webxr scene-viewer quick-look"`, `ios-src` USDZ, confidence overlay).

## 5. Database (Supabase / Postgres) — `supabase/migrations`

```sql
-- identities
profiles(id uuid pk → auth.users, name, initials, title, avatar_url, created_at)
organisations(id, name, slug)
org_members(org_id, user_id, role org_role check in ('owner','admin','creator','reviewer','viewer'), pk(org_id,user_id))

-- site content (working copy)
sites(id, org_id, slug unique, name, location, site_type, description, status site_status default 'draft', reconstruction_year int, require_review bool default true,
      settings jsonb default '{"requireSourceForHigh":true,"warnNoEvidence":true,"showAssumptions":true,"showAlternatives":true,"collectFeedback":true}',
      managed_by, licence, current_version_id uuid null, created_by, created_at, updated_at)
periods(id, site_id, name, year_from int, year_to int, sort)
events(id, site_id, period_id, title, year int, approx bool, kind, description, element_ids uuid[])
locations(id, site_id, name, plan_x float, plan_y float, primary_element_id uuid null, qr_code text unique)
elements(id, site_id, parent_id null, name, kind check in ('group','structure','architectural','object'), confidence confidence_level default 'low',
         rationale text, assumptions text[] default '{}', visible bool default true, model_asset_id uuid null, transform jsonb, plan_x, plan_y, sort)
evidence(id, site_id, kind evidence_kind, title, citation, date_label, strength confidence_level, note, asset_id uuid null, url text null, added_by, created_at)
element_evidence(element_id, evidence_id, pk(element_id,evidence_id))
questions(id, site_id, element_id null, question, context, status check in ('open','resolved'), level confidence_level, raised_by, created_at, resolved_at)
interpretations(id, site_id, element_id, label, summary, confidence confidence_level, selected bool, evidence_ids uuid[])
comments(id, site_id, target_type check in ('element','story','review_item'), target_id, author, body, parent_id null, resolved bool default false, created_at)
stories(id, site_id, title, category, summary, status check in ('draft','in_review','approved','published'), duration_s int, sort)
story_steps(id, story_id, title, location_id, body, audio_asset_id null, audio_duration_s, element_id null, source_ids uuid[], trigger check in ('arrival','tap','scan'), sort)
assets(id, site_id, kind check in ('photo','model','usdz','document','audio','drawing'), storage_path, filename, bytes, mime, width, height, caption, taken_on, uploaded_by, created_at)
condition(site_id pk, state check in ('good','fair','poor'), notes, surveyed_at, survival jsonb)
measurements(id, site_id, element_id, dimension, value, unit, method)

-- workflow
reviews(id, site_id, status check in ('open','changes_requested','approved','withdrawn'), submitted_by, submitted_at, decided_by null, decided_at null, content_sig text null)
review_items(id, review_id, target_type check in ('element','story'), target_id, status check in ('waiting','approved','changes'))
versions(id, site_id, number text, note, published_by, published_at, snapshot jsonb, checksum text, unique(site_id, number))

-- visitor
analytics_events(id bigserial, site_id, version_id, type, element_id null, location_id null, session_id, payload jsonb, at)
feedback(id, site_id, version_id, understand smallint, trust smallint, comment, page, session_id, at)
```

Enums: `confidence_level ('high','medium','low')`, `evidence_kind ('physical','archaeological','historical','comparative','visual','scholarly')`, `site_status ('draft','in_review','published','archived')`.

**Triggers / functions (SQL, tested):**
- `enforce_high_needs_evidence()` BEFORE UPDATE OF confidence ON elements: raise `'HIGH_NEEDS_EVIDENCE'` when new.confidence='high', site setting on, and no row in element_evidence. Also on DELETE of element_evidence: if it was the last link and the element is high → downgrade to medium and insert a question "Evidence removed — confidence re-rated".
- `content_sig(site_id)` → md5 of elements(name, confidence, visible, sorted evidence ids) + stories(id, status, step count).
- `snapshot_site(site_id)` → the visitor JSON (site, periods, events, locations, elements with resolved evidence + interpretations, published stories, settings, counts). Called by `publish_site(site_id, number, note)` which checks `can_publish` and inserts into versions (immutable: no UPDATE/DELETE policies on versions).
- `can_approve(review_id)`: caller role in (reviewer, admin, owner) AND caller ≠ submitted_by. `can_publish(site_id)`: caller role in (admin, owner) AND latest review approved AND `content_sig = reviews.content_sig` AND (require_review = false OR …).
- `diff_versions(a, b)` → jsonb list (added, removed, confidence_changed from→to, source_added, story_published).

**Row-level security:** org members read their org's sites; creators write content tables for their org; reviewers write reviews/review_items/comments only; admins/owners everything. `versions`, `analytics_events`, `feedback` are readable anonymously by `site_id` where `sites.status = 'published'` (and `versions.published_at is not null`); anonymous may INSERT analytics_events and feedback only. Storage buckets: `assets` (private, signed URLs) and `published` (public: GLB/USDZ/images referenced by snapshots, copied at publish time by an edge function so visitors never hit working-copy files).

## 6. API / server actions (`src/server`)

`sites.*` (create, update, listForOrg) · `elements.*` (create → low, update, setConfidence → surfaces `HIGH_NEEDS_EVIDENCE` as a typed error the UI shows inline, reorder, setVisible) · `evidence.*` (create with optional upload, link, unlink) · `questions.*` · `interpretations.select` · `comments.*` (Realtime channel per site) · `stories.*` · `reviews.submit/requestChanges/approve/withdraw/resubmit/resolveComment` · `publish(siteId, number, note)` → edge function: copy assets to `published`, generate USDZ if missing (hook; stub acceptable in v1), call `publish_site`, render QR PNGs per location into `published/qr/` · `versions.list/compare/download` (zip of snapshot + assets manifest) · `visitor.getSnapshot(slug, version?)` (public, cached, ISR 60s) · `visitor.logEvent/feedback`.

All inputs validated with zod; all mutations return `{ok, error?}` with error codes the UI maps to copy.

## 7. Routes

**Studio (`app.anvaya.site`)** `/login` · `/` dashboard · `/sites` · `/sites/new` (3-step wizard: name & location → type & period → invite members) · `/s/[slug]/{overview,document,evidence,timeline,reconstruct,stories,review,publish,archive}` · `/assets` · `/review-queue` · `/archive` · `/analytics` · `/settings/{profile,members,site,export}`.

**Visitor (`anvaya.site`)** `/[slug]` landing (logs scan; `?l=L2` deep link from per-location QR) · `/[slug]/plan` · `/[slug]/l/[loc]` · `/[slug]/ar/[el]` · `/[slug]/hdwk/[el]` · `/[slug]/sources/[el]` · `/[slug]/stories` · `/[slug]/story/[id]/[step]` · `/[slug]/timeline` · `/[slug]/compare/[el]` · `/[slug]/about` · `?v=1.1` any version · `?preview=<signed token>` working copy for logged-in team (watermarked).

PWA: `manifest.json`, service worker caching the snapshot + published assets of the last opened site, offline banner, install prompt only after the first AR session.

## 8. AR strategy (be honest in UI copy)

v1 ships **model-viewer AR**: tap "Start AR" → the element's published GLB (USDZ on iOS) opens in Scene Viewer / Quick Look placed on a detected surface, with the confidence label baked into the visitor page before and after. Inside the web page, the R3F preview supports drag-to-look and Then/Now. On-site alignment to the real ruin (marker/image tracking) is **v2**: keep an `anchors` field on elements and an `alignment_mode` setting (`'placed' | 'image-target' | 'geo'`), default `placed`. Never claim alignment the system doesn't do.

## 9. Figma → code workflow (every screen task)

1. Select the frame in Figma (or paste its node URL). Call `figma.get_design_context` and `figma.get_screenshot`.
2. Compose the screen only from §4 components; fetch component designs from the Components page when a variant is unclear.
3. Wire data via react-query hooks + server actions; loading = Skeleton, empty = EmptyState, error = Notice.
4. Run the app, `playwright.browser_navigate` to the route, `browser_take_screenshot`, compare with the Figma screenshot, fix spacing/type until they match at 1440 (studio) or 390 (visitor).
5. Typecheck, tests, commit.

The 14 reference frames: S01 Dashboard · S02 My sites · S03 Overview · S04 Evidence · S05 Reconstruct · S06 Review (creator) · S07 Review queue · S08 Publish · S09 Published+QR · S10 Archive compare · V01 Landing · V02 AR · V03 How do we know? · V04 Compare. Screens without a frame follow the nearest one's patterns.

## 10. Tasks (one Agent run each; commit after each)

**T0 — Scaffold.** Read CLAUDE.md fully. Create the Next.js 15 app with the §2 stack, pnpm, strict TS, Tailwind with tokens from `figma.get_variable_defs` (fallback §3), `src/styles/tokens.css` light/dark, Drizzle config, Supabase client (server + browser), zod, react-query provider, framer-motion, Radix. Add `/kitchen-sink` with placeholders. Scripts: dev, typecheck, test, lint, db:migrate, db:seed. Commit "T0: scaffold".

**T1 — Database.** Using the supabase MCP, write and apply migrations for §5 (tables, enums, indexes, triggers, functions, RLS, storage buckets). Write `supabase/seed.sql` with the Kanheri placeholder content (§11), including one approved review and a published version 1.0 whose snapshot is produced by `snapshot_site`. Add pgTAP or vitest-with-pg tests for `enforce_high_needs_evidence`, `can_approve`, `can_publish`, `diff_versions`. Generate Drizzle schema + types. Commit.

**T2 — Auth & orgs.** Magic-link + Google auth, `/login`, profile creation on first sign-in, organisation + membership bootstrap, role helper `useRole()`, route protection (studio requires session; visitor never does). Settings → Members page with invites by email and role select. Commit.

**T3 — UI primitives.** All `ui/*` from §4 to match the Figma Components page (figma MCP), with interactions 1, 3, 4, 8, 13. Storybook-free: extend `/kitchen-sink` to show every variant light/dark. Commit.

**T4 — Studio shell.** Rail with account menu (profile, theme, org switch, sign out), Topbar + StepTabs (2), PreviewPanel + PhoneFrame rendering the visitor route tree in-page with a signed preview token (5), route transitions (11), responsive docking. Commit.

**T5 — S01 Dashboard + S02 My sites + New-site wizard.** Real data: attention list computed server-side (`attention(site_id)` view), progress %, recent activity from an `activity` view over versions/reviews/evidence/comments. Commit.

**T6 — S03 Overview + Document + Timeline.** Document: condition form, survival dots, photo/3D upload to Storage with dropzone + progress, drawings & measurements table, metadata form. Timeline: periods/events CRUD with an SVG timeline. Commit.

**T7 — S04 Evidence.** Sources list with filters, EvidenceCard, Add-evidence modal (3 steps, upload or URL, link elements, strength), link/unlink, Open questions CRUD, Interpretations (select → sets confidence through the same rule), Confidence tab with rules toggles, map preview. Commit.

**T8 — S05 Reconstruct.** SceneBuilder: load existing-remains model + element GLBs from Storage (signed URLs), element tree, pick/select, transform gizmo persisting `transform`, confidence tint + dashed edges, Then/Now, colours toggle, inspector with the `HIGH_NEEDS_EVIDENCE` inline notice (7), assumptions, visibility, Add-element (upload GLB or primitive placeholder). Commit.

**T9 — Stories.** Library + builder (steps, locations on plan, text, audio upload, linked element, sources), status flow draft → in_review → approved → published. Commit.

**T10 — S06 Review + S07 Review queue.** Submit (items from `diff_versions(current, working)`), reviewer queue with Realtime comments, request changes / approve gated by `can_approve`, resolve/resubmit, checklist. Email notification via Supabase edge function + Resend (stub provider in dev). Commit.

**T11 — S08 Publish + S09 Success + S10 Archive.** Publish readiness (hard/soft checks from `can_publish`), version number + note, edge-function publish (asset copy, QR PNGs per location + site, snapshot), success screen with downloadable QR sheet (PDF of all location codes), Archive spine, compare with two SceneBuilders in read-only mode + DiffList, "Download package" zip. Commit.

**T12 — Visitor app.** All routes in §7 from snapshots: V01–V04 matched to Figma, ModelViewerAR with GLB/USDZ, fallback R3F view, sheet drag (9), slider (10), stories with audio playback, compare split, about + feedback, analytics logging (not in PhoneFrame), PWA + offline. Commit.

**T13 — Analytics + Settings + Assets + exports.** Analytics from `analytics_events`/`feedback` with SQL views; Settings (site rules, members, export JSON-LD + zip per version); Assets library. Commit.

**T14 — Polish & hardening.** Verify interactions 1–14; dark-mode audit; reduced motion; a11y (labels, focus trap, slider is a real range input, confidence never colour-only); error states (camera denied, WebGL missing, offline); rate-limit anonymous inserts; Playwright demo script (§12) green; Lighthouse PWA ≥ 90 on the visitor landing. Commit "T14: release candidate".

Prefix for every screen task: *"Select the frame in Figma / use node URL <…>; call figma get_design_context and get_screenshot; match it exactly using only §4 components; then verify with playwright screenshots at 1440 (studio) or 390 (visitor)."*

## 11. Seed content (placeholder — labelled as such in the UI)

People: A. Iyer (creator, conservation architect) · R. Mehta (reviewer, archaeologist) · S. Rao (admin, trust director). Site: Kanheri Caves, Mumbai, rock-cut Buddhist caves, year 200, published. Elements: group Cave 3 → North wall (high), Entrance (high, assumption "Door leaves were timber, now lost"), Roof (medium, rationale "Roof form inferred from surviving beam sockets and comparison with Cave 3 at Karla. No direct evidence of the ridge height.", assumptions "Ridge height estimated at 4.2 m", "Timber species unknown"), Decorative frieze (low); Water cistern (low, no evidence). Evidence: Beam socket survey 2026 (physical, high) · Fergusson & Burgess 1880 pl. 12 (historical, medium) · Cave 3 at Karla roof profile (comparative, medium) · Site photograph 1962 (visual, high) · Nagaraju 1981 (scholarly, low); links roof↔1,2,3 · north wall↔1,2,4 · entrance↔1,2,4 · frieze↔4. Questions: roof form (low), entrance height (medium, by reviewer), cisterns roofed (medium). Interpretations (roof): pitched timber ridge ~4.2 m (medium, selected) · flat timber on brackets (low). Locations L1 Entrance (QR) · L2 Cave 3 · L3 Cave 3 interior · L4 Water cistern · L5 Viewpoint path. Story "Daily life at Kanheri", 5 steps, neutral placeholder text. Placeholder GLBs: procedurally exported primitives committed under `public/seed-models/` (existing remains, roof prism, lintel, frieze band, cistern cover) so the Studio scene and AR work before any real capture exists.

## 12. Definition of done (Playwright script `e2e/demo.spec.ts`)

1. Sign in as A. Iyer → Reconstruct → Water cistern → High → inline notice, DB unchanged.
2. Add evidence via modal → High succeeds (chip pulses) → set Medium.
3. Review → Submit → status In review.
4. Sign in as R. Mehta → queue → Request changes (comment) → A. Iyer replies, resolves, resubmits → R. Mehta approves.
5. Sign in as S. Rao → Publish 1.1 → success screen with QR; `versions` has an immutable row; `published` bucket has assets.
6. Archive → compare 1.0 ↔ 1.1 → diff shows cistern Low → Medium and the new source.
7. Signed-out phone viewport → `/kanheri?l=L2` → location → AR page shows "Likely" and the model-viewer AR button → How do we know? lists evidence and assumptions → About → feedback saved → visible in Analytics.
8. Offline reload of the visitor landing works from the service worker.

## 13. Out of scope for v1

Image-target / geo alignment, multi-language audio, payments, public site directory, Figma design-token sync automation (tokens are read once in T0).
