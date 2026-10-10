// Shared load/actions for the role-specific login portals (/login/buyer, /login/seller, /admin/login).

import { fail, redirect, type Cookies } from '@sveltejs/kit';
import { authenticate, createSession, destinationFor, normalizeEmail, PHONE_ERROR, phoneFromForm, safeRedirect, type Portal } from './auth.ts';
import { now } from './db.ts';
import { hashPassword, passwordProblem } from './password.ts';
import { findUserByEmail, findUserByPhone, insertUser, nextUserId } from './users.ts';

export function portalLoad(portal: Portal, locals: App.Locals, url: URL) {
	// Already signed in on THIS side → straight to its area. (Being signed in on the other side doesn't count.)
	const same = portal === 'ADMIN' ? (locals.user?.role === 'ADMIN' ? locals.user : null) : locals.sessions[portal];
	if (same) redirect(303, destinationFor(same, url.searchParams.get('redirectTo')));
	// Signed in on the other side (buyer ↔ seller)? It stays signed in; offer its details for a quick sign-up.
	const other = portal === 'BUYER' ? locals.sessions.SELLER : portal === 'SELLER' ? locals.sessions.BUYER : null;
	return {
		portal,
		redirectTo: safeRedirect(url.searchParams.get('redirectTo'), ''),
		mode: url.searchParams.get('mode') === 'signup' && portal !== 'ADMIN' ? ('signup' as const) : ('login' as const),
		signedInAs: other ? other.role : null,
		prefill: other ? { name: other.name, companyName: other.companyName, phone: other.phone, email: other.email ?? '' } : null
	};
}

export async function portalLogin(portal: Portal, request: Request, cookies: Cookies) {
	const data = await request.formData();
	const loginId = (data.get('loginId')?.toString() ?? '').trim().slice(0, 120);
	const password = data.get('password')?.toString() ?? '';
	const res = await authenticate(portal, loginId, password.slice(0, 200));
	if (!res.ok) return fail(res.locked ? 429 : 400, { mode: 'login' as const, loginId, error: res.error, wrongPortal: res.wrongPortal ?? null });
	await createSession(cookies, res.user);
	redirect(303, destinationFor(res.user, data.get('redirectTo')?.toString()));
}

/** Sign-up for buyers and sellers; also creates the first admin (from /admin/setup — no company or terms needed). */
export async function portalSignup(portal: Portal, request: Request, cookies: Cookies) {
	const data = await request.formData();
	const s = (k: string) => (data.get(k)?.toString() ?? '').trim();
	const values = { name: s('name'), companyName: portal === 'ADMIN' ? 'eYantrik' : s('companyName'), phone: s('phone'), email: s('email') };
	const password = data.get('password')?.toString() ?? '';
	const confirm = data.get('confirm')?.toString() ?? '';
	const e: Record<string, string> = {};

	if (values.name.length < 2 || values.name.length > 80) e.name = 'Enter your full name.';
	if (values.companyName.length < 2 || values.companyName.length > 120) e.companyName = 'Enter your company or workshop name.';
	// One account per role: this mobile/email may already have a buyer account and still open a seller account
	// (and vice versa), but never a second account of the same role.
	const side = portal === 'ADMIN' ? 'an admin' : portal === 'SELLER' ? 'a seller' : 'a buyer';
	const phone = phoneFromForm(data);
	if (!phone) e.phone = PHONE_ERROR;
	else if (await findUserByPhone(phone, portal)) e.phone = `This mobile number already has ${side} account — please log in.`;
	const email = normalizeEmail(values.email);
	if (!email) e.email = 'Enter a valid email address.';
	else if (await findUserByEmail(email, portal)) e.email = `This email already has ${side} account — please log in.`;
	const pwProblem = passwordProblem(password);
	if (pwProblem) e.password = pwProblem;
	else if (password !== confirm) e.confirm = 'Passwords do not match.';
	if (portal !== 'ADMIN' && data.get('terms') !== 'on') e.terms = 'Please accept the terms to continue.';
	if (Object.keys(e).length) return fail(400, { mode: 'signup' as const, values, errors: e });

	const user = { id: await nextUserId(), phone: phone!, email: email!, passwordHash: await hashPassword(password), name: values.name, companyName: values.companyName, role: portal, createdAt: now() };
	try {
		await insertUser(user);
	} catch (err) {
		// Unique index on phone/email: someone registered the same details a moment ago (code 11000 = duplicate key).
		if ((err as { code?: number }).code === 11000) return fail(400, { mode: 'signup' as const, values, errors: { form: `This mobile number or email was just registered as ${side} account — please log in.` } });
		throw err;
	}
	await createSession(cookies, user);
	redirect(303, destinationFor(user, data.get('redirectTo')?.toString()));
}
