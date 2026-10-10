// First-run setup: registers the first admin account on an empty platform.
// Open only while no admin exists — once one does, this page is closed for good.
import { error, redirect } from '@sveltejs/kit';
import { portalSignup } from '#lib/server/portal.ts';
import { adminExists } from '#lib/server/users.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	if (await adminExists()) redirect(303, '/admin/login');
	return {};
};

export const actions: Actions = {
	signup: async ({ request, cookies }) => {
		if (await adminExists()) error(403, 'An admin account already exists. Please log in.');
		return portalSignup('ADMIN', request, cookies); // creates the admin, logs them in, → /admin
	}
};
