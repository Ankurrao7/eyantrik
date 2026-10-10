// Separate admin access: own URL (not linked from the public site), own cookie (path /admin, 8 h).
import { portalLoad, portalLogin } from '#lib/server/portal.ts';
import { adminExists } from '#lib/server/users.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => ({ ...portalLoad('ADMIN', locals, url), needsSetup: !(await adminExists()) });

export const actions: Actions = {
	login: ({ request, cookies }) => portalLogin('ADMIN', request, cookies)
};
