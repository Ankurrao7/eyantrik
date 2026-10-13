import { error } from '@sveltejs/kit';
import { contactsShared } from '#lib/server/auth.ts';
import { db, nextId, now } from '#lib/server/db.ts';
import { findSellerById, isListed } from '#lib/server/sellers.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) error(401, 'Login required');

	let body: { channel?: unknown; sellerId?: unknown; buyerUserId?: unknown; rfqId?: unknown };
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON');
	}

	const channel = body.channel === 'PHONE' || body.channel === 'WHATSAPP' ? body.channel : null;
	if (!channel) error(400, 'Invalid channel');
	const sellerId = typeof body.sellerId === 'string' ? body.sellerId : undefined;
	const buyerUserId = typeof body.buyerUserId === 'string' ? body.buyerUserId : undefined;
	const rfqId = typeof body.rfqId === 'string' ? body.rfqId : undefined;
	// Contacts exist on screen only for a shortlisted/awarded quote on a requirement, so every call is tied to one.
	const rfq = rfqId ? db.rfqs.find((r) => r.id === rfqId) : undefined;
	if (!rfq || rfq.hidden) error(404, 'Requirement not found');

	if (sellerId) {
		const seller = await findSellerById(sellerId);
		if (!seller || !isListed(seller)) error(404, 'Seller not found');
		if (user.role !== 'BUYER' || rfq.buyerUserId !== user.id || !contactsShared(rfq, sellerId)) error(403, 'Contacts are locked');
	} else if (buyerUserId) {
		if (rfq.buyerUserId !== buyerUserId) error(400, 'Buyer does not match requirement');
		if (user.role !== 'SELLER' || !user.sellerId || !contactsShared(rfq, user.sellerId)) error(403, 'Contacts are locked');
	} else {
		error(400, 'Nothing to log');
	}

	db.contacts.push({ id: nextId('C'), fromUserId: user.id, fromRole: user.role, toSellerId: sellerId, toBuyerUserId: buyerUserId, rfqId, channel, at: now() });
	return new Response(null, { status: 204 });
};
