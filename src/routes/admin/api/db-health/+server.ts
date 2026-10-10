// Admin-only check that the app can reach MongoDB (protected by the /admin guard in hooks).
import { json } from '@sveltejs/kit';
import { mongo } from '#lib/server/mongo.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const [users, sellers, rfqs] = await Promise.all([
		mongo.collection('users').countDocuments(),
		mongo.collection('sellers').countDocuments(),
		mongo.collection('rfqs').countDocuments()
	]);
	return json({ ok: true, database: mongo.databaseName, users, sellers, rfqs }, { headers: { 'cache-control': 'no-store' } });
};
