// Quotation rules, form parsing and buyer "things to consider" insights.

import { DELIVERY_TIMELINES, PROCESS_LABEL } from '../taxonomy.ts';
import { effectiveProcesses, pickedProcesses, processesForSeller } from '../rfqFields.ts';
import { normalizeProcesses, normalizeShop, shopLabel } from '../processes.ts';
import { saveUpload } from './files.ts';
import { GST_RATES, landed, PAYMENT_TERMS, QUOTE_INCLUSIONS, inr } from '../quote.ts';
import { db, nextId, now, sellerRating, type NegotiationEvent, type Quote, type QuoteVersion, type Rfq, type Seller } from './db.ts';
import { scoreMatch } from './matching.ts';
import { notifyBuyerOf } from './notify.ts';

export const latest = (q: Quote): QuoteVersion => q.versions[q.versions.length - 1];

const LIVE: Quote['status'][] = ['SUBMITTED', 'SHORTLISTED', 'NEGOTIATING', 'ACCEPTED'];
export const isLive = (q: Quote) => LIVE.includes(q.status);

export function quotesForRfq(rfqId: string): Quote[] {
	return db.quotes.filter((q) => q.rfqId === rfqId);
}

/** What sellers see about competition: just the number of live quotes. */
export function liveQuoteCount(rfqId: string): number {
	return db.quotes.filter((q) => q.rfqId === rfqId && isLive(q)).length;
}

export function isQuotingOpen(rfq: Rfq): boolean {
	return rfq.status === 'OPEN' && Date.now() < Date.parse(rfq.quoteDeadline);
}

export function counterRounds(q: Quote): number {
	return q.thread.filter((e) => e.kind === 'COUNTER').length;
}

/** The latest buyer counter-offer the seller hasn't answered yet (if any). */
export function pendingCounter(q: Quote): NegotiationEvent | null {
	for (let i = q.thread.length - 1; i >= 0; i--) {
		const e = q.thread[i];
		if (e.kind === 'COUNTER') return e;
		if (e.by === 'SELLER') return null;
	}
	return null;
}

export function addEvent(q: Quote, e: Omit<NegotiationEvent, 'id' | 'at'>) {
	q.thread.push({ id: nextId('N'), at: now(), ...e });
	q.updatedAt = now();
}

export function sellerResponse(rfqId: string, sellerId: string) {
	return db.responses.find((r) => r.rfqId === rfqId && r.sellerId === sellerId);
}

/** Seller signals interest (allowed before verification). Notifies the buyer once. Returns an error message or null. */
export function markInterested(seller: Seller, rfqId: string | undefined): string | null {
	const rfq = db.rfqs.find((r) => r.id === rfqId);
	if (!rfq || rfq.hidden || !isQuotingOpen(rfq)) return 'This requirement is closed for new responses.';
	const existing = sellerResponse(rfq.id, seller.id);
	if (existing?.kind === 'INTERESTED') return null;
	if (existing) Object.assign(existing, { kind: 'INTERESTED', reason: undefined, at: now() });
	else db.responses.push({ rfqId: rfq.id, sellerId: seller.id, kind: 'INTERESTED', at: now() });
	notifyBuyerOf(rfq, {
		type: 'INTERESTED',
		title: 'A supplier is interested',
		body: `${seller.companyName} (${seller.city}) is interested in ${rfq.id} ${rfq.values.partName}.`,
		link: `/buyer/rfq/${rfq.id}`
	});
	return null;
}

export function interestedCount(rfqId: string): number {
	return db.responses.filter((r) => r.rfqId === rfqId && r.kind === 'INTERESTED').length;
}

// ---------------- Quote form ----------------

export interface QuoteFormValues {
	unitPrice: string; quantity: string; break1Qty: string; break1Price: string; break2Qty: string; break2Price: string;
	toolingCost: string; toolOwnedByBuyer: boolean; setupCost: string; sampleCost: string; gstPercent: string;
	freight: string; freightCost: string; includes: string[]; sampleDays: string; bulkDays: string; monthlyCapacity: string;
	paymentTerms: string; validTill: string; route: Record<string, string>; notes: string;
}

/** Pre-fill: previous version first; otherwise the seller's saved defaults (only if they turned auto-fill on). */
export function quoteFormDefaults(rfq: Rfq, prev?: QuoteVersion, seller?: Seller): QuoteFormValues {
	const d = !prev && seller?.quoteDefaults?.autoFill ? seller.quoteDefaults : undefined;
	const in15 = new Date(Date.now() + (d?.validityDays ?? 15) * 86_400_000).toISOString().slice(0, 10);
	const route: Record<string, string> = {};
	for (const p of processesForSeller(rfq.values, seller?.processes ?? [])) route[p] = prev?.processRoute.find((r) => r.process === p)?.mode ?? 'IN_HOUSE';
	return {
		unitPrice: prev ? String(prev.unitPrice) : '',
		quantity: prev ? String(prev.quantity) : String(rfq.values.quantity ?? ''),
		break1Qty: prev?.priceBreaks[0] ? String(prev.priceBreaks[0].qty) : '',
		break1Price: prev?.priceBreaks[0] ? String(prev.priceBreaks[0].unitPrice) : '',
		break2Qty: prev?.priceBreaks[1] ? String(prev.priceBreaks[1].qty) : '',
		break2Price: prev?.priceBreaks[1] ? String(prev.priceBreaks[1].unitPrice) : '',
		toolingCost: prev ? String(prev.toolingCost || '') : '',
		toolOwnedByBuyer: prev?.toolOwnedByBuyer ?? false,
		setupCost: prev ? String(prev.setupCost || '') : '',
		sampleCost: prev ? String(prev.sampleCost || '') : '',
		gstPercent: prev ? String(prev.gstPercent) : String(d?.gstPercent ?? 18),
		freight: prev?.freight ?? d?.freight ?? 'EX_WORKS',
		freightCost: prev ? String(prev.freightCost || '') : '',
		includes: prev?.includes ?? d?.includes ?? ['MATERIAL', 'MACHINING'],
		sampleDays: prev ? String(prev.sampleDays) : '',
		bulkDays: prev ? String(prev.bulkDays) : '',
		monthlyCapacity: prev?.monthlyCapacity ? String(prev.monthlyCapacity) : '',
		paymentTerms: prev?.paymentTerms ?? d?.paymentTerms ?? PAYMENT_TERMS[2],
		validTill: prev && Date.parse(prev.validTill) > Date.now() ? prev.validTill : in15,
		route,
		notes: prev?.notes ?? ''
	};
}

const ATTACH_EXT = ['.pdf', '.xlsx', '.xls', '.csv', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
const ATTACH_MAX_MB = 10;
const ATTACH_MAX_FILES = 5;

export async function parseQuoteForm(
	data: FormData,
	rfq: Rfq,
	prev?: QuoteVersion,
	ownerUserId?: string
): Promise<{ values: QuoteFormValues; errors: Record<string, string>; version?: Omit<QuoteVersion, 'v' | 'at'>; saveDefaults: boolean }> {
	const s = (k: string) => (data.get(k)?.toString() ?? '').trim();
	// only the process rows the form actually showed (see quoteFormDefaults)
	const processes = effectiveProcesses(rfq.values).filter((p) => data.has(`route_${p}`));
	const values: QuoteFormValues = {
		unitPrice: s('unitPrice'), quantity: s('quantity'), break1Qty: s('break1Qty'), break1Price: s('break1Price'),
		break2Qty: s('break2Qty'), break2Price: s('break2Price'), toolingCost: s('toolingCost'),
		toolOwnedByBuyer: data.get('toolOwnedByBuyer') === 'on', setupCost: s('setupCost'), sampleCost: s('sampleCost'),
		gstPercent: s('gstPercent'), freight: s('freight'), freightCost: s('freightCost'),
		includes: data.getAll('includes').map(String).filter((i) => QUOTE_INCLUSIONS.some((x) => x.id === i)),
		sampleDays: s('sampleDays'), bulkDays: s('bulkDays'), monthlyCapacity: s('monthlyCapacity'),
		paymentTerms: s('paymentTerms'), validTill: s('validTill'),
		route: Object.fromEntries(processes.map((p) => [p, s(`route_${p}`) === 'OUTSOURCED' ? 'OUTSOURCED' : 'IN_HOUSE'])),
		notes: s('notes').slice(0, 2000)
	};
	const e: Record<string, string> = {};
	const money = (k: keyof QuoteFormValues, label: string, opts: { required?: boolean; min?: number; max?: number } = {}) => {
		const raw = values[k] as string;
		if (!raw) { if (opts.required) e[k] = `${label} is required.`; return 0; }
		const n = Number(raw);
		if (!Number.isFinite(n) || n < (opts.min ?? 0)) { e[k] = `${label} must be ${opts.min ? `at least ${opts.min}` : '0 or more'}.`; return 0; }
		if (opts.max !== undefined && n > opts.max) { e[k] = `${label} looks too large.`; return 0; }
		return Math.round(n * 100) / 100;
	};
	const whole = (k: keyof QuoteFormValues, label: string, opts: { required?: boolean; min?: number; max?: number } = {}) => {
		const n = money(k, label, opts);
		if (!e[k] && values[k] && !Number.isInteger(Number(values[k]))) e[k] = `${label} must be a whole number.`;
		return n;
	};

	const unitPrice = money('unitPrice', 'Unit price', { required: true, min: 0.01, max: 1e8 });
	const quantity = whole('quantity', 'Quantity', { required: true, min: 1, max: 1e7 });
	const toolingCost = money('toolingCost', 'Tooling cost', { max: 1e9 });
	const setupCost = money('setupCost', 'Setup cost', { max: 1e9 });
	const sampleCost = money('sampleCost', 'Sample cost', { max: 1e9 });
	const gstPercent = Number(values.gstPercent);
	if (!(GST_RATES as readonly number[]).includes(gstPercent)) e.gstPercent = 'Pick a GST rate.';
	if (values.freight !== 'EX_WORKS' && values.freight !== 'DELIVERED') e.freight = 'Choose ex-works or delivered.';
	const freightCost = values.freight === 'DELIVERED' ? money('freightCost', 'Freight cost', { max: 1e8 }) : 0;
	const sampleDays = whole('sampleDays', 'Sample lead time', { required: true, min: 1, max: 365 });
	const bulkDays = whole('bulkDays', 'Bulk lead time', { required: true, min: 1, max: 730 });
	const monthlyCapacity = whole('monthlyCapacity', 'Monthly capacity', { min: 1, max: 1e8 });
	if (values.paymentTerms.length < 3 || values.paymentTerms.length > 120) e.paymentTerms = 'Enter payment terms (3–120 characters), e.g. 30 days credit.';
	const vt = Date.parse(values.validTill);
	if (!values.validTill || Number.isNaN(vt)) e.validTill = 'Set how long this price is valid.';
	else if (vt < Date.now() - 86_400_000) e.validTill = 'Validity date cannot be in the past.';
	if (values.includes.length === 0) e.includes = 'Tick what the price includes.';

	const priceBreaks: { qty: number; unitPrice: number }[] = [];
	for (const [qk, pk] of [['break1Qty', 'break1Price'], ['break2Qty', 'break2Price']] as const) {
		if (!values[qk] && !values[pk]) continue;
		const q = Number(values[qk]);
		const p = Number(values[pk]);
		if (!Number.isInteger(q) || q <= quantity || !Number.isFinite(p) || p <= 0) {
			e.priceBreaks = 'Each price break needs a quantity above the quoted quantity and a unit price.';
			continue;
		}
		priceBreaks.push({ qty: q, unitPrice: Math.round(p * 100) / 100 });
	}

	// Seller's own quote PDF / Excel (e.g. from their costing software). New upload replaces; otherwise keep previous.
	const files = data.getAll('attachments').filter((x): x is File => x instanceof File && x.size > 0);
	let attachments = prev?.attachments ?? [];
	let keepFiles = prev?.attachmentFiles ?? [];
	if (files.length) {
		attachments = [];
		keepFiles = [];
		if (files.length > ATTACH_MAX_FILES) e.attachments = `Attach up to ${ATTACH_MAX_FILES} files.`;
		for (const file of files) {
			const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
			if (!ATTACH_EXT.includes(ext)) { e.attachments = `${file.name}: only PDF, Excel, Word or image files.`; break; }
			if (file.size > ATTACH_MAX_MB * 1024 * 1024) { e.attachments = `${file.name} is larger than ${ATTACH_MAX_MB} MB.`; break; }
			attachments.push(file.name.slice(0, 200));
		}
	}
	const saveDefaults = data.get('saveDefaults') === 'on';

	if (Object.keys(e).length) return { values, errors: e, saveDefaults };
	// valid → keep the uploaded quotation files
	const attachmentFiles = files.length ? (await Promise.all(files.map((f) => saveUpload(f, 'QUOTE', ownerUserId)))).map((f) => ({ name: f.fileName, fileId: f.fileId, sizeKb: f.sizeKb })) : keepFiles;
	return {
		values,
		errors: e,
		version: {
			unitPrice, quantity, priceBreaks: priceBreaks.sort((a, b) => a.qty - b.qty), toolingCost, toolOwnedByBuyer: values.toolOwnedByBuyer,
			setupCost, sampleCost, gstPercent, freight: values.freight as 'EX_WORKS' | 'DELIVERED', freightCost, includes: values.includes,
			sampleDays, bulkDays, monthlyCapacity: monthlyCapacity || undefined, paymentTerms: values.paymentTerms, validTill: values.validTill,
			processRoute: processes.map((p) => ({ process: p, mode: values.route[p] as 'IN_HOUSE' | 'OUTSOURCED' })),
			notes: values.notes, attachments, attachmentFiles
		},
		saveDefaults
	};
}

// ---------------- Buyer insights ("things to consider") ----------------

export interface Insight {
	tone: 'good' | 'warn' | 'info';
	text: string;
}

function median(nums: number[]): number {
	const a = [...nums].sort((x, y) => x - y);
	const m = Math.floor(a.length / 2);
	return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/** Prompts that help the buyer think before choosing — not a verdict. */
export function buyerInsights(q: Quote, rfq: Rfq, seller: Seller, all: Quote[]): Insight[] {
	const v = latest(q);
	const out: Insight[] = [];
	const live = all.filter(isLive);
	const prices = live.map((x) => landed(latest(x)).perPiece);
	const mine = landed(v).perPiece;
	const match = scoreMatch(seller, rfq);
	const picked = pickedProcesses(rfq.values);

	if (live.length > 1) {
		const med = median(prices);
		if (mine === Math.min(...prices)) out.push({ tone: 'good', text: 'Lowest landed price so far.' });
		if (mine < med * 0.75) out.push({ tone: 'warn', text: `About ${Math.round((1 - mine / med) * 100)}% below the median quote — confirm material grade, tolerances and what is included before deciding.` });
		if (mine > med * 1.3) out.push({ tone: 'info', text: `About ${Math.round((mine / med - 1) * 100)}% above the median — ask what extra is included, or negotiate.` });
		const bulk = live.map((x) => latest(x).bulkDays);
		if (v.bulkDays === Math.min(...bulk)) out.push({ tone: 'good', text: `Fastest bulk delivery (${v.bulkDays} days).` });
	}

	const own = normalizeProcesses(seller.processes);
	const missing = picked.filter((p) => !own.includes(p));
	if (missing.length) out.push({ tone: 'warn', text: `Outside their listed capability: ${missing.map((p) => PROCESS_LABEL[p] ?? p).join(', ')}. Ask for a process sheet or a sample first.` });
	else if (!picked.length && !match.covers.length)
		out.push({ tone: 'warn', text: `They don't list any ${shopLabel(normalizeShop(String(rfq.values.commodityCategory ?? ''))).toLowerCase()} work. Ask for a process sheet or a sample first.` });
	const outsourced = v.processRoute.filter((r) => r.mode === 'OUTSOURCED');
	if (outsourced.length) out.push({ tone: 'info', text: `Outsources ${outsourced.map((r) => PROCESS_LABEL[r.process] ?? r.process).join(', ')} — ask who does it and who owns quality.` });

	if (v.freight === 'EX_WORKS') out.push({ tone: 'info', text: `Ex-works price — freight is extra${match.distanceKm !== null ? ` (~${match.distanceKm} km away)` : ''}.` });
	if (match.distanceKm !== null && match.distanceKm > 500) out.push({ tone: 'warn', text: 'Far from your delivery location — factor in freight cost, transit time and site visits.' });
	else if (match.distanceKm !== null && match.distanceKm <= 50) out.push({ tone: 'good', text: `Nearby (~${match.distanceKm} km) — easy factory visits and quick logistics.` });

	const timelineDays = DELIVERY_TIMELINES.find((t) => t.id === rfq.values.deliveryTimeline)?.days;
	if (timelineDays && v.bulkDays > timelineDays) out.push({ tone: 'warn', text: `Bulk delivery (${v.bulkDays} days) is later than your timeline (${timelineDays} days).` });

	if (v.toolingCost > 0 && !v.toolOwnedByBuyer) out.push({ tone: 'warn', text: `Tooling (${inr(v.toolingCost)}) stays with the supplier — ask for tool ownership so you can move suppliers later.` });
	if (v.toolingCost > 0 && v.toolOwnedByBuyer) out.push({ tone: 'good', text: 'You will own the tooling.' });
	if (String(rfq.values.qualityRequirements ?? '') && !v.includes.includes('INSPECTION') && !v.includes.includes('REPORTS'))
		out.push({ tone: 'warn', text: 'You asked for quality requirements, but inspection / reports are not included in this price.' });
	if (/100\s*%\s*advance/i.test(v.paymentTerms)) out.push({ tone: 'warn', text: '100% advance — consider milestone payments, especially for a first order.' });

	const daysValid = Math.ceil((Date.parse(v.validTill) - Date.now()) / 86_400_000);
	if (daysValid <= 3) out.push({ tone: 'warn', text: daysValid < 0 ? 'This quote has expired — ask for a revision.' : `Price valid for only ${Math.max(daysValid, 0)} more day(s).` });

	if (seller.verification !== 'GROUND_VERIFIED') out.push({ tone: 'info', text: 'Documents verified, factory not yet inspected by eYantrik — consider a video call or visit.' });
	if (!seller.reviewCount) out.push({ tone: 'info', text: 'No buyer reviews yet — a sample order first lowers your risk.' });
	else if ((sellerRating(seller) ?? 0) >= 4.5) out.push({ tone: 'good', text: `Highly rated by buyers (★ ${sellerRating(seller)}).` });
	if (rfq.values.ndaRequired === 'yes' && !rfq.ndaAcceptedBy.includes(seller.id)) out.push({ tone: 'warn', text: 'Quoted without accepting your NDA, so they have not seen the drawings.' });

	return out;
}

/**
 * Buyer edited & re-posted an RFQ: the chain restarts. Live quotes become OUTDATED (seller must re-quote),
 * pending counter-offers lapse. Returns the seller ids that had quoted so they can be notified.
 */
export function outdateQuotes(rfq: Rfq, changed: string[]): string[] {
	const affected: string[] = [];
	for (const q of db.quotes.filter((x) => x.rfqId === rfq.id && isLive(x) && x.status !== 'ACCEPTED')) {
		q.status = 'OUTDATED';
		addEvent(q, { by: 'BUYER', kind: 'RFQ_EDITED', message: changed.length ? `Changed: ${changed.join(', ')}` : undefined });
		affected.push(q.sellerId);
	}
	return affected;
}
