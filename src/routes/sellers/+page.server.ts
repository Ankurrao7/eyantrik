import { canSeeSellerContacts, sellerContactLock } from '#lib/server/auth.ts';
import { sellerRating } from '#lib/server/db.ts';
import type { Filter } from 'mongodb';
import type { Seller } from '#lib/server/db.ts';
import { toPublicSeller } from '#lib/server/matching.ts';
import { listSellers, sellers } from '#lib/server/sellers.ts';
import { INDUSTRY_LABEL, LISTED_STATUSES, MATERIAL_CATEGORY_LABEL, PROCESS_LABEL } from '#lib/taxonomy.ts';
import { isProcessId, isShopId, normalizeProcesses, normalizeShop, processById, processesOfShop, SHOPS } from '#lib/processes.ts';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 12;

export const load: PageServerLoad = async ({ url, locals }) => {
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
	const process = url.searchParams.get('process') ?? '';
	const state = url.searchParams.get('state') ?? '';
	const groundOnly = url.searchParams.get('ground') === '1';
	const pageNo = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1);

	// The dropdown filters run inside MongoDB; only the free-text search runs here
	// (it also matches labels like "CNC machining", which aren't stored in the database).
	const listed: Filter<Seller> = { verification: { $in: LISTED_STATUSES } };
	const filter: Filter<Seller> = { ...listed };
	// `process` may be a whole type of work (shop), one process, or an old id from an earlier link.
	const shopId = isShopId(process) ? process : normalizeShop(process);
	const wanted = shopId ? processesOfShop(shopId) : isProcessId(process) ? [process] : normalizeProcesses([process]);
	if (process && wanted.length) filter.processes = { $in: wanted }; // array field: any of these
	if (state) filter.state = state;
	if (groundOnly) filter.verification = 'GROUND_VERIFIED';
	const [found, states] = await Promise.all([listSellers(filter), sellers.distinct('state', listed)]);
	const terms = q.toLowerCase().split(/\s+/).filter(Boolean);

	const filtered = found
		.filter((s) => {
			if (!terms.length) return true;
			const hay = [
				s.companyName, s.city, s.state, s.about,
				...s.processes.map((p) => PROCESS_LABEL[p] ?? p),
				// other names people type: "VMC", "wire cut", "CO2 welding"…
				...s.processes.flatMap((p) => processById(p)?.aka ?? []),
				...s.materials.map((m) => MATERIAL_CATEGORY_LABEL[m] ?? m),
				...s.industries.map((i) => INDUSTRY_LABEL[i] ?? i),
				...s.machines.map((m) => m.name)
			].join(' ').toLowerCase();
			return terms.every((t) => hay.includes(t));
		})
		.sort(
			(a, b) =>
				Number(b.verification === 'GROUND_VERIFIED') - Number(a.verification === 'GROUND_VERIFIED') ||
				(sellerRating(b) ?? 0) - (sellerRating(a) ?? 0) ||
				a.companyName.localeCompare(b.companyName)
		);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const current = Math.min(pageNo, totalPages);
	const showContacts = canSeeSellerContacts(locals.sessions.BUYER);

	return {
		filters: { q, process, state, groundOnly },
		sellers: filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE).map((s) => toPublicSeller(s, showContacts)),
		total: filtered.length,
		page: current,
		totalPages,
		lockReason: sellerContactLock(locals.sessions.BUYER ?? locals.user),
		processGroups: SHOPS.map((sh) => ({ id: sh.id, label: sh.label, processes: sh.groups.flatMap((g) => g.processes.map((p) => ({ id: p.id, label: p.label }))) })),
		stateOptions: states.sort()
	};
};
