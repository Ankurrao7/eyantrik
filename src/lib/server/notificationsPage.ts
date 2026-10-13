// Notification inbox — shared by /buyer/notifications and /seller/notifications.
// Each role has its own inbox page, so a buyer tab and a seller tab each show their own notifications.
import { redirect } from '@sveltejs/kit';
import { requireUser, safeRedirect } from './auth.ts';
import { db } from './db.ts';
import { notificationsFor } from './notify.ts';

type Side = 'BUYER' | 'SELLER';
const inbox = (role: Side) => `/${role.toLowerCase()}/notifications`;

export function notificationsLoad(role: Side, locals: App.Locals, url: URL) {
	const user = requireUser(locals, url, [role]);
	return { role, items: notificationsFor(user.id).slice(0, 100) };
}

export function notificationsActions(role: Side) {
	return {
		open: async ({ request, locals, url }: { request: Request; locals: App.Locals; url: URL }) => {
			const user = requireUser(locals, url, [role]);
			const id = (await request.formData()).get('id')?.toString();
			const n = db.notifications.find((x) => x.id === id && x.userId === user.id);
			if (n) n.read = true;
			redirect(303, safeRedirect(n?.link, inbox(role)));
		},
		readAll: ({ locals, url }: { locals: App.Locals; url: URL }) => {
			const user = requireUser(locals, url, [role]);
			for (const n of db.notifications) if (n.userId === user.id) n.read = true;
			return { ok: true };
		}
	};
}
