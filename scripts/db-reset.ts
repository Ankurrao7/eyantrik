// Resets the MongoDB database to an empty, ready-to-use platform:
// drops everything, then creates indexes, the user-ID counter and the Compass views.
// Run: npm run db:reset   (reads MONGODB_URI / MONGODB_DB from .env)
// Afterwards create the first admin at /admin/setup.
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017');
await client.connect();
const mongo = client.db(process.env.MONGODB_DB ?? 'eyantrik');

await mongo.dropDatabase();

// Indexes: fast lookups and no duplicate logins
await mongo.collection('users').createIndex({ id: 1 }, { unique: true });
// one account per role per email / mobile (the same person may have a buyer AND a seller account)
await mongo.collection('users').createIndex({ role: 1, email: 1 }, { unique: true });
await mongo.collection('users').createIndex({ role: 1, phone: 1 }, { unique: true });
await mongo.collection('sellers').createIndex({ id: 1 }, { unique: true });
await mongo.collection('sellers').createIndex({ slug: 1 }, { unique: true });
await mongo.collection('sellers').createIndex({ userId: 1 }); // "which factory does this login own?"
await mongo.collection('sellers').createIndex({ verification: 1 }); // listed sellers, verification queue

// Sessions and login-attempt counters delete themselves when `expiresAt` passes (TTL index)
await mongo.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
await mongo.collection('loginAttempts').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ID counters: users U-1001…, sellers S-1001… — see src/lib/server/counters.ts
await mongo.collection('counters').insertMany([{ _id: 'U', value: 1000 }, { _id: 'S', value: 1000 }] as any);

// "Folders" for browsing in Compass. MongoDB has no folders, so these are read-only VIEWS:
// saved queries that always show live data (a seller moves to sellers_verified the moment
// they're verified) and never show password hashes.
const LISTED = ['DOCS_VERIFIED', 'GROUND_VERIFIED'];
const withLogin = [
	// attach the owner's login account (from users) to each factory listing
	{ $lookup: { from: 'users', localField: 'userId', foreignField: 'id', as: 'login', pipeline: [{ $project: { _id: 0, id: 1, name: 1, email: 1, phone: 1 } }] } },
	{ $set: { login: { $first: '$login' } } },
	{ $project: { _id: 0 } }
];
await mongo.createCollection('buyers', {
	viewOn: 'users',
	pipeline: [{ $match: { role: 'BUYER' } }, { $project: { _id: 0, passwordHash: 0 } }]
});
await mongo.createCollection('sellers_verified', {
	viewOn: 'sellers',
	pipeline: [{ $match: { verification: { $in: LISTED } } }, ...withLogin]
});
await mongo.createCollection('sellers_unverified', {
	viewOn: 'sellers',
	pipeline: [
		{ $match: { verification: { $nin: LISTED } } }, // under review or rejected
		...withLogin,
		// + seller accounts that signed up but haven't registered their factory yet
		{
			$unionWith: {
				coll: 'users',
				pipeline: [
					{ $match: { role: 'SELLER', sellerId: null } },
					{ $project: { _id: 0, companyName: 1, verification: { $literal: 'NOT_REGISTERED' }, login: { id: '$id', name: '$name', email: '$email', phone: '$phone' } } }
				]
			}
		}
	]
});

await client.close();
console.log(`Database "${mongo.databaseName}" reset ✔ — create the first admin at /admin/setup`);
