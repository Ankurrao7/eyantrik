import type { User } from '#lib/server/db.ts';
import { unreadCount } from '#lib/server/notify.ts';
import type { LayoutServerLoad } from './$types';

/** What the header needs about one signed-in account. */
function summary(u: User) {
	return {
		id: u.id,
		name: u.name,
		companyName: u.companyName,
		role: u.role,
		hasSellerProfile: !!u.sellerId,
		home: u.role === 'ADMIN' ? '/admin' : u.role === 'SELLER' ? (u.sellerId ? '/seller' : '/seller/onboarding') : '/buyer/dashboard',
		unread: u.role === 'ADMIN' ? 0 : unreadCount(u.id)
	};
}
export type AccountSummary = ReturnType<typeof summary>;

export const load: LayoutServerLoad = ({ locals }) => {
	// `user` = the identity this request acted as (decided by the URL, or the side used last on shared pages).
	// `sides` = everyone signed in through this browser, so each TAB can show its own side (see tabSide.svelte.ts).
	return {
		user: locals.user ? summary(locals.user) : null,
		sides: {
			BUYER: locals.sessions.BUYER ? summary(locals.sessions.BUYER) : null,
			SELLER: locals.sessions.SELLER ? summary(locals.sessions.SELLER) : null
		}
	};
};
