// Shapes sent to the browser (safe to import from components).
import type { VerificationStatus } from './taxonomy.ts';

export interface PublicSeller {
	id: string;
	slug: string;
	companyName: string;
	city: string;
	state: string;
	yearEstablished?: number;
	about: string;
	processes: string[];
	/** material family ids */
	materials: string[];
	/** industry ids */
	industries: string[];
	machines: { name: string; count: number }[];
	certifications: string[];
	/** fixed attributes (missing on older listings) — see taxonomy.ts */
	mainShop?: string;
	orderTypes?: string[];
	teamSize?: string;
	maxPartSize?: string;
	bestTolerance?: string;
	verification: VerificationStatus;
	groundInspectedOn?: string;
	rating: number | null;
	reviewCount: number;
	isEyantrikPlant: boolean;
	contact: { person: string; phone: string; whatsapp: string; email?: string; address: string } | null;
}
