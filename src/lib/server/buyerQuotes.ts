// Buyer-side quotation logic shared by the RFQ page and the quote detail page.

import { error } from '@sveltejs/kit';
import { isActive } from './accounts.ts';
import { requireUser } from './auth.ts';
import { db, now, sellerRating, type Quote, type Rfq } from './db.ts';
import { scoreMatch } from './matching.ts';
import { notifySeller } from './notify.ts';
import { sellersById } from './sellers.ts';
import { addEvent, buyerInsights, counterRounds, isLive, latest, pendingCounter } from './quotes.ts';
import { landed, MAX_COUNTER_ROUNDS, inr } from '../quote.ts';
import { pickedProcesses } from '../rfqFields.ts';
import { maskContacts } from '../contactMask.ts';

export function ownRfq(locals: App.Locals, url: URL, id: string) {
	const user = requireUser(locals, url, ['BUYER']);
	const rfq = db.rfqs.find((r) => r.id === id);
	// 404 (not 403) so RFQ ids can't be probed.
	if (!rfq || rfq.buyerUserId !== user.id) error(404, 'Requirement not found');
	return { user, rfq };
}

export function ownQuote(locals: App.Locals, url: URL, rfqId: string, quoteId: string) {
	const { user, rfq } = ownRfq(locals, url, rfqId);
	const quote = db.quotes.find((q) => q.id === quoteId && q.rfqId === rfq.id);
	if (!quote || quote.versions.length === 0) error(404, 'Quotation not found');
	return { user, rfq, quote };
}

export type QuoteSort = 'price' | 'distance' | 'lead' | 'rating';

/** Comparison rows for the buyer. Default order: lowest landed price first. */
export async function quoteRows(rfq: Rfq, sort: QuoteSort = 'price') {
	const all = db.quotes.filter((q) => q.rfqId === rfq.id && q.versions.length);
	const sellerMap = await sellersById(all.map((q) => q.sellerId)); // one query for every quoting seller
	// Quotes from a supplier the admin team suspended/deactivated are not shown.
	const rows = all.filter((q) => sellerMap.has(q.sellerId) && isActive(sellerMap.get(q.sellerId))).map((q) => {
		const seller = sellerMap.get(q.sellerId)!;
		const v = latest(q);
		const m = scoreMatch(seller, rfq);
		return {
			id: q.id,
			status: q.status,
			live: isLive(q),
			version: v.v,
			seller: { id: seller.id, slug: seller.slug, companyName: seller.companyName, city: seller.city, verification: seller.verification, rating: sellerRating(seller), reviewCount: seller.reviewCount },
			distanceKm: m.distanceKm,
			zone: m.zone,
			/** processes of this RFQ the supplier lists as its own capability */
			covers: m.covers.length,
			/** 0 = buyer chose only a type of work */
			wanted: pickedProcesses(rfq.values).length,
			landed: landed(v),
			unitPrice: v.unitPrice,
			toolingCost: v.toolingCost,
			toolOwnedByBuyer: v.toolOwnedByBuyer,
			freight: v.freight,
			includes: v.includes,
			sampleDays: v.sampleDays,
			bulkDays: v.bulkDays,
			paymentTerms: v.paymentTerms,
			validTill: v.validTill,
			counterPending: !!pendingCounter(q),
			rounds: counterRounds(q),
			insights: buyerInsights(q, rfq, seller, all),
			updatedAt: q.updatedAt
		};
	});
	const live = rows.filter((r) => r.live);
	const dead = rows.filter((r) => !r.live);
	const cmp: Record<QuoteSort, (a: (typeof rows)[number], b: (typeof rows)[number]) => number> = {
		price: (a, b) => a.landed.perPiece - b.landed.perPiece,
		distance: (a, b) => a.zone - b.zone || (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9),
		lead: (a, b) => a.bulkDays - b.bulkDays,
		rating: (a, b) => (b.seller.rating ?? 0) - (a.seller.rating ?? 0)
	};
	return [...live.sort(cmp[sort]), ...dead.sort(cmp.price)];
}

const link = (q: Quote) => `/seller/rfq/${q.rfqId}`;

export async function shortlist(rfq: Rfq, q: Quote): Promise<string | null> {
	if (rfq.status !== 'OPEN') return 'This requirement is closed.';
	if (q.status !== 'SUBMITTED') return q.status === 'SHORTLISTED' ? null : 'Only new quotations can be shortlisted.';
	q.status = 'SHORTLISTED';
	addEvent(q, { by: 'BUYER', kind: 'SHORTLIST' });
	await notifySeller(q.sellerId, { type: 'SHORTLISTED', title: 'You are shortlisted ⭐', body: `The buyer shortlisted your quote for ${rfq.values.partName} — their contact details are now on the requirement page.`, link: link(q) });
	return null;
}

export async function counterOffer(rfq: Rfq, q: Quote, data: FormData): Promise<{ error?: string; fieldErrors?: Record<string, string> }> {
	if (rfq.status !== 'OPEN') return { error: 'This requirement is closed.' };
	if (!['SUBMITTED', 'SHORTLISTED', 'NEGOTIATING'].includes(q.status)) return { error: 'You can only negotiate on an active quotation.' };
	if (pendingCounter(q)) return { error: 'Your previous counter-offer is still waiting for the supplier’s reply.' };
	if (counterRounds(q) >= MAX_COUNTER_ROUNDS) return { error: `Maximum ${MAX_COUNTER_ROUNDS} counter-offers reached — accept, decline, or message the supplier.` };

	const unitPrice = data.get('targetUnitPrice')?.toString().trim() ?? '';
	const bulkDays = data.get('targetBulkDays')?.toString().trim() ?? '';
	const paymentTerms = data.get('targetPaymentTerms')?.toString() ?? '';
	const message = (data.get('message')?.toString() ?? '').trim().slice(0, 500);
	const e: Record<string, string> = {};
	const target: { unitPrice?: number; bulkDays?: number; paymentTerms?: string } = {};
	if (unitPrice) {
		const n = Number(unitPrice);
		if (!Number.isFinite(n) || n <= 0) e.targetUnitPrice = 'Enter a price above 0.';
		else target.unitPrice = Math.round(n * 100) / 100;
	}
	if (bulkDays) {
		const n = Number(bulkDays);
		if (!Number.isInteger(n) || n < 1 || n > 730) e.targetBulkDays = 'Enter whole days (1–730).';
		else target.bulkDays = n;
	}
	if (paymentTerms.trim()) {
		const t = paymentTerms.trim();
		if (t.length < 3 || t.length > 120) e.targetPaymentTerms = 'Payment terms should be 3–120 characters.';
		else if (t !== latest(q).paymentTerms) target.paymentTerms = t;
	}
	if (Object.keys(e).length) return { fieldErrors: e };
	if (!Object.keys(target).length && !message) return { error: 'Propose a price, lead time or payment terms, or add a message.' };

	q.status = 'NEGOTIATING';
	addEvent(q, { by: 'BUYER', kind: 'COUNTER', target, message: message || undefined });
	const bits = [target.unitPrice && `${inr(target.unitPrice)}/pc`, target.bulkDays && `${target.bulkDays} days`, target.paymentTerms].filter(Boolean).join(' · ');
	await notifySeller(q.sellerId, { type: 'COUNTER', title: 'Counter-offer from buyer 🤝', body: `For ${rfq.values.partName}: ${bits || maskContacts(message)}. Accept, revise or decline.`, link: link(q) });
	return {};
}

export async function award(rfq: Rfq, q: Quote): Promise<string | null> {
	if (rfq.status !== 'OPEN') return 'This requirement is already closed.';
	if (!isLive(q)) return 'This quotation is no longer active.';
	if (pendingCounter(q)) return 'Your counter-offer is still pending — wait for the supplier’s reply, or accept their current quote after they respond.';
	q.status = 'ACCEPTED';
	addEvent(q, { by: 'BUYER', kind: 'AWARD', version: latest(q).v });
	rfq.status = 'CLOSED';
	rfq.outcome = 'DEAL_DONE';
	rfq.awardedQuoteId = q.id;
	rfq.updatedAt = now();
	await notifySeller(q.sellerId, { type: 'AWARDED', title: 'You won the order! 🏆', body: `${rfq.values.partName} (${rfq.id}) was awarded to you at ${inr(landed(latest(q)).perPiece)}/pc landed. Contacts are now shared — confirm the PO with the buyer.`, link: link(q) });
	for (const other of db.quotes.filter((x) => x.rfqId === rfq.id && x.id !== q.id && isLive(x))) {
		other.status = 'NOT_SELECTED';
		other.updatedAt = now();
		await notifySeller(other.sellerId, { type: 'NOT_SELECTED', title: 'Order awarded to another supplier', body: `${rfq.values.partName} (${rfq.id}) went to another supplier. Thanks for quoting — keep an eye on new leads.`, link: link(other) });
	}
	return null;
}

export async function declineQuote(rfq: Rfq, q: Quote, reason: string): Promise<string | null> {
	if (!isLive(q) || q.status === 'ACCEPTED') return 'This quotation cannot be declined.';
	q.status = 'DECLINED';
	addEvent(q, { by: 'BUYER', kind: 'DECLINE', message: reason || undefined });
	await notifySeller(q.sellerId, { type: 'DECLINED', title: 'Quotation declined', body: `The buyer declined your quote for ${rfq.values.partName}${reason ? `: “${reason}”` : ''}.`, link: link(q) });
	return null;
}

/** Requirement closed without (or outside) an award: release every still-live quote and tell the sellers. */
export async function releaseQuotes(rfq: Rfq) {
	for (const q of db.quotes.filter((x) => x.rfqId === rfq.id && isLive(x) && x.status !== 'ACCEPTED')) {
		q.status = 'NOT_SELECTED';
		q.updatedAt = now();
		await notifySeller(q.sellerId, { type: 'NOT_SELECTED', title: 'Requirement closed', body: `The buyer closed ${rfq.values.partName} (${rfq.id}) without selecting your quote.`, link: link(q) });
	}
}
