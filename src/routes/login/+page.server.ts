// /login is just a chooser — each role signs in through its own portal.
import { redirect } from '@sveltejs/kit';
import { destinationFor, isAllowed, safeRedirect } from '#lib/server/auth.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const redirectTo = safeRedirect(url.searchParams.get('redirectTo'), '');
	// Old links like /login?as=SELLER keep working.
	if (url.searchParams.get('as') === 'SELLER') redirect(303, `/login/seller${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`);
	// A redirect target that needs a side the person is already signed in on → go straight there.
	for (const side of ['BUYER', 'SELLER'] as const) {
		const u = locals.sessions[side];
		if (u && redirectTo && isAllowed(side, redirectTo)) redirect(303, destinationFor(u, redirectTo));
	}
	const s = locals.sessions;
	return {
		redirectTo,
		buyer: s.BUYER ? { name: s.BUYER.name, home: '/buyer/dashboard' } : null,
		seller: s.SELLER ? { name: s.SELLER.name, home: s.SELLER.sellerId ? '/seller' : '/seller/onboarding' } : null
	};
};
