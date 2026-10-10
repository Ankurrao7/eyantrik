import { homeFor, safeRedirect } from '#lib/server/auth.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const need = (url.searchParams.get('need') ?? '').split(',').filter((r) => ['BUYER', 'SELLER', 'ADMIN'].includes(r));
	return {
		need,
		from: safeRedirect(url.searchParams.get('from'), ''),
		role: locals.user?.role ?? (locals.sessions.SELLER ? 'SELLER' : locals.sessions.BUYER ? 'BUYER' : null),
		home: (() => {
			const u = locals.user ?? locals.sessions.SELLER ?? locals.sessions.BUYER;
			return u ? homeFor(u) : '/';
		})()
	};
};
