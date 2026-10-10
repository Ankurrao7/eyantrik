// Old shared address: forward to the inbox of the side this person is using (/buyer or /seller/notifications).
import { redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const user = requireUser(locals, url);
	redirect(303, user.role === 'SELLER' ? '/seller/notifications' : '/buyer/notifications');
};
