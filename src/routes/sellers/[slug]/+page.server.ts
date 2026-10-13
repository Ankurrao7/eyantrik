import { error, fail } from '@sveltejs/kit';
import { sellerContactLock } from '#lib/server/auth.ts';
import { db, isInvited } from '#lib/server/db.ts';
import { inviteChosen } from '#lib/server/invites.ts';
import { toPublicSeller } from '#lib/server/matching.ts';
import { findSellerBySlug, isListed } from '#lib/server/sellers.ts';
import { isQuotingOpen } from '#lib/server/quotes.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const seller = await findSellerBySlug(params.slug);
	const isOwner = !!seller && locals.sessions.SELLER?.sellerId === seller.id;
	// Unlisted (pending/rejected) profiles are only visible to their owner; suspended ones to no one here
	// (the admin team sees every supplier in the admin console, never through this public page).
	if (!seller || (!isListed(seller) && !(isOwner && !seller.accountStatus))) {
		error(404, 'Supplier not found');
	}

	const buyerOpenRfqs =
		locals.sessions.BUYER
			? db.rfqs
					.filter((r) => r.buyerUserId === locals.sessions.BUYER!.id && !r.hidden && isQuotingOpen(r))
					.map((r) => ({ id: r.id, title: String(r.values.partName ?? r.id), asked: isInvited(r, seller.id) }))
			: [];

	const reviews = db.feedback
		.filter((f) => f.sellerId === seller.id && f.comment)
		.slice(-5)
		.reverse()
		.map((f) => ({ rating: f.rating, comment: f.comment, at: f.at, outcome: f.outcome }));

	return {
		// contacts only for the owner: buyers get them when they shortlist this supplier's quote
		seller: toPublicSeller(seller, isOwner),
		lockReason: sellerContactLock(locals.sessions.BUYER ?? locals.user),
		isOwner,
		buyerOpenRfqs,
		reviews
	};
};

export const actions: Actions = {
	// Buyer asks this supplier to quote on one of their open requirements (invites it, see invites.ts).
	invite: async ({ params, locals, request }) => {
		const buyer = locals.sessions.BUYER;
		if (!buyer) return fail(403, { error: 'Log in with your buyer account to ask for a quote.' });
		const seller = await findSellerBySlug(params.slug);
		if (!seller || !isListed(seller)) return fail(404, { error: 'Supplier not found.' });
		const rfqId = (await request.formData()).get('rfqId')?.toString();
		const rfq = db.rfqs.find((r) => r.id === rfqId && r.buyerUserId === buyer.id);
		if (!rfq) return fail(400, { error: 'Choose one of your open requirements.' });
		const err = inviteChosen(rfq, seller);
		return err ? fail(409, { error: err }) : { message: `${seller.companyName} has been asked to quote on ${rfq.values.partName}. Their quote will appear on your requirement page.` };
	}
};
