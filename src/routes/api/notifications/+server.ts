// Unread notifications for the logged-in user — polled by the in-app pop-ups.
import { json } from '@sveltejs/kit';
import { db } from '#lib/server/db.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
	const user = locals.user;
	if (!user) return json({ unread: 0, items: [] }, { status: 401 });
	const items = db.notifications
		.filter((n) => n.userId === user.id && !n.read)
		.slice(0, 20)
		.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, at: n.at }));
	return json({ unread: items.length, items }, { headers: { 'cache-control': 'no-store' } });
};
