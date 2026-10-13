// Seller (factory) listings — stored in MongoDB.
// Collection + indexes are created by `npm run db:reset` (scripts/db-reset.ts).
// Remember: changing a seller object in memory does NOT save it — call updateSeller().

import type { Filter } from 'mongodb';
import { LISTED_STATUSES } from '../taxonomy.ts';
import { nextMongoId } from './counters.ts';
import { slugify, type Seller } from './db.ts';
import { mongo } from './mongo.ts';

export const sellers = mongo.collection<Seller>('sellers');

// Leave MongoDB's internal `_id` out of results (pages can't serialise it).
const noMongoId = { projection: { _id: 0 } } as const;

export const findSellerById = (id: string) => sellers.findOne<Seller>({ id }, noMongoId);
export const findSellerBySlug = (slug: string) => sellers.findOne<Seller>({ slug }, noMongoId);

export const listSellers = (filter: Filter<Seller> = {}) => sellers.find<Seller>(filter, noMongoId).toArray();
/**
 * Sellers buyers can see and that receive leads: documents or ground verified, and not suspended/deactivated
 * by the admin team (a missing accountStatus counts as active).
 */
export const LISTED_FILTER: Filter<Seller> = { verification: { $in: LISTED_STATUSES }, accountStatus: { $nin: ['SUSPENDED', 'DEACTIVATED'] } };
export const isListed = (s: Seller) => LISTED_STATUSES.includes(s.verification) && (!s.accountStatus || s.accountStatus === 'ACTIVE');
export const listedSellers = () => listSellers(LISTED_FILTER);

/** Map of id → seller for showing names on lists (one query instead of one per row). */
export async function sellersById(ids: (string | undefined)[]): Promise<Map<string, Seller>> {
	const wanted = [...new Set(ids.filter((id): id is string => !!id))];
	const list = wanted.length ? await listSellers({ id: { $in: wanted } }) : [];
	return new Map(list.map((s) => [s.id, s]));
}

export async function insertSeller(seller: Seller) {
	await sellers.insertOne({ ...seller }); // a copy: insertOne adds an _id to the object it's given
}

/** Save changes. A field set to `undefined` is removed from the document ($unset), e.g. clearing a rejection reason. */
export async function updateSeller(id: string, changes: Partial<Omit<Seller, 'id'>>) {
	const $set: Record<string, unknown> = {};
	const $unset: Record<string, ''> = {};
	for (const [key, value] of Object.entries(changes)) {
		if (value === undefined) $unset[key] = '';
		else $set[key] = value;
	}
	await sellers.updateOne({ id }, { ...(Object.keys($set).length && { $set }), ...(Object.keys($unset).length && { $unset }) });
}

/** Add a buyer rating. `$inc` is atomic, so two reviews at once can't overwrite each other. */
export async function addRating(id: string, ratingDelta: number, reviewDelta: number) {
	await sellers.updateOne({ id }, { $inc: { ratingTotal: ratingDelta, reviewCount: reviewDelta } });
}

/** Is this GSTIN already used by another (non-rejected) listing? */
export async function gstinTaken(gstin: string, excludeSellerId?: string): Promise<boolean> {
	const filter: Filter<Seller> = { gstin, verification: { $ne: 'REJECTED' } };
	if (excludeSellerId) filter.id = { $ne: excludeSellerId };
	return (await sellers.countDocuments(filter, { limit: 1 })) > 0;
}

/** URL-friendly unique slug for a seller profile page: "apex-precision-noida", "…-2" if taken. */
export async function uniqueSlug(base: string): Promise<string> {
	const root = slugify(base) || 'seller';
	let slug = root;
	for (let i = 2; await sellers.countDocuments({ slug }, { limit: 1 }); i++) slug = `${root}-${i}`;
	return slug;
}

export const nextSellerId = () => nextMongoId('S');
