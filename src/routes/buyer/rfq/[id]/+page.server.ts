import { fail } from '@sveltejs/kit';
import { canSeeSellerContacts } from '#lib/server/auth.ts';
import { ownRfq, quoteRows, releaseQuotes, shortlist, type QuoteSort } from '#lib/server/buyerQuotes.ts';
import { db, nextId, now } from '#lib/server/db.ts';
import { matchedSellersFor, toPublicSeller } from '#lib/server/matching.ts';
import { addRating, findSellerById, sellersById } from '#lib/server/sellers.ts';
import { interestedCount, isQuotingOpen } from '#lib/server/quotes.ts';
import { effectiveProcesses } from '#lib/rfqFields.ts';
import type { Actions, PageServerLoad } from './$types';

const SORTS: QuoteSort[] = ['price', 'distance', 'lead', 'rating'];

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const { user, rfq } = ownRfq(locals, url, params.id);
	const showContacts = canSeeSellerContacts(user);

	const matches = (await matchedSellersFor(rfq)).map((m) => ({
		seller: toPublicSeller(m.seller, showContacts),
		covers: m.covers,
		distanceKm: m.distanceKm,
		materialMatch: m.materialMatch,
		zone: m.zone,
		quoted: db.quotes.some((q) => q.rfqId === rfq.id && q.sellerId === m.seller.id && q.versions.length),
		contacted: db.contacts.some((c) => c.rfqId === rfq.id && c.fromUserId === user.id && c.toSellerId === m.seller.id),
		contactedYou: db.contacts.some((c) => c.rfqId === rfq.id && c.toBuyerUserId === user.id && c.fromUserId === m.seller.userId)
	}));

	const responses = db.responses.filter((r) => r.rfqId === rfq.id);
	const rfqFeedback = db.feedback.filter((f) => f.rfqId === rfq.id);
	const names = await sellersById([...rfqFeedback.map((f) => f.sellerId), ...responses.map((r) => r.sellerId)]);
	const nameOf = (id: string) => names.get(id)?.companyName ?? '—';
	const feedback = rfqFeedback.map((f) => ({ ...f, sellerName: nameOf(f.sellerId) }));

	const ticket = db.tickets.find((t) => t.rfqId === rfq.id && t.userId === user.id && t.status !== 'RESOLVED');

	const sortParam = url.searchParams.get('sort') as QuoteSort | null;
	const sort: QuoteSort = sortParam && SORTS.includes(sortParam) ? sortParam : 'price';

	return {
		rfq: { id: rfq.id, values: rfq.values, files: rfq.files, status: rfq.status, outcome: rfq.outcome, reopenCount: rfq.reopenCount, createdAt: rfq.createdAt, quoteDeadline: rfq.quoteDeadline, awardedQuoteId: rfq.awardedQuoteId },
		quotingOpen: isQuotingOpen(rfq),
		sort,
		quotes: await quoteRows(rfq, sort),
		interested: responses
			.filter((r) => r.kind === 'INTERESTED' && !db.quotes.some((q) => q.rfqId === rfq.id && q.sellerId === r.sellerId && q.versions.length))
			.map((r) => nameOf(r.sellerId)),
		interestedTotal: interestedCount(rfq.id),
		passed: responses.filter((r) => r.kind === 'NOT_FOR_US').length,
		matches,
		feedback,
		wanted: effectiveProcesses(rfq.values),
		ndaAcceptedCount: rfq.ndaAcceptedBy.length,
		openTicket: ticket ? { id: ticket.id, status: ticket.status } : null,
		justPosted: url.searchParams.get('posted') === '1'
	};
};

export const actions: Actions = {
	feedback: async ({ params, locals, url, request }) => {
		const { user, rfq } = ownRfq(locals, url, params.id);
		const data = await request.formData();
		const sellerId = data.get('sellerId')?.toString() ?? '';
		const outcome = data.get('outcome')?.toString();
		const rating = Number(data.get('rating'));
		const comment = (data.get('comment')?.toString() ?? '').trim().slice(0, 1000);
		const closeRfq = data.get('close') === 'on';

		const errors: Record<string, string> = {};
		const seller = sellerId ? await findSellerById(sellerId) : null;
		if (!seller) errors.sellerId = 'Choose the supplier.';
		if (outcome !== 'DEAL_DONE' && outcome !== 'NO_DEAL') errors.outcome = 'Did the deal happen?';
		if (!Number.isInteger(rating) || rating < 1 || rating > 5) errors.rating = 'Give a rating from 1 to 5 stars.';
		if (Object.keys(errors).length) return fail(400, { action: 'feedback' as const, errors });

		// One review per supplier per requirement — a new submission replaces the old one.
		const existing = db.feedback.find((f) => f.rfqId === rfq.id && f.sellerId === sellerId && f.buyerUserId === user.id);
		if (existing) {
			await addRating(sellerId, rating - existing.rating, 0); // replace the old rating
			Object.assign(existing, { outcome, rating, comment, at: now() });
		} else {
			db.feedback.push({ id: nextId('FB'), rfqId: rfq.id, buyerUserId: user.id, sellerId, outcome: outcome as 'DEAL_DONE' | 'NO_DEAL', rating, comment, at: now() });
			await addRating(sellerId, rating, 1);
		}

		if (closeRfq || outcome === 'DEAL_DONE') {
			rfq.status = 'CLOSED';
			rfq.outcome = outcome as 'DEAL_DONE' | 'NO_DEAL';
			rfq.updatedAt = now();
			await releaseQuotes(rfq);
		}
		return { action: 'feedback' as const, ok: true, closed: rfq.status === 'CLOSED' };
	},

	close: async ({ params, locals, url }) => {
		const { rfq } = ownRfq(locals, url, params.id);
		if (rfq.status === 'CLOSED') return fail(409, { action: 'close' as const, error: 'Already closed.' });
		rfq.status = 'CLOSED';
		rfq.outcome = rfq.outcome ?? 'NO_DEAL';
		rfq.updatedAt = now();
		await releaseQuotes(rfq);
		return { action: 'close' as const, ok: true };
	},

	shortlist: async ({ params, locals, url, request }) => {
		const { rfq } = ownRfq(locals, url, params.id);
		const qid = (await request.formData()).get('quoteId')?.toString();
		const q = db.quotes.find((x) => x.id === qid && x.rfqId === rfq.id);
		if (!q) return fail(404, { action: 'shortlist' as const, error: 'Quotation not found.' });
		const err = await shortlist(rfq, q);
		return err ? fail(409, { action: 'shortlist' as const, error: err }) : { action: 'shortlist' as const, ok: true };
	},

	reopen: async ({ params, locals, url }) => {
		const { rfq } = ownRfq(locals, url, params.id);
		if (rfq.status === 'OPEN') return fail(409, { action: 'reopen' as const, error: 'This requirement is already open.' });
		if (rfq.awardedQuoteId) return fail(409, { action: 'reopen' as const, error: 'This order was awarded. Post a new requirement for a repeat order.' });
		rfq.status = 'OPEN';
		rfq.outcome = undefined;
		// Fresh 7-day quotation window so new suppliers can respond.
		rfq.quoteDeadline = new Date(Date.now() + 7 * 86_400_000).toISOString();
		rfq.reopenCount += 1;
		rfq.updatedAt = now();
		return { action: 'reopen' as const, ok: true };
	}
};
