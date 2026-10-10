import { portalLoad, portalLogin, portalSignup } from '#lib/server/portal.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => portalLoad('BUYER', locals, url);

export const actions: Actions = {
	login: ({ request, cookies }) => portalLogin('BUYER', request, cookies),
	signup: ({ request, cookies }) => portalSignup('BUYER', request, cookies)
};
