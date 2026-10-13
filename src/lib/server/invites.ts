// Curated invitations (decision 2026-10-13: curate, don't broadcast).
// A requirement goes to the best few matched suppliers — nearest first, then fit and track record
// (matchedSellersFor) — instead of every matching seller. Buyers get fewer, better quotes; invited
// suppliers know they compete with a handful, not a hundred. More are invited when:
//  - an invited supplier says "Not for us" (one replacement),
//  - the buyer asks for more,
//  - few quotes came in after AUTO_AFTER_MS (automatic top-up, at most AUTO_MAX times),
//  - the admin team asks for more (work queue "No quotes yet"),
//  - the buyer picks a supplier from the directory ("Ask for a quote").
// Only invited suppliers see a requirement in their lead feed and can open, message or quote on it.

import { db, isInvited, now, type InviteReason, type Rfq, type Seller } from './db.ts';
import { matchedSellersFor, scoreMatch, type Match } from './matching.ts';
import { notify, notifyBuyerOf } from './notify.ts';
import { isQuotingOpen, liveQuoteCount } from './quotes.ts';
import { listSellers } from './sellers.ts';

export const FIRST_INVITES = 6;
export const MORE_INVITES = 4;
const AUTO_AFTER_MS = 48 * 3_600_000;
const AUTO_MIN_QUOTES = 2;
const AUTO_MAX = 2;
const SWEEP_EVERY_MS = 5 * 60_000;

const title = (rfq: Rfq) => String(rfq.values.partName ?? rfq.id);

/** Matched, listed suppliers not invited yet — best first. */
export async function uninvitedMatches(rfq: Rfq): Promise<Match[]> {
	return (await matchedSellersFor(rfq)).filter((m) => !isInvited(rfq, m.seller.id));
}

function invite(rfq: Rfq, picks: Match[], reason: InviteReason): number {
	for (const m of picks) {
		rfq.invites.push({ sellerId: m.seller.id, at: now(), reason });
		const km = m.distanceKm !== null ? ` · ~${m.distanceKm} km` : '';
		notify(m.seller.userId, {
			type: 'NEW_LEAD',
			title: reason === 'PICKED' ? 'A buyer asked you for a quote' : 'You’re invited to quote',
			body: `${rfq.id} ${title(rfq)} · ${rfq.values.quantity} pcs · ${rfq.values.deliveryCity}${km}. ${reason === 'PICKED' ? 'The buyer chose you from the supplier directory' : 'Only a few matched suppliers are invited'} — quote before it closes.`,
			link: `/seller/rfq/${rfq.id}`
		});
	}
	return picks.length;
}

/** The buyer picked this supplier from the directory for one of their open requirements. */
export function inviteChosen(rfq: Rfq, seller: Seller): string | null {
	if (rfq.hidden || !isQuotingOpen(rfq)) return 'The quotation window for this requirement has closed.';
	if (isInvited(rfq, seller.id)) return null;
	invite(rfq, [scoreMatch(seller, rfq)], 'PICKED');
	return null;
}

/** Suppliers still under document review get a teaser (no details) — it shows what verification unlocks. */
async function teaseUnverified(rfq: Rfq) {
	const waiting = await listSellers({ verification: 'DOCS_SUBMITTED', accountStatus: { $nin: ['SUSPENDED', 'DEACTIVATED'] } });
	for (const seller of waiting) {
		const m = scoreMatch(seller, rfq);
		if (m.score === 0) continue;
		const km = m.distanceKm !== null ? ` · ~${m.distanceKm} km` : '';
		notify(seller.userId, {
			type: 'LEAD_TEASER',
			title: 'A buyer needs what you make',
			body: `${title(rfq)} · ${rfq.values.quantity} pcs${km}. Verified suppliers get invited to quote on requirements like this — finish verification to be one of them.`,
			link: '/seller'
		});
	}
}

/** New requirement: invite the best FIRST_INVITES. Returns how many were invited. */
export async function inviteFirst(rfq: Rfq): Promise<number> {
	const n = invite(rfq, (await uninvitedMatches(rfq)).slice(0, FIRST_INVITES), 'FIRST');
	await teaseUnverified(rfq);
	return n;
}

/** Invite the next best `count` suppliers (nothing once quoting has closed). */
export async function inviteMore(rfq: Rfq, count: number, reason: InviteReason): Promise<number> {
	if (rfq.hidden || !isQuotingOpen(rfq)) return 0;
	return invite(rfq, (await uninvitedMatches(rfq)).slice(0, count), reason);
}

/**
 * Buyer edited the requirement. Invited suppliers who still match (or already quoted) stay invited and are
 * told it changed; the rest drop out; new matches top the list back up to FIRST_INVITES.
 * `alreadyTold` = suppliers asked to re-quote separately. Returns how many were notified here.
 */
export async function reinviteAfterEdit(rfq: Rfq, alreadyTold: Set<string>): Promise<number> {
	const matches = await matchedSellersFor(rfq);
	const byId = new Map(matches.map((m) => [m.seller.id, m]));
	const quoted = new Set(db.quotes.filter((q) => q.rfqId === rfq.id && q.versions.length).map((q) => q.sellerId));
	rfq.invites = rfq.invites.filter((i) => byId.has(i.sellerId) || quoted.has(i.sellerId));
	let told = 0;
	for (const i of rfq.invites) {
		const m = byId.get(i.sellerId);
		if (!m || alreadyTold.has(i.sellerId)) continue;
		notify(m.seller.userId, {
			type: 'RFQ_UPDATED',
			title: 'Requirement updated & re-posted',
			body: `${rfq.id} ${title(rfq)} · ${rfq.values.quantity} pcs · ${rfq.values.deliveryCity}. Have a look — the quotation window is open again.`,
			link: `/seller/rfq/${rfq.id}`
		});
		told++;
	}
	const room = Math.max(0, FIRST_INVITES - rfq.invites.length);
	return told + invite(rfq, matches.filter((m) => !isInvited(rfq, m.seller.id)).slice(0, room), 'EDIT');
}

/**
 * Automatic top-up: an open requirement with fewer than AUTO_MIN_QUOTES live quotes, AUTO_AFTER_MS after
 * its last invitation, gets MORE_INVITES more suppliers (at most AUTO_MAX times) and the buyer is told.
 * Called on requests (hooks.server.ts), at most once every SWEEP_EVERY_MS.
 */
let lastSweep = 0;
export async function topUpQuietRequirements(): Promise<void> {
	if (Date.now() - lastSweep < SWEEP_EVERY_MS) return;
	lastSweep = Date.now();
	for (const rfq of db.rfqs) {
		if (rfq.hidden || !isQuotingOpen(rfq) || liveQuoteCount(rfq.id) >= AUTO_MIN_QUOTES) continue;
		const autoRounds = new Set(rfq.invites.filter((i) => i.reason === 'AUTO').map((i) => i.at)).size;
		if (autoRounds >= AUTO_MAX) continue;
		const last = Math.max(Date.parse(rfq.editedAt ?? rfq.createdAt), Date.parse(rfq.topUpCheckedAt ?? rfq.createdAt), ...rfq.invites.map((i) => Date.parse(i.at)));
		if (Date.now() - last < AUTO_AFTER_MS) continue;
		rfq.topUpCheckedAt = now();
		const n = await inviteMore(rfq, MORE_INVITES, 'AUTO');
		if (n)
			notifyBuyerOf(rfq, {
				type: 'MORE_INVITED',
				title: 'We invited more suppliers',
				body: `Few quotes came in for ${title(rfq)}, so ${n} more matching supplier${n === 1 ? ' was' : 's were'} invited.`,
				link: `/buyer/rfq/${rfq.id}`
			});
	}
}
