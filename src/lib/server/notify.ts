// In-app notifications. Phase 2: fan out the same events to WhatsApp / SMS / email.

import { db, nextId, now, type Rfq } from './db.ts';
import { findSellerById } from './sellers.ts';

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
 * A person's notifications, newest first — minus alerts about a requirement that is on hold
 * (its buyer was suspended/deactivated), so a seller never gets a link that leads nowhere.
 */
export function notificationsFor(userId: string) {
	return db.notifications.filter((n) => {
		if (n.userId !== userId) return false;
		const rfqId = /^\/seller\/rfq\/([^/?#]+)/.exec(n.link)?.[1];
		return !rfqId || !db.rfqs.find((r) => r.id === rfqId)?.hidden;
	});
}

export function unreadCount(userId: string): number {
	return notificationsFor(userId).filter((n) => !n.read).length;
}
