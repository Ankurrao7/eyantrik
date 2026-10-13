// Seller profile completeness (the ring around the seller's avatar, LinkedIn-style).
// One list of weighted items, used by the header ring, seller dashboard, seller home, the profile
// page, the admin supplier file and matching (complete profiles rank a little higher).
// Safe on client and server: takes plain seller fields only.

export interface ScoreInput {
	verification: string;
	mainShop?: string;
	processes: string[];
	orderTypes?: string[];
	teamSize?: string;
	materials: string[];
	industries: string[];
	machines: { name: string; count: number }[];
	documents: { kind: string }[];
	about: string;
	certifications: string[];
	maxPartSize?: string;
	bestTolerance?: string;
	yearEstablished?: number;
	email?: string;
}

export interface ScoreItem {
	id: string;
	label: string;
	points: number;
	done: boolean;
	/** what to do, in plain words */
	hint: string;
	/** where to fix it; null = the eYantrik team does it */
	href: string | null;
}

const PROFILE = '/seller/profile';
export const MIN_PHOTOS = 3;
export const GOOD_ABOUT = 120;

export function profileItems(s: ScoreInput): ScoreItem[] {
	const verified = s.verification === 'DOCS_VERIFIED' || s.verification === 'GROUND_VERIFIED';
	const photos = s.documents.filter((d) => d.kind === 'FACTORY_PHOTO').length;
	return [
		{ id: 'basics', label: 'Company & contact details', points: 10, done: true, hint: 'Registered at sign-up.', href: null },
		{ id: 'docs', label: 'Documents verified', points: 15, done: verified, hint: 'Our team checks your GST certificate and photos (1–2 working days).', href: null },
		{ id: 'ground', label: 'Factory visit done', points: 10, done: s.verification === 'GROUND_VERIFIED', hint: 'After documents are verified, our team visits your factory. Ask the help desk to schedule it.', href: '/help' },
		{ id: 'work', label: 'Main type of work & processes', points: 10, done: !!s.mainShop && s.processes.length > 0, hint: 'Pick your main type of work and tick every process you do in-house.', href: `${PROFILE}#capabilities` },
		{ id: 'orders', label: 'Order sizes & team size', points: 10, done: !!s.orderTypes?.length && !!s.teamSize, hint: 'Tell buyers if you take prototypes, small batches or production runs.', href: `${PROFILE}#capabilities` },
		{ id: 'markets', label: 'Materials & industries', points: 10, done: s.materials.length > 0 && s.industries.length > 0, hint: 'Buyers in your industry see you first.', href: `${PROFILE}#capabilities` },
		{ id: 'machines', label: 'Machine list', points: 10, done: s.machines.length > 0, hint: 'List your machines with quantities (make & model if you can).', href: `${PROFILE}#machines` },
		{ id: 'photos', label: `${MIN_PHOTOS}+ shop-floor photos`, points: 10, done: photos >= MIN_PHOTOS, hint: `Add photos of your machines and shop floor (${photos} of ${MIN_PHOTOS} so far).`, href: `${PROFILE}#photos` },
		{ id: 'about', label: 'Good description', points: 5, done: s.about.trim().length >= GOOD_ABOUT, hint: `Describe what you make, for whom, and your strengths (at least ${GOOD_ABOUT} characters).`, href: `${PROFILE}#company` },
		{ id: 'certs', label: 'Certifications', points: 5, done: s.certifications.length > 0, hint: 'Add ISO / IATF or other certificates you hold.', href: `${PROFILE}#company` },
		{ id: 'limits', label: 'Largest part & best tolerance', points: 5, done: !!s.maxPartSize && !!s.bestTolerance, hint: 'Helps buyers know if you can make their part.', href: `${PROFILE}#capabilities` }
	];
}

export function profileScore(s: ScoreInput): { percent: number; items: ScoreItem[]; missing: ScoreItem[] } {
	const items = profileItems(s);
	const total = items.reduce((n, i) => n + i.points, 0);
	const got = items.filter((i) => i.done).reduce((n, i) => n + i.points, 0);
	return { percent: Math.round((got / total) * 100), items, missing: items.filter((i) => !i.done) };
}

/** Ring colour band. */
export function scoreTone(percent: number): 'low' | 'mid' | 'high' {
	return percent >= 80 ? 'high' : percent >= 50 ? 'mid' : 'low';
}
