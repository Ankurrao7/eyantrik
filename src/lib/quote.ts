// Shared quotation helpers (safe on client and server): option lists + the "landed cost" maths
// used by the seller's live preview AND the buyer's comparison, so both always agree.

export const QUOTE_INCLUSIONS = [
	{ id: 'MATERIAL', label: 'Raw material' },
	{ id: 'MACHINING', label: 'Machining / processing' },
	{ id: 'FINISHING', label: 'Surface finish / treatment' },
	{ id: 'INSPECTION', label: 'Inspection' },
	{ id: 'PACKAGING', label: 'Packaging' },
	{ id: 'REPORTS', label: 'PPAP / CMM reports' }
] as const;

export const INCLUSION_LABEL: Record<string, string> = Object.fromEntries(QUOTE_INCLUSIONS.map((i) => [i.id, i.label]));

/** Suggestions only — payment terms are a B2B decision, so sellers/buyers may type their own. */
export const PAYMENT_TERMS = [
	'100% advance',
	'50% advance, balance on delivery',
	'30% advance, balance on delivery',
	'Against delivery',
	'30 days credit',
	'45 days credit (MSME)',
	'60 days credit'
] as const;

export const GST_RATES = [0, 5, 12, 18, 28] as const;

/** Buyer picks how long quotes stay open when posting an RFQ. */
export const QUOTE_WINDOWS = [
	{ days: 3, label: '3 days' },
	{ days: 7, label: '7 days (recommended)' },
	{ days: 14, label: '14 days' },
	{ days: 30, label: '30 days' }
] as const;

/** Max buyer counter-offers per quote — keeps deals moving. */
export const MAX_COUNTER_ROUNDS = 3;

export interface PriceInput {
	unitPrice: number;
	quantity: number;
	toolingCost: number;
	setupCost: number;
	sampleCost: number;
	gstPercent: number;
	freight: 'EX_WORKS' | 'DELIVERED';
	freightCost: number;
}

export interface Landed {
	/** per piece, one-time costs + freight spread over the quantity, before GST */
	perPiece: number;
	perPieceInclGst: number;
	oneTime: number;
	totalExGst: number;
	gst: number;
	totalInclGst: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function landed(q: PriceInput): Landed {
	const qty = Math.max(1, q.quantity || 1);
	const oneTime = (q.toolingCost || 0) + (q.setupCost || 0) + (q.sampleCost || 0);
	const freight = q.freight === 'DELIVERED' ? q.freightCost || 0 : 0;
	const totalExGst = (q.unitPrice || 0) * qty + oneTime + freight;
	const gst = (totalExGst * (q.gstPercent || 0)) / 100;
	return {
		perPiece: r2(totalExGst / qty),
		perPieceInclGst: r2((totalExGst + gst) / qty),
		oneTime,
		totalExGst: r2(totalExGst),
		gst: r2(gst),
		totalInclGst: r2(totalExGst + gst)
	};
}

export const inr = (n: number, decimals = 0) =>
	'₹' + n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const QUOTE_STATUS_LABEL: Record<string, string> = {
	SUBMITTED: 'Received',
	SHORTLISTED: 'Shortlisted',
	NEGOTIATING: 'Negotiating',
	ACCEPTED: 'Awarded',
	DECLINED: 'Declined',
	NOT_SELECTED: 'Not selected',
	WITHDRAWN: 'Withdrawn',
	OUTDATED: 'Needs re-quote'
};

export const QUOTE_STATUS_CLASS: Record<string, string> = {
	SUBMITTED: 'docs',
	SHORTLISTED: 'docs',
	NEGOTIATING: 'pending',
	ACCEPTED: 'ground',
	DECLINED: 'rejected',
	NOT_SELECTED: 'neutral',
	WITHDRAWN: 'neutral',
	OUTDATED: 'pending'
};

// ---- Simple cost estimator (sellers may also use their own software and upload a PDF) ----

export interface EstimateInput {
	materialCost: number; // ₹ per piece
	machineMinutes: number; // per piece
	machineHourRate: number; // ₹ per machine hour
	outsideCost: number; // ₹ per piece (finishing, heat treatment, bought-out)
	packagingCost: number; // ₹ per piece (packing, inspection)
	overheadPct: number;
	profitPct: number;
}

export function estimateUnitPrice(e: EstimateInput) {
	const machining = (e.machineMinutes / 60) * e.machineHourRate;
	const direct = e.materialCost + machining + e.outsideCost + e.packagingCost;
	const overhead = (direct * e.overheadPct) / 100;
	const profit = ((direct + overhead) * e.profitPct) / 100;
	return { machining: r2(machining), direct: r2(direct), overhead: r2(overhead), profit: r2(profit), unitPrice: r2(direct + overhead + profit) };
}
