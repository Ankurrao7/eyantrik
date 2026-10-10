// Approximate location from an Indian pincode, and road-agnostic distance between two points.
// DEMO: a small lookup by pincode prefix (first 3 digits = sorting district), falling back to state.
// Production: replace `coordsFor` with the India Post pincode dataset or a geocoding API.

export interface LatLng {
	lat: number;
	lng: number;
}

const PIN_PREFIX: Record<string, LatLng> = {
	'110': { lat: 28.61, lng: 77.21 }, // Delhi
	'201': { lat: 28.54, lng: 77.39 }, // Noida / Ghaziabad / Greater Noida
	'121': { lat: 28.41, lng: 77.32 }, // Faridabad
	'122': { lat: 28.42, lng: 76.98 }, // Gurugram / Manesar
	'124': { lat: 28.9, lng: 76.6 }, // Rohtak
	'131': { lat: 28.99, lng: 77.02 }, // Sonipat
	'141': { lat: 30.9, lng: 75.85 }, // Ludhiana
	'160': { lat: 30.73, lng: 76.78 }, // Chandigarh / Mohali
	'302': { lat: 26.91, lng: 75.79 }, // Jaipur
	'360': { lat: 22.3, lng: 70.8 }, // Rajkot
	'380': { lat: 23.02, lng: 72.57 }, // Ahmedabad
	'382': { lat: 23.1, lng: 72.6 }, // Ahmedabad outskirts / Sanand
	'400': { lat: 19.08, lng: 72.88 }, // Mumbai
	'410': { lat: 18.75, lng: 73.85 }, // Pune outskirts / Chakan
	'411': { lat: 18.52, lng: 73.86 }, // Pune
	'452': { lat: 22.72, lng: 75.86 }, // Indore
	'500': { lat: 17.39, lng: 78.49 }, // Hyderabad
	'560': { lat: 12.97, lng: 77.59 }, // Bengaluru
	'600': { lat: 13.08, lng: 80.27 }, // Chennai
	'641': { lat: 11.02, lng: 76.96 }, // Coimbatore
	'700': { lat: 22.57, lng: 88.36 } // Kolkata
};

const STATE_CENTRE: Record<string, LatLng> = {
	'Andhra Pradesh': { lat: 15.9, lng: 79.7 }, Bihar: { lat: 25.6, lng: 85.1 }, Chhattisgarh: { lat: 21.25, lng: 81.63 },
	Delhi: { lat: 28.61, lng: 77.21 }, Goa: { lat: 15.49, lng: 73.83 }, Gujarat: { lat: 22.7, lng: 71.6 },
	Haryana: { lat: 29.06, lng: 76.09 }, 'Himachal Pradesh': { lat: 31.1, lng: 77.17 }, Jharkhand: { lat: 23.34, lng: 85.31 },
	Karnataka: { lat: 15.32, lng: 75.71 }, Kerala: { lat: 10.85, lng: 76.27 }, 'Madhya Pradesh': { lat: 23.26, lng: 77.41 },
	Maharashtra: { lat: 19.75, lng: 75.71 }, Odisha: { lat: 20.3, lng: 85.82 }, Punjab: { lat: 31.15, lng: 75.34 },
	Rajasthan: { lat: 26.91, lng: 75.79 }, 'Tamil Nadu': { lat: 11.13, lng: 78.66 }, Telangana: { lat: 17.39, lng: 78.49 },
	'Uttar Pradesh': { lat: 26.85, lng: 80.95 }, Uttarakhand: { lat: 30.07, lng: 79.02 }, 'West Bengal': { lat: 22.57, lng: 88.36 }
};

export function coordsFor(pincode: string | undefined, state?: string): LatLng | null {
	if (pincode && PIN_PREFIX[pincode.slice(0, 3)]) return PIN_PREFIX[pincode.slice(0, 3)];
	return (state && STATE_CENTRE[state]) || null;
}

// ---- Pincode zones (Indian pincode: digit 1 = postal zone, 1–2 = region/circle, 1–3 = sorting district) ----

// Each zone also has a km band: some neighbours sit in different postal zones
// (e.g. Noida 201xxx vs Gurugram 122xxx, ~40 km apart), so the nearer of the two wins.
export const PIN_ZONES = [
	{ zone: 0, label: 'Same pincode area', maxKm: 10 },
	{ zone: 1, label: 'Same district / ≤50 km', maxKm: 50 },
	{ zone: 2, label: 'Same region / ≤250 km', maxKm: 250 },
	{ zone: 3, label: 'Same postal zone / ≤800 km', maxKm: 800 },
	{ zone: 4, label: 'Rest of India', maxKm: Infinity }
] as const;

export const PIN_ZONE_LABEL: Record<number, string> = Object.fromEntries(PIN_ZONES.map((z) => [z.zone, z.label]));

/** 0 = same pincode … 4 = different postal zone. Lower = nearer. */
export function pinZone(a: string | undefined, b: string | undefined): number {
	if (!a || !b || a.length !== 6 || b.length !== 6) return 4;
	if (a === b) return 0;
	if (a.slice(0, 3) === b.slice(0, 3)) return 1;
	if (a.slice(0, 2) === b.slice(0, 2)) return 2;
	if (a[0] === b[0]) return 3;
	return 4;
}

/** Zone used for ranking: the nearer of the pincode hierarchy and the straight-line km band. */
export function nearZone(a: string | undefined, b: string | undefined, km: number | null): number {
	const byPin = pinZone(a, b);
	const byKm = km === null ? 4 : PIN_ZONES.find((z) => km <= z.maxKm)!.zone;
	return Math.min(byPin, byKm);
}

/** Nearby-first ordering: pincode zone ascending, then km ascending (unknown km last). */
export function byNearness<T extends { zone: number; distanceKm: number | null }>(a: T, b: T): number {
	return a.zone - b.zone || (a.distanceKm ?? 99_999) - (b.distanceKm ?? 99_999);
}

/** Straight-line distance in km (Haversine). Road distance is typically ~1.2–1.4× this. */
export function distanceKm(a: LatLng, b: LatLng): number {
	const R = 6371;
	const toRad = (d: number) => (d * Math.PI) / 180;
	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);
	const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
	return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}
