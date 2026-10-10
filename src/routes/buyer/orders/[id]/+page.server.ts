// Buyer view of an order MANAGED by eYantrik (concierge job). Internal costs/margins are never sent.
import { error } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth.ts';
import { db } from '#lib/server/db.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals, url }) => {
	const user = requireUser(locals, url, ['BUYER']);
	const job = db.jobs.find((j) => j.id === params.id);
	if (!job || job.buyerUserId !== user.id) error(404, 'Order not found');
	const base = job.steps.reduce((n, s) => n + s.unitCost, 0);
	return {
		order: {
			id: job.id,
			partName: job.partName,
			quantity: job.quantity,
			status: job.status,
			rfqId: job.rfqId,
			milestones: job.milestones,
			// Client price only once quoted (never the base cost or margin).
			pricePerPiece: job.status === 'COSTING' ? null : Math.round(base * (1 + job.marginPercent / 100)),
			createdAt: job.createdAt
		}
	};
};
