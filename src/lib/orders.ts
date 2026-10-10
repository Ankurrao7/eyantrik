// Order tracking for orders MANAGED by the eYantrik team (concierge jobs).
// Deals closed directly between buyer and seller are not tracked (decision 2026-10-07).

export const ORDER_STAGES = [
	{ id: 'ORDER_CONFIRMED', label: 'Order confirmed', icon: '📝' },
	{ id: 'MATERIAL_PROCURED', label: 'Material procured', icon: '🧱' },
	{ id: 'SAMPLE_APPROVED', label: 'Sample approved', icon: '🔍' },
	{ id: 'IN_PRODUCTION', label: 'Bulk production', icon: '⚙️' },
	{ id: 'QUALITY_CHECK', label: 'Quality check passed', icon: '✅' },
	{ id: 'DISPATCHED', label: 'Dispatched', icon: '🚚' },
	{ id: 'DELIVERED', label: 'Delivered', icon: '📦' }
] as const;

export const ORDER_STAGE_LABEL: Record<string, string> = Object.fromEntries(ORDER_STAGES.map((s) => [s.id, s.label]));

/** Index of the furthest stage reached (-1 = none yet). */
export function stageIndex(milestones: { stage: string }[]): number {
	return Math.max(-1, ...milestones.map((m) => ORDER_STAGES.findIndex((s) => s.id === m.stage)));
}
