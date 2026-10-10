// One shared MongoDB connection for the whole server.
// Settings come from .env, declared and validated in src/env.ts.
import { MongoClient } from 'mongodb';
import { MONGODB_URI, MONGODB_DB } from '$app/env/private';

// Keep the client on globalThis so Vite hot-reloads don't open a new connection each time
// (same trick db.ts uses for the in-memory data).
const g = globalThis as unknown as { __mongoClient?: MongoClient };
// ignoreUndefined: optional fields left `undefined` (e.g. no email) are not stored, instead of being saved as null.
export const client = (g.__mongoClient ??= new MongoClient(MONGODB_URI, { ignoreUndefined: true }));
await client.connect();

export const mongo = client.db(MONGODB_DB);
