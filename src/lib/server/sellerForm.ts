// Validation for seller profiles — shared by self-registration (/seller/onboarding)
// and team onboarding (/admin → Add seller).

import { normalizePhone, PHONE_ERROR } from './auth.ts';
import type { Machine, SellerDocument } from './db.ts';
import { gstinTaken } from './sellers.ts';
import { INDIAN_STATES, INDUSTRIES, MATERIAL_CATEGORIES, PROCESSES } from '../taxonomy.ts';

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** First two digits of a GSTIN = state code. Used to check the GSTIN matches the factory's state. */
const GST_STATE_CODE: Record<string, string> = {
	'01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand',
	'06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '19': 'West Bengal',
	'20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
	'27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa', '32': 'Kerala', '33': 'Tamil Nadu', '36': 'Telangana', '37': 'Andhra Pradesh'
};

const DOC_EXT = ['.pdf', '.jpg', '.jpeg', '.png'];
const PHOTO_EXT = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_DOC_MB = 5;

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
	certifications: string;
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

function checkFile(file: FormDataEntryValue | null, allowed: string[]): { name: string } | 'missing' | string {
	if (!(file instanceof File) || file.size === 0) return 'missing';
	const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
	if (!allowed.includes(ext)) return `Only ${allowed.join(', ')} files are allowed.`;
	if (file.size > MAX_DOC_MB * 1024 * 1024) return `Each file must be under ${MAX_DOC_MB} MB.`;
	return { name: file.name };
}

export async function parseSellerForm(
	data: FormData,
	opts: { mode: 'SELF' | 'TEAM'; fixedPhone?: string; excludeSellerId?: string }
): Promise<ParsedSeller> {
	const s = (k: string) => (data.get(k)?.toString() ?? '').trim();
	const names = data.getAll('machineName').map((v) => v.toString().trim());
	const counts = data.getAll('machineCount').map((v) => v.toString().trim());

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
		yearEstablished: s('yearEstablished'),
		about: s('about'),
		processes: data.getAll('processes').map(String).filter((p) => PROCESSES.some((x) => x.id === p)),
		materials: data.getAll('materials').map(String).filter((m) => MATERIAL_CATEGORIES.some((x) => x.id === m)),
		industries: data.getAll('industries').map(String).filter((i) => INDUSTRIES.some((x) => x.id === i)),
		machines: names.map((name, i) => ({ name, count: counts[i] ?? '' })).filter((m) => m.name || m.count),
		certifications: s('certifications')
	};
	const e: Record<string, string> = {};

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

	let yearEstablished: number | undefined;
	if (input.yearEstablished) {
		yearEstablished = Number(input.yearEstablished);
		if (!Number.isInteger(yearEstablished) || yearEstablished < 1900 || yearEstablished > new Date().getFullYear())
			e.yearEstablished = 'Enter a valid year.';
	}
	if (input.about.length < 20) e.about = 'Describe your work in at least 20 characters (what you make, for which industries).';
	if (input.about.length > 1000) e.about = 'Keep it under 1000 characters.';
	if (input.processes.length === 0) e.processes = 'Select at least one process.';
	if (input.materials.length === 0) e.materials = 'Select at least one material family.';

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

	// Documents: required for self-registration; optional when the team adds a seller after a site visit.
	const documents: SellerDocument[] = [];
	const gst = checkFile(data.get('gstCertificate'), DOC_EXT);
	if (gst === 'missing') {
		if (opts.mode === 'SELF') e.gstCertificate = 'Upload your GST registration certificate.';
	} else if (typeof gst === 'string') e.gstCertificate = gst;
	else documents.push({ kind: 'GST_CERTIFICATE', fileName: gst.name });

	const udyam = checkFile(data.get('udyam'), DOC_EXT);
	if (typeof udyam === 'string' && udyam !== 'missing') e.udyam = udyam;
	else if (typeof udyam === 'object') documents.push({ kind: 'UDYAM_MSME', fileName: udyam.name });

	const photos = data.getAll('factoryPhotos');
	let photoCount = 0;
	for (const p of photos) {
		const r = checkFile(p, PHOTO_EXT);
		if (r === 'missing') continue;
		if (typeof r === 'string') { e.factoryPhotos = r; break; }
		documents.push({ kind: 'FACTORY_PHOTO', fileName: r.name });
		photoCount++;
	}
	if (photoCount > 10) e.factoryPhotos = 'Upload up to 10 photos.';
	if (opts.mode === 'SELF' && photoCount === 0 && !e.factoryPhotos) e.factoryPhotos = 'Upload at least one photo of your shop floor showing the machines.';

	if (opts.mode === 'SELF' && data.get('declaration') !== 'on')
		e.declaration = 'You must accept the verification declaration.';

	const certifications = input.certifications.split(',').map((c) => c.trim()).filter(Boolean).slice(0, 10);

	return Object.keys(e).length
		? { input, errors: e }
		: { input, errors: e, clean: { phone: phone!, whatsapp: whatsapp!, machines, yearEstablished, certifications, documents } };
}
