// Matching between requirements and sellers, plus the shapes sent to the browser.
// Contacts are stripped server-side unless the viewer is allowed to see them,
// so a locked number never reaches the page source.

import { byNearness, coordsFor, distanceKm, nearZone } from '../geo.ts';
import { effectiveProcesses } from '../rfqFields.ts';
import type { PublicSeller } from '../types.ts';
import { sellerRating, type Rfq, type Seller, type User } from './db.ts';
import { listedSellers } from './sellers.ts';
import { findUserById } from './users.ts';

export function toPublicSeller(s: Seller, showContact: boolean): PublicSeller {
	return {
		id: s.id,
		slug: s.slug,
		companyName: s.companyName,
		city: s.city,
		state: s.state,
		yearEstablished: s.yearEstablished,
		about: s.about,
		processes: s.processes,
		materials: s.materials,
		industries: s.industries,
		machines: s.machines,
		certifications: s.certifications,
		verification: s.verification,
		groundInspectedOn: s.groundInspection?.date,
		rating: sellerRating(s),
		reviewCount: s.reviewCount,
		isEyantrikPlant: !!s.isEyantrikPlant,
		contact: showContact
			? { person: s.contactPerson, phone: s.phone, whatsapp: s.whatsapp, email: s.email, address: `${s.address}, ${s.city}, ${s.state} ${s.pincode}` }
			: null
	};
}

/** Straight-line km between the seller's factory and the RFQ's delivery pincode (null if unknown). */
export function sellerDistanceKm(seller: Seller, rfq: Rfq): number | null {
	const from = coordsFor(seller.pincode, seller.state);
	const to = coordsFor(String(rfq.values.deliveryPincode ?? ''), String(rfq.values.deliveryState ?? ''));
	return from && to ? distanceKm(from, to) : null;
}

export interface Match {
	seller: Seller;
	score: number;
	covers: string[];
	distanceKm: number | null;
	/** nearness zone 0 (same pincode area) … 4 (rest of India) — see geo.ts */
	zone: number;
	materialMatch: boolean;
}

/**
 * Relevance score. Process overlap is mandatory (0 = not a match); then nearness, material family,
 * industry experience, verification depth and buyer rating add to it.
 */
export function scoreMatch(seller: Seller, rfq: Rfq): Match {
	const wanted = effectiveProcesses(rfq.values);
	const covers = wanted.filter((p) => seller.processes.includes(p));
	const distance = sellerDistanceKm(seller, rfq);
	const zone = nearZone(seller.pincode, String(rfq.values.deliveryPincode ?? ''), distance);
	const materialMatch = seller.materials.includes(String(rfq.values.materialCategory ?? ''));
	if (covers.length === 0) return { seller, score: 0, covers, distanceKm: distance, zone, materialMatch };

	let score = covers.length * 10;
	if (distance !== null) score += Math.max(0, 8 - distance / 100); // 0 km → +8, 800 km+ → 0
	if (materialMatch) score += 4;
	if (seller.industries.includes(String(rfq.values.industry ?? ''))) score += 2;
	if (seller.verification === 'GROUND_VERIFIED') score += 2;
	score += sellerRating(seller) ?? 0;
	return { seller, score, covers, distanceKm: distance, zone, materialMatch };
}

/** Matching sellers, nearest first (pincode zone, then km); relevance score breaks ties. */
export async function matchedSellersFor(rfq: Rfq): Promise<Match[]> {
	return (await listedSellers())
		.map((seller) => scoreMatch(seller, rfq))
		.filter((m) => m.score > 0)
		.sort((a, b) => byNearness(a, b) || b.score - a.score);
}

export function buyerOf(rfq: Rfq): Promise<User | null> {
	return findUserById(rfq.buyerUserId);
}
