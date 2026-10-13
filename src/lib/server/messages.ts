// On-platform messages between a buyer and one supplier about one requirement (decision 2026-10-13:
// keep the deal on the platform). Questions and clarifications happen here instead of on the phone;
// phone numbers / emails typed in are hidden until the buyer shortlists the supplier (contactMask.ts).

import { maskContacts, showText } from '../contactMask.ts';
import { contactsShared } from './auth.ts';
import { db, isInvited, nextId, now, type Rfq } from './db.ts';
import { notify, notifySeller } from './notify.ts';

export const MESSAGE_MAX = 1000;

/**
 * Who can talk on a requirement: suppliers that were invited (or already quoted), while it is open,
 * and the winner after an award. Never while the buyer's account is on hold.
 */
export function canMessage(rfq: Rfq, sellerId: string): boolean {
	if (rfq.hidden) return false;
	const quote = db.quotes.find((q) => q.rfqId === rfq.id && q.sellerId === sellerId);
	if (!isInvited(rfq, sellerId) && !quote) return false;
	return rfq.status === 'OPEN' || quote?.status === 'ACCEPTED';
}

/** The conversation as shown on screen (contacts masked until shared). */
export function threadFor(rfq: Rfq, sellerId: string) {
	const shared = contactsShared(rfq, sellerId);
	return db.messages
		.filter((m) => m.rfqId === rfq.id && m.sellerId === sellerId)
		.map((m) => ({ id: m.id, from: m.from, text: showText(m.text, shared), at: m.at }));
}

export function messageCount(rfqId: string, sellerId: string): number {
	return db.messages.filter((m) => m.rfqId === rfqId && m.sellerId === sellerId).length;
}

/** Saves a message and notifies the other side. Returns an error message or null. */
export async function sendMessage(rfq: Rfq, sellerId: string, from: 'BUYER' | 'SELLER', raw: string, sellerName: string): Promise<string | null> {
	const text = raw.trim();
	if (!text) return 'Type a message first.';
	if (text.length > MESSAGE_MAX) return `Keep it under ${MESSAGE_MAX} characters.`;
	if (!canMessage(rfq, sellerId)) return 'Messages are closed for this requirement.';
	db.messages.push({ id: nextId('M'), rfqId: rfq.id, sellerId, from, text, at: now() });

	// The alert never carries contact details, even after sharing (it is a short preview).
	const preview = maskContacts(text.length > 120 ? `${text.slice(0, 117)}…` : text);
	const part = String(rfq.values.partName ?? rfq.id);
	if (from === 'SELLER')
		notify(rfq.buyerUserId, { type: 'MESSAGE', title: `Message from ${sellerName}`, body: `About ${part}: “${preview}”`, link: `/buyer/rfq/${rfq.id}/suppliers/${sellerId}` });
	else await notifySeller(sellerId, { type: 'MESSAGE', title: 'Message from the buyer', body: `About ${rfq.id} ${part}: “${preview}”`, link: `/seller/rfq/${rfq.id}#messages` });
	return null;
}
