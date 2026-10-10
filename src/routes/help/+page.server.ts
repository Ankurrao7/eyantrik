import { fail } from '@sveltejs/kit';
import { PHONE_ERROR, phoneFromForm } from '#lib/server/auth.ts';
import { db, nextId, now } from '#lib/server/db.ts';
import type { Actions, PageServerLoad } from './$types';

const MAX_OPEN_TICKETS_PER_PHONE = 3;

function rfqFor(user: App.Locals['user'], rfqId: string | null) {
	if (!user || !rfqId) return undefined;
	const rfq = db.rfqs.find((r) => r.id === rfqId);
	return rfq && rfq.buyerUserId === user.id ? rfq : undefined;
}

export const load: PageServerLoad = ({ locals, url }) => {
	const user = locals.user;
	const rfq = rfqFor(user, url.searchParams.get('rfq'));
	const existing = rfq ? db.tickets.find((t) => t.rfqId === rfq.id && t.status !== 'RESOLVED') : undefined;
	return {
		prefill: user ? { name: user.name, phone: user.phone, companyName: user.companyName } : null,
		role: user?.role ?? null,
		rfq: rfq ? { id: rfq.id, title: String(rfq.values.partName ?? rfq.id) } : null,
		existingTicket: existing ? { id: existing.id, status: existing.status } : null
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = locals.user;
		const data = await request.formData();
		const name = (data.get('name')?.toString() ?? '').trim();
		const rawPhone = data.get('phone')?.toString() ?? '';
		const companyName = (data.get('companyName')?.toString() ?? '').trim();
		const need = data.get('need')?.toString() ?? '';
		const message = (data.get('message')?.toString() ?? '').trim();
		const preferredTime = data.get('preferredTime')?.toString() ?? 'Anytime';
		const rfq = rfqFor(user, data.get('rfqId')?.toString() ?? null);

		const values = { name, phone: rawPhone, companyName, need, message, preferredTime };
		const errors: Record<string, string> = {};
		const phone = user ? user.phone : phoneFromForm(data);
		if (!user && name.length < 2) errors.name = 'Enter your name.';
		if (!phone) errors.phone = PHONE_ERROR;
		if (message.length < 10) errors.message = 'Tell us a bit more (at least 10 characters).';
		if (message.length > 2000) errors.message = 'Keep it under 2000 characters.';
		if (Object.keys(errors).length) return fail(400, { values, errors });

		if (rfq) {
			const dup = db.tickets.find((t) => t.rfqId === rfq.id && t.status !== 'RESOLVED');
			if (dup) return { ok: true, ticketId: dup.id, duplicate: true };
		}
		const open = db.tickets.filter((t) => t.phone === phone && t.status !== 'RESOLVED').length;
		if (open >= MAX_OPEN_TICKETS_PER_PHONE) {
			return fail(429, { values, errors: { form: `You already have ${open} open requests — our team will call you shortly. For urgent help call +91 120 4567890.` } });
		}

		const needLabel: Record<string, string> = {
			MANAGE_ORDER: 'Manage my order end-to-end',
			FIND_SUPPLIER: 'Help me find the right supplier',
			TECHNICAL: 'Technical / engineering advice',
			FIND_BUYERS: 'Help me find buyers',
			SUBCONTRACT: 'I need a sub-contractor for part of a job',
			OTHER: 'Other'
		};

		const ticket = {
			id: nextId('HELP'),
			userId: user?.id,
			raisedBy: (user?.role === 'SELLER' ? 'SELLER' : user?.role === 'BUYER' ? 'BUYER' : 'VISITOR') as 'BUYER' | 'SELLER' | 'VISITOR',
			name: user?.name ?? name,
			phone: phone!,
			companyName: user?.companyName ?? companyName,
			rfqId: rfq?.id,
			message: `[${needLabel[need] ?? 'Other'}] ${message}`,
			preferredTime,
			status: 'NEW' as const,
			adminNotes: '',
			createdAt: now()
		};
		db.tickets.unshift(ticket);
		return { ok: true, ticketId: ticket.id, duplicate: false };
	}
};
