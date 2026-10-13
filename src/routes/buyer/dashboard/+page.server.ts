// src/routes/buyer/dashboard/+page.server.ts
import { requireUser } from '#lib/server/auth.ts';
import { db } from '#lib/server/db.ts';
import { notificationsFor } from '#lib/server/notify.ts';
import { listSellers } from '#lib/server/sellers.ts';
import { interestedCount, isLive, isQuotingOpen, latest } from '#lib/server/quotes.ts';
import { landed } from '#lib/quote.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireUser(locals, url, ['BUYER']);

	const rfqs = db.rfqs
		.filter((r) => r.buyerUserId === user.id)
		.map((r) => {
			const live = db.quotes.filter((q) => q.rfqId === r.id && isLive(q) && q.versions.length);
			const prices = live.map((q) => landed(latest(q)).perPiece);
			let stage: 'AWAITING' | 'QUOTES' | 'NEGOTIATING' | 'AWARDED' | 'CLOSED' = 'AWAITING';
			if (r.awardedQuoteId) stage = 'AWARDED';
			else if (r.status === 'CLOSED') stage = 'CLOSED';
			else if (live.some((q) => q.status === 'NEGOTIATING')) stage = 'NEGOTIATING';
			else if (live.length) stage = 'QUOTES';
			return {
				stage,
				quoteCount: live.length,
				lowest: prices.length ? Math.min(...prices) : null,
				interested: interestedCount(r.id),
				quotingOpen: isQuotingOpen(r),
				deadline: r.quoteDeadline,
				// a supplier answered your counter-offer, or a new quote you haven't acted on
				// the supplier moved last on some quote (new quote, revision, reply to your counter)
				needsAction: r.status === 'OPEN' && live.some((q) => q.thread[q.thread.length - 1]?.by === 'SELLER'),
				id: r.id,
				title: String(r.values.partName ?? r.id),
				quantity: String(r.values.quantity ?? ''),
				orderType: String(r.values.orderType ?? ''),
				createdAt: r.createdAt
			};
		});

	const pipeline = {
		AWAITING: rfqs.filter((r) => r.stage === 'AWAITING').length,
		QUOTES: rfqs.filter((r) => r.stage === 'QUOTES').length,
		NEGOTIATING: rfqs.filter((r) => r.stage === 'NEGOTIATING').length,
		AWARDED: rfqs.filter((r) => r.stage === 'AWARDED').length
	};

	const recent = db.contacts
		.filter((c) => c.fromUserId === user.id || c.toBuyerUserId === user.id)
		.slice(-15)
		.reverse();
	// One query for every seller in the list: ones you contacted (by id) and ones who contacted you (by owner).
	const involved = await listSellers({
		$or: [{ id: { $in: recent.flatMap((c) => c.toSellerId ?? []) } }, { userId: { $in: recent.map((c) => c.fromUserId) } }]
	});
	const sellerName = (id?: string) => involved.find((s) => s.id === id)?.companyName ?? '—';
	const contacts = recent
		.map((c) => {
			const inbound = c.toBuyerUserId === user.id;
			const fromSeller = inbound ? involved.find((s) => s.userId === c.fromUserId)?.id : undefined;
			return {
				id: c.id,
				at: c.at,
				channel: c.channel,
				rfqId: c.rfqId,
				direction: inbound ? ('IN' as const) : ('OUT' as const),
				seller: inbound ? sellerName(fromSeller) : sellerName(c.toSellerId)
			};
		});

	const updates = notificationsFor(user.id)
		.slice(0, 5)
		.map((n) => ({ id: n.id, title: n.title, body: n.body, at: n.at, read: n.read }));

	// Orders managed by the eYantrik team (off-platform deals are not tracked).
	const orders = db.jobs
		.filter((j) => j.buyerUserId === user.id)
		.map((j) => ({ id: j.id, partName: j.partName, quantity: j.quantity, status: j.status, last: j.milestones.at(-1) ?? null }));

	const tickets = db.tickets
		.filter((t) => t.userId === user.id)
		.map((t) => ({ id: t.id, rfqId: t.rfqId, status: t.status, message: t.message, createdAt: t.createdAt }));

	return { buyer: { name: user.name, companyName: user.companyName }, rfqs, pipeline, contacts, tickets, updates, orders, unlocked: rfqs.length > 0 };
};
