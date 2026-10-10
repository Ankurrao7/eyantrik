import { unreadCount } from '#lib/server/notify.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	const u = locals.user;
	// The person may also be signed in as the other side (buyer ↔ seller) — offer a one-click switch.
	const otherRole = u?.role === 'BUYER' ? 'SELLER' : u?.role === 'SELLER' ? 'BUYER' : null;
	const other = otherRole ? locals.sessions[otherRole] : null;
	return {
		user: u ? { id: u.id, name: u.name, companyName: u.companyName, role: u.role, hasSellerProfile: !!u.sellerId } : null,
		other: other ? { role: other.role, name: other.name, home: other.role === 'SELLER' ? (other.sellerId ? '/seller' : '/seller/onboarding') : '/buyer/dashboard' } : null,
		unread: u ? unreadCount(u.id) : 0
	};
};
