import { redirect } from '@sveltejs/kit';
import { destroySession } from '#lib/server/auth.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => redirect(303, '/admin');

export const actions: Actions = {
	default: async ({ cookies }) => {
		await destroySession(cookies, 'ADMIN');
		redirect(303, '/admin/login');
	}
};
