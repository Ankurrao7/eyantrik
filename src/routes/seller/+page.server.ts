// src/routes/seller/+page.server.ts — Seller Dashboard / Lead Feed
import { fail, redirect } from '@sveltejs/kit';
import { isVerifiedSeller, requireUser } from '#lib/server/auth.ts';
import { db, isInvited, now, sellerRating, type Seller, type User } from '#lib/server/db.ts';
import { inviteMore } from '#lib/server/invites.ts';
import { messageCount } from '#lib/server/messages.ts';
import { notificationsFor } from '#lib/server/notify.ts';
import { scoreMatch } from '#lib/server/matching.ts';
import { findSellerById } from '#lib/server/sellers.ts';
import { isQuotingOpen, latest, liveQuoteCount, markInterested, pendingCounter, sellerResponse } from '#lib/server/quotes.ts';
import { byNearness } from '#lib/geo.ts';
import { landed } from '#lib/quote.ts';
import { pickedProcesses } from '#lib/rfqFields.ts';
import { normalizeShop, shopLabel } from '#lib/processes.ts';
import { profileScore } from '#lib/profileScore.ts';
import type { Actions, PageServerLoad } from './$types';

const TABS = ['matched', 'interested', 'quoted', 'negotiating', 'won', 'lost'] as const;
type Tab = (typeof TABS)[number];

const NOT_FOR_US_REASONS = [
	'Capacity is full right now',
	'Not our process / capability',
	'Quantity too low',
	'Quantity too high',
	'Material we do not work with',
	'Too far from us',
	'Timeline too short',
	'Other'
];

async function currentSeller(locals: App.Locals, url: URL): Promise<{ user: User; seller: Seller }> {
	const user = requireUser(locals, url, ['SELLER']);
	const seller = user.sellerId ? await findSellerById(user.sellerId) : null;
	if (!seller) redirect(303, '/seller/onboarding');
	return { user, seller };
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user, seller } = await currentSeller(locals, url);
	const verified = await isVerifiedSeller(user);
	const tabParam = url.searchParams.get('tab') as Tab | null;
	const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : 'matched';
	const maxZone = Math.min(4, Math.max(0, Number.parseInt(url.searchParams.get('zone') ?? '4', 10) || 4));

	// Only requirements this supplier was invited to (or already quoted on) — curated, not broadcast.
	// Hidden = the buyer's account was suspended/deactivated by the admin team.
	const rows = db.rfqs
		.filter((rfq) => !rfq.hidden && (isInvited(rfq, seller.id) || db.quotes.some((q) => q.rfqId === rfq.id && q.sellerId === seller.id)))
		.map((rfq) => {
			const m = scoreMatch(seller, rfq);
			const quote = db.quotes.find((q) => q.rfqId === rfq.id && q.sellerId === seller.id);
			const response = sellerResponse(rfq.id, seller.id);
			const open = isQuotingOpen(rfq);
			let bucket: Tab | 'hidden' = 'hidden';
			if (quote?.status === 'ACCEPTED') bucket = 'won';
			else if (quote && ['DECLINED', 'NOT_SELECTED'].includes(quote.status)) bucket = 'lost';
			else if (quote?.status === 'NEGOTIATING' && rfq.status === 'OPEN') bucket = 'negotiating';
			else if (quote && ['SUBMITTED', 'SHORTLISTED'].includes(quote.status) && rfq.status === 'OPEN') bucket = 'quoted';
			else if (open && response?.kind === 'INTERESTED') bucket = 'interested';
			else if (open && response?.kind !== 'NOT_FOR_US') bucket = 'matched';
			const picked = pickedProcesses(rfq.values);
			const wanted = picked.length ? picked : m.covers;
			return {
				bucket,
				id: rfq.id,
				title: String(rfq.values.partName ?? rfq.id),
				quantity: String(rfq.values.quantity ?? ''),
				values: rfq.values,
				wanted,
				/** set when the buyer chose only a type of work, e.g. "Machine shop (CNC & lathe)" */
				anyOf: picked.length ? null : shopLabel(normalizeShop(String(rfq.values.commodityCategory ?? ''))),
				covers: m.covers,
				isMatch: m.score > 0,
				zone: m.zone,
				distanceKm: m.distanceKm,
				deadline: rfq.quoteDeadline,
				quotingOpen: open,
				quoteCount: liveQuoteCount(rfq.id),
				interested: response?.kind === 'INTERESTED',
				messages: messageCount(rfq.id, seller.id),
				myQuote: quote
					? { status: quote.status, version: latest(quote).v, perPiece: landed(latest(quote)).perPiece, counterPending: !!pendingCounter(quote) }
					: null,
				createdAt: rfq.createdAt
			};
		})
		.filter((r) => r.bucket !== 'hidden');

	const counts = Object.fromEntries(TABS.map((t) => [t, rows.filter((r) => r.bucket === t).length])) as Record<Tab, number>;

	const list = rows
		.filter((r) => r.bucket === tab)
		.filter((r) => r.zone <= maxZone)
		.sort(byNearness);

	const mine = db.quotes.filter((q) => q.sellerId === seller.id);
	const won = mine.filter((q) => q.status === 'ACCEPTED').length;
	const lost = mine.filter((q) => q.status === 'DECLINED' || q.status === 'NOT_SELECTED').length;

	const updates = notificationsFor(user.id)
		.slice(0, 5)
		.map((n) => ({ id: n.id, title: n.title, body: n.body, at: n.at, read: n.read }));

	const score = profileScore(seller);
	return {
		updates,
		profile: { percent: score.percent, missing: score.missing.slice(0, 3), missingCount: score.missing.length },
		seller: {
			id: seller.id,
			slug: seller.slug,
			companyName: seller.companyName,
			verification: seller.verification,
			rejectionReason: seller.rejectionReason,
			groundInspection: seller.groundInspection,
			documents: seller.documents,
			processes: seller.processes,
			rating: sellerRating(seller),
			reviewCount: seller.reviewCount,
			pincode: seller.pincode
		},
		verified,
		// not verified yet: how many open requirements match their work (they are not invited until verified)
		teaserCount: verified ? 0 : db.rfqs.filter((r) => !r.hidden && isQuotingOpen(r) && scoreMatch(seller, r).score > 0).length,
		tab,
		maxZone,
		counts,
		list,
		reasons: NOT_FOR_US_REASONS,
		stats: { quotesSent: mine.length, won, winRate: won + lost ? Math.round((won / (won + lost)) * 100) : null },
		submitted: url.searchParams.get('submitted') === '1'
	};
};

export const actions: Actions = {
	interested: async ({ request, locals, url }) => {
		const { seller } = await currentSeller(locals, url);
		const rfqId = (await request.formData()).get('rfqId')?.toString();
		const err = markInterested(seller, rfqId);
		return err ? fail(409, { error: err }) : { ok: true, interestedIn: rfqId };
	},

	notForUs: async ({ request, locals, url }) => {
		const { seller } = await currentSeller(locals, url);
		const data = await request.formData();
		const rfqId = data.get('rfqId')?.toString();
		const reason = data.get('reason')?.toString() ?? '';
		const rfq = db.rfqs.find((r) => r.id === rfqId);
		if (!rfq || rfq.hidden || !isInvited(rfq, seller.id)) return fail(404, { error: 'Requirement not found.' });
		if (!NOT_FOR_US_REASONS.includes(reason)) return fail(400, { error: 'Pick a reason — it helps us send you better leads.' });
		if (db.quotes.some((q) => q.rfqId === rfq.id && q.sellerId === seller.id && q.status !== 'WITHDRAWN'))
			return fail(409, { error: 'You already quoted on this — withdraw the quote instead.' });
		const existing = sellerResponse(rfq.id, seller.id);
		const alreadyPassed = existing?.kind === 'NOT_FOR_US';
		if (existing) Object.assign(existing, { kind: 'NOT_FOR_US', reason, at: now() });
		else db.responses.push({ rfqId: rfq.id, sellerId: seller.id, kind: 'NOT_FOR_US', reason, at: now() });
		if (!alreadyPassed) await inviteMore(rfq, 1, 'REPLACEMENT'); // keep the buyer's shortlist full
		return { ok: true, hidden: rfq.id };
	}
};
