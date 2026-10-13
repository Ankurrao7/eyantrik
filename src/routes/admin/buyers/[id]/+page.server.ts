// Buyer file for the admin team: full contact details (never blurred), every requirement, quotes received,
// orders, contacts, help desk requests and managed orders — plus suspend / deactivate / reactivate.
// The admin never edits the buyer's details — those are entered and updated by the buyer only.
import { error, fail } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth.ts';
import { db } from '#lib/server/db.ts';
import { parseStatusForm, setBuyerStatus } from '#lib/server/accounts.ts';
import { isLive, latest } from '#lib/server/quotes.ts';
import { listSellers, sellersById } from '#lib/server/sellers.ts';
import { findUserById } from '#lib/server/users.ts';
import { landed } from '#lib/quote.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadBuyer(id: string) {
	const user = await findUserById(id);
	if (!user || user.role !== 'BUYER') error(404, 'Buyer not found');
	return user;
}

export const load: PageServerLoad = async ({ params, locals, url }) => {
	requireUser(locals, url, ['ADMIN']);
	const u = await loadBuyer(params.id);
	const rfqs = db.rfqs.filter((r) => r.buyerUserId === u.id);
	const rfqIds = new Set(rfqs.map((r) => r.id));
	const quotes = db.quotes.filter((q) => rfqIds.has(q.rfqId) && q.versions.length);
	const contacts = db.contacts.filter((c) => c.fromUserId === u.id && c.toSellerId);
	const contactedBy = db.contacts.filter((c) => c.toBuyerUserId === u.id);
	const feedback = db.feedback.filter((f) => f.buyerUserId === u.id);
	const [names, callers] = await Promise.all([
		sellersById([...quotes.map((q) => q.sellerId), ...contacts.map((c) => c.toSellerId), ...feedback.map((f) => f.sellerId)]),
		// sellers who contacted this buyer are logged by their login id
		listSellers({ userId: { $in: [...new Set(contactedBy.map((c) => c.fromUserId))] } })
	]);
	const sellerName = (id?: string) => (id && names.get(id)?.companyName) || '—';
	const callerOf = (userId: string) => callers.find((s) => s.userId === userId);

	return {
		buyer: {
			id: u.id,
			name: u.name,
			companyName: u.companyName,
			phone: u.phone,
			email: u.email ?? '',
			createdAt: u.createdAt,
			accountLog: u.accountLog ?? []
		},
		account: { status: u.accountStatus ?? ('ACTIVE' as const), reason: u.accountStatusReason ?? '' },
		requirements: rfqs.map((r) => {
			const live = quotes.filter((q) => q.rfqId === r.id && isLive(q));
			return {
				id: r.id,
				title: String(r.values.partName ?? r.id),
				quantity: String(r.values.quantity ?? ''),
				city: String(r.values.deliveryCity ?? ''),
				status: r.awardedQuoteId ? 'AWARDED' : r.status,
				outcome: r.outcome ?? null,
				quotes: quotes.filter((q) => q.rfqId === r.id).length,
				lowest: live.length ? Math.min(...live.map((q) => landed(latest(q)).perPiece)) : null,
				awardedTo: r.awardedQuoteId ? sellerName(quotes.find((q) => q.id === r.awardedQuoteId)?.sellerId) : null,
				createdAt: r.createdAt
			};
		}),
		stats: {
			rfqs: rfqs.length,
			open: rfqs.filter((r) => r.status === 'OPEN').length,
			quotes: quotes.length,
			awarded: rfqs.filter((r) => r.awardedQuoteId).length,
			contacts: contacts.length,
			contactedBy: contactedBy.length
		},
		contacts: contacts.slice(-20).reverse().map((c) => ({ id: c.id, at: c.at, channel: c.channel, rfqId: c.rfqId, sellerId: c.toSellerId!, seller: sellerName(c.toSellerId) })),
		contactedBy: contactedBy.slice(-20).reverse().map((c) => ({ id: c.id, at: c.at, channel: c.channel, rfqId: c.rfqId, sellerId: callerOf(c.fromUserId)?.id ?? null, seller: callerOf(c.fromUserId)?.companyName ?? '—' })),
		feedback: feedback.slice().reverse().map((f) => ({ id: f.id, rfqId: f.rfqId, seller: sellerName(f.sellerId), sellerId: f.sellerId, rating: f.rating, comment: f.comment, outcome: f.outcome, at: f.at })),
		tickets: db.tickets.filter((t) => t.userId === u.id).map((t) => ({ id: t.id, status: t.status, message: t.message, createdAt: t.createdAt })),
		jobs: db.jobs.filter((j) => j.buyerUserId === u.id).map((j) => ({ id: j.id, partName: j.partName, quantity: j.quantity, status: j.status }))
	};
};

export const actions: Actions = {
	// Suspend / deactivate / reactivate the buyer login (details are never edited here).
	setStatus: async ({ params, request, locals, url }) => {
		const admin = requireUser(locals, url, ['ADMIN']);
		const u = await loadBuyer(params.id);
		const parsed = parseStatusForm(await request.formData());
		if (!parsed.ok) return fail(400, { error: parsed.error });
		if ((u.accountStatus ?? 'ACTIVE') === parsed.status) return fail(409, { error: 'The account is already in that state.' });
		await setBuyerStatus(u.id, { status: parsed.status, reason: parsed.reason, by: admin.name });
		const done = parsed.status === 'ACTIVE' ? 'reactivated — requirements visible to sellers again' : parsed.status === 'SUSPENDED' ? 'suspended — signed out, requirements hidden from sellers' : 'deactivated — signed out, requirements hidden from sellers';
		return { message: `${u.name} (${u.companyName}) ${done}.` };
	}
};
