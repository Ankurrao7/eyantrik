// src/routes/+page.server.ts
// One address, three home pages: visitor (public, SEO), buyer (buying + "your requirements" strip) and
// seller (leads, profile completeness, demand by type of work). Which one a tab shows is decided in the
// page by the tab's side (tabSide), so both signed-in sides' summaries are sent.
import { canSeeSellerContacts, sellerContactLock } from '#lib/server/auth.ts';
import { db, sellerRating, type Seller, type User } from '#lib/server/db.ts';
import { scoreMatch, toPublicSeller } from '#lib/server/matching.ts';
import { findSellerById, listedSellers } from '#lib/server/sellers.ts';
import { countUsers } from '#lib/server/users.ts';
import { isLive, isQuotingOpen, sellerResponse } from '#lib/server/quotes.ts';
import { normalizeShop, processesOfShop, SHOPS } from '#lib/processes.ts';
import { profileScore } from '#lib/profileScore.ts';
import type { PageServerLoad } from './$types';

/** Requirements sellers can act on (open, buyer not on hold). */
const openRfqs = () => db.rfqs.filter((r) => r.status === 'OPEN' && !r.hidden);

function buyerHome(u: User) {
	const mine = db.rfqs.filter((r) => r.buyerUserId === u.id);
	const open = mine.filter((r) => r.status === 'OPEN');
	const openIds = new Set(open.map((r) => r.id));
	return {
		name: u.name.split(' ')[0],
		total: mine.length,
		open: open.length,
		// quotes the buyer hasn't acted on yet (not shortlisted / negotiating / decided)
		quotesWaiting: db.quotes.filter((q) => openIds.has(q.rfqId) && q.versions.length && isLive(q) && q.status === 'SUBMITTED').length
	};
}

async function sellerHome(u: User) {
	const seller: Seller | null = u.sellerId ? await findSellerById(u.sellerId) : null;
	if (!seller) return { registered: false as const, name: u.name.split(' ')[0] };
	const score = profileScore(seller);
	const quotes = db.quotes.filter((q) => q.sellerId === seller.id && q.versions.length);
	return {
		registered: true as const,
		name: u.name.split(' ')[0],
		companyName: seller.companyName,
		verification: seller.verification,
		mainShop: seller.mainShop ?? null,
		percent: score.percent,
		missing: score.missing.slice(0, 3),
		matchingLeads: openRfqs().filter(
			(r) => isQuotingOpen(r) && scoreMatch(seller, r).score > 0 && sellerResponse(r.id, seller.id)?.kind !== 'NOT_FOR_US' && !quotes.some((q) => q.rfqId === r.id)
		).length,
		quotesSent: quotes.length,
		won: quotes.filter((q) => q.status === 'ACCEPTED').length
	};
}

export const load: PageServerLoad = async ({ locals }) => {
	const sellers = await listedSellers();
	const showContacts = canSeeSellerContacts(locals.sessions.BUYER);

	const featured = [...sellers]
		.sort(
			(a, b) =>
				Number(b.verification === 'GROUND_VERIFIED') - Number(a.verification === 'GROUND_VERIFIED') ||
				(sellerRating(b) ?? 0) - (sellerRating(a) ?? 0)
		)
		.slice(0, 4)
		.map((s) => toPublicSeller(s, showContacts));

	// Browse by type of work: every shop, with how many listed suppliers do any of its processes.
	const categories = SHOPS.map((sh) => {
		const ids = processesOfShop(sh.id);
		return { id: sh.id, label: sh.label, emoji: sh.emoji, examples: sh.examples, count: sellers.filter((s) => s.processes.some((p) => ids.includes(p))).length };
	});

	// Seller home: buyer demand (open requirements) per type of work.
	const open = openRfqs();
	const demandByShop: Record<string, number> = {};
	for (const r of open) {
		const shop = normalizeShop(String(r.values.commodityCategory ?? ''));
		if (shop) demandByShop[shop] = (demandByShop[shop] ?? 0) + 1;
	}

	return {
		featured,
		lockReason: sellerContactLock(locals.sessions.BUYER ?? locals.user),
		role: locals.user?.role ?? null,
		hasSellerProfile: !!locals.user?.sellerId,
		categories,
		stats: {
			sellers: sellers.length,
			groundVerified: sellers.filter((s) => s.verification === 'GROUND_VERIFIED').length,
			cities: new Set(sellers.map((s) => s.city)).size,
			openRfqs: open.length
		},
		buyerHome: locals.sessions.BUYER ? buyerHome(locals.sessions.BUYER) : null,
		sellerHome: locals.sessions.SELLER ? await sellerHome(locals.sessions.SELLER) : null,
		demand: {
			openRfqs: open.length,
			buyers: locals.sessions.SELLER ? await countUsers({ role: 'BUYER' }) : 0,
			cities: new Set(open.map((r) => String(r.values.deliveryCity ?? '').trim().toLowerCase()).filter(Boolean)).size,
			byShop: demandByShop
		}
	};
};
