import { error, fail, redirect } from '@sveltejs/kit';
import { isActive } from '#lib/server/accounts.ts';
import { canSeeSellerContacts } from '#lib/server/auth.ts';
import { award, counterOffer, declineQuote, ownQuote, shortlist } from '#lib/server/buyerQuotes.ts';
import { scoreMatch, toPublicSeller } from '#lib/server/matching.ts';
import { buyerInsights, counterRounds, isLive, latest, pendingCounter, quotesForRfq } from '#lib/server/quotes.ts';
import { findSellerById } from '#lib/server/sellers.ts';
import { landed, MAX_COUNTER_ROUNDS } from '#lib/quote.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const { user, rfq, quote } = ownQuote(locals, url, params.id, params.quoteId);
	const seller = await findSellerById(quote.sellerId);
	if (!seller || !isActive(seller)) error(404, 'This supplier is no longer on eYantrik.');
	const m = scoreMatch(seller, rfq);
	const live = quotesForRfq(rfq.id).filter((q) => isLive(q) && q.versions.length);
	const rank = [...live].sort((a, b) => landed(latest(a)).perPiece - landed(latest(b)).perPiece).findIndex((q) => q.id === quote.id);
	const rounds = counterRounds(quote);
	const open = rfq.status === 'OPEN' && isLive(quote) && quote.status !== 'ACCEPTED';

	return {
		rfq: { id: rfq.id, title: String(rfq.values.partName ?? rfq.id), quantity: String(rfq.values.quantity ?? ''), status: rfq.status, values: rfq.values },
		quote: { id: quote.id, status: quote.status, versions: quote.versions.map((v) => ({ ...v, landed: landed(v) })), thread: quote.thread },
		seller: toPublicSeller(seller, canSeeSellerContacts(user)),
		match: { covers: m.covers, distanceKm: m.distanceKm, zone: m.zone },
		insights: buyerInsights(quote, rfq, seller, quotesForRfq(rfq.id)),
		priceRank: rank >= 0 ? { rank: rank + 1, of: live.length } : null,
		pendingCounter: pendingCounter(quote),
		roundsLeft: Math.max(0, MAX_COUNTER_ROUNDS - rounds),
		canAct: open,
		canCounter: open && !pendingCounter(quote) && rounds < MAX_COUNTER_ROUNDS,
		canAward: open && !pendingCounter(quote)
	};
};

export const actions: Actions = {
	shortlist: async ({ params, locals, url }) => {
		const { rfq, quote } = ownQuote(locals, url, params.id, params.quoteId);
		const err = await shortlist(rfq, quote);
		return err ? fail(409, { error: err }) : { message: 'Shortlisted — the supplier has been told.' };
	},
	counter: async ({ params, locals, url, request }) => {
		const { rfq, quote } = ownQuote(locals, url, params.id, params.quoteId);
		const res = await counterOffer(rfq, quote, await request.formData());
		if (res.fieldErrors) return fail(400, { counterErrors: res.fieldErrors, error: 'Please fix the counter-offer.' });
		if (res.error) return fail(409, { error: res.error });
		return { message: 'Counter-offer sent. The supplier has been notified and can accept, revise or decline.' };
	},
	award: async ({ params, locals, url }) => {
		const { rfq, quote } = ownQuote(locals, url, params.id, params.quoteId);
		const err = await award(rfq, quote);
		if (err) return fail(409, { error: err });
		redirect(303, `/buyer/rfq/${rfq.id}/quotes/${quote.id}?awarded=1`);
	},
	decline: async ({ params, locals, url, request }) => {
		const { rfq, quote } = ownQuote(locals, url, params.id, params.quoteId);
		const reason = ((await request.formData()).get('reason')?.toString() ?? '').trim().slice(0, 300);
		const err = await declineQuote(rfq, quote, reason);
		return err ? fail(409, { error: err }) : { message: 'Quotation declined — the supplier has been told.' };
	}
};
