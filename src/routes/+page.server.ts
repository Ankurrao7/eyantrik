// src/routes/+page.server.ts
import { canSeeSellerContacts, sellerContactLock } from '#lib/server/auth.ts';
import { db, sellerRating } from '#lib/server/db.ts';
import { toPublicSeller } from '#lib/server/matching.ts';
import { listedSellers } from '#lib/server/sellers.ts';
import { PROCESSES } from '#lib/taxonomy.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const sellers = await listedSellers();
	const showContacts = canSeeSellerContacts(locals.sessions.BUYER);

	const featured = [...sellers]
		.sort(
			(a, b) =>
				Number(b.verification === 'GROUND_VERIFIED') - Number(a.verification === 'GROUND_VERIFIED') ||
				(sellerRating(b) ?? 0) - (sellerRating(a) ?? 0)
		)
		.slice(0, 4)
		.map((s) => toPublicSeller(s, showContacts));

	const categories = PROCESSES.map((p) => ({
		id: p.id,
		label: p.label,
		count: sellers.filter((s) => s.processes.includes(p.id)).length
	})).sort((a, b) => b.count - a.count);

	return {
		featured,
		lockReason: sellerContactLock(locals.sessions.BUYER ?? locals.user),
		role: locals.user?.role ?? null,
		hasSellerProfile: !!locals.user?.sellerId,
		categories,
		stats: {
			sellers: sellers.length,
			groundVerified: sellers.filter((s) => s.verification === 'GROUND_VERIFIED').length,
			cities: new Set(sellers.map((s) => s.city)).size,
			openRfqs: db.rfqs.filter((r) => r.status === 'OPEN').length
		}
	};
};
