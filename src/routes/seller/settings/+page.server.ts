// Seller quotation defaults: pre-fill (optional) + cost-estimator rates.
import { fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth.ts';
import { findSellerById, updateSeller } from '#lib/server/sellers.ts';
import { GST_RATES, QUOTE_INCLUSIONS } from '#lib/quote.ts';
import type { Actions, PageServerLoad } from './$types';

async function mySeller(locals: App.Locals, url: URL) {
	const user = requireUser(locals, url, ['SELLER']);
	const seller = user.sellerId ? await findSellerById(user.sellerId) : null;
	if (!seller) redirect(303, '/seller/onboarding');
	return seller;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const seller = await mySeller(locals, url);
	const d = seller.quoteDefaults;
	return {
		values: {
			autoFill: d?.autoFill ?? false,
			gstPercent: String(d?.gstPercent ?? 18),
			paymentTerms: d?.paymentTerms ?? '30% advance, balance on delivery',
			includes: d?.includes ?? ['MATERIAL', 'MACHINING'],
			freight: d?.freight ?? 'EX_WORKS',
			validityDays: String(d?.validityDays ?? 15),
			machineHourRate: d?.machineHourRate ? String(d.machineHourRate) : '',
			overheadPct: d?.overheadPct !== undefined ? String(d.overheadPct) : '10',
			profitPct: d?.profitPct !== undefined ? String(d.profitPct) : '15'
		}
	};
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const seller = await mySeller(locals, url);
		const data = await request.formData();
		const s = (k: string) => (data.get(k)?.toString() ?? '').trim();
		const values = {
			autoFill: data.get('autoFill') === 'on',
			gstPercent: s('gstPercent'),
			paymentTerms: s('paymentTerms'),
			includes: data.getAll('includes').map(String).filter((i) => QUOTE_INCLUSIONS.some((x) => x.id === i)),
			freight: s('freight'),
			validityDays: s('validityDays'),
			machineHourRate: s('machineHourRate'),
			overheadPct: s('overheadPct'),
			profitPct: s('profitPct')
		};
		const e: Record<string, string> = {};
		const gst = Number(values.gstPercent);
		if (!(GST_RATES as readonly number[]).includes(gst)) e.gstPercent = 'Pick a GST rate.';
		if (values.paymentTerms.length < 3 || values.paymentTerms.length > 120) e.paymentTerms = 'Enter payment terms (3–120 characters).';
		if (values.freight !== 'EX_WORKS' && values.freight !== 'DELIVERED') e.freight = 'Choose a freight basis.';
		const validity = Number(values.validityDays);
		if (!Number.isInteger(validity) || validity < 1 || validity > 180) e.validityDays = 'Between 1 and 180 days.';
		const num = (k: 'machineHourRate' | 'overheadPct' | 'profitPct', max: number) => {
			if (!values[k]) return undefined;
			const n = Number(values[k]);
			if (!Number.isFinite(n) || n < 0 || n > max) { e[k] = `Enter 0–${max}.`; return undefined; }
			return n;
		};
		const machineHourRate = num('machineHourRate', 100_000);
		const overheadPct = num('overheadPct', 200);
		const profitPct = num('profitPct', 200);
		if (Object.keys(e).length) return fail(400, { values, errors: e });

		await updateSeller(seller.id, {
			quoteDefaults: {
				autoFill: values.autoFill,
				gstPercent: gst,
				paymentTerms: values.paymentTerms,
				includes: values.includes,
				freight: values.freight as 'EX_WORKS' | 'DELIVERED',
				validityDays: validity,
				machineHourRate,
				overheadPct,
				profitPct
			}
		});
		return { saved: true, values };
	}
};
