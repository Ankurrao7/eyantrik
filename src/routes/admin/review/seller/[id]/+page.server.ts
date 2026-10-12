// Seller verification review: details + automatic checks + documents + decision, in one screen.
// Every decision is re-checked here on the server (the checklist can't be skipped by editing the page).
import { error, fail } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth.ts';
import { now, type VerificationEvent } from '#lib/server/db.ts';
import { notifySeller } from '#lib/server/notify.ts';
import { findSellerById, updateSeller } from '#lib/server/sellers.ts';
import { findUserById } from '#lib/server/users.ts';
import { autoChecks, CHANGE_REASONS, REVIEW_CHECKS, VISIT_CHECKS } from '#lib/server/verification.ts';
import { INDUSTRY_LABEL, MATERIAL_CATEGORY_LABEL, PROCESS_LABEL } from '#lib/taxonomy.ts';
import type { Actions, PageServerLoad } from './$types';

async function loadSeller(id: string) {
	const seller = await findSellerById(id);
	if (!seller) error(404, 'Seller not found');
	return seller;
}

export const load: PageServerLoad = async ({ params, locals, url }) => {
	requireUser(locals, url, ['ADMIN']);
	const s = await loadSeller(params.id);
	const owner = s.userId ? await findUserById(s.userId) : null;
	return {
		seller: {
			...s,
			processLabels: s.processes.map((p) => PROCESS_LABEL[p] ?? p),
			materialLabels: s.materials.map((m) => MATERIAL_CATEGORY_LABEL[m] ?? m),
			industryLabels: s.industries.map((i) => INDUSTRY_LABEL[i] ?? i),
			documents: s.documents.map((d) => ({ ...d, url: d.fileId ? `/admin/files/${d.fileId}` : null })),
			history: [...(s.verificationLog ?? [])].reverse()
		},
		owner: owner ? { name: owner.name, phone: owner.phone, email: owner.email ?? '', createdAt: owner.createdAt } : null,
		checks: await autoChecks(s),
		reviewChecks: REVIEW_CHECKS,
		visitChecks: VISIT_CHECKS,
		changeReasons: CHANGE_REASONS
	};
};

const log = (by: string, action: VerificationEvent['action'], note?: string): VerificationEvent => ({ at: now(), by, action, note });

export const actions: Actions = {
	approve: async ({ params, request, locals, url }) => {
		const admin = requireUser(locals, url, ['ADMIN']);
		const s = await loadSeller(params.id);
		if (s.verification !== 'DOCS_SUBMITTED') return fail(409, { error: 'This seller is not waiting for a document review.' });
		const ticked = (await request.formData()).getAll('check').map(String);
		const missing = REVIEW_CHECKS.filter((c) => c.required && !ticked.includes(c.id));
		if (missing.length) return fail(400, { error: `Tick every required check first: ${missing.map((c) => c.label.toLowerCase()).join('; ')}.` });
		const done = REVIEW_CHECKS.filter((c) => ticked.includes(c.id)).map((c) => c.label);
		await updateSeller(s.id, {
			verification: 'DOCS_VERIFIED',
			rejectionReason: undefined,
			verificationLog: [...(s.verificationLog ?? []), log(admin.name, 'DOCS_VERIFIED', `Checked: ${done.join('; ')}`)]
		});
		await notifySeller(s.id, { type: 'VERIFICATION', title: 'Documents verified ✓', body: 'You are now listed and can send quotations. Matching leads are waiting in your feed.', link: '/seller' });
		return { message: `${s.companyName}: documents verified — now listed and receiving leads. Next step: factory visit.` };
	},

	requestChanges: async ({ params, request, locals, url }) => {
		const admin = requireUser(locals, url, ['ADMIN']);
		const s = await loadSeller(params.id);
		if (s.verification !== 'DOCS_SUBMITTED' && s.verification !== 'DOCS_VERIFIED') return fail(409, { error: 'Nothing to send back for this seller.' });
		const data = await request.formData();
		const reason = data.get('reason')?.toString() ?? '';
		const note = (data.get('note')?.toString() ?? '').trim().slice(0, 500);
		if (!(CHANGE_REASONS as readonly string[]).includes(reason)) return fail(400, { error: 'Choose what the seller needs to fix.', changes: true });
		if (reason === 'Other' && note.length < 5) return fail(400, { error: 'Explain what to fix (at least 5 characters).', changes: true });
		const message = reason === 'Other' ? note : note ? `${reason} — ${note}` : reason;
		await updateSeller(s.id, {
			verification: 'REJECTED',
			rejectionReason: message,
			verificationLog: [...(s.verificationLog ?? []), log(admin.name, 'CHANGES_REQUESTED', message)]
		});
		await notifySeller(s.id, { type: 'VERIFICATION', title: 'Verification needs changes', body: `Please fix: ${message}. Correct it and resubmit from your dashboard.`, link: '/seller/onboarding' });
		return { message: `${s.companyName} has been asked to fix: ${message}` };
	},

	groundVerify: async ({ params, request, locals, url }) => {
		const admin = requireUser(locals, url, ['ADMIN']);
		const s = await loadSeller(params.id);
		if (s.verification !== 'DOCS_VERIFIED') return fail(409, { error: 'Verify the documents before recording a factory visit.' });
		const data = await request.formData();
		const inspector = (data.get('inspector')?.toString() ?? '').trim().slice(0, 80);
		const date = data.get('date')?.toString() ?? '';
		const notes = (data.get('notes')?.toString() ?? '').trim().slice(0, 1000);
		const ticked = data.getAll('visit').map(String);
		if (inspector.length < 2) return fail(400, { error: 'Who visited the factory?', visit: true });
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Date.parse(date) > Date.now()) return fail(400, { error: 'Enter the visit date (not in the future).', visit: true });
		const missing = VISIT_CHECKS.filter((c) => !ticked.includes(c.id));
		if (missing.length) return fail(400, { error: `Confirm on-site: ${missing.map((c) => c.label.toLowerCase()).join('; ')}.`, visit: true });
		await updateSeller(s.id, {
			verification: 'GROUND_VERIFIED',
			groundInspection: { inspector, date, notes },
			verificationLog: [...(s.verificationLog ?? []), log(admin.name, 'GROUND_VERIFIED', `Visited ${date} by ${inspector}${notes ? ` — ${notes}` : ''}`)]
		});
		await notifySeller(s.id, { type: 'VERIFICATION', title: 'Ground verified ✓✓', body: 'Your factory inspection is complete. You now rank higher for buyers.', link: '/seller' });
		return { message: `${s.companyName} is now ground verified.` };
	},

	note: async ({ params, request, locals, url }) => {
		const admin = requireUser(locals, url, ['ADMIN']);
		const s = await loadSeller(params.id);
		const note = ((await request.formData()).get('note')?.toString() ?? '').trim().slice(0, 500);
		if (note.length < 2) return fail(400, { error: 'Write a note first.' });
		await updateSeller(s.id, { verificationLog: [...(s.verificationLog ?? []), log(admin.name, 'NOTE', note)] });
		return { message: 'Note added to the history.' };
	}
};
