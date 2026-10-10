// In-app notifications. Phase 2: fan out the same events to WhatsApp / SMS / email.

import { db, nextId, now, type Rfq } from './db.ts';
import { scoreMatch } from './matching.ts';
import { findSellerById, listSellers } from './sellers.ts';

export function notify(userId: string | undefined, n: { type: string; title: string; body: string; link: string }) {
	if (!userId) return;
	db.notifications.unshift({ id: nextId('NT'), userId, read: false, at: now(), ...n });
}

/** Notify the login account that owns a seller listing (the listing records its owner's userId). */
export async function notifySeller(sellerId: string, n: { type: string; title: string; body: string; link: string }) {
	notify((await findSellerById(sellerId))?.userId, n);
}

export function notifyBuyerOf(rfq: Rfq, n: { type: string; title: string; body: string; link: string }) {
	notify(rfq.buyerUserId, n);
}

/**
 * New (or edited & re-posted) RFQ → every matching verified seller gets a lead; matching sellers still
 * under review get a teaser. `skip` = sellers already notified separately (e.g. asked to re-quote).
 */
export async function notifyRfqPosted(rfq: Rfq, mode: 'POSTED' | 'UPDATED' = 'POSTED', skip: Set<string> = new Set()): Promise<number> {
	const title = String(rfq.values.partName ?? rfq.id);
	const where = `${rfq.values.deliveryCity}`;
	let count = 0;
	// one query for every seller who could get a lead or a teaser
	const candidates = await listSellers({ verification: { $in: ['DOCS_VERIFIED', 'GROUND_VERIFIED', 'DOCS_SUBMITTED'] } });
	for (const seller of candidates) {
		if (skip.has(seller.id)) continue;
		const m = scoreMatch(seller, rfq);
		if (m.score === 0) continue;
		const km = m.distanceKm !== null ? ` · ~${m.distanceKm} km` : '';
		if (seller.verification === 'DOCS_VERIFIED' || seller.verification === 'GROUND_VERIFIED') {
			notify(seller.userId, {
				type: mode === 'POSTED' ? 'NEW_LEAD' : 'RFQ_UPDATED',
				title: mode === 'POSTED' ? 'New matching requirement' : 'Requirement updated & re-posted',
				body: `${rfq.id} ${title} · ${rfq.values.quantity} pcs · ${where}${km}. Quote before it closes.`,
				link: `/seller/rfq/${rfq.id}`
			});
			count++;
		} else if (seller.verification === 'DOCS_SUBMITTED') {
			notify(seller.userId, {
				type: 'LEAD_TEASER',
				title: 'A buyer needs what you make',
				body: `${title} · ${rfq.values.quantity} pcs${km}. Complete verification to quote on leads like this.`,
				link: '/seller'
			});
		}
	}
	return count;
}

export function unreadCount(userId: string): number {
	return db.notifications.filter((n) => n.userId === userId && !n.read).length;
}
