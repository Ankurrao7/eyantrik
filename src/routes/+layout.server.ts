import type { User } from '#lib/server/db.ts';
import { unreadCount } from '#lib/server/notify.ts';
import { findSellerById } from '#lib/server/sellers.ts';
import { profileScore } from '#lib/profileScore.ts';
import type { LayoutServerLoad } from './$types';

/** What the header needs about one signed-in account (sellers: also the profile-completeness ring). */
async function summary(u: User) {
	const seller = u.role === 'SELLER' && u.sellerId ? await findSellerById(u.sellerId) : null;
	return {
		id: u.id,
		name: u.name,
		companyName: u.companyName,
		role: u.role,
		hasSellerProfile: !!u.sellerId,
		home: u.role === 'ADMIN' ? '/admin' : u.role === 'SELLER' ? (u.sellerId ? '/seller' : '/seller/onboarding') : '/buyer/dashboard',
		unread: u.role === 'ADMIN' ? 0 : unreadCount(u.id),
		/** null = not a seller, or factory not registered yet */
		profilePct: seller ? profileScore(seller).percent : null
	};
}
export type AccountSummary = Awaited<ReturnType<typeof summary>>;

export const load: LayoutServerLoad = async ({ locals }) => {
	const [user, buyer, seller] = await Promise.all([
		locals.user ? summary(locals.user) : null,
		locals.sessions.BUYER ? summary(locals.sessions.BUYER) : null,
		locals.sessions.SELLER ? summary(locals.sessions.SELLER) : null
	]);
	// `user` = the identity this request acted as (decided by the URL, or the tab's lane on shared pages).
	// `sides` = the buyer/seller logins this request may see (none on /admin or in an admin tab; only the
	// tab's own side on shared pages) — used by the header's "Switch to…" in role areas.
	return {
		user,
		sides: { BUYER: buyer, SELLER: seller },
		/** the lane the server rendered with — a brand-new tab adopts it (tabSide.svelte.ts) */
		lane: locals.lane
	};
};
