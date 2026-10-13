import { error } from '@sveltejs/kit';
import { canSeeBuyerContacts, canSeeSellerContacts } from '#lib/server/auth.ts';
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
	const rfq = rfqId ? db.rfqs.find((r) => r.id === rfqId) : undefined;
	if (rfqId && (!rfq || rfq.hidden)) error(404, 'Requirement not found');

	if (sellerId) {
		const seller = await findSellerById(sellerId);
		if (!seller || !isListed(seller)) error(404, 'Seller not found');
		if (!canSeeSellerContacts(user)) error(403, 'Contacts are locked');
	} else if (buyerUserId) {
		if (!(await canSeeBuyerContacts(user))) error(403, 'Contacts are locked');
		if (!rfq || rfq.buyerUserId !== buyerUserId) error(400, 'Buyer does not match requirement');
	} else {
		error(400, 'Nothing to log');
	}

	db.contacts.push({ id: nextId('C'), fromUserId: user.id, fromRole: user.role, toSellerId: sellerId, toBuyerUserId: buyerUserId, rfqId, channel, at: now() });
	return new Response(null, { status: 204 });
};
