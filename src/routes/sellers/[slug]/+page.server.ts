import { error } from '@sveltejs/kit';
import { canSeeSellerContacts, sellerContactLock } from '#lib/server/auth.ts';
import { db } from '#lib/server/db.ts';
import { toPublicSeller } from '#lib/server/matching.ts';
import { findSellerBySlug } from '#lib/server/sellers.ts';
import { LISTED_STATUSES } from '#lib/taxonomy.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const seller = await findSellerBySlug(params.slug);
	const isOwner = !!seller && locals.sessions.SELLER?.sellerId === seller.id;
	const isAdmin = locals.user?.role === 'ADMIN';

	// Unlisted (pending/rejected) profiles are only visible to their owner and admins.
	if (!seller || (!LISTED_STATUSES.includes(seller.verification) && !isOwner && !isAdmin)) {
		error(404, 'Supplier not found');
	}

	const buyerOpenRfqs =
		locals.sessions.BUYER
			? db.rfqs
					.filter((r) => r.buyerUserId === locals.sessions.BUYER!.id && r.status === 'OPEN')
					.map((r) => ({ id: r.id, title: String(r.values.partName ?? r.id) }))
			: [];

	const reviews = db.feedback
		.filter((f) => f.sellerId === seller.id && f.comment)
		.slice(-5)
		.reverse()
		.map((f) => ({ rating: f.rating, comment: f.comment, at: f.at, outcome: f.outcome }));

	return {
		seller: toPublicSeller(seller, canSeeSellerContacts(locals.sessions.BUYER) || isOwner),
		lockReason: sellerContactLock(locals.sessions.BUYER ?? locals.user),
		isOwner,
		buyerOpenRfqs,
		reviews
	};
};
