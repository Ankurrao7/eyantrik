# eYantrik — Project Brain

> Single source of truth for **what we're building, why, and how it flows**.
> Update this file whenever a decision is made, a feature ships, or the flow changes.
> Last updated: **2026-10-07** (quotation & negotiation release)

---

## 1. Vision & goal

**eYantrik** is a B2B manufacturing marketplace for India: buyers (OEMs, auto-component makers, startups) find **verified** job shops / manufacturers and deal with them directly. Where buyers want one accountable partner, the **eYantrik help desk** steps in as seller (make in-house / broker) or as buyer (source for a seller).

**Phase 1 goal (now): grow users & make them dependent on the platform** — everything free, easy features, friendly UI. No profit motive yet. Monetisation (subscriptions, featured listings, lead credits) comes in Phase 2 once there is traffic.

**North-star metrics (Phase 1):** sign-ups (buyers / sellers), verified sellers, RFQs posted, quotes submitted, contacts made, deals reported, repeat buyers.

---

## 2. Roles — kept strictly separate

| Role | Sees | Never sees |
|---|---|---|
| **Visitor** | Home, supplier directory (contacts blurred), Post Requirement form, Help desk | Contacts, leads |
| **Buyer** | Find Suppliers, Post Requirement, Buyer Dashboard, Help desk | Seller lead feed |
| **Seller** | Lead Feed / Seller Dashboard, Help desk | Post Requirement, buyer tools |
| **Admin** (eYantrik team) | Admin console, supplier directory | — |

- **Separate buyer and seller accounts** (separate verification, reputation and data). One mobile/email may own **one buyer account AND one seller account**, never two of the same role (decision 2026-10-09; unique indexes `{role, phone}`, `{role, email}`). Buyer and seller areas never mix.

### 2.1 Authentication & access control (decision 2026-10-07)
**Three separate login portals — each accepts only its own role:**

| Portal | URL | Accepts | Session cookie |
|---|---|---|---|
| Buyer | `/login/buyer` (login + sign-up) | BUYER | `ey_buyer` · path `/` · 7 days · HttpOnly · SameSite=Lax |
| Seller | `/login/seller` (login + sign-up) | SELLER | `ey_seller` · path `/` · 7 days · HttpOnly · SameSite=Lax |
| Admin | `/admin/login` (not linked anywhere) | ADMIN | `ey_admin` · path `/admin` only · 8 h · HttpOnly · SameSite=Strict |

- `/login` is only a chooser (Buyer / Seller). No demo accounts are shown on any screen.
- **Login ID** = email or mobile + password. Passwords stored as **PBKDF2-SHA256** hashes (`src/lib/server/password.ts`); rule: 8–64 chars with a letter and a number.
- **Wrong portal:** seller credentials on the buyer portal (or vice versa) → "This is a seller account. Please use the Seller login." — no session is created. The admin portal never reveals non-admin accounts ("Invalid admin credentials"), and admin credentials on buyer/seller portals look like a normal failure.
- **Lockout:** 5 wrong passwords per portal + ID → 15-minute lock. Unknown IDs get the same message and timing as wrong passwords.
- **Sessions:** one cookie per role, so a buyer tab, a seller tab and an admin tab work side by side in one browser. New random session id on every login (no fixation); server-side expiry; a session can never cross roles (session doc stores `role`).
- **Which identity a request uses** (`identityFor` in auth.ts) — the URL decides: `/buyer…` & `/rfq/new` → buyer · `/seller…` → seller · `/admin…` → admin · `/api/…?as=BUYER|SELLER` → that side · shared pages (home, directory, help) → side used last (`ey_active` cookie). `locals.user` = this request's identity; `locals.sessions` = everyone signed in.
- **Per-tab side (2026-10-12):** cookies are shared by all tabs, so shared pages (home, directory, help) can't tell tabs apart on the server. Each tab remembers its own side in `sessionStorage` (`src/lib/tabSide.svelte.ts`); the header, bell, pop-ups, logout and homepage CTA use that tab's side (`+layout.svelte` → `me`). Server sends every signed-in side (`data.sides`). A brand-new tab starts on the side used last and offers "Switch to …". Verified in a real multi-tab Edge session (Playwright, 10/10).
- **Signed in as both:** header shows "Switch to buyer/seller"; Log out signs out only the current side; signing up for the other side pre-fills name/company/phone/email; buyer portal tells a seller-only person "no buyer account yet" (only after the right password).
- **Notifications** are per side: `/buyer/notifications`, `/seller/notifications` (old `/notifications` forwards); pop-ups poll `/api/notifications?as=<role>`.
- **Phone fields** use `PhoneInput.svelte` (🇮🇳 +91 dropdown; only India for now). Valid = 10 digits starting 6/7/8/9 (70…, 71… included); server re-checks with `phoneFromForm()` / `PHONE_ERROR` in auth.ts.
- **Authorization** is central in `src/hooks.server.ts` using `rolesFor()` in `auth.ts`:
  - `/buyer/*` → BUYER · `/seller/*` → SELLER · `/admin/*` → ADMIN (except `/admin/login`) · `/notifications`, `/api/notifications`, `/api/contact-log` → BUYER or SELLER · `/rfq/new` public but **closed to sellers**.
  - Not logged in → that role's portal (pages) / 401 (API, form posts).
  - Wrong role → `/denied` page (pages) / 403 (API, form posts).
  - Every protected load/action also calls `requireUser()` (defense in depth) → 403 on wrong role.
  - **Never remove the `/buyer` and `/seller` lines in `rolesFor()`**, and never log the `user` object (it contains the password hash) — log `user?.id` / `user?.role` only.
- Admin session works only inside `/admin`; admin sees no bell/pop-ups (notifications are for buyers & sellers).
- Team-added sellers: admin sets the owner's **login email + temporary password** when adding the factory.
- Phase 2: OTP / 2FA, password reset by email/SMS, "change temporary password on first login", HTTPS-only (`secure`) cookies.

### 2.2 Accounts
The platform starts **empty** — there are no built-in accounts. Create the first admin at **`/admin/setup`** (open only while no admin exists; linked from `/admin/login` until then). Buyers and sellers sign up on their portal; the admin can also add ground-verified sellers.

---

## 3. Core flow (current)

```
VISITOR ── browse directory ──┐
        └─ post requirement ──┤ (draft kept through login)
                              ▼
                    LOGIN (ID + password)
                 ┌────────────┴────────────┐
              BUYER                      SELLER
  post RFQ → matched sellers      register factory (rules) → docs review
  contacts unlock after 1st RFQ   → DOCS_VERIFIED (listed, gets leads)
  call / WhatsApp (logged)        → GROUND_VERIFIED (field visit)
  feedback, close / reopen        lead feed: matched RFQs + buyer contact
  "Need assistance" → help desk   NDA accept → drawings
                 └────────────┬────────────┘
                 SELF-MANAGED  or  CONCIERGE (help desk → admin job costing)
```

### Contact & visibility rules
- Buyer sees seller phone/WhatsApp **only after posting ≥1 requirement**.
- Seller sees buyer identity/phone **only once documents are verified**.
- Unverified (DOCS_SUBMITTED) sellers are hidden from the directory; they see lead *counts* as motivation.
- If RFQ has **NDA required**, drawing file names are hidden until a verified seller clicks *Accept NDA*.
- Every call/WhatsApp tap is logged (`/api/contact-log`) — proof of lead value for Phase 2 pricing.

### Seller verification ladder
`DOCS_SUBMITTED` → (admin approves docs) → `DOCS_VERIFIED` (listed, receives leads) → (field inspection recorded, "machines match" confirmed) → `GROUND_VERIFIED`. `REJECTED` with reason → seller can resubmit.
- **Self-register rules:** valid GSTIN whose state code matches factory state; one GSTIN = one listing; GST certificate + shop-floor photos required; machine list required; declaration accepting field inspection.
- **Team "Add seller"** (admin): created directly as GROUND_VERIFIED after a site visit; a login is created on the owner's mobile.

---

## 4. RFQ form (aligned with the E-Yantrik "Create New RFQ" form)

Defined once in `src/lib/rfqFields.ts` (form UI, server validation and display are generated from it).

| Section | Fields |
|---|---|
| Part | Part name* (≥3), Description, Industry*, Budget range*, **What kind of work is it?*** (13 shop cards with example parts; stored as `commodityCategory`), Material type*, Material* (grade suggestions by family), **Which process? (optional)** (process picker filtered by the chosen shop, search, "part needs other types of work too"), Prototype or batch*, Quantity* |
| Specifications | Bounding L×W×H (mm), Tolerance (mm), Tolerance notes, Surface finish, Quality requirements |
| Delivery | Delivery timeline*, Pincode*, City*, State* |
| Drawings | Require NDA (checkbox), Drawings (multi-file, 20 MB each, max 10) — optional in Phase 1 |

**Deliberate differences from the reference form:** commodity category = *primary* category (multi-process parts allowed); extra low budget bands (<₹50k, ₹50k–2L, ₹2–10L, Not sure); pincode instead of free-text location (needed for distance); drawings optional (traffic goal); "Prototype or batch?" added.

**Process list (decision 2026-10-12, Option B — built):** `src/lib/processes.ts` = **13 shops → 33 groups → 143 processes**, curated for Indian job shops from the Manufacturing Network research (`docs/research/manufacturing-network-processes.md`). Must be easy for engineers AND non-engineers:
- Shops use buyer language: Machine shop · Cutting & profiling · Sheet metal & press shop · Forging & forming · Foundry · Plastics, rubber & fibreglass · **Tool room** (India strength) · Welding & fabrication · Heat treatment · Surface finishing & coating · Inspection & testing · Assembly & electronics · 3D printing & prototypes.
- Every shop has an emoji + example parts; every process has an everyday name, a one-line plain `hint`, and `aka` shop-floor words for search (VMC, wire cut, CO2 welding, bakelite, lost wax…). `searchProcesses()` ranks exact names first.
- **Excluded on purpose:** size/material/machine variants (Large turning, ferrous vs non-ferrous, CNC vs manual → future seller capability fields), "coded welding" duplicates (→ certification badge), lab/rare tech (LIGA, laser peening, HIP…), printing-industry processes, rare plating (cadmium/rhodium → "other plating").
- Buyers: choose a shop (required); exact process optional. Process list stays hidden until a shop is chosen. Sellers: collapsible shops with a count, search, removable chips (`ProcessPicker.svelte`, `WorkTypePicker.svelte`).
- Old 23 ids → new via `LEGACY_PROCESS_MAP` / `LEGACY_SHOP_MAP`; `normalizeProcesses()` converts at read time; `npm run db:migrate` converted stored sellers (S-1001: CNC_MACHINING, PRESS_STAMPING, SAND_CASTING → VMC, HMC, Blanking, Progressive stamping, Sand casting).
- **Next (not built):** seller capability fields — max part size/weight, sheet thickness, press/machine tonnage, tolerance, batch sweet spot, certifications (ISO 9001, IATF 16949, AS9100, NABL, IBR/ASME IX welders), in-house vs outsourced; combination search ("does ALL of these"); one description page per process.

**Shared taxonomy** (`src/lib/taxonomy.ts`): processes, commodity categories (→ processes), material families (→ grade examples), industries, budget bands (ranked), delivery timelines. **Sellers are tagged with the same ids** (processes, material families, industries) so filtering compares like with like.

---

## 5. Matching & ranking (current)

**Nearby first (decision 2026-10-07).** Suppliers and leads are ordered by **pincode zone ascending, then km**:

| Zone | Meaning |
|---|---|
| 0 | Same pincode area (≤10 km) |
| 1 | Same district — first 3 pincode digits (or ≤50 km) |
| 2 | Same region — first 2 digits (or ≤250 km) |
| 3 | Same postal zone — first digit (or ≤800 km) |
| 4 | Rest of India |

The nearer of pincode hierarchy and km band wins (`nearZone` in `src/lib/geo.ts`) — needed because NCR neighbours sit in different postal zones (Noida 201xxx vs Gurugram 122xxx, ~40 km).

- **Match rule** (`scoreMatch`, `src/lib/server/matching.ts`): seller must cover ≥1 required process (picked processes, or the whole shop if none picked). Shop-only requirements score "works in this shop" once (a seller who ticked 20 boxes doesn't out-rank a specialist); picked processes score per process covered. Screens show the picked processes, or "Any · <shop>" + what this seller does in it (`processesForSeller`). Relevance score (process coverage, nearness, material family, industry, ground verified, rating) only breaks ties within the same zone.
- **Quotes on the buyer's RFQ are ordered by landed price ascending** (default), with sort options Nearest / Fastest / Best rated.
- Distance = straight-line km from pincodes (demo lookup; production → India Post pincode dataset).

---

## 6. Quotation & negotiation (BUILT 2026-10-07)

### 6.1 Decisions (from user, 2026-10-07)
1. Sellers **may quote outside their listed processes** — the buyer sees it flagged plus "things to consider" prompts.
2. Sellers see only the **number of quotes** on an RFQ, never others' prices.
3. Buyers set a **quote deadline** when posting ("Quotes close in" 3 / 7 / 14 / 30 days, default 7). Negotiation can continue after it.
4. **Unverified sellers can only mark Interested**; quoting and buyer contacts unlock after document verification.
5. Ranking: **nearby first by pincode zone**, then quotes compared **by price**.

### 6.2 End-to-end flow
```
Buyer posts RFQ ──► notify every matching VERIFIED seller (NEW_LEAD)
                    + teaser to matching sellers under review
Seller lead feed ──► 👋 Interested (buyer notified)  /  Not for us (reason)
                 └─► Submit quotation (verified only, before deadline)
Buyer RFQ page  ──► quotes compared by landed ₹/pc (+ things to consider)
                 ├─► ⭐ Shortlist (seller notified)
                 ├─► 🤝 Counter-offer: target price / lead time / payment terms + message
                 │     (max 3 rounds; one pending at a time)
                 │     Seller: Accept terms (→ new version) / Revise (→ new version) / Decline
                 ├─► Decline (optional reason, seller notified)
                 └─► 🏆 Award → RFQ closed (DEAL_DONE); winner notified;
                       all other live quotes → "Not selected" + notified
Closing an RFQ without award also releases live quotes ("Not selected").
Reopen gives a fresh 7-day window (not allowed after an award).
```

### 6.3 Quotation form (seller) — `src/routes/seller/rfq/[id]`
Unit price*, quantity*, up to 2 price breaks, one-time tooling (+ "buyer owns tool"), setup/NRE, samples, GST* (0/5/12/18/28), freight* (ex-works / delivered + cost), price includes* (material, machining, finishing, inspection, packaging, PPAP/CMM reports), sample days*, bulk days*, monthly capacity, payment terms* (100% adv … 60 days credit, incl. MSME 45 days), valid till*, **process route** (in-house / outsourced per process), notes. Sticky live preview: **"Buyer will see ₹X/pc landed"**.
- **Landed / pc** = (unit × qty + tooling + setup + samples + freight-if-delivered) ÷ qty, before GST (`src/lib/quote.ts`, used by both sides so numbers always agree).
- Every submit / revision / accepted counter creates a **new version** (v1, v2 …); full history kept.

### 6.4 "Things to consider" (buyer prompts per quote) — `buyerInsights()` in `src/lib/server/quotes.ts`
Lowest price / fastest delivery · >25% below median (verify grade, tolerance, inclusions) · >30% above median · outside listed capability · outsourced steps · ex-works (freight extra) · far (>500 km) / nearby (≤50 km) · bulk delivery later than buyer's timeline · tooling not owned by buyer / owned · quality required but inspection not included · 100% advance · quote expiring · not ground verified · no reviews yet / highly rated · quoted without accepting NDA.

### 6.5 Dashboards
- **Buyer dashboard:** pipeline tiles (Waiting for quotes · Quotes to compare · Negotiating · Awarded); per RFQ: interested, quotes, lowest ₹/pc, stage, "Review →" when a supplier moved last.
- **Seller dashboard (lead feed):** stats (new matched leads, quotes sent, won, win rate); tabs Matched for you · All open RFQs · Interested · Quoted · Negotiating · Won · Lost; zone filter ("Show leads within …"); each lead shows ✓/✗ process coverage, distance + zone, budget, timeline, closes-in, quote count; actions Interested · Submit quotation · Not for us.
- **No Post Requirement for sellers anywhere** (nav, home, footer; `/rfq/new` redirects server-side).

### 6.6 Notifications (in-app) — `src/lib/server/notify.ts`
Bell with unread count in the header + `/notifications` (click marks read & opens). Events: NEW_LEAD, LEAD_TEASER, INTERESTED, QUOTE_RECEIVED, QUOTE_REVISED, SHORTLISTED, COUNTER, COUNTER_ACCEPTED, COUNTER_DECLINED, AWARDED, NOT_SELECTED, DECLINED, WITHDRAWN, VERIFICATION (docs verified / rejected / ground verified).

### 6.7 Decisions — round 3 (from user, 2026-10-07, all built)
1. **Notifications:** mobile / Gmail push is **Phase 2**. For the demo: **in-app pop-up ("cloud") notifications** on the user's screen + "Latest updates" panel on both dashboards + bell.
2. **Order tracking only when the eYantrik team manages the order** (concierge jobs). Deals done directly off-platform are **not** tracked.
3. **Seller quote tools:** saved defaults (GST, payment terms, inclusions, freight, validity) that pre-fill **only if the seller turns auto-fill on**; **payment terms are free text** (B2B decision, suggestions offered); built-in **simple cost estimator**; sellers using their own software can **attach their quote as PDF / Excel / Word**.
4. **Buyers can edit an RFQ any time** (until awarded). Editing **restarts the chain**: active quotes → "Needs re-quote", pending counter-offers lapse, interest/"not for us" responses reset, a fresh quote window opens, and sellers are notified (those who quoted get "what changed").
5. **eYantrik does not quote on the platform.** The **ground sales team** calls buyers directly — admin "Requirements" tab lists every RFQ with buyer contact.

### 6.8 How these work
- **Pop-ups** (`NotificationToasts.svelte`): polls `/api/notifications` every 15 s and after each navigation; shows up to 3 new items bottom-right (auto-hide 9 s, click opens the item). Shown once per browser tab session.
- **Edit & re-post** (`/buyer/rfq/[id]/edit`): same form as posting (`RfqForm.svelte`). Unchanged submit is rejected. New drawings replace old ones (none uploaded → kept); NDA acceptances reset if drawings/NDA change.
- **Order tracking** (`/buyer/orders/[id]`, admin → Concierge costing → Order tracking): stages Order confirmed → Material procured → Sample approved → Bulk production → Quality check → Dispatched → Delivered. Each update notifies the buyer. Buyer sees client price only — never base cost or margin.
- **Quote defaults** (`/seller/settings`) also store estimator rates (machine-hour rate, overhead %, profit %). "Save as my defaults" checkbox on the quote form updates them.
- **Estimator** = (material + machine minutes ÷ 60 × hour rate + outside processes + packing/inspection) + overhead % + profit % → "Use as unit price".

### 6.9 Open questions / next decisions
1. Quote PDFs and drawings are stored as **file names only** — real file storage comes with the real database (Supabase storage?). When do we move off mock data?
2. Should managed-order buyers be able to **confirm delivery / raise an issue** from the tracker (two-way), or stay read-only?
3. Should sellers get a **daily digest** of new leads in-app (and later on WhatsApp) instead of one notification per RFQ when volume grows?
4. Ground sales team: do they need **call notes / follow-up status** per requirement in admin?

---

## 7. Backlog (ideas to increase platform dependence)
- Quote templates / rate card · saved suppliers · one-click re-order · RFQ duplicate
- Order tracking after award (PO upload, milestones, dispatch photos, delivery confirmation → rating prompt)
- Quote PDF / process-sheet attachments (needs real file storage)
- Seller performance badges (response time, win rate, on-time delivery)
- WhatsApp notifications · Hindi UI (Google Translate widget first, then i18n)
- Real file storage for drawings, real DB (Supabase/Postgres), real OTP (MSG91)

---

## 8. Tech notes
- **Stack:** SvelteKit 3 + Svelte 5 (runes), TypeScript, MongoDB 9 (driver `mongodb` 7). Imports use `#lib/...ts` (subpath imports, explicit `.ts`). Node ≥ 22.18.
- **Config (no hardcoding):** `.env` → `MONGODB_URI`, `MONGODB_DB`, `HELPDESK_PHONE`, `HELPDESK_HOURS` (declared in `src/env.ts`, template `.env.example`). `robots.txt` is generated by `src/routes/robots.txt/+server.ts` from the request's domain.
- **Run:** `npm run dev` → http://localhost:5173 · type check `npm run check` · reset DB `npm run db:reset`.
- **Logins:** buyer `/login/buyer`, seller `/login/seller`, admin `/admin/login` (first admin: `/admin/setup`).
- **Data — two stores during the migration:**
  - **MongoDB** (persistent): users, sessions, login attempts, sellers (factories), ID counters.
  - **In memory** `src/lib/server/db.ts` (starts empty, resets on restart): RFQs, quotes, responses, notifications, contacts, feedback, help tickets, concierge jobs, RFQ drafts.
- **MongoDB setup:**
  - Local server as a Windows service · shell `mongosh` · GUI Compass.
  - Config: `.env` (git-ignored; template `.env.example`) → `MONGODB_URI=mongodb://127.0.0.1:27017` (use 127.0.0.1, not localhost), `MONGODB_DB=eyantrik`. Declared + validated in `src/env.ts` (`defineEnvVars`), imported server-only from `$app/env/private`.
  - Connection: `src/lib/server/mongo.ts` exports `mongo` (one shared client on `globalThis`).
  - Connection option `ignoreUndefined: true`: optional fields left `undefined` are not stored (no `null` junk).
  - Reset: `npm run db:reset` (`scripts/db-reset.ts`) drops the DB and creates unique indexes (users id/email/phone, sellers id/slug), lookup indexes (sellers userId, verification), TTL indexes (sessions, loginAttempts), the ID counters (`counters`: U and S start at 1000 → U-1001, S-1001) and the Compass views.
  - IDs: `src/lib/server/counters.ts` → `nextMongoId(prefix)` (atomic `$inc`, survives restarts). In-memory data still uses `nextId()` in db.ts.
  - Health check: `/admin/api/db-health` (admin only) returns collection counts.
- **Users module** `src/lib/server/users.ts`: `findUserById/Email/Phone`, `usersById` (one query for lists), `countUsers`, `adminExists`, `insertUser`, `updateUser`, `nextUserId` (atomic `$inc`). Results exclude Mongo's `_id`.
  - **Sessions:** `_id` = cookie session id, TTL on `expiresAt` (Mongo auto-deletes expired). **loginAttempts:** `_id` = `portal:loginId`, TTL 15 min.
  - The user is re-read from MongoDB on every request → deleting/editing a user in Compass takes effect on their next click.
  - Duplicate phone/email blocked by unique indexes (E11000 handled on sign-up).
  - Hard-deleting a user leaves their RFQs/quotes behind (no cascade). Prefer a future admin "deactivate user".
- **Sellers module** `src/lib/server/sellers.ts` (stage 2, 2026-10-09): `findSellerById/BySlug/OfUser`, `listSellers(filter)`, `listedSellers`, `sellersById` (one query for lists), `insertSeller`, `updateSeller` (undefined → `$unset`), `addRating` (atomic `$inc`), `gstinTaken`, `uniqueSlug`, `nextSellerId`.
  - **Rule:** changing a seller object in memory does not save it — always call `updateSeller()`.
  - A seller listing records its owner's `userId`; notifications to a seller go to that user (`notifySeller` looks the listing up; `notifyRfqPosted` uses the records it already loaded).
  - Became async (callers must `await`): `matchedSellersFor`, `notifySeller`, `notifyRfqPosted`, `canSeeBuyerContacts`, `parseSellerForm`, and buyerQuotes `quoteRows/shortlist/counterOffer/award/declineQuote/releaseQuotes`. Watch out: `const err = shortlist(...)` without `await` compiles but is always truthy.
  - `/sellers` directory: process/state/ground filters run as a MongoDB query; free-text search runs in code (matches labels). Admin console loads all sellers once per page view (fine at Phase 1 scale).
  - **Transition caveat:** requirements, quotes and feedback are still in memory, so after a restart a seller keeps its rating totals but the review texts and quotes are gone.
- **Compass views** (read-only, always live): `buyers` (no password hash) · `sellers_verified` (DOCS_VERIFIED / GROUND_VERIFIED + owner login) · `sellers_unverified` (DOCS_SUBMITTED / REJECTED + seller accounts with no factory as `NOT_REGISTERED`). Verification changes in the admin console show up immediately.
- **First admin:** `/admin/setup` (public in `rolesFor`, closed with 303/403 once `adminExists()`), uses `portalSignup('ADMIN')`; logs straight in to `/admin`. More admins: Phase 2.
- **Next migration stages:** RFQs → quotes → notifications → admin (tickets/jobs/contacts) → drafts (TTL) → real file storage (uploads are currently only recorded by name).
- **Design system (2026-10-09):** all look & feel in `src/app.css` (tokens on `:root`: navy/brand blue `#3355ff` → violet `#6b4dff` gradient, accent orange `#ff6a2b` for main CTAs, green for seller actions; Inter + Plus Jakarta Sans from Google Fonts in `app.html`). Shared classes kept (`.btn` + `.grad/.accent/.ok/.ghost/.lg`, `.card` + `.hover`, `.badge`, `.alert`, `.tabs`, `.stat` …) so every page follows. Components: `Icon.svelte` (inline SVG icon set — use instead of emoji), `Logo.svelte` (hex-nut mark). Header = frosted sticky bar with avatar + bell; footer = multi-column. Home page: animated hero with illustrative quote preview (labelled "Example"), trust strip (live stats once suppliers exist, value props when empty), steps, features, suppliers (empty state invites factories), processes, audience cards, help-desk band. Motion respects `prefers-reduced-motion`. No test/demo banner.
- **Key files:** `taxonomy.ts` (shared categories) · `rfqFields.ts` (RFQ form) · `geo.ts` (distance + pincode zones) · `quote.ts` (quote options + landed-cost maths) · `orders.ts` (managed-order stages) · `server/matching.ts` (match + nearest-first) · `server/quotes.ts` (quote rules, form parsing, buyer insights) · `server/buyerQuotes.ts` (shortlist / counter / award / decline) · `server/notify.ts` (notifications) · `server/sellerForm.ts` (seller validation) · `routes/admin` (verification, help desk, concierge costing, contact log).
- **Auth files:** `src/hooks.server.ts` (guard) · `server/auth.ts` (sessions, authenticate, rolesFor, requireUser) · `server/users.ts` · `server/password.ts` · `server/portal.ts` + `PortalLogin.svelte` · routes `/login`, `/login/buyer`, `/login/seller`, `/admin/login`, `/admin/setup`, `/admin/logout`, `/logout`, `/denied`.
- **Routes:** buyer `/buyer/dashboard`, `/buyer/rfq/[id]`, `/buyer/rfq/[id]/edit`, `/buyer/rfq/[id]/quotes/[quoteId]`, `/buyer/orders/[id]`, `/rfq/new` · seller `/seller` (lead feed), `/seller/rfq/[id]` (lead + quote + negotiation), `/seller/settings` (quote defaults), `/seller/onboarding` · shared `/notifications`, `/api/notifications` (pop-up poll), `/help`, `/sellers` · admin tabs: overview, requirements (sales), verification, add seller, help desk, concierge costing + order tracking, contact log.

---

## 9. Changelog
- **2026-10-12** — Fix: a seller tab no longer turns into a buyer on shared pages after a buyer logs in in another tab — each tab remembers its own side (sessionStorage); header/bell/pop-ups/logout/homepage button follow it.
- **2026-10-12** — New process list (Option B): 13 shops → 33 groups → 143 processes in `processes.ts`, plain explanations + shop-floor search words; "What kind of work?" cards and a process picker on the requirement form; collapsible picker for sellers; directory filter by shop or process (+ keyword finds VMC, wire cut…); homepage "Browse by type of work"; sitemap per shop/process; fair scoring for shop-only requirements; old ids converted (`db:migrate`). Research saved in `docs/research/`. Tested 22/22.
- **2026-10-10** — Code audit: removed unused code (`leadsForSeller`, `RFQ_FIELD`, `findSellerOfUser`, `ProcessId`, `COMMODITY_LABEL`, unused imports, unused modal/grad-text CSS, old `/login?as=SELLER` redirect); `robots.txt` is now a route using the real domain (was hardcoded localhost); cookies use SvelteKit's secure default (HTTPS-only except localhost) instead of `secure: false`; fake help-desk number removed — real contact comes from `.env` (`HELPDESK_PHONE`, `HELPDESK_HOURS`, hidden when empty).
- **2026-10-09** — Separate sessions per role: `ey_buyer` / `ey_seller` / `ey_admin` cookies, URL decides identity, buyer + seller + admin tabs work in one browser; same mobile/email allowed once per role (unique `{role, phone}` / `{role, email}`); per-side notification inboxes; header switcher; logout per side; prefilled second sign-up; +91 phone dropdown on all phone fields. `npm run db:migrate` upgrades an existing DB (drops old unique phone/email indexes, removes old shared sessions). Verified 33/33.
- **2026-10-09** — Fix: restored the `/buyer` and `/seller` rules in `rolesFor()` (they had been commented out, so wrong-role visitors got a bare 403 instead of the /denied page, and the areas relied only on per-page checks); removed a debug `console.log` in `hooks.server.ts` that printed each user's password hash, email and phone on every request. Verified 17/17 access checks.
- **2026-10-09** — Professional redesign: new design system (app.css tokens, fonts, buttons, forms, cards, tables), new header/footer with logo + SVG icons, redesigned landing page with empty states, test banner removed, outdated "mobile number, no passwords" copy removed; login/sign-up tab now server-rendered from `?mode=` (fixes `/admin/setup` briefly showing a login form).
- **2026-10-09** — MongoDB stage 2: sellers (factories) moved to MongoDB (`sellers.ts`, `counters.ts`); onboarding, verification, admin add-seller, ratings, quote defaults and the directory persist across restarts; `ignoreUndefined` connection option; `@types/node` added; site banner updated. Tested: 38/38 incl. after-restart checks.
- **2026-10-07** — Repo cleanup for GitHub: demo data, demo mode, old OTP code, in-memory users/sessions, old prototype backup and dead files removed; `npm run seed` → `npm run db:reset`; this file moved to `docs/`; real README; package renamed `eyantrik`.
- **2026-10-07** — Platform starts empty (user enters all data manually). Demo data only via `seed:demo` + `EYANTRIK_DEMO=1`. New first-admin registration `/admin/setup`. Tests run in demo mode: 176/176.
- **2026-10-07** — MongoDB views `buyers`, `sellers_verified`, `sellers_unverified` for browsing by role / verification in Compass.
- **2026-10-07** — MongoDB stage 1: users, sessions (TTL) and login lockout moved to MongoDB (`users.ts`); sign-up/admin add-seller/onboarding persist; deleting a user in the DB logs them out at once; tests reseed first. 176/176 pass.
- **2026-10-07** — Local MongoDB connected: `mongodb` driver, `.env` + `src/env.ts`, `src/lib/server/mongo.ts`, `npm run seed`, admin `/admin/api/db-health`. Data persists across restarts; routes still use the in-memory DB (migration next).
- **2026-10-07** — Authentication & access control: three role-locked portals (buyer, seller, separate admin portal + admin-only cookie scoped to /admin), ID + password login (PBKDF2), lockout, session rotation, central role guard in hooks (403 / access-denied page), demo accounts removed from screens, admin sets temp password for team-added sellers.
- **2026-10-07** — Round 3: in-app pop-up notifications + "Latest updates" on dashboards; edit & re-post RFQ restarts the quote chain ("Needs re-quote"); seller quote defaults (optional auto-fill), free-text payment terms, cost estimator, quote PDF/Excel attachments; managed-order tracking for concierge jobs (admin posts stages, buyer tracker + notifications); admin Requirements tab for the ground sales team.
- **2026-10-07** — Quotation system: notifications (bell + page), seller lead feed with tabs / zone filter / Interested / Not for us, quotation form with live landed-cost preview & versions, buyer comparison sorted by price with "things to consider", shortlist, counter-offers (max 3 rounds), award / decline, auto "not selected". Quote deadline on RFQs. Nearest-first ranking by pincode zone + km. Verification decisions notify sellers. Admin quote KPIs.
- **2026-10-07** — Buyer/seller UI separated (role-based nav, footer, home CTAs; `/rfq/new` buyer-only server-side). Proposed dashboards, notifications, quotation & negotiation design (§6). Created brain.md.
- **2026-10-07** — Demo login replaces OTP (one-click accounts + phone sign-in/sign-up).
- **2026-10-07** — RFQ form aligned with reference E-Yantrik form; shared taxonomy; pincode distance; NDA gating; seller material families & industries.
- **2026-10-07** — Phase 1 build: directory + SEO, login, RFQ posting, matching, contact unlock & logging, seller onboarding with rules, verification ladder, help desk, admin console, feedback/reopen.
