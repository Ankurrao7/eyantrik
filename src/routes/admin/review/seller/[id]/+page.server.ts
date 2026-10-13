// Supplier file for the admin team — every company at every stage (pending, verified, sent back, suspended):
// full details + contacts (never blurred) + documents + verification decision + platform activity + account control.
// Every decision is re-checked here on the server (the checklist can't be skipped by editing the page).
// The admin never edits the supplier's details — those are entered and updated by the supplier only.
import { error, fail } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth.ts';
import { db, isInvited, now, sellerRating, type VerificationEvent } from '#lib/server/db.ts';
import { parseStatusForm, setSellerStatus } from '#lib/server/accounts.ts';
import { scoreMatch } from '#lib/server/matching.ts';
import { latest } from '#lib/server/quotes.ts';
import { landed } from '#lib/quote.ts';
import { profileScore } from '#lib/profileScore.ts';
import { shopLabel } from '#lib/processes.ts';
import { ORDER_TYPE_LABEL, PART_SIZE_LABEL, TEAM_SIZE_LABEL, TOLERANCE_LABEL } from '#lib/taxonomy.ts';
import { usersById } from '#lib/server/users.ts';
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

	// ---- What this supplier did on the platform ----
	const quotes = db.quotes.filter((q) => q.sellerId === s.id && q.versions.length);
	const rfqTitle = (id: string) => String(db.rfqs.find((r) => r.id === id)?.values.partName ?? id);
	const received = db.contacts.filter((c) => c.toSellerId === s.id);
	const made = owner ? db.contacts.filter((c) => c.fromUserId === owner.id && c.toBuyerUserId) : [];
	const people = await usersById([...received.map((c) => c.fromUserId), ...made.map((c) => c.toBuyerUserId)]);
	const personName = (id?: string) => {
		const u = id ? people.get(id) : undefined;
		return u ? `${u.name}${u.companyName ? ` · ${u.companyName}` : ''}` : '—';
	};
	const activity = {
		matchedOpen: db.rfqs.filter((r) => r.status === 'OPEN' && !r.hidden && scoreMatch(s, r).score > 0).length,
		invitedOpen: db.rfqs.filter((r) => r.status === 'OPEN' && !r.hidden && isInvited(r, s.id)).length,
		interested: db.responses.filter((r) => r.sellerId === s.id && r.kind === 'INTERESTED').length,
		passed: db.responses.filter((r) => r.sellerId === s.id && r.kind === 'NOT_FOR_US').length,
		quotes: quotes.map((q) => ({ id: q.id, rfqId: q.rfqId, title: rfqTitle(q.rfqId), status: q.status, version: latest(q).v, perPiece: landed(latest(q)).perPiece, updatedAt: q.updatedAt })),
		won: quotes.filter((q) => q.status === 'ACCEPTED').length,
		contactsIn: received.slice(-20).reverse().map((c) => ({ id: c.id, at: c.at, channel: c.channel, rfqId: c.rfqId, who: personName(c.fromUserId) })),
		contactsInTotal: received.length,
		contactsOut: made.slice(-20).reverse().map((c) => ({ id: c.id, at: c.at, channel: c.channel, rfqId: c.rfqId, who: personName(c.toBuyerUserId) })),
		contactsOutTotal: made.length,
		rating: sellerRating(s),
		reviewCount: s.reviewCount,
		reviews: db.feedback.filter((f) => f.sellerId === s.id).slice(-10).reverse().map((f) => ({ id: f.id, rating: f.rating, comment: f.comment, outcome: f.outcome, at: f.at, buyer: personName(f.buyerUserId) })),
		tickets: owner ? db.tickets.filter((t) => t.userId === owner.id).map((t) => ({ id: t.id, status: t.status, message: t.message, createdAt: t.createdAt })) : []
	};

	return {
		seller: {
			...s,
			processLabels: s.processes.map((p) => PROCESS_LABEL[p] ?? p),
			materialLabels: s.materials.map((m) => MATERIAL_CATEGORY_LABEL[m] ?? m),
			industryLabels: s.industries.map((i) => INDUSTRY_LABEL[i] ?? i),
			documents: s.documents.map((d) => ({ ...d, url: d.fileId ? `/admin/files/${d.fileId}` : null })),
			history: [...(s.verificationLog ?? [])].reverse(),
			attributes: {
				mainShop: s.mainShop ? shopLabel(s.mainShop) : '',
				orderTypes: (s.orderTypes ?? []).map((o) => ORDER_TYPE_LABEL[o] ?? o),
				teamSize: s.teamSize ? TEAM_SIZE_LABEL[s.teamSize] : '',
				maxPartSize: s.maxPartSize ? PART_SIZE_LABEL[s.maxPartSize] : '',
				bestTolerance: s.bestTolerance ? TOLERANCE_LABEL[s.bestTolerance] : ''
			}
		},
		profile: profileScore(s),
		owner: owner ? { id: owner.id, name: owner.name, phone: owner.phone, email: owner.email ?? '', createdAt: owner.createdAt, accountLog: owner.accountLog ?? [] } : null,
		account: { status: s.accountStatus ?? ('ACTIVE' as const), reason: s.accountStatusReason ?? '' },
		activity,
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

	// Suspend / deactivate / reactivate the listing and its owner's seller login (details are never edited here).
	setStatus: async ({ params, request, locals, url }) => {
		const admin = requireUser(locals, url, ['ADMIN']);
		const s = await loadSeller(params.id);
		const parsed = parseStatusForm(await request.formData());
		if (!parsed.ok) return fail(400, { error: parsed.error });
		if ((s.accountStatus ?? 'ACTIVE') === parsed.status) return fail(409, { error: 'The account is already in that state.' });
		await setSellerStatus(s.id, { status: parsed.status, reason: parsed.reason, by: admin.name });
		const done = parsed.status === 'ACTIVE' ? 'reactivated — listed and receiving leads again' : parsed.status === 'SUSPENDED' ? 'suspended — hidden from buyers and signed out' : 'deactivated — hidden from buyers and signed out';
		return { message: `${s.companyName} ${done}.` };
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
