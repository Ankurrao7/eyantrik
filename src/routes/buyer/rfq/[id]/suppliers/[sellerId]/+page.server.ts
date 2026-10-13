// Buyer ↔ one invited supplier about one requirement: messages, their quote, and their contacts once
// the buyer has shortlisted that quote (decision 2026-10-13: keep the deal on the platform).
import { error, fail } from '@sveltejs/kit';
import { contactsShared } from '#lib/server/auth.ts';
import { ownRfq } from '#lib/server/buyerQuotes.ts';
import { db, isInvited } from '#lib/server/db.ts';
import { scoreMatch, toPublicSeller } from '#lib/server/matching.ts';
import { canMessage, MESSAGE_MAX, sendMessage, threadFor } from '#lib/server/messages.ts';
import { latest } from '#lib/server/quotes.ts';
import { findSellerById, isListed } from '#lib/server/sellers.ts';
import { landed } from '#lib/quote.ts';
import type { Actions, PageServerLoad } from './$types';

async function ctx(locals: App.Locals, url: URL, rfqId: string, sellerId: string) {
	const { rfq } = ownRfq(locals, url, rfqId);
	const seller = await findSellerById(sellerId);
	const quote = db.quotes.find((q) => q.rfqId === rfq.id && q.sellerId === sellerId && q.versions.length);
	if (!seller || !isListed(seller) || (!isInvited(rfq, sellerId) && !quote)) error(404, 'Supplier not found on this requirement');
	return { rfq, seller, quote };
}

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const { rfq, seller, quote } = await ctx(locals, url, params.id, params.sellerId);
	const shared = contactsShared(rfq, seller.id);
	const m = scoreMatch(seller, rfq);
	return {
		rfq: { id: rfq.id, title: String(rfq.values.partName ?? rfq.id), status: rfq.status },
		seller: toPublicSeller(seller, shared),
		distanceKm: m.distanceKm,
		shared,
		quote: quote ? { id: quote.id, status: quote.status, version: latest(quote).v, perPiece: landed(latest(quote)).perPiece } : null,
		messages: threadFor(rfq, seller.id),
		canSend: canMessage(rfq, seller.id),
		max: MESSAGE_MAX
	};
};

export const actions: Actions = {
	message: async ({ params, locals, url, request }) => {
		const { rfq, seller } = await ctx(locals, url, params.id, params.sellerId);
		const err = await sendMessage(rfq, seller.id, 'BUYER', (await request.formData()).get('text')?.toString() ?? '', seller.companyName);
		return err ? fail(400, { messageError: err }) : { sent: true };
	}
};
