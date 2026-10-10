import { fail, redirect } from '@sveltejs/kit';
import { randomHex } from '#lib/server/auth.ts';
import { db, nextId, now } from '#lib/server/db.ts';
import { notifyRfqPosted } from '#lib/server/notify.ts';
import { parseRfqForm, type RfqValues } from '#lib/rfqFields.ts';
import type { Actions, PageServerLoad } from './$types';

const DRAFT_COOKIE = 'ey_rfq_draft';
const DRAFT_TTL_MS = 24 * 60 * 60_000;

export const load: PageServerLoad = ({ locals, cookies }) => {
	// This URL always acts as the buyer account (see identityFor). Signed in only as a seller → the guard
	// already sent them to /denied, with a "create a buyer account" option.
	const draftId = cookies.get(DRAFT_COOKIE);
	const draft = draftId ? db.drafts.get(draftId) : undefined;
	const validDraft = draft && draft.expiresAt > Date.now() ? draft.values : null;

	return {
		draft: validDraft,
		role: locals.user?.role ?? null,
		postedBefore: !!locals.user && db.rfqs.some((r) => r.buyerUserId === locals.user!.id)
	};
};

export const actions: Actions = {
	default: async ({ request, locals, cookies }) => {
		let data: FormData;
		try {
			data = await request.formData();
		} catch {
			return fail(400, { values: {} as RfqValues, errors: {} as Record<string, string>, formError: 'The upload could not be read. Try a smaller file.' });
		}

		const { values, files, errors } = parseRfqForm(data);
		if (Object.keys(errors).length) {
			return fail(400, { values, errors, formError: 'Please fix the highlighted fields.' });
		}

		const user = locals.user;
		if (!user) {
			// Keep their work: store the draft, send them to login, bring them back here.
			const draftId = cookies.get(DRAFT_COOKIE) ?? randomHex(12);
			db.drafts.set(draftId, { values, expiresAt: Date.now() + DRAFT_TTL_MS });
			cookies.set(DRAFT_COOKIE, draftId, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: DRAFT_TTL_MS / 1000 });
			redirect(303, '/login/buyer?redirectTo=%2Frfq%2Fnew%3Fdraft%3D1');
		}
		if (user.role !== 'BUYER') {
			return fail(403, { values, errors: {}, formError: 'Requirements are posted from a buyer account. Log in or create one — your seller account stays signed in.' });
		}

		const rfq = {
			id: nextId('RFQ'),
			buyerUserId: user.id,
			values,
			files,
			ndaAcceptedBy: [] as string[],
			status: 'OPEN' as const,
			reopenCount: 0,
			editCount: 0,
			quoteDeadline: new Date(Date.now() + Number(values.quoteWindowDays || 7) * 86_400_000).toISOString(),
			createdAt: now(),
			updatedAt: now()
		};
		db.rfqs.unshift(rfq);

		const draftId = cookies.get(DRAFT_COOKIE);
		if (draftId) {
			db.drafts.delete(draftId);
			cookies.delete(DRAFT_COOKIE, { path: '/' });
		}

		const notified = await notifyRfqPosted(rfq);
		redirect(303, `/buyer/rfq/${rfq.id}?posted=1&notified=${notified}`);
	}
};
