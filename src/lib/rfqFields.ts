// RFQ (Post Requirement) form definition — aligned with the E-Yantrik "Create New RFQ" form.
// The form UI, server validation and the read-only display are all generated from this list,
// so adding / removing / reordering an attribute only needs a change here.
//
// Shared categories (industry, commodity, material family, budget, timeline) come from taxonomy.ts
// and are the same ids sellers are tagged with — that's what the shop filter/ranking compares.

import {
	BUDGET_RANGES,
	COMMODITY_CATEGORIES,
	DELIVERY_TIMELINES,
	INDIAN_STATES,
	INDUSTRIES,
	MATERIAL_CATEGORIES,
	ORDER_TYPES,
	PROCESSES,
	processesForCommodity
} from './taxonomy.ts';
import { QUOTE_WINDOWS } from './quote.ts';

export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'date' | 'file' | 'checkbox';

export interface RfqField {
	name: string;
	label: string;
	type: FieldType;
	required?: boolean;
	/** Used by matching / unlocking / ranking — keep these (labels can change freely). */
	core?: boolean;
	placeholder?: string;
	/** pre-selected value for a new form */
	defaultValue?: string;
	help?: string;
	options?: { value: string; label: string }[];
	min?: number;
	max?: number;
	minLength?: number;
	maxLength?: number;
	/** number fields: allow decimals (default whole numbers only) */
	decimals?: boolean;
	unit?: string;
	pattern?: { regex: RegExp; message: string };
	/** file fields */
	accept?: string;
	maxSizeMb?: number;
	maxFiles?: number;
	/** multiselect whose options are narrowed by another field's value (e.g. process ← commodity) */
	filterBy?: 'commodityCategory';
	/** text field with suggestions taken from another field's value (e.g. material ← material family) */
	suggestFrom?: 'materialCategory';
	section: (typeof RFQ_SECTIONS)[number];
	width?: 'full' | 'half' | 'third';
}

export const RFQ_SECTIONS = ['Part', 'Specifications', 'Delivery', 'Drawings & Attachments'] as const;

export const RFQ_FIELDS: RfqField[] = [
	// ---- Part ----
	{ name: 'partName', label: 'Part name', type: 'text', required: true, core: true, minLength: 3, maxLength: 120, placeholder: 'e.g. Hydraulic valve block', help: 'The RFQ title uses the part name (minimum 3 characters).', section: 'Part' },
	{ name: 'description', label: 'Description', type: 'textarea', maxLength: 2000, placeholder: 'Detailed specifications, application, notes suppliers should see.', section: 'Part' },
	{ name: 'industry', label: 'Industry', type: 'select', required: true, core: true, options: INDUSTRIES.map((i) => ({ value: i.id, label: i.label })), section: 'Part', width: 'half' },
	{ name: 'budgetRange', label: 'Budget range', type: 'select', required: true, core: true, options: BUDGET_RANGES.map((b) => ({ value: b.id, label: b.label })), section: 'Part', width: 'half' },
	{ name: 'commodityCategory', label: 'Commodity category', type: 'select', required: true, core: true, options: COMMODITY_CATEGORIES.map((c) => ({ value: c.id, label: c.label })), section: 'Part', width: 'half' },
	{ name: 'materialCategory', label: 'Material category', type: 'select', required: true, core: true, options: MATERIAL_CATEGORIES.map((m) => ({ value: m.id, label: m.label })), section: 'Part', width: 'half' },
	{ name: 'material', label: 'Material', type: 'text', required: true, maxLength: 80, placeholder: 'e.g. EN8, SS304, Al6061', suggestFrom: 'materialCategory', section: 'Part' },
	{
		name: 'processes',
		label: 'Manufacturing process',
		type: 'multiselect',
		core: true,
		filterBy: 'commodityCategory',
		help: 'Optional — pick every process the part needs (multi-process parts can use “Show all processes”). If left empty we match on the whole commodity category.',
		options: PROCESSES.map((p) => ({ value: p.id, label: p.label })),
		section: 'Part'
	},
	{ name: 'orderType', label: 'Prototype or batch?', type: 'select', required: true, core: true, options: ORDER_TYPES.map((o) => ({ value: o.id, label: o.label })), section: 'Part', width: 'half' },
	{ name: 'quantity', label: 'Quantity', type: 'number', required: true, core: true, min: 1, max: 10_000_000, unit: 'pcs', placeholder: '100', section: 'Part', width: 'half' },

	// ---- Specifications (bounding box feeds the future instant estimate) ----
	{ name: 'lengthMm', label: 'Length', type: 'number', decimals: true, min: 0.1, max: 20_000, unit: 'mm', placeholder: '200', help: 'Bounding dimensions — used for instant estimates.', section: 'Specifications', width: 'third' },
	{ name: 'widthMm', label: 'Width', type: 'number', decimals: true, min: 0.1, max: 20_000, unit: 'mm', placeholder: '150', section: 'Specifications', width: 'third' },
	{ name: 'heightMm', label: 'Height', type: 'number', decimals: true, min: 0.1, max: 20_000, unit: 'mm', placeholder: '50', section: 'Specifications', width: 'third' },
	{ name: 'toleranceMm', label: 'Tolerance', type: 'number', decimals: true, min: 0.001, max: 10, unit: 'mm', placeholder: '0.05', section: 'Specifications', width: 'third' },
	{ name: 'toleranceNotes', label: 'Tolerance notes', type: 'text', maxLength: 200, placeholder: 'e.g. ±0.05 mm on mating faces', section: 'Specifications', width: 'third' },
	{ name: 'surfaceFinish', label: 'Surface finish', type: 'text', maxLength: 120, placeholder: 'Ra 1.6 / Zinc plated', section: 'Specifications', width: 'third' },
	{ name: 'qualityRequirements', label: 'Quality requirements', type: 'text', maxLength: 300, placeholder: 'e.g. ISO 9001 certified supplier, PPAP required', section: 'Specifications' },

	// ---- Delivery (pincode gives the location used for "nearby" ranking) ----
	{ name: 'deliveryTimeline', label: 'Delivery timeline', type: 'select', required: true, core: true, options: DELIVERY_TIMELINES.map((t) => ({ value: t.id, label: t.label })), section: 'Delivery', width: 'half' },
	{ name: 'deliveryPincode', label: 'Delivery pincode', type: 'text', required: true, core: true, pattern: { regex: /^[1-9][0-9]{5}$/, message: 'Enter a valid 6-digit pincode.' }, placeholder: '411001', help: 'Used to rank nearby suppliers first.', section: 'Delivery', width: 'half' },
	{ name: 'deliveryCity', label: 'Delivery city', type: 'text', required: true, core: true, maxLength: 60, placeholder: 'e.g. Pune', section: 'Delivery', width: 'half' },
	{ name: 'deliveryState', label: 'State', type: 'select', required: true, core: true, options: INDIAN_STATES.map((s) => ({ value: s, label: s })), section: 'Delivery', width: 'half' },
	{ name: 'quoteWindowDays', label: 'Quotes close in', type: 'select', required: true, core: true, defaultValue: '7', options: QUOTE_WINDOWS.map((w) => ({ value: String(w.days), label: w.label })), help: 'Suppliers can send quotations until then. Negotiation can continue after.', section: 'Delivery', width: 'half' },

	// ---- Drawings ----
	{ name: 'ndaRequired', label: 'Require NDA before suppliers can view drawings', type: 'checkbox', help: 'Suppliers must accept an NDA to see files attached to this RFQ.', section: 'Drawings & Attachments' },
	{
		name: 'drawings',
		label: 'Drawings & attachments',
		type: 'file',
		accept: '.pdf,.dxf,.dwg,.step,.stp,.stl,.igs,.iges,.png,.jpg,.jpeg',
		maxSizeMb: 20,
		maxFiles: 10,
		help: 'PDF, DXF, DWG, STEP, STL, IGES, PNG, JPG — up to 20 MB each, max 10 files. (Demo: only file names are stored.)',
		section: 'Drawings & Attachments'
	}
];

export const RFQ_FIELD = Object.fromEntries(RFQ_FIELDS.map((f) => [f.name, f])) as Record<string, RfqField>;

export type RfqValues = Record<string, string | string[]>;
export type RfqFiles = Record<string, { name: string; sizeKb: number }[]>;

export interface ParsedRfq {
	values: RfqValues;
	files: RfqFiles;
	errors: Record<string, string>;
}

/** Processes used for matching: the ones picked, or the whole commodity category if none were picked. */
export function effectiveProcesses(values: RfqValues): string[] {
	const picked = Array.isArray(values.processes) ? values.processes : [];
	return picked.length ? picked : processesForCommodity(String(values.commodityCategory ?? ''));
}

/** Validates submitted form data against RFQ_FIELDS. Used on the server. */
export function parseRfqForm(data: FormData): ParsedRfq {
	const values: RfqValues = {};
	const files: RfqFiles = {};
	const errors: Record<string, string> = {};

	for (const f of RFQ_FIELDS) {
		if (f.type === 'file') {
			const picked = data.getAll(f.name).filter((x): x is File => x instanceof File && x.size > 0);
			files[f.name] = [];
			if (f.maxFiles && picked.length > f.maxFiles) errors[f.name] = `Attach up to ${f.maxFiles} files.`;
			for (const file of picked) {
				const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
				if (f.accept && !f.accept.split(',').includes(ext)) {
					errors[f.name] = `${file.name}: file type ${ext} is not allowed.`;
					break;
				}
				if (f.maxSizeMb && file.size > f.maxSizeMb * 1024 * 1024) {
					errors[f.name] = `${file.name} is larger than ${f.maxSizeMb} MB.`;
					break;
				}
				files[f.name].push({ name: file.name.slice(0, 200), sizeKb: Math.round(file.size / 1024) });
			}
			if (f.required && picked.length === 0 && !errors[f.name]) errors[f.name] = 'Upload at least one file.';
			continue;
		}

		if (f.type === 'checkbox') {
			values[f.name] = data.get(f.name) === 'on' ? 'yes' : '';
			continue;
		}

		if (f.type === 'multiselect') {
			const allowed = new Set(f.options?.map((o) => o.value));
			const picked = [...new Set(data.getAll(f.name).map(String))].filter((v) => allowed.has(v));
			values[f.name] = picked;
			if (f.required && picked.length === 0) errors[f.name] = 'Select at least one option.';
			continue;
		}

		// Fields with a default (e.g. quote window) fall back to it when left empty.
		const raw = (data.get(f.name)?.toString() ?? '').trim() || f.defaultValue || '';
		values[f.name] = raw;

		if (!raw) {
			if (f.required) errors[f.name] = `${f.label} is required.`;
			continue;
		}
		if (f.minLength && raw.length < f.minLength) errors[f.name] = `Enter at least ${f.minLength} characters.`;
		if (f.maxLength && raw.length > f.maxLength) errors[f.name] = `Keep it under ${f.maxLength} characters.`;
		if (f.type === 'number') {
			const n = Number(raw);
			if (!Number.isFinite(n)) errors[f.name] = 'Enter a number.';
			else if (!f.decimals && !Number.isInteger(n)) errors[f.name] = 'Enter a whole number.';
			else if (f.min !== undefined && n < f.min) errors[f.name] = `Minimum is ${f.min}${f.unit ? ' ' + f.unit : ''}.`;
			else if (f.max !== undefined && n > f.max) errors[f.name] = `Maximum is ${f.max.toLocaleString('en-IN')}${f.unit ? ' ' + f.unit : ''}.`;
		}
		if (f.type === 'select' && f.options && !f.options.some((o) => o.value === raw)) {
			errors[f.name] = 'Pick an option from the list.';
		}
		if (f.type === 'date') {
			const d = new Date(raw);
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			if (Number.isNaN(d.getTime())) errors[f.name] = 'Enter a valid date.';
			else if (d < today) errors[f.name] = 'Date cannot be in the past.';
		}
		if (f.pattern && !f.pattern.regex.test(raw)) errors[f.name] = f.pattern.message;
	}

	// Commodity category is the PRIMARY category; multi-process parts (e.g. casting + machining +
	// anodizing) may also pick processes from other categories, so no cross-field restriction here.

	return { values, files, errors };
}

/** Human-readable value for display pages (buyer detail, seller lead, admin). */
export function formatRfqValue(field: RfqField, values: RfqValues, files?: RfqFiles): string {
	if (field.type === 'file') {
		const list = files?.[field.name] ?? [];
		return list.length ? list.map((f) => f.name).join(', ') : '—';
	}
	const v = values[field.name];
	if (field.type === 'checkbox') return v === 'yes' ? 'Yes' : 'No';
	if (Array.isArray(v)) return v.map((x) => field.options?.find((o) => o.value === x)?.label ?? x).join(', ') || '—';
	if (!v) return '—';
	if (field.type === 'select') return field.options?.find((o) => o.value === v)?.label ?? v;
	if (field.type === 'number') return `${Number(v).toLocaleString('en-IN')}${field.unit ? ' ' + field.unit : ''}`;
	if (field.type === 'date') return new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
	return v;
}
