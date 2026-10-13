// Unread notifications for the logged-in user — polled by the in-app pop-ups.
import { json } from '@sveltejs/kit';
import { notificationsFor } from '#lib/server/notify.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
	const user = locals.user;
	if (!user) return json({ unread: 0, items: [] }, { status: 401 });
	const items = notificationsFor(user.id)
		.filter((n) => !n.read)
		.slice(0, 20)
		.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, at: n.at }));
	return json({ unread: items.length, items }, { headers: { 'cache-control': 'no-store' } });
};
