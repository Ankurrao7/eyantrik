// Upgrades an existing database WITHOUT deleting data. Safe to run any number of times.
// Run: npm run db:migrate   (reads MONGODB_URI / MONGODB_DB from .env)
//
// 2026-10-09 — separate buyer & seller logins:
//   • users: unique phone/email → unique per role ({ role, phone }, { role, email }),
//     so one mobile can own a buyer account AND a seller account.
//   • sessions: old shared sessions (field `kind`) are removed — everyone logs in once again.
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017');
await client.connect();
const mongo = client.db(process.env.MONGODB_DB ?? 'eyantrik');
const users = mongo.collection('users');

const existing = (await users.indexes()).map((i) => i.name);
for (const old of ['email_1', 'phone_1']) {
	if (existing.includes(old)) {
		await users.dropIndex(old);
		console.log(`dropped index users.${old}`);
	}
}
await users.createIndex({ role: 1, email: 1 }, { unique: true });
await users.createIndex({ role: 1, phone: 1 }, { unique: true });
console.log('index users {role, email} and {role, phone} ✔');

const old = await mongo.collection('sessions').deleteMany({ role: { $exists: false } });
console.log(`removed ${old.deletedCount} old shared session(s) — users log in again once`);

await client.close();
console.log('Migration done ✔');
