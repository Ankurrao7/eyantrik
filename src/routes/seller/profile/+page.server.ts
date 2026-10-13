// The seller's own profile: completeness ring + checklist, and the edit form.
// Data entry stays in the seller's hands. Verified identity (company name, GSTIN, factory address,
// login mobile) is locked here — changing it goes through the help desk and is verified again.
import { fail, redirect } from '@sveltejs/kit';
import { normalizePhone, PHONE_ERROR, requireUser } from '#lib/server/auth.ts';
import { now } from '#lib/server/db.ts';
import { attributeFields, capabilityValues, MAX_PHOTOS, parseCapabilities, saveExtraPhotos } from '#lib/server/sellerForm.ts';
import { findSellerById, updateSeller } from '#lib/server/sellers.ts';
import { profileScore } from '#lib/profileScore.ts';
import type { Actions, PageServerLoad } from './$types';

async function ownSeller(locals: App.Locals, url: URL) {
	const user = requireUser(locals, url, ['SELLER']);
	const seller = user.sellerId ? await findSellerById(user.sellerId) : null;
	if (!seller) redirect(303, '/seller/onboarding');
	// Sent back for changes → the full form (documents too) is on the onboarding page.
	if (seller.verification === 'REJECTED') redirect(303, '/seller/onboarding');
	return { user, seller };
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const { seller } = await ownSeller(locals, url);
	const photos = seller.documents.filter((d) => d.kind === 'FACTORY_PHOTO').length;
	return {
		slug: seller.slug,
		verification: seller.verification,
		score: profileScore(seller),
		photoCount: photos,
		maxPhotos: MAX_PHOTOS,
		phone: seller.phone,
		values: {
			companyName: seller.companyName,
			gstin: seller.gstin,
			address: seller.address,
			city: seller.city,
			state: seller.state,
			pincode: seller.pincode,
			contactPerson: seller.contactPerson,
			whatsapp: seller.whatsapp === seller.phone ? '' : seller.whatsapp,
			email: seller.email ?? '',
			...capabilityValues(seller)
		},
		saved: url.searchParams.get('saved') === '1'
	};
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const { user, seller } = await ownSeller(locals, url);
		let data: FormData;
		try {
			data = await request.formData();
		} catch {
			return fail(400, { values: {}, errors: { form: 'Upload failed — keep each photo under 5 MB.' } as Record<string, string> });
		}
		const s = (k: string) => (data.get(k)?.toString() ?? '').trim();
		const contact = { contactPerson: s('contactPerson'), whatsapp: s('whatsapp'), email: s('email') };
		const caps = parseCapabilities(data);
		const errors: Record<string, string> = { ...caps.errors };

		if (contact.contactPerson.length < 2) errors.contactPerson = 'Enter the contact person’s name.';
		const indian = !data.get('whatsappCountry') || data.get('whatsappCountry') === '+91';
		const whatsapp = contact.whatsapp ? (indian ? normalizePhone(contact.whatsapp) : null) : seller.phone;
		if (!whatsapp) errors.whatsapp = `${PHONE_ERROR} Or leave blank to use the mobile number.`;
		if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) errors.email = 'Enter a valid email or leave blank.';

		const values = { ...contact, ...caps.input };
		if (Object.keys(errors).length) return fail(400, { values, errors: { ...errors, form: 'Please fix the highlighted fields.' } });

		// Photos are saved only once everything else is valid.
		const have = seller.documents.filter((d) => d.kind === 'FACTORY_PHOTO').length;
		const photos = await saveExtraPhotos(data, have, user.id);
		if (photos.error) return fail(400, { values, errors: { factoryPhotos: photos.error, form: 'Please fix the highlighted fields.' } });

		const { machines, yearEstablished, certifications } = caps.clean;
		await updateSeller(seller.id, {
			contactPerson: contact.contactPerson,
			whatsapp: whatsapp!,
			email: contact.email || undefined,
			yearEstablished,
			about: caps.input.about,
			processes: caps.input.processes,
			materials: caps.input.materials,
			industries: caps.input.industries,
			machines,
			certifications,
			...attributeFields(caps.input),
			documents: [...seller.documents, ...photos.documents],
			verificationLog: [
				...(seller.verificationLog ?? []),
				{ at: now(), by: 'Seller', action: 'PROFILE_UPDATED', note: photos.documents.length ? `Profile updated · ${photos.documents.length} photo(s) added` : 'Profile updated' }
			]
		});
		redirect(303, '/seller/profile?saved=1');
	}
};
