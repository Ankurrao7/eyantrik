import { portalLoad, portalLogin, portalSignup } from '#lib/server/portal.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => portalLoad('SELLER', locals, url);

export const actions: Actions = {
	login: ({ request, cookies }) => portalLogin('SELLER', request, cookies),
	signup: ({ request, cookies }) => portalSignup('SELLER', request, cookies)
};
