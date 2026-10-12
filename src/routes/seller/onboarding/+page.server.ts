import { fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth.ts';
import { now } from '#lib/server/db.ts';
import { findSellerById, insertSeller, nextSellerId, uniqueSlug, updateSeller } from '#lib/server/sellers.ts';
import { parseSellerForm } from '#lib/server/sellerForm.ts';
import { updateUser } from '#lib/server/users.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireUser(locals, url, ['SELLER']);
	const existing = user.sellerId ? await findSellerById(user.sellerId) : null;
	// Only new sellers, or rejected sellers resubmitting, use this page.
	if (existing && existing.verification !== 'REJECTED') redirect(303, '/seller');

	return {
		phone: user.phone,
		rejectionReason: existing?.rejectionReason ?? null,
		prefill: existing
			? {
					companyName: existing.companyName, contactPerson: existing.contactPerson, whatsapp: existing.whatsapp,
					email: existing.email ?? '', gstin: existing.gstin, address: existing.address, city: existing.city,
					state: existing.state, pincode: existing.pincode, yearEstablished: existing.yearEstablished ? String(existing.yearEstablished) : '',
					about: existing.about, processes: existing.processes, materials: existing.materials, industries: existing.industries,
					machines: existing.machines.map((m) => ({ name: m.name, count: String(m.count) })),
					certifications: existing.certifications.join(', ')
				}
			: { companyName: user.companyName, contactPerson: user.name }
	};
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const user = requireUser(locals, url, ['SELLER']);
		const existing = user.sellerId ? await findSellerById(user.sellerId) : null;
		if (existing && existing.verification !== 'REJECTED') redirect(303, '/seller');

		let data: FormData;
		try {
			data = await request.formData();
		} catch {
			return fail(400, { values: {}, errors: { form: 'Upload failed — files may be too large. Keep each under 5 MB.' } as Record<string, string> });
		}
		const parsed = await parseSellerForm(data, { mode: 'SELF', fixedPhone: user.phone, excludeSellerId: existing?.id, ownerUserId: user.id });
		if (!parsed.clean) {
			return fail(400, { values: parsed.input, errors: { ...parsed.errors, form: 'Please fix the highlighted fields.' } });
		}

		const { input, clean } = parsed;
		const profile = {
			companyName: input.companyName,
			contactPerson: input.contactPerson,
			phone: clean.phone,
			whatsapp: clean.whatsapp,
			email: input.email || undefined,
			gstin: input.gstin,
			address: input.address,
			city: input.city,
			state: input.state,
			pincode: input.pincode,
			yearEstablished: clean.yearEstablished,
			about: input.about,
			processes: input.processes,
			materials: input.materials,
			industries: input.industries,
			machines: clean.machines,
			certifications: clean.certifications,
			documents: clean.documents,
			verification: 'DOCS_SUBMITTED' as const,
			rejectionReason: undefined,
			submittedAt: now()
		};
		const event = { at: now(), by: 'Seller', action: existing ? ('RESUBMITTED' as const) : ('SUBMITTED' as const) };

		if (existing) {
			await updateSeller(existing.id, { ...profile, verificationLog: [...(existing.verificationLog ?? []), event] }); // resubmission after changes were requested
		} else {
			const id = await nextSellerId();
			await insertSeller({
				id,
				slug: await uniqueSlug(`${input.companyName} ${input.city}`),
				userId: user.id,
				onboardedBy: 'SELF',
				ratingTotal: 0,
				reviewCount: 0,
				createdAt: now(),
				verificationLog: [event],
				...profile
			});
			user.sellerId = id;
		}
		user.companyName = input.companyName;
		await updateUser(user.id, { sellerId: user.sellerId, companyName: input.companyName });
		redirect(303, '/seller?submitted=1');
	}
};
