// src/routes/admin/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth.ts';
import { db, nextId, now, sellerRating, type HelpStatus } from '#lib/server/db.ts';
import { findSellerById, insertSeller, listSellers, nextSellerId, uniqueSlug, updateSeller } from '#lib/server/sellers.ts';
import { parseSellerForm } from '#lib/server/sellerForm.ts';
import { normalizeEmail } from '#lib/server/auth.ts';
import { hashPassword, passwordProblem } from '#lib/server/password.ts';
import { countUsers, findUserByEmail, findUserByPhone, insertUser, nextUserId, updateUser, usersById } from '#lib/server/users.ts';
import { notify, notifySeller } from '#lib/server/notify.ts';
import { interestedCount, isLive, latest } from '#lib/server/quotes.ts';
import { landed } from '#lib/quote.ts';
import { ORDER_STAGES, ORDER_STAGE_LABEL } from '#lib/orders.ts';
import type { Actions, PageServerLoad } from './$types';

const TABS = ['overview', 'requirements', 'verification', 'add-seller', 'helpdesk', 'concierge', 'activity'] as const;
type Tab = (typeof TABS)[number];

const DAY = 86_400_000;

export const load: PageServerLoad = async ({ locals, url }) => {
	requireUser(locals, url, ['ADMIN']);
	const tabParam = url.searchParams.get('tab') as Tab | null;
	const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : 'overview';

	// Users live in MongoDB: fetch everyone this page mentions in one query, then look up by id.
	const people = await usersById([...db.contacts.flatMap((c) => [c.fromUserId, c.toBuyerUserId]), ...db.rfqs.map((r) => r.buyerUserId)]);
	const userName = (id?: string) => (id && people.get(id)?.name) || '—';
	// Sellers live in MongoDB. The console needs all of them (KPIs, queue, partners), so fetch the list once.
	const allSellers = await listSellers();
	const sellerName = (id?: string) => allSellers.find((s) => s.id === id)?.companyName ?? '—';
	const weekAgo = Date.now() - 7 * DAY;
	const [buyerCount, sellerCount, newUsers7d] = await Promise.all([
		countUsers({ role: 'BUYER' }),
		countUsers({ role: 'SELLER' }),
		countUsers({ createdAfter: new Date(weekAgo).toISOString() })
	]);

	const rated = allSellers.filter((s) => s.reviewCount > 0);
	const kpis = {
		buyers: buyerCount,
		sellers: sellerCount,
		newUsers7d,
		listed: allSellers.filter((s) => s.verification === 'DOCS_VERIFIED' || s.verification === 'GROUND_VERIFIED').length,
		groundVerified: allSellers.filter((s) => s.verification === 'GROUND_VERIFIED').length,
		pendingReview: allSellers.filter((s) => s.verification === 'DOCS_SUBMITTED').length,
		awaitingVisit: allSellers.filter((s) => s.verification === 'DOCS_VERIFIED').length,
		rfqsTotal: db.rfqs.length,
		rfqsOpen: db.rfqs.filter((r) => r.status === 'OPEN').length,
		buyerToSeller: db.contacts.filter((c) => c.toSellerId).length,
		sellerToBuyer: db.contacts.filter((c) => c.toBuyerUserId).length,
		dealsDone: db.feedback.filter((f) => f.outcome === 'DEAL_DONE').length,
		quotes: db.quotes.filter((q) => q.versions.length).length,
		awarded: db.quotes.filter((q) => q.status === 'ACCEPTED').length,
		negotiating: db.quotes.filter((q) => q.status === 'NEGOTIATING').length,
		ticketsOpen: db.tickets.filter((t) => t.status !== 'RESOLVED').length,
		avgRating: rated.length ? Math.round((rated.reduce((n, s) => n + (sellerRating(s) ?? 0), 0) / rated.length) * 10) / 10 : null
	};

	const verificationQueue = allSellers
		.filter((s) => s.verification === 'DOCS_SUBMITTED' || s.verification === 'DOCS_VERIFIED')
		.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
		.map((s) => ({ ...s }));

	const tickets = db.tickets.map((t) => ({
		...t,
		rfqTitle: t.rfqId ? String(db.rfqs.find((r) => r.id === t.rfqId)?.values.partName ?? '') : '',
		jobId: db.jobs.find((j) => j.ticketId === t.id)?.id ?? null
	}));

	const activity = db.contacts
		.slice()
		.reverse()
		.slice(0, 50)
		.map((c) => ({
			id: c.id,
			at: c.at,
			channel: c.channel,
			rfqId: c.rfqId,
			from: `${userName(c.fromUserId)} (${c.fromRole.toLowerCase()})`,
			to: c.toSellerId ? sellerName(c.toSellerId) : userName(c.toBuyerUserId)
		}));

	// Ground sales team: every requirement with the buyer's contact, so they can call directly.
	const requirements = db.rfqs.map((r) => {
		const buyer = people.get(r.buyerUserId);
		const live = db.quotes.filter((q) => q.rfqId === r.id && isLive(q) && q.versions.length);
		return {
			id: r.id,
			title: String(r.values.partName ?? r.id),
			quantity: String(r.values.quantity ?? ''),
			city: String(r.values.deliveryCity ?? ''),
			budget: String(r.values.budgetRange ?? ''),
			buyer: buyer ? { name: buyer.name, company: buyer.companyName, phone: buyer.phone } : null,
			status: r.awardedQuoteId ? 'AWARDED' : r.status,
			interested: interestedCount(r.id),
			quotes: live.length,
			lowest: live.length ? Math.min(...live.map((q) => landed(latest(q)).perPiece)) : null,
			editCount: r.editCount,
			createdAt: r.createdAt
		};
	});

	const jobId = url.searchParams.get('job');
	return {
		tab,
		kpis,
		verificationQueue,
		tickets,
		jobs: db.jobs,
		selectedJobId: db.jobs.some((j) => j.id === jobId) ? jobId : (db.jobs[0]?.id ?? null),
		activity,
		requirements,
		orderStages: ORDER_STAGES.map((s) => ({ id: s.id, label: s.label })),
		partners: allSellers.filter((s) => s.verification !== 'REJECTED' && s.verification !== 'DOCS_SUBMITTED').map((s) => ({ id: s.id, name: s.companyName, isPlant: !!s.isEyantrikPlant }))
	};
};

function findSeller(id: string | undefined) {
	return id ? findSellerById(id) : Promise.resolve(null);
}
function findJob(id: string | undefined) {
	return db.jobs.find((j) => j.id === id);
}

export const actions: Actions = {
	approveDocs: async ({ request, locals, url }) => {
		requireUser(locals, url, ['ADMIN']);
		const seller = await findSeller((await request.formData()).get('sellerId')?.toString());
		if (!seller) return fail(404, { error: 'Seller not found.' });
		if (seller.verification !== 'DOCS_SUBMITTED') return fail(409, { error: `${seller.companyName} is not awaiting document review.` });
		await updateSeller(seller.id, { verification: 'DOCS_VERIFIED' });
		await notifySeller(seller.id, { type: 'VERIFICATION', title: 'Documents verified ✓', body: 'You are now listed and can send quotations. Matching leads are waiting in your feed.', link: '/seller' });
		return { message: `${seller.companyName}: documents verified — now listed and receiving leads.` };
	},

	rejectSeller: async ({ request, locals, url }) => {
		requireUser(locals, url, ['ADMIN']);
		const data = await request.formData();
		const seller = await findSeller(data.get('sellerId')?.toString());
		const reason = (data.get('reason')?.toString() ?? '').trim();
		if (!seller) return fail(404, { error: 'Seller not found.' });
		if (reason.length < 5) return fail(400, { error: 'Give the seller a clear rejection reason (min 5 characters).', sellerId: seller.id });
		await updateSeller(seller.id, { verification: 'REJECTED', rejectionReason: reason });
		await notifySeller(seller.id, { type: 'VERIFICATION', title: 'Verification needs changes', body: `Reason: ${reason}. Correct and resubmit from your dashboard.`, link: '/seller/onboarding' });
		return { message: `${seller.companyName} rejected. They can correct and resubmit.` };
	},

	groundVerify: async ({ request, locals, url }) => {
		requireUser(locals, url, ['ADMIN']);
		const data = await request.formData();
		const seller = await findSeller(data.get('sellerId')?.toString());
		const inspector = (data.get('inspector')?.toString() ?? '').trim();
		const date = data.get('date')?.toString() ?? '';
		const notes = (data.get('notes')?.toString() ?? '').trim();
		if (!seller) return fail(404, { error: 'Seller not found.' });
		if (seller.verification !== 'DOCS_VERIFIED') return fail(409, { error: 'Approve documents before ground verification.', sellerId: seller.id });
		if (inspector.length < 2 || !date || data.get('machinesMatch') !== 'on')
			return fail(400, { error: 'Inspector, visit date and the "machines match" confirmation are required.', sellerId: seller.id });
		if (Date.parse(date) > Date.now()) return fail(400, { error: 'Visit date cannot be in the future.', sellerId: seller.id });
		await updateSeller(seller.id, { verification: 'GROUND_VERIFIED', groundInspection: { inspector, date, notes } });
		await notifySeller(seller.id, { type: 'VERIFICATION', title: 'Ground verified ✓✓', body: 'Your factory inspection is complete. You now rank higher for buyers.', link: '/seller' });
		return { message: `${seller.companyName} is now ground verified.` };
	},

	addSeller: async ({ request, locals, url }) => {
		requireUser(locals, url, ['ADMIN']);
		let data: FormData;
		try {
			data = await request.formData();
		} catch {
			return fail(400, { addSeller: { values: {}, errors: { form: 'Upload failed — keep files under 5 MB.' } as Record<string, string> } });
		}
		const parsed = await parseSellerForm(data, { mode: 'TEAM' });
		const inspector = (data.get('inspector')?.toString() ?? '').trim();
		const date = data.get('inspectionDate')?.toString() ?? '';
		const notes = (data.get('inspectionNotes')?.toString() ?? '').trim();
		const errors = { ...parsed.errors };
		if (inspector.length < 2) errors.inspector = 'Who visited the factory?';
		// The owner signs in through the Seller login with this email (or mobile) + a temporary password.
		const loginEmail = normalizeEmail(data.get('loginEmail')?.toString() ?? '');
		const tempPassword = data.get('tempPassword')?.toString() ?? '';
		if (!loginEmail) errors.loginEmail = 'Enter the owner’s email (their login ID).';
		else if (await findUserByEmail(loginEmail, 'SELLER')) errors.loginEmail = 'This email already has a seller account.';
		const pwProblem = passwordProblem(tempPassword);
		if (pwProblem) errors.tempPassword = pwProblem;
		if (!date || Date.parse(date) > Date.now()) errors.inspectionDate = 'Enter the visit date (not in the future).';

		const phone = parsed.clean?.phone;
		// Same mobile as a BUYER account is fine (separate accounts); a SELLER account that already has a factory is not.
		const existingUser = phone ? await findUserByPhone(phone, 'SELLER') : null;
		if (existingUser?.sellerId) errors.phone = 'This number already has a seller account with a factory listing.';

		if (Object.keys(errors).length || !parsed.clean) {
			return fail(400, { addSeller: { values: { ...parsed.input, inspector, inspectionDate: date, inspectionNotes: notes, loginEmail: data.get('loginEmail')?.toString() ?? '' }, errors: { ...errors, form: 'Please fix the highlighted fields.' } } });
		}

		const { input, clean } = parsed;
		const id = await nextSellerId();
		// Create (or link) a seller login so the owner can sign in on this number.
		let owner = existingUser;
		if (!owner) {
			owner = { id: await nextUserId(), phone: clean.phone, email: loginEmail!, passwordHash: await hashPassword(tempPassword), name: input.contactPerson, companyName: input.companyName, role: 'SELLER', sellerId: id, createdAt: now() };
			await insertUser(owner);
		} else {
			await updateUser(owner.id, { sellerId: id, email: owner.email ?? loginEmail!, passwordHash: owner.passwordHash ?? (await hashPassword(tempPassword)) });
		}

		await insertSeller({
			id,
			slug: await uniqueSlug(`${input.companyName} ${input.city}`),
			userId: owner.id,
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
			verification: 'GROUND_VERIFIED',
			onboardedBy: 'TEAM',
			documents: clean.documents,
			groundInspection: { inspector, date, notes },
			ratingTotal: 0,
			reviewCount: 0,
			createdAt: now()
		});
		return { message: `${input.companyName} added as ground verified. Share the Seller login with the owner: ID ${loginEmail} (or +91 ${clean.phone}) and the temporary password you set.` };
	},

	updateTicket: async ({ request, locals, url }) => {
		requireUser(locals, url, ['ADMIN']);
		const data = await request.formData();
		const ticket = db.tickets.find((t) => t.id === data.get('ticketId')?.toString());
		if (!ticket) return fail(404, { error: 'Ticket not found.' });
		const status = data.get('status')?.toString() as HelpStatus;
		const role = data.get('eyantrikRole')?.toString();
		if (!['NEW', 'CONTACTED', 'EYANTRIK_HANDLING', 'RESOLVED'].includes(status)) return fail(400, { error: 'Invalid status.' });
		if (status === 'EYANTRIK_HANDLING' && role !== 'AS_SELLER' && role !== 'AS_BUYER')
			return fail(400, { error: 'Choose whether eYantrik acts as the seller or the buyer.' });
		ticket.status = status;
		ticket.eyantrikRole = role === 'AS_SELLER' || role === 'AS_BUYER' ? role : undefined;
		ticket.adminNotes = (data.get('adminNotes')?.toString() ?? '').trim().slice(0, 2000);
		return { message: `${ticket.id} updated.` };
	},

	ticketToJob: async ({ request, locals, url }) => {
		requireUser(locals, url, ['ADMIN']);
		const ticketId = (await request.formData()).get('ticketId')?.toString();
		const ticket = db.tickets.find((t) => t.id === ticketId);
		if (!ticket) return fail(404, { error: 'Ticket not found.' });
		const existing = db.jobs.find((j) => j.ticketId === ticket.id);
		if (existing) redirect(303, `/admin?tab=concierge&job=${existing.id}`);
		const rfq = ticket.rfqId ? db.rfqs.find((r) => r.id === ticket.rfqId) : undefined;
		const job = {
			id: nextId('JOB'),
			ticketId: ticket.id,
			clientName: ticket.companyName || ticket.name,
			clientPhone: ticket.phone,
			partName: rfq ? String(rfq.values.partName ?? '') : ticket.message.slice(0, 80),
			quantity: rfq ? Number(rfq.values.quantity) || 1 : 1,
			steps: [],
			marginPercent: 20,
			status: 'COSTING' as const,
			// Only buyers with an account get live order tracking.
			buyerUserId: ticket.raisedBy === 'BUYER' ? ticket.userId : undefined,
			rfqId: ticket.rfqId,
			milestones: [],
			createdAt: now()
		};
		db.jobs.unshift(job);
		ticket.status = 'EYANTRIK_HANDLING';
		ticket.eyantrikRole = 'AS_SELLER';
		redirect(303, `/admin?tab=concierge&job=${job.id}`);
	},

	addStep: async ({ request, locals, url }) => {
		requireUser(locals, url, ['ADMIN']);
		const data = await request.formData();
		const job = findJob(data.get('jobId')?.toString());
		if (!job) return fail(404, { error: 'Job not found.' });
		if (job.status !== 'COSTING') return fail(409, { error: 'Quote already sent — costing is locked.' });
		const process = (data.get('process')?.toString() ?? '').trim();
		const assignedTo = (data.get('assignedTo')?.toString() ?? '').trim();
		const fulfillment = data.get('fulfillment')?.toString();
		const unitCost = Number(data.get('unitCost'));
		if (process.length < 2 || !assignedTo || (fulfillment !== 'IN_HOUSE' && fulfillment !== 'PARTNER') || !Number.isFinite(unitCost) || unitCost <= 0)
			return fail(400, { error: 'Every step needs a process, an assignee, a type and a unit cost above 0.' });
		job.steps.push({ id: nextId('ST'), process, assignedTo, fulfillment, unitCost: Math.round(unitCost * 100) / 100 });
		return { message: 'Step added.' };
	},

	removeStep: async ({ request, locals, url }) => {
		requireUser(locals, url, ['ADMIN']);
		const data = await request.formData();
		const job = findJob(data.get('jobId')?.toString());
		if (!job) return fail(404, { error: 'Job not found.' });
		if (job.status !== 'COSTING') return fail(409, { error: 'Quote already sent — costing is locked.' });
		job.steps = job.steps.filter((s) => s.id !== data.get('stepId')?.toString());
		return { message: 'Step removed.' };
	},

	finalizeQuote: async ({ request, locals, url }) => {
		requireUser(locals, url, ['ADMIN']);
		const data = await request.formData();
		const job = findJob(data.get('jobId')?.toString());
		const margin = Number(data.get('marginPercent'));
		if (!job) return fail(404, { error: 'Job not found.' });
		if (job.steps.length === 0) return fail(400, { error: 'Add at least one process step before quoting.' });
		if (!Number.isFinite(margin) || margin < 0 || margin > 100) return fail(400, { error: 'Margin must be between 0 and 100%.' });
		job.marginPercent = margin;
		job.status = 'QUOTED';
		return { message: `${job.id} quoted to ${job.clientName}.` };
	},

	addMilestone: async ({ request, locals, url }) => {
		requireUser(locals, url, ['ADMIN']);
		const data = await request.formData();
		const job = findJob(data.get('jobId')?.toString());
		if (!job) return fail(404, { error: 'Job not found.' });
		const stage = data.get('stage')?.toString() ?? '';
		const note = (data.get('note')?.toString() ?? '').trim().slice(0, 500);
		if (!ORDER_STAGE_LABEL[stage]) return fail(400, { error: 'Pick a stage.' });
		job.milestones.push({ id: nextId('M'), stage, note, at: now() });
		if (stage === 'DELIVERED') job.status = 'DELIVERED';
		else if (['ORDER_CONFIRMED', 'MATERIAL_PROCURED', 'SAMPLE_APPROVED', 'IN_PRODUCTION', 'QUALITY_CHECK', 'DISPATCHED'].includes(stage) && job.status !== 'DELIVERED') job.status = 'IN_PRODUCTION';
		notify(job.buyerUserId, {
			type: 'ORDER_UPDATE',
			title: `Order update: ${ORDER_STAGE_LABEL[stage]}`,
			body: `${job.id} ${job.partName}${note ? ` — ${note}` : ''}`,
			link: `/buyer/orders/${job.id}`
		});
		return { message: job.buyerUserId ? `Update posted — ${job.clientName} has been notified.` : 'Update saved (client has no eYantrik account, so share it by phone).' };
	},

	advanceJob: async ({ request, locals, url }) => {
		requireUser(locals, url, ['ADMIN']);
		const job = findJob((await request.formData()).get('jobId')?.toString());
		if (!job) return fail(404, { error: 'Job not found.' });
		const next = { COSTING: null, QUOTED: 'IN_PRODUCTION', IN_PRODUCTION: 'DELIVERED', DELIVERED: null } as const;
		const to = next[job.status];
		if (!to) return fail(409, { error: 'No next stage.' });
		job.status = to;
		return { message: `${job.id} → ${to.replace('_', ' ').toLowerCase()}.` };
	}
};
