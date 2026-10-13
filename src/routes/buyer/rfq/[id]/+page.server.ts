import { fail } from '@sveltejs/kit';
import { contactsShared } from '#lib/server/auth.ts';
import { ownRfq, quoteRows, releaseQuotes, shortlist, type QuoteSort } from '#lib/server/buyerQuotes.ts';
import { db, isInvited, nextId, now } from '#lib/server/db.ts';
import { inviteMore, MORE_INVITES, uninvitedMatches } from '#lib/server/invites.ts';
import { scoreMatch, toPublicSeller } from '#lib/server/matching.ts';
import { messageCount } from '#lib/server/messages.ts';
import { addRating, findSellerById, isListed, sellersById } from '#lib/server/sellers.ts';
import { interestedCount, isQuotingOpen, sellerResponse } from '#lib/server/quotes.ts';
import { pickedProcesses } from '#lib/rfqFields.ts';
import { normalizeShop, shopLabel } from '#lib/processes.ts';
import type { Actions, PageServerLoad } from './$types';

const SORTS: QuoteSort[] = ['price', 'distance', 'lead', 'rating'];

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const { user, rfq } = ownRfq(locals, url, params.id);

	// The suppliers invited to quote (curated, best first). Contacts only for those whose quote was shortlisted.
	const invitedSellers = await sellersById(rfq.invites.map((i) => i.sellerId));
	const invited = rfq.invites
		.filter((i) => invitedSellers.has(i.sellerId) && isListed(invitedSellers.get(i.sellerId)!))
		.map((i) => {
			const seller = invitedSellers.get(i.sellerId)!;
			const m = scoreMatch(seller, rfq);
			const response = sellerResponse(rfq.id, seller.id);
			const quote = db.quotes.find((q) => q.rfqId === rfq.id && q.sellerId === seller.id && q.versions.length);
			return {
				seller: toPublicSeller(seller, contactsShared(rfq, seller.id)),
				covers: m.covers,
				distanceKm: m.distanceKm,
				materialMatch: m.materialMatch,
				zone: m.zone,
				reason: i.reason,
				state: quote ? ('QUOTED' as const) : response?.kind === 'INTERESTED' ? ('INTERESTED' as const) : response?.kind === 'NOT_FOR_US' ? ('PASSED' as const) : ('INVITED' as const),
				messages: messageCount(rfq.id, seller.id),
				contacted: db.contacts.some((c) => c.rfqId === rfq.id && c.fromUserId === user.id && c.toSellerId === seller.id)
			};
		});
	const moreAvailable = !rfq.hidden && isQuotingOpen(rfq) ? (await uninvitedMatches(rfq)).length : 0;

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
		invited,
		moreAvailable,
		moreBatch: MORE_INVITES,
		feedback,
		wanted: pickedProcesses(rfq.values),
		workType: shopLabel(normalizeShop(String(rfq.values.commodityCategory ?? ''))),
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
		if (!seller || !isInvited(rfq, seller.id)) errors.sellerId = 'Choose one of the suppliers invited to this requirement.';
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

	inviteMore: async ({ params, locals, url }) => {
		const { rfq } = ownRfq(locals, url, params.id);
		if (rfq.status !== 'OPEN' || !isQuotingOpen(rfq)) return fail(409, { action: 'inviteMore' as const, error: 'The quotation window is closed — reopen the requirement first.' });
		const n = await inviteMore(rfq, MORE_INVITES, 'BUYER');
		return n ? { action: 'inviteMore' as const, ok: true, invitedMore: n } : fail(409, { action: 'inviteMore' as const, error: 'No more matching verified suppliers right now. Our help desk can find one for you.' });
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
		const n = await inviteMore(rfq, MORE_INVITES, 'BUYER'); // "try other suppliers"
		return { action: 'reopen' as const, ok: true, invitedMore: n };
	}
};
