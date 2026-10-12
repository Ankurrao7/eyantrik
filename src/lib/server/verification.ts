// Seller verification rules — what the system checks automatically, what the admin must confirm by
// looking at the documents, and the standard reasons for sending a seller back. Change rules HERE;
// the review screen (/admin/review/seller/[id]) and its actions read them.
import { coordsFor } from '../geo.ts';
import type { Seller } from './db.ts';
import { GST_STATE_CODE, GSTIN_RE } from './sellerForm.ts';
import { gstinTaken } from './sellers.ts';

export interface AutoCheck {
	label: string;
	/** true = passed, false = problem, null = information only */
	ok: boolean | null;
	detail: string;
}

/** Checks the system can do by itself — shown to the admin as ✓ / ⚠ before they open any document. */
export async function autoChecks(s: Seller): Promise<AutoCheck[]> {
	const gstOk = GSTIN_RE.test(s.gstin);
	const gstState = GST_STATE_CODE[s.gstin.slice(0, 2)];
	const docs = (k: string) => s.documents.filter((d) => d.kind === k);
	const gstDoc = docs('GST_CERTIFICATE');
	const photos = docs('FACTORY_PHOTO');
	const duplicate = gstOk ? await gstinTaken(s.gstin, s.id) : false;
	return [
		{ label: 'GSTIN format', ok: gstOk, detail: gstOk ? `${s.gstin} is a valid GSTIN pattern` : `${s.gstin} is not a valid 15-character GSTIN` },
		{ label: 'GST state matches factory', ok: gstState ? gstState === s.state : null, detail: gstState ? `GSTIN registered in ${gstState}; factory is in ${s.state}` : 'State code not recognised' },
		{ label: 'PAN inside the GSTIN', ok: null, detail: gstOk ? `PAN ${s.gstin.slice(2, 12)} — compare with the certificate` : '—' },
		{ label: 'GSTIN not used by another seller', ok: !duplicate, detail: duplicate ? 'Another active listing uses this GSTIN — check before approving' : 'No other listing uses it' },
		{ label: 'GST certificate uploaded', ok: gstDoc.some((d) => d.fileId) ? true : gstDoc.length ? null : false, detail: gstDoc.length ? (gstDoc.some((d) => d.fileId) ? 'Open it on the right' : 'Uploaded before files were kept — ask the seller to re-upload') : 'Missing' },
		{ label: 'Factory photos', ok: photos.length > 0, detail: photos.length ? `${photos.length} photo${photos.length === 1 ? '' : 's'}` : 'None uploaded' },
		{ label: 'Location recognised', ok: !!coordsFor(s.pincode, s.state), detail: `${s.city}, ${s.state} ${s.pincode} — used for nearest-first matching` },
		{ label: 'Machines listed', ok: s.machines.length > 0, detail: s.machines.length ? s.machines.map((m) => `${m.count}× ${m.name}`).join(', ') : 'No machines listed' },
		{ label: 'Work (processes) listed', ok: s.processes.length > 0, detail: `${s.processes.length} process${s.processes.length === 1 ? '' : 'es'}` }
	];
}

/** What the admin must confirm by LOOKING at the documents. Approval is blocked until every required box is ticked. */
export const REVIEW_CHECKS = [
	{ id: 'DOC_GENUINE', label: 'The GST certificate is genuine and readable', required: true },
	{ id: 'NAME_MATCH', label: 'Legal / trade name on the certificate matches the company name', required: true },
	{ id: 'GSTIN_MATCH', label: 'GSTIN on the certificate is the same as entered', required: true },
	{ id: 'ADDRESS_MATCH', label: 'Address on the certificate matches the factory city and state', required: true },
	{ id: 'PHOTOS_REAL', label: 'Photos show a real workshop with the kind of machines listed', required: true },
	{ id: 'CALLED', label: 'Spoke to the contact person on the phone (recommended)', required: false }
] as const;

/** Standard reasons when sending a seller back — the seller sees the reason and can fix and resubmit. */
export const CHANGE_REASONS = [
	'GST certificate is blurry or unreadable',
	'Company name does not match the GST certificate',
	'GSTIN does not match the certificate',
	'Address or state does not match the certificate',
	'Factory photos are missing or not clear',
	'Machines in the photos do not match the listing',
	'Other'
] as const;

/** On-site visit checklist — all required before marking a factory ground verified. */
export const VISIT_CHECKS = [
	{ id: 'ADDRESS_FOUND', label: 'Factory found at the listed address' },
	{ id: 'MACHINES_MATCH', label: 'Machines on the floor match the listing' },
	{ id: 'OWNER_MET', label: 'Met the owner or contact person' }
] as const;
