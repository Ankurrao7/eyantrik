// Logs out ONE side (buyer or seller). If the person is signed in as the other side too, that stays.
import { redirect } from '@sveltejs/kit';
import { destroySession, setActive } from '#lib/server/auth.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => redirect(303, '/');

export const actions: Actions = {
	default: async ({ cookies, request, locals }) => {
		const role = (await request.formData()).get('role') === 'SELLER' ? 'SELLER' : 'BUYER';
		await destroySession(cookies, role);
		const other = role === 'BUYER' ? 'SELLER' : 'BUYER';
		if (locals.sessions[other]) setActive(cookies, other);
		redirect(303, '/');
	}
};
