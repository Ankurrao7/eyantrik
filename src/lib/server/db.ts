// In-memory store for the data not yet moved to MongoDB: RFQs, quotes, notifications, help desk.
// Starts empty and resets on server restart. Already in MongoDB: users (users.ts), sellers (sellers.ts).
// Kept on globalThis so it survives Vite hot-reloads. Routes only use the exported functions/types.

import type { VerificationStatus } from '../taxonomy.ts';
import type { RfqFiles, RfqValues } from '../rfqFields.ts';

export type Role = 'BUYER' | 'SELLER' | 'ADMIN';

export interface User {
	id: string;
	phone: string; // 10-digit Indian mobile, no +91
	/** login ID (lower-case); users can sign in with email OR mobile */
	email?: string;
	/** PBKDF2 hash — never the plain password */
	passwordHash?: string;
	name: string;
	companyName: string;
	role: Role;
	sellerId?: string;
	/** missing = active. Suspended/deactivated accounts can't sign in (set by the admin team, see accounts.ts). */
	accountStatus?: AccountStatus;
	accountStatusReason?: string;
	/** suspend / deactivate / reactivate history (admin only) */
	accountLog?: AccountEvent[];
	createdAt: string;
}

export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

/** One suspend / deactivate / reactivate decision by the admin team. */
export interface AccountEvent {
	at: string;
	by: string;
	status: AccountStatus;
	reason?: string;
}

export interface Machine {
	name: string;
	count: number;
}

export interface SellerDocument {
	kind: 'GST_CERTIFICATE' | 'UDYAM_MSME' | 'FACTORY_PHOTO' | 'OTHER';
	fileName: string;
	/** stored file (see files.ts); missing on documents uploaded before files were kept */
	fileId?: string;
	sizeKb?: number;
	type?: string;
}

/** One entry in a seller's verification history (shown to the admin team). */
export interface VerificationEvent {
	at: string;
	/** "Seller" or the admin's name */
	by: string;
	action: 'SUBMITTED' | 'RESUBMITTED' | 'ADDED_BY_TEAM' | 'DOCS_VERIFIED' | 'CHANGES_REQUESTED' | 'GROUND_VERIFIED' | 'NOTE' | 'SUSPENDED' | 'DEACTIVATED' | 'REACTIVATED' | 'PROFILE_UPDATED';
	note?: string;
}

export interface Seller {
	id: string;
	slug: string;
	userId?: string;
	companyName: string;
	contactPerson: string;
	phone: string;
	whatsapp: string;
	email?: string;
	gstin: string;
	address: string;
	city: string;
	state: string;
	pincode: string;
	yearEstablished?: number;
	about: string;
	processes: string[];
	/** material family ids (taxonomy MATERIAL_CATEGORIES) */
	materials: string[];
	/** industry ids (taxonomy INDUSTRIES) */
	industries: string[];
	machines: Machine[];
	certifications: string[];
	// ---- Fixed attributes (2026-10-12; taxonomy.ts lists). Optional in the type because older
	// listings don't have them yet — the profile-completeness ring asks the seller to fill them in.
	/** main type of work = one shop id (processes.ts) */
	mainShop?: string;
	/** order sizes accepted = ORDER_TYPES ids, same as the RFQ's orderType */
	orderTypes?: string[];
	/** TEAM_SIZES id */
	teamSize?: string;
	/** PART_SIZES id */
	maxPartSize?: string;
	/** TOLERANCES id */
	bestTolerance?: string;
	verification: VerificationStatus;
	/** missing = active. Suspended/deactivated listings are hidden from buyers, matching and leads. */
	accountStatus?: AccountStatus;
	accountStatusReason?: string;
	onboardedBy: 'SELF' | 'TEAM';
	documents: SellerDocument[];
	groundInspection?: { inspector: string; date: string; notes: string };
	rejectionReason?: string;
	/** when documents were (re)submitted — the admin queue is oldest first */
	submittedAt?: string;
	verificationLog?: VerificationEvent[];
	ratingTotal: number;
	reviewCount: number;
	isEyantrikPlant?: boolean;
	/** seller's saved quotation defaults (pre-filled only when autoFill is on) */
	quoteDefaults?: QuoteDefaults;
	createdAt: string;
}

export interface QuoteDefaults {
	autoFill: boolean;
	gstPercent: number;
	paymentTerms: string;
	includes: string[];
	freight: 'EX_WORKS' | 'DELIVERED';
	validityDays: number;
	/** cost estimator defaults */
	machineHourRate?: number;
	overheadPct?: number;
	profitPct?: number;
}

export interface Rfq {
	id: string;
	buyerUserId: string;
	values: RfqValues;
	files: RfqFiles;
	/** seller ids that accepted the NDA (only relevant when values.ndaRequired === 'yes') */
	ndaAcceptedBy: string[];
	status: 'OPEN' | 'CLOSED';
	outcome?: 'DEAL_DONE' | 'NO_DEAL';
	reopenCount: number;
	/** sellers can submit new quotes until this time (ISO); negotiation can continue after it */
	quoteDeadline: string;
	awardedQuoteId?: string;
	/** how many times the buyer edited & re-posted it */
	editCount: number;
	/** sales team called the buyer about this requirement (admin work queue) */
	salesCalledAt?: string;
	salesNote?: string;
	salesBy?: string;
	editedAt?: string;
	/** the buyer's account is suspended/deactivated: hidden from sellers until it is reactivated */
	hidden?: boolean;
	createdAt: string;
	updatedAt: string;
}

// ---- Quotations & negotiation ----

/** OUTDATED = buyer edited the RFQ after this quote; the seller must re-quote. */
export type QuoteStatus = 'SUBMITTED' | 'SHORTLISTED' | 'NEGOTIATING' | 'ACCEPTED' | 'DECLINED' | 'NOT_SELECTED' | 'WITHDRAWN' | 'OUTDATED';

export interface QuoteVersion {
	v: number;
	unitPrice: number;
	quantity: number;
	priceBreaks: { qty: number; unitPrice: number }[];
	toolingCost: number;
	toolOwnedByBuyer: boolean;
	setupCost: number;
	sampleCost: number;
	gstPercent: number;
	freight: 'EX_WORKS' | 'DELIVERED';
	freightCost: number;
	includes: string[];
	sampleDays: number;
	bulkDays: number;
	monthlyCapacity?: number;
	paymentTerms: string;
	validTill: string; // YYYY-MM-DD
	processRoute: { process: string; mode: 'IN_HOUSE' | 'OUTSOURCED' }[];
	notes: string;
	attachments: string[];
	/** stored copies of the attachments (see files.ts) */
	attachmentFiles?: { name: string; fileId: string; sizeKb: number }[];
	at: string;
}

export interface NegotiationEvent {
	id: string;
	at: string;
	by: 'BUYER' | 'SELLER';
	kind: 'QUOTE' | 'REVISION' | 'COUNTER' | 'SHORTLIST' | 'ACCEPT_COUNTER' | 'DECLINE_COUNTER' | 'AWARD' | 'DECLINE' | 'WITHDRAW' | 'RFQ_EDITED';
	version?: number;
	target?: { unitPrice?: number; bulkDays?: number; paymentTerms?: string };
	message?: string;
}

export interface Quote {
	id: string;
	rfqId: string;
	sellerId: string;
	status: QuoteStatus;
	versions: QuoteVersion[];
	thread: NegotiationEvent[];
	createdAt: string;
	updatedAt: string;
}

export interface SellerResponse {
	rfqId: string;
	sellerId: string;
	kind: 'INTERESTED' | 'NOT_FOR_US';
	reason?: string;
	at: string;
}

export interface Notification {
	id: string;
	userId: string;
	type: string;
	title: string;
	body: string;
	link: string;
	read: boolean;
	at: string;
}

export interface ContactEvent {
	id: string;
	fromUserId: string;
	fromRole: Role;
	toSellerId?: string;
	toBuyerUserId?: string;
	rfqId?: string;
	channel: 'PHONE' | 'WHATSAPP';
	at: string;
}

export interface Feedback {
	id: string;
	rfqId: string;
	buyerUserId: string;
	sellerId: string;
	outcome: 'DEAL_DONE' | 'NO_DEAL';
	rating: number;
	comment: string;
	at: string;
}

export type HelpStatus = 'NEW' | 'CONTACTED' | 'EYANTRIK_HANDLING' | 'RESOLVED';

export interface HelpTicket {
	id: string;
	userId?: string;
	raisedBy: 'BUYER' | 'SELLER' | 'VISITOR';
	name: string;
	phone: string;
	companyName: string;
	rfqId?: string;
	message: string;
	preferredTime: string;
	status: HelpStatus;
	/** How eYantrik steps in: as the seller (we make/broker it) or as the buyer (we source for a seller). */
	eyantrikRole?: 'AS_SELLER' | 'AS_BUYER';
	adminNotes: string;
	createdAt: string;
}

export interface ConciergeStep {
	id: string;
	process: string;
	assignedTo: string;
	fulfillment: 'IN_HOUSE' | 'PARTNER';
	unitCost: number;
}

export interface ConciergeJob {
	id: string;
	ticketId?: string;
	clientName: string;
	clientPhone: string;
	partName: string;
	quantity: number;
	steps: ConciergeStep[];
	marginPercent: number;
	status: 'COSTING' | 'QUOTED' | 'IN_PRODUCTION' | 'DELIVERED';
	/** buyer account to keep updated (managed orders only — off-platform deals are not tracked) */
	buyerUserId?: string;
	rfqId?: string;
	milestones: { id: string; stage: string; note: string; at: string }[];
	createdAt: string;
}

interface Db {
	rfqs: Rfq[];
	contacts: ContactEvent[];
	feedback: Feedback[];
	tickets: HelpTicket[];
	jobs: ConciergeJob[];
	quotes: Quote[];
	responses: SellerResponse[];
	notifications: Notification[];
	/** unsent "Post requirement" drafts kept while a visitor logs in */
	drafts: Map<string, { values: RfqValues; expiresAt: number }>;
	seq: number;
}

function emptyDb(): Db {
	return { rfqs: [], contacts: [], feedback: [], tickets: [], jobs: [], quotes: [], responses: [], notifications: [], drafts: new Map(), seq: 1000 };
}

const g = globalThis as unknown as { __eyantrikDb?: Db };
export const db: Db = (g.__eyantrikDb ??= emptyDb());

export function nextId(prefix: string): string {
	db.seq += 1;
	return `${prefix}-${db.seq}`;
}

export function now(): string {
	return new Date().toISOString();
}

export function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/&/g, ' and ')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

export function sellerRating(s: Seller): number | null {
	return s.reviewCount ? Math.round((s.ratingTotal / s.reviewCount) * 10) / 10 : null;
}
