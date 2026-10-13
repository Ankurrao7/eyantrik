// Validation for seller profiles — shared by self-registration (/seller/onboarding),
// team onboarding (/admin → Add seller) and the seller's own profile edits (/seller/profile).
// Capabilities (parseCapabilities) use FIXED lists wherever possible so suppliers can be grouped
// on fixed attributes: main type of work, processes, order sizes, team size, materials, industries.

import { normalizePhone, PHONE_ERROR } from './auth.ts';
import type { Machine, SellerDocument } from './db.ts';
import { gstinTaken } from './sellers.ts';
import { saveUpload } from './files.ts';
import { CERTIFICATIONS, INDIAN_STATES, INDUSTRIES, MATERIAL_CATEGORIES, ORDER_TYPES, PART_SIZES, TEAM_SIZES, TOLERANCES } from '../taxonomy.ts';
import { isShopId, normalizeProcesses, processesOfShop, shopLabel } from '../processes.ts';

export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** First two digits of a GSTIN = state code. Used to check the GSTIN matches the factory's state. */
export const GST_STATE_CODE: Record<string, string> = {
	'01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand',
	'06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '19': 'West Bengal',
	'20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
	'27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa', '32': 'Kerala', '33': 'Tamil Nadu', '36': 'Telangana', '37': 'Andhra Pradesh'
};

const DOC_EXT = ['.pdf', '.jpg', '.jpeg', '.png'];
const PHOTO_EXT = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_DOC_MB = 5;
export const MAX_PHOTOS = 10;

export interface SellerInput {
	companyName: string;
	contactPerson: string;
	phone: string;
	whatsapp: string;
	email: string;
	gstin: string;
	address: string;
	city: string;
	state: string;
	pincode: string;
	yearEstablished: string;
	about: string;
	processes: string[];
	materials: string[];
	industries: string[];
	machines: { name: string; count: string }[];
	/** fixed choices (CERTIFICATIONS) */
	certChoices: string[];
	/** anything else, comma separated */
	certifications: string;
	mainShop: string;
	orderTypes: string[];
	teamSize: string;
	maxPartSize: string;
	bestTolerance: string;
}

/** The capability part of the form (everything except company identity, contact and documents). */
export type CapabilityInput = Pick<SellerInput, 'yearEstablished' | 'about' | 'processes' | 'materials' | 'industries' | 'machines' | 'certChoices' | 'certifications' | 'mainShop' | 'orderTypes' | 'teamSize' | 'maxPartSize' | 'bestTolerance'>;

export interface CleanCapabilities {
	machines: Machine[];
	yearEstablished?: number;
	certifications: string[];
}

const ids = <T extends readonly { id: string }[]>(list: T) => new Set(list.map((x) => x.id));
const ORDER_IDS = ids(ORDER_TYPES), TEAM_IDS = ids(TEAM_SIZES), PART_IDS = ids(PART_SIZES), TOL_IDS = ids(TOLERANCES);

/** Split stored certifications into the fixed choices and the free "other" text (for pre-filling the form). */
export function splitCertifications(list: string[]): { certChoices: string[]; certifications: string } {
	const norm = (c: string) => CERTIFICATIONS.find((f) => c.toLowerCase().replace(/[:\s-]+\d{4}$/, '').trim() === f.toLowerCase());
	const certChoices = [...new Set(list.map(norm).filter((c): c is (typeof CERTIFICATIONS)[number] => !!c))];
	return { certChoices, certifications: list.filter((c) => !norm(c)).join(', ') };
}

/** Form values for an existing seller (onboarding resubmission, profile edit). */
export function capabilityValues(s: { yearEstablished?: number; about: string; processes: string[]; materials: string[]; industries: string[]; machines: Machine[]; certifications: string[]; mainShop?: string; orderTypes?: string[]; teamSize?: string; maxPartSize?: string; bestTolerance?: string }) {
	return {
		yearEstablished: s.yearEstablished ? String(s.yearEstablished) : '',
		about: s.about,
		processes: s.processes,
		materials: s.materials,
		industries: s.industries,
		machines: s.machines.map((m) => ({ name: m.name, count: String(m.count) })),
		...splitCertifications(s.certifications),
		mainShop: s.mainShop ?? '',
		orderTypes: s.orderTypes ?? [],
		teamSize: s.teamSize ?? '',
		maxPartSize: s.maxPartSize ?? '',
		bestTolerance: s.bestTolerance ?? ''
	};
}

/** Read + validate the capability fields. Mandatory: main type of work, a process in it, materials, industries, order sizes, team size, machines, about. */
export function parseCapabilities(data: FormData): { input: CapabilityInput; errors: Record<string, string>; clean: CleanCapabilities } {
	const s = (k: string) => (data.get(k)?.toString() ?? '').trim();
	const names = data.getAll('machineName').map((v) => v.toString().trim());
	const counts = data.getAll('machineCount').map((v) => v.toString().trim());
	const input: CapabilityInput = {
		yearEstablished: s('yearEstablished'),
		about: s('about'),
		processes: normalizeProcesses(data.getAll('processes').map(String)),
		materials: data.getAll('materials').map(String).filter((m) => MATERIAL_CATEGORIES.some((x) => x.id === m)),
		industries: data.getAll('industries').map(String).filter((i) => INDUSTRIES.some((x) => x.id === i)),
		machines: names.map((name, i) => ({ name, count: counts[i] ?? '' })).filter((m) => m.name || m.count),
		certChoices: [...new Set(data.getAll('certChoices').map(String))].filter((c) => (CERTIFICATIONS as readonly string[]).includes(c)),
		certifications: s('certifications'),
		mainShop: s('mainShop'),
		orderTypes: [...new Set(data.getAll('orderTypes').map(String))].filter((o) => ORDER_IDS.has(o)),
		teamSize: s('teamSize'),
		maxPartSize: s('maxPartSize'),
		bestTolerance: s('bestTolerance')
	};
	const e: Record<string, string> = {};

	let yearEstablished: number | undefined;
	if (input.yearEstablished) {
		yearEstablished = Number(input.yearEstablished);
		if (!Number.isInteger(yearEstablished) || yearEstablished < 1900 || yearEstablished > new Date().getFullYear())
			e.yearEstablished = 'Enter a valid year.';
	}
	if (input.about.length < 20) e.about = 'Describe your work in at least 20 characters (what you make, for which industries).';
	if (input.about.length > 1000) e.about = 'Keep it under 1000 characters.';

	if (!isShopId(input.mainShop)) e.mainShop = 'Choose your main type of work.';
	if (input.processes.length === 0) e.processes = 'Tick at least one kind of work you do.';
	else if (isShopId(input.mainShop) && !input.processes.some((p) => processesOfShop(input.mainShop).includes(p)))
		e.processes = `Tick at least one process under your main type of work (${shopLabel(input.mainShop)}).`;
	if (input.materials.length === 0) e.materials = 'Select at least one material family.';
	if (input.industries.length === 0) e.industries = 'Select at least one industry you supply.';
	if (input.orderTypes.length === 0) e.orderTypes = 'Select the order sizes you take.';
	if (!TEAM_IDS.has(input.teamSize)) e.teamSize = 'Select your team size.';
	if (input.maxPartSize && !PART_IDS.has(input.maxPartSize)) e.maxPartSize = 'Choose from the list.';
	if (input.bestTolerance && !TOL_IDS.has(input.bestTolerance)) e.bestTolerance = 'Choose from the list.';

	const machines: Machine[] = [];
	if (input.machines.length === 0) e.machines = 'List at least one machine — this is checked during inspection.';
	for (const m of input.machines) {
		const count = Number(m.count);
		if (!m.name || m.name.length > 80 || !Number.isInteger(count) || count < 1 || count > 999) {
			e.machines = 'Each machine needs a name and a quantity between 1 and 999.';
			break;
		}
		machines.push({ name: m.name, count });
	}
	if (input.machines.length > 40) e.machines = 'List up to 40 machine types.';

	const other = input.certifications.split(',').map((c) => c.trim()).filter(Boolean);
	const certifications = [...new Set([...input.certChoices, ...other])].slice(0, 15);
	return { input, errors: e, clean: { machines, yearEstablished, certifications } };
}

/** Fixed attributes to store on the seller (empty optional ones are removed). */
export function attributeFields(input: CapabilityInput) {
	return {
		mainShop: input.mainShop,
		orderTypes: input.orderTypes,
		teamSize: input.teamSize,
		maxPartSize: input.maxPartSize || undefined,
		bestTolerance: input.bestTolerance || undefined
	};
}

export interface ParsedSeller {
	input: SellerInput;
	errors: Record<string, string>;
	clean?: {
		phone: string;
		whatsapp: string;
		machines: Machine[];
		yearEstablished?: number;
		certifications: string[];
		documents: SellerDocument[];
	};
}

/** Check + save extra shop-floor photos (profile page). `have` = photos already on file. */
export async function saveExtraPhotos(data: FormData, have: number, ownerUserId?: string): Promise<{ error?: string; documents: SellerDocument[] }> {
	const files: File[] = [];
	for (const p of data.getAll('factoryPhotos')) {
		const r = checkFile(p, PHOTO_EXT);
		if (r === 'missing') continue;
		if (typeof r === 'string') return { error: r, documents: [] };
		files.push(r.file);
	}
	if (have + files.length > MAX_PHOTOS) return { error: `You can keep up to ${MAX_PHOTOS} photos (you have ${have}).`, documents: [] };
	const documents: SellerDocument[] = [];
	for (const f of files) {
		const saved = await saveUpload(f, 'FACTORY_PHOTO', ownerUserId);
		documents.push({ kind: 'FACTORY_PHOTO', fileName: saved.fileName, fileId: saved.fileId, sizeKb: saved.sizeKb, type: saved.type });
	}
	return { documents };
}

function checkFile(file: FormDataEntryValue | null, allowed: string[]): { file: File } | 'missing' | string {
	if (!(file instanceof File) || file.size === 0) return 'missing';
	const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
	if (!allowed.includes(ext)) return `Only ${allowed.join(', ')} files are allowed.`;
	if (file.size > MAX_DOC_MB * 1024 * 1024) return `Each file must be under ${MAX_DOC_MB} MB.`;
	return { file };
}

export async function parseSellerForm(
	data: FormData,
	opts: { mode: 'SELF' | 'TEAM'; fixedPhone?: string; excludeSellerId?: string; ownerUserId?: string }
): Promise<ParsedSeller> {
	const s = (k: string) => (data.get(k)?.toString() ?? '').trim();
	const caps = parseCapabilities(data);

	const input: SellerInput = {
		companyName: s('companyName'),
		contactPerson: s('contactPerson'),
		phone: opts.fixedPhone ?? s('phone'),
		whatsapp: s('whatsapp'),
		email: s('email'),
		gstin: s('gstin').toUpperCase(),
		address: s('address'),
		city: s('city'),
		state: s('state'),
		pincode: s('pincode'),
		...caps.input
	};
	const e: Record<string, string> = { ...caps.errors };

	if (input.companyName.length < 3 || input.companyName.length > 120) e.companyName = 'Enter the registered company name (3–120 characters).';
	if (input.contactPerson.length < 2) e.contactPerson = 'Enter the contact person’s name.';

	// Only India (+91) for now — the PhoneInput dropdown sends phoneCountry / whatsappCountry.
	const indian = (field: string) => !data.get(`${field}Country`) || data.get(`${field}Country`) === '+91';
	const phone = indian('phone') ? normalizePhone(input.phone) : null;
	if (!phone) e.phone = PHONE_ERROR;
	const whatsapp = input.whatsapp ? (indian('whatsapp') ? normalizePhone(input.whatsapp) : null) : phone;
	if (input.whatsapp && !whatsapp) e.whatsapp = `${PHONE_ERROR} Or leave blank to use the mobile number.`;
	if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) e.email = 'Enter a valid email or leave blank.';

	if (!GSTIN_RE.test(input.gstin)) {
		e.gstin = 'Enter a valid 15-character GSTIN (e.g. 09ABCDE1234F1Z5).';
	} else {
		const gstState = GST_STATE_CODE[input.gstin.slice(0, 2)];
		if (input.state && gstState && gstState !== input.state) e.gstin = `This GSTIN is registered in ${gstState}, but the factory state is ${input.state}.`;
		if (await gstinTaken(input.gstin, opts.excludeSellerId))
			e.gstin = 'This GSTIN is already registered on eYantrik. Contact the help desk if this is your company.';
	}

	if (input.address.length < 5) e.address = 'Enter the full factory address (it will be inspected).';
	if (input.city.length < 2) e.city = 'Enter the city.';
	if (!(INDIAN_STATES as readonly string[]).includes(input.state)) e.state = 'Select the state.';
	if (!/^[1-9][0-9]{5}$/.test(input.pincode)) e.pincode = 'Enter a valid 6-digit pincode.';


	// Documents: required for self-registration; optional when the team adds a seller after a site visit.
	// Files are only SAVED once the whole form is valid (below), so a rejected form leaves nothing behind.
	const uploads: { kind: SellerDocument['kind']; file: File }[] = [];
	const gst = checkFile(data.get('gstCertificate'), DOC_EXT);
	if (gst === 'missing') {
		if (opts.mode === 'SELF') e.gstCertificate = 'Upload your GST registration certificate.';
	} else if (typeof gst === 'string') e.gstCertificate = gst;
	else uploads.push({ kind: 'GST_CERTIFICATE', file: gst.file });

	const udyam = checkFile(data.get('udyam'), DOC_EXT);
	if (typeof udyam === 'string' && udyam !== 'missing') e.udyam = udyam;
	else if (typeof udyam === 'object') uploads.push({ kind: 'UDYAM_MSME', file: udyam.file });

	const photos = data.getAll('factoryPhotos');
	let photoCount = 0;
	for (const p of photos) {
		const r = checkFile(p, PHOTO_EXT);
		if (r === 'missing') continue;
		if (typeof r === 'string') { e.factoryPhotos = r; break; }
		uploads.push({ kind: 'FACTORY_PHOTO', file: r.file });
		photoCount++;
	}
	if (photoCount > MAX_PHOTOS) e.factoryPhotos = `Upload up to ${MAX_PHOTOS} photos.`;
	if (opts.mode === 'SELF' && photoCount === 0 && !e.factoryPhotos) e.factoryPhotos = 'Upload at least one photo of your shop floor showing the machines.';

	if (opts.mode === 'SELF' && data.get('declaration') !== 'on')
		e.declaration = 'You must accept the verification declaration.';

	if (Object.keys(e).length) return { input, errors: e };
	const { machines, yearEstablished, certifications } = caps.clean;

	const documents: SellerDocument[] = [];
	for (const u of uploads) {
		const saved = await saveUpload(u.file, u.kind, opts.ownerUserId);
		documents.push({ kind: u.kind, fileName: saved.fileName, fileId: saved.fileId, sizeKb: saved.sizeKb, type: saved.type });
	}
	return { input, errors: e, clean: { phone: phone!, whatsapp: whatsapp!, machines, yearEstablished, certifications, documents } };
}
