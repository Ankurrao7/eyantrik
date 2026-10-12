// Seller view of one requirement: full details, NDA, buyer contact, quotation form,
// and the negotiation thread (respond to counter-offers, revise, withdraw).
import { error, fail, redirect } from '@sveltejs/kit';
import { canSeeBuyerContacts, requireUser } from '#lib/server/auth.ts';
import { db, nextId, now, type Quote, type Seller, type User } from '#lib/server/db.ts';
import { buyerOf, scoreMatch } from '#lib/server/matching.ts';
import { notifyBuyerOf } from '#lib/server/notify.ts';
import { findSellerById, updateSeller } from '#lib/server/sellers.ts';
import {
	addEvent, isLive, isQuotingOpen, latest, liveQuoteCount, markInterested, parseQuoteForm,
	pendingCounter, quoteFormDefaults, sellerResponse
} from '#lib/server/quotes.ts';
import { landed, inr } from '#lib/quote.ts';
import type { Actions, PageServerLoad } from './$types';

async function ctx(locals: App.Locals, url: URL, rfqId: string): Promise<{ user: User; seller: Seller; rfq: (typeof db.rfqs)[number]; quote?: Quote }> {
	const user = requireUser(locals, url, ['SELLER']);
	const seller = user.sellerId ? await findSellerById(user.sellerId) : null;
	if (!seller) redirect(303, '/seller/onboarding');
	const rfq = db.rfqs.find((r) => r.id === rfqId);
	const quote = rfq ? db.quotes.find((q) => q.rfqId === rfq.id && q.sellerId === seller.id) : undefined;
	// Closed requirements stay visible only to sellers who took part.
	if (!rfq || (rfq.status !== 'OPEN' && !quote)) error(404, 'Requirement not found or closed');
	return { user, seller, rfq, quote };
}

/** Can this seller send a NEW quote or a revision right now? */
function quotingAllowed(rfq: (typeof db.rfqs)[number], quote: Quote | undefined): { ok: boolean; why?: string } {
	if (quote?.status === 'ACCEPTED') return { ok: false, why: 'Your quote was accepted — the deal is done.' };
	if (rfq.status !== 'OPEN') return { ok: false, why: 'This requirement is closed.' };
	if (quote?.status === 'NEGOTIATING') return { ok: true }; // negotiation may continue after the deadline
	// OUTDATED (buyer edited the RFQ) falls through: re-quote while the new window is open.
	if (!isQuotingOpen(rfq)) return { ok: false, why: 'The quotation window for this requirement has closed.' };
	return { ok: true };
}

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const { user, seller, rfq, quote } = await ctx(locals, url, params.id);
	const verified = await canSeeBuyerContacts(user);
	const m = scoreMatch(seller, rfq);
	const ndaRequired = rfq.values.ndaRequired === 'yes';
	const buyer = await buyerOf(rfq);
	const allowed = quotingAllowed(rfq, quote);
	const counter = quote ? pendingCounter(quote) : null;

	return {
		rfq: { id: rfq.id, values: rfq.values, status: rfq.status, deadline: rfq.quoteDeadline, createdAt: rfq.createdAt },
		verified,
		match: { covers: m.covers, isMatch: m.score > 0, distanceKm: m.distanceKm, zone: m.zone },
		ndaRequired,
		ndaAccepted: rfq.ndaAcceptedBy.includes(seller.id),
		drawingCount: rfq.files.drawings?.length ?? 0,
		drawings: verified && (!ndaRequired || rfq.ndaAcceptedBy.includes(seller.id)) ? (rfq.files.drawings ?? []) : [],
		buyer: verified && buyer ? { userId: buyer.id, name: buyer.name, companyName: buyer.companyName, phone: buyer.phone } : null,
		quoteCount: liveQuoteCount(rfq.id),
		interested: sellerResponse(rfq.id, seller.id)?.kind === 'INTERESTED',
		quote: quote ? { id: quote.id, status: quote.status, versions: quote.versions, thread: quote.thread, live: isLive(quote) } : null,
		counter,
		canQuote: verified && allowed.ok,
		cannotQuoteWhy: !verified ? 'Quotations unlock once your documents are verified.' : allowed.why,
		defaults: quoteFormDefaults(rfq, quote ? latest(quote) : undefined, seller),
		autoFilled: !quote && !!seller.quoteDefaults?.autoFill,
		estimator: {
			machineHourRate: seller.quoteDefaults?.machineHourRate ?? 800,
			overheadPct: seller.quoteDefaults?.overheadPct ?? 10,
			profitPct: seller.quoteDefaults?.profitPct ?? 15
		},
		requote: quote?.status === 'OUTDATED',
		rfqEditCount: rfq.editCount,
		sellerName: seller.companyName
	};
};

export const actions: Actions = {
	interested: async ({ params, locals, url }) => {
		const { seller } = await ctx(locals, url, params.id);
		const err = markInterested(seller, params.id);
		return err ? fail(409, { error: err }) : { message: 'Marked interested — the buyer has been notified.' };
	},

	acceptNda: async ({ params, locals, url }) => {
		const { user, seller, rfq } = await ctx(locals, url, params.id);
		if (!(await canSeeBuyerContacts(user))) return fail(403, { error: 'Only verified sellers can accept NDAs.' });
		if (!rfq.ndaAcceptedBy.includes(seller.id)) rfq.ndaAcceptedBy.push(seller.id);
		return { message: 'NDA accepted — drawings unlocked.' };
	},

	submitQuote: async ({ params, locals, url, request }) => {
		const { user, seller, rfq, quote } = await ctx(locals, url, params.id);
		if (!(await canSeeBuyerContacts(user))) return fail(403, { error: 'Quotations unlock once your documents are verified.' });
		const allowed = quotingAllowed(rfq, quote);
		if (!allowed.ok) return fail(409, { error: allowed.why });

		let formData: FormData;
		try {
			formData = await request.formData();
		} catch {
			return fail(400, { error: 'Upload failed — keep attachments under 10 MB each.' });
		}
		const parsed = await parseQuoteForm(formData, rfq, quote ? latest(quote) : undefined, user.id);
		if (!parsed.version) return fail(400, { values: parsed.values, errors: parsed.errors, error: 'Please fix the highlighted fields.' });
		if (parsed.saveDefaults) {
			await updateSeller(seller.id, {
				quoteDefaults: {
					...seller.quoteDefaults,
					autoFill: true,
					gstPercent: parsed.version.gstPercent,
					paymentTerms: parsed.version.paymentTerms,
					includes: parsed.version.includes,
					freight: parsed.version.freight,
					validityDays: Math.max(1, Math.round((Date.parse(parsed.version.validTill) - Date.now()) / 86_400_000))
				}
			});
		}

		const title = String(rfq.values.partName ?? rfq.id);
		let q = quote;
		let isRevision = false;
		if (!q) {
			q = { id: nextId('Q'), rfqId: rfq.id, sellerId: seller.id, status: 'SUBMITTED', versions: [], thread: [], createdAt: now(), updatedAt: now() };
			db.quotes.push(q);
		} else {
			isRevision = q.versions.length > 0;
			if (!isLive(q)) q.status = 'SUBMITTED'; // re-quoting after withdraw/decline
		}
		const v = q.versions.length + 1;
		q.versions.push({ ...parsed.version, v, at: now() });
		addEvent(q, { by: 'SELLER', kind: isRevision ? 'REVISION' : 'QUOTE', version: v });

		// Quoting implies interest.
		if (!sellerResponse(rfq.id, seller.id)) db.responses.push({ rfqId: rfq.id, sellerId: seller.id, kind: 'INTERESTED', at: now() });
		else Object.assign(sellerResponse(rfq.id, seller.id)!, { kind: 'INTERESTED', reason: undefined });

		const price = inr(landed(parsed.version).perPiece);
		notifyBuyerOf(rfq, isRevision
			? { type: 'QUOTE_REVISED', title: 'Quotation revised', body: `${seller.companyName} revised their quote for ${title} to ${price}/pc landed (v${v}).`, link: `/buyer/rfq/${rfq.id}/quotes/${q.id}` }
			: { type: 'QUOTE_RECEIVED', title: 'New quotation received', body: `${seller.companyName} quoted ${price}/pc landed for ${rfq.id} ${title}.`, link: `/buyer/rfq/${rfq.id}` });
		return { message: isRevision ? `Revision v${v} sent to the buyer.` : 'Quotation sent! The buyer has been notified.' };
	},

	acceptCounter: async ({ params, locals, url }) => {
		const { seller, rfq, quote } = await ctx(locals, url, params.id);
		const counter = quote ? pendingCounter(quote) : null;
		if (!quote || !counter || rfq.status !== 'OPEN') return fail(409, { error: 'There is no open counter-offer to accept.' });
		const base = latest(quote);
		const v = quote.versions.length + 1;
		quote.versions.push({
			...base,
			v,
			unitPrice: counter.target?.unitPrice ?? base.unitPrice,
			bulkDays: counter.target?.bulkDays ?? base.bulkDays,
			paymentTerms: counter.target?.paymentTerms ?? base.paymentTerms,
			at: now()
		});
		addEvent(quote, { by: 'SELLER', kind: 'ACCEPT_COUNTER', version: v });
		notifyBuyerOf(rfq, { type: 'COUNTER_ACCEPTED', title: 'Counter-offer accepted', body: `${seller.companyName} accepted your terms for ${rfq.values.partName} (v${v}). You can award the order now.`, link: `/buyer/rfq/${rfq.id}/quotes/${quote.id}` });
		return { message: 'You accepted the buyer’s offer. They can now award you the order.' };
	},

	declineCounter: async ({ params, locals, url, request }) => {
		const { seller, rfq, quote } = await ctx(locals, url, params.id);
		if (!quote || !pendingCounter(quote)) return fail(409, { error: 'There is no open counter-offer.' });
		const message = ((await request.formData()).get('message')?.toString() ?? '').trim().slice(0, 500);
		addEvent(quote, { by: 'SELLER', kind: 'DECLINE_COUNTER', message: message || undefined });
		notifyBuyerOf(rfq, { type: 'COUNTER_DECLINED', title: 'Counter-offer declined', body: `${seller.companyName} can’t meet your counter-offer${message ? `: “${message}”` : ''}. Their last quote still stands.`, link: `/buyer/rfq/${rfq.id}/quotes/${quote.id}` });
		return { message: 'Declined. Your last quote still stands — you can also send a revision.' };
	},

	withdraw: async ({ params, locals, url }) => {
		const { seller, rfq, quote } = await ctx(locals, url, params.id);
		if (!quote || !isLive(quote) || quote.status === 'ACCEPTED') return fail(409, { error: 'Nothing to withdraw.' });
		quote.status = 'WITHDRAWN';
		addEvent(quote, { by: 'SELLER', kind: 'WITHDRAW' });
		notifyBuyerOf(rfq, { type: 'WITHDRAWN', title: 'Quotation withdrawn', body: `${seller.companyName} withdrew their quote for ${rfq.values.partName}.`, link: `/buyer/rfq/${rfq.id}` });
		return { message: 'Quotation withdrawn.' };
	}
};
