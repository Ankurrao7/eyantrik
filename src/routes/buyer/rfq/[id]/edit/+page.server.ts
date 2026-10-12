// Edit & re-post a requirement. Allowed any time until an order is awarded.
// If it changes, the chain restarts: active quotes become "needs re-quote", responses reset,
// a fresh quotation window opens, and sellers are notified (decision 2026-10-07).
import { fail, redirect } from '@sveltejs/kit';
import { ownRfq } from '#lib/server/buyerQuotes.ts';
import { db, now } from '#lib/server/db.ts';
import { notifyRfqPosted, notifySeller } from '#lib/server/notify.ts';
import { outdateQuotes } from '#lib/server/quotes.ts';
import { parseRfqForm, RFQ_FIELDS } from '#lib/rfqFields.ts';
import { saveFormFiles } from '#lib/server/files.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals, url }) => {
	const { rfq } = ownRfq(locals, url, params.id);
	if (rfq.awardedQuoteId) redirect(303, `/buyer/rfq/${rfq.id}`);
	const liveQuotes = db.quotes.filter((q) => q.rfqId === rfq.id && ['SUBMITTED', 'SHORTLISTED', 'NEGOTIATING'].includes(q.status)).length;
	return {
		rfq: { id: rfq.id, values: rfq.values, drawings: rfq.files.drawings ?? [], editCount: rfq.editCount, status: rfq.status },
		liveQuotes
	};
};

export const actions: Actions = {
	default: async ({ params, locals, url, request }) => {
		const { rfq } = ownRfq(locals, url, params.id);
		if (rfq.awardedQuoteId) return fail(409, { values: rfq.values, errors: {} as Record<string, string>, formError: 'This order was already awarded — post a new requirement instead.' });

		let data: FormData;
		try {
			data = await request.formData();
		} catch {
			return fail(400, { values: rfq.values, errors: {} as Record<string, string>, formError: 'The upload could not be read. Try a smaller file.' });
		}
		const { values, files, errors } = parseRfqForm(data);
		if (Object.keys(errors).length) return fail(400, { values, errors, formError: 'Please fix the highlighted fields.' });

		// No new upload → keep the existing drawings.
		const newDrawings = (files.drawings ?? []).length > 0;
		const changed = RFQ_FIELDS.filter((f) => f.type !== 'file' && f.name !== 'quoteWindowDays' && JSON.stringify(values[f.name] ?? '') !== JSON.stringify(rfq.values[f.name] ?? '')).map((f) => f.label);
		if (newDrawings) changed.push('Drawings');
		if (!changed.length && values.quoteWindowDays === rfq.values.quoteWindowDays) {
			return fail(400, { values, errors: {}, formError: 'Nothing changed — edit a field before re-posting.' });
		}

		const ndaOrDrawingsChanged = newDrawings || values.ndaRequired !== rfq.values.ndaRequired;
		rfq.values = values;
		if (newDrawings) {
			const saved = await saveFormFiles(data, 'drawings', 'DRAWING', rfq.buyerUserId);
			rfq.files = { ...rfq.files, drawings: saved.map((f) => ({ name: f.fileName, sizeKb: f.sizeKb, fileId: f.fileId })) };
		}
		if (ndaOrDrawingsChanged) rfq.ndaAcceptedBy = [];
		rfq.editCount += 1;
		rfq.editedAt = now();
		rfq.updatedAt = now();
		rfq.status = 'OPEN';
		rfq.outcome = undefined;
		rfq.quoteDeadline = new Date(Date.now() + Number(values.quoteWindowDays || 7) * 86_400_000).toISOString();

		// Chain restarts from the beginning.
		const requote = new Set(outdateQuotes(rfq, changed));
		db.responses = db.responses.filter((r) => r.rfqId !== rfq.id);
		for (const sellerId of requote) {
			await notifySeller(sellerId, {
				type: 'RFQ_UPDATED',
				title: 'Buyer updated a requirement you quoted on',
				body: `${rfq.id} ${values.partName}: ${changed.join(', ') || 'details'} changed. Please review and send a fresh quote.`,
				link: `/seller/rfq/${rfq.id}`
			});
		}
		const notified = (await notifyRfqPosted(rfq, 'UPDATED', requote)) + requote.size;
		redirect(303, `/buyer/rfq/${rfq.id}?edited=1&notified=${notified}`);
	}
};
