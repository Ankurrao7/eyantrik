# eYantrik

B2B manufacturing marketplace for India. Buyers post part requirements (RFQs), the few best-matched verified job shops nearby are invited to quote, and the two sides message, compare, negotiate and award on the platform — no lead selling, no spam calls. The eYantrik team verifies sellers and can manage orders end to end.

## Features

- **Three role-locked portals:** buyer, seller and admin, each with its own login and session — all three can be open in one browser, one tab each. One mobile number can have one buyer and one seller account.
- **Requirements (RFQs):** a detailed form (process, material, quantity, tolerances, drawings, delivery city and deadline). Buyers can edit a requirement until it is awarded.
- **Curated invitations:** each requirement goes to the 6 best-matched verified sellers (process, material, industry; nearest first by pincode zone, then distance). More are invited when one passes, when the buyer asks, or automatically when few quotes come in.
- **Contacts after shortlist:** buyers and sellers talk through on-platform messages; phone & WhatsApp are shared both ways only when the buyer shortlists a quote.
- **Quotations:** versioned quotes with a landed cost per piece, buyer shortlisting, counter-offers (up to 3 rounds) and awarding.
- **Seller onboarding:** self-registration with GST, machines and documents, followed by admin verification (documents, then a ground visit).
- **Admin console:** KPIs, the verification queue, adding sellers after a factory visit, the help desk, concierge costing and order tracking.
- **In-app notifications:** a bell, pop-ups and a "Latest updates" panel.

## Tech stack

- [SvelteKit 3](https://svelte.dev/docs/kit) + Svelte 5 (runes) and TypeScript
- [MongoDB](https://www.mongodb.com/) through the official `mongodb` driver
- Passwords hashed with PBKDF2-SHA256 (Web Crypto)

## Getting started

### Prerequisites

- Node.js **22.18** or newer
- MongoDB running locally, for example installed with `winget install MongoDB.Server`

### Setup

```sh
npm install
cp .env.example .env      # adjust if your MongoDB isn't on 127.0.0.1:27017
npm run db:reset          # creates an empty database with indexes and views
npm run dev               # http://localhost:5173
```

Next, open **http://localhost:5173/admin/setup** to create the first admin account. This page closes as soon as an admin exists. Buyers sign up at `/login/buyer` and sellers at `/login/seller`.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run check` | Type-check the project |
| `npm run build` | Production build |
| `npm run db:reset` | **Wipe** the database and recreate indexes, counters and views |
| `npm run db:migrate` | Upgrade an existing database in place (keeps all data); safe to run again |

### Environment variables

| Name | Default | Description |
|---|---|---|
| `MONGODB_URI` | `mongodb://127.0.0.1:27017` | MongoDB connection string. Use `127.0.0.1`, not `localhost`. |
| `MONGODB_DB` | `eyantrik` | Database name |

These are declared and validated in `src/env.ts`.

## Project structure

```
src/
├── env.ts                  environment variables (validated at startup)
├── hooks.server.ts         access control for every request
├── lib/
│   ├── components/         shared Svelte components
│   ├── server/             server-only code
│   │   ├── mongo.ts        MongoDB connection
│   │   ├── users.ts        users, sessions, login attempts (MongoDB)
│   │   ├── sellers.ts      seller / factory listings (MongoDB)
│   │   ├── counters.ts     readable ids: U-1001, S-1001 … (MongoDB)
│   │   ├── auth.ts         login, sessions, role rules
│   │   ├── db.ts           in-memory store (being migrated to MongoDB)
│   │   ├── matching.ts     seller ↔ requirement matching
│   │   ├── invites.ts      curated invitations (top 6, top-ups)
│   │   ├── messages.ts     buyer ↔ supplier messages
│   │   ├── quotes.ts       quotation rules
│   │   └── …
│   └── taxonomy.ts, rfqFields.ts, quote.ts, geo.ts …   shared logic
└── routes/
    ├── buyer/  seller/  admin/     role areas
    ├── login/                      buyer & seller portals
    ├── rfq/new/                    post a requirement
    └── sellers/  help/  api/ …     public pages and endpoints
scripts/db-reset.ts         database setup
docs/brain.md               product decisions, flows and changelog
```

## Data storage

The move to MongoDB is happening in stages:

| Stored in | Data |
|---|---|
| **MongoDB** (persistent) | users, sessions, login attempts, sellers |
| **Memory** (reset on restart) | requirements (incl. invitations), quotes, messages, notifications, help desk, orders |

Next stages, in order: requirements, then quotes, then notifications, then admin data. See [docs/brain.md](docs/brain.md) for the full product notes.

## Status

Phase 1: everything is free, with the focus on user growth. Phase 2 plans include OTP / 2FA, password reset, SMS / WhatsApp / email notifications and production hosting.
