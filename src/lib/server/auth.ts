// Authentication & authorization.
//
// • Three portals: /login/buyer, /login/seller (buyer/seller accounts) and /admin/login (admin only).
//   A portal only accepts its own role — a seller can never sign in through the buyer portal, etc.
// • One session cookie PER ROLE, so a buyer, a seller and an admin can be signed in side by side
//   in the same browser (e.g. one tab each):
//     ey_buyer  — buyer,  path "/", 7 days, SameSite=Lax
//     ey_seller — seller, path "/", 7 days, SameSite=Lax
//     ey_admin  — admin,  path "/admin" only, 8 hours, SameSite=Strict (never sent to the public site)
//   The URL decides which identity a request uses (identityFor): /buyer… → buyer, /seller… → seller,
//   /admin… → admin; shared pages (home, directory, help) use the side used last (ey_active cookie).
// • One mobile/email can own one buyer account AND one seller account (separate verification),
//   never two accounts of the same role.
// • Route-level rules are enforced centrally in hooks.server.ts; requireUser() repeats the check
//   inside every protected load/action (defense in depth).
// • Passwords: PBKDF2 hashes (password.ts); 5 wrong attempts per portal+ID → 15-minute lock.
// • Users, sessions and login attempts live in MongoDB (users.ts).

import { error, redirect, type Cookies } from '@sveltejs/kit';
import { db, type Role, type User } from './db.ts';
import { hashPassword, verifyPassword } from './password.ts';
import { findSellerById } from './sellers.ts';
import { findUserByEmail, findUserById, findUserByPhone, loginAttempts, sessions } from './users.ts';

export const SESSION_COOKIE: Record<Role, string> = { BUYER: 'ey_buyer', SELLER: 'ey_seller', ADMIN: 'ey_admin' };
/** Which side (buyer/seller) shared pages show when both are signed in. Not a secret — just a preference. */
export const ACTIVE_COOKIE = 'ey_active';
const USER_TTL_S = 60 * 60 * 24 * 7;
const ADMIN_TTL_S = 60 * 60 * 8;
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60_000;

export type Portal = 'BUYER' | 'SELLER' | 'ADMIN';

export const PORTAL_LOGIN: Record<Portal, string> = { BUYER: '/login/buyer', SELLER: '/login/seller', ADMIN: '/admin/login' };

/** Cryptographically random hex string (Web Crypto). */
export function randomHex(bytes: number): string {
	const buf = crypto.getRandomValues(new Uint8Array(bytes));
	return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Accepts "98765 43210", "+91-9876543210", "09876543210" → "9876543210", or null if invalid. */
export function normalizePhone(input: string): string | null {
	let digits = input.replace(/\D/g, '');
	if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
	if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
	return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export const PHONE_ERROR = 'Enter a 10-digit Indian mobile number starting with 6, 7, 8 or 9.';

/** Mobile number from a form that uses PhoneInput (+91 dropdown). Only India (+91) is supported for now. */
export function phoneFromForm(data: FormData, field = 'phone'): string | null {
	const country = data.get(`${field}Country`)?.toString();
	if (country && country !== '+91') return null;
	return normalizePhone(data.get(field)?.toString() ?? '');
}

export function normalizeEmail(input: string): string | null {
	const e = input.trim().toLowerCase();
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 120 ? e : null;
}

/** Login ID can be an email or a mobile number; the role says which of the person's accounts. */
export async function findByLoginId(loginId: string, role: Role): Promise<User | null> {
	const email = normalizeEmail(loginId);
	if (email) return findUserByEmail(email, role);
	const phone = normalizePhone(loginId);
	return phone ? findUserByPhone(phone, role) : null;
}

// ---------------- Sessions ----------------

export type Sessions = Record<Role, User | null>;

function cookieOpts(role: Role) {
	return role === 'ADMIN'
		? { path: '/admin', httpOnly: true, sameSite: 'strict' as const, secure: false, maxAge: ADMIN_TTL_S }
		: { path: '/', httpOnly: true, sameSite: 'lax' as const, secure: false, maxAge: USER_TTL_S }; // secure: true behind HTTPS
}

export function setActive(cookies: Cookies, role: 'BUYER' | 'SELLER') {
	cookies.set(ACTIVE_COOKIE, role, { path: '/', httpOnly: true, sameSite: 'lax', secure: false, maxAge: USER_TTL_S });
}

/** New session id on every login (prevents session fixation); only this role's previous session is replaced. */
export async function createSession(cookies: Cookies, user: User) {
	await destroySession(cookies, user.role);
	const sid = randomHex(32);
	const ttl = user.role === 'ADMIN' ? ADMIN_TTL_S : USER_TTL_S;
	await sessions.insertOne({ _id: sid, userId: user.id, role: user.role, expiresAt: new Date(Date.now() + ttl * 1000) });
	cookies.set(SESSION_COOKIE[user.role], sid, cookieOpts(user.role));
	if (user.role !== 'ADMIN') setActive(cookies, user.role);
}

/** Log out ONE role; the person's other session (if any) stays signed in. */
export async function destroySession(cookies: Cookies, role: Role) {
	const sid = cookies.get(SESSION_COOKIE[role]);
	if (sid) await sessions.deleteOne({ _id: sid });
	cookies.delete(SESSION_COOKIE[role], { path: cookieOpts(role).path });
}

async function sessionUser(sid: string, role: Role): Promise<User | null> {
	const s = await sessions.findOne({ _id: sid });
	// (The TTL index removes expired sessions within ~1 minute; the time check covers that gap.)
	if (!s || s.role !== role || Date.now() > s.expiresAt.getTime()) {
		if (s && Date.now() > s.expiresAt.getTime()) await sessions.deleteOne({ _id: sid });
		return null;
	}
	// Read the user fresh on every request: a user deleted or changed in the database takes effect at once.
	const user = await findUserById(s.userId);
	// A session can never cross roles, even if a cookie were copied into another cookie name.
	return user && user.role === role ? user : null;
}

/** Everyone signed in through this browser. The admin cookie only arrives on /admin URLs. */
export async function resolveSessions(cookies: Cookies): Promise<Sessions> {
	const out: Sessions = { BUYER: null, SELLER: null, ADMIN: null };
	await Promise.all(
		(Object.keys(SESSION_COOKIE) as Role[]).map(async (role) => {
			const sid = cookies.get(SESSION_COOKIE[role]);
			if (sid) out[role] = await sessionUser(sid, role);
		})
	);
	return out;
}

/**
 * Which signed-in identity this request acts as. The URL decides, so tabs never interfere:
 * /admin… → admin · /buyer… and /rfq/new → buyer · /seller… → seller ·
 * /api/…?as=BUYER|SELLER → that side · anything else → the side used last, else whoever is signed in.
 */
export function identityFor(url: URL, signedIn: Sessions, active: string | undefined): Role | null {
	const path = url.pathname;
	const under = (p: string) => path === p || path.startsWith(p + '/');
	if (under('/admin')) return 'ADMIN';
	if (under('/buyer') || under('/rfq/new')) return 'BUYER';
	if (under('/seller')) return 'SELLER';
	const as = url.searchParams.get('as');
	if (under('/api') && (as === 'BUYER' || as === 'SELLER')) return as;
	if ((active === 'BUYER' || active === 'SELLER') && signedIn[active]) return active;
	return signedIn.BUYER ? 'BUYER' : signedIn.SELLER ? 'SELLER' : null;
}

// ---------------- Login ----------------

export type AuthResult =
	| { ok: true; user: User }
	| { ok: false; error: string; wrongPortal?: Role; locked?: boolean };

const DUMMY_HASH = await hashPassword('timing-equaliser-not-a-real-password');

export async function authenticate(portal: Portal, loginId: string, password: string): Promise<AuthResult> {
	const id = loginId.trim().toLowerCase();
	if (!id || !password) return { ok: false, error: 'Enter your login ID and password.' };

	const key = `${portal}:${id}`;
	const attempt = await loginAttempts.findOne({ _id: key });
	if (attempt && attempt.lockedUntil > Date.now()) {
		const mins = Math.ceil((attempt.lockedUntil - Date.now()) / 60_000);
		return { ok: false, locked: true, error: `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.` };
	}

	const user = await findByLoginId(id, portal);
	// Always run a hash so response time doesn't reveal whether the ID exists.
	const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

	// No account of this role, but the right password for the person's OTHER account → point them to the right door.
	if (!user && portal !== 'ADMIN') {
		const otherRole = portal === 'BUYER' ? 'SELLER' : 'BUYER';
		const other = await findByLoginId(id, otherRole);
		if (other && (await verifyPassword(password, other.passwordHash ?? DUMMY_HASH))) {
			const side = portal === 'BUYER' ? 'buyer' : 'seller';
			return { ok: false, wrongPortal: otherRole, error: `You have a ${otherRole.toLowerCase()} account, but no ${side} account yet. Use the ${otherRole === 'SELLER' ? 'Seller' : 'Buyer'} login, or create a ${side} account.` };
		}
	}

	if (!user || !valid) {
		const fails = (attempt?.fails ?? 0) + 1;
		const lockedUntil = fails >= MAX_FAILS ? Date.now() + LOCK_MS : 0;
		await loginAttempts.updateOne({ _id: key }, { $set: { fails, lockedUntil, expiresAt: new Date(Date.now() + LOCK_MS) } }, { upsert: true });
		const left = MAX_FAILS - fails;
		return {
			ok: false,
			locked: left <= 0,
			error: left <= 0
				? 'Too many failed attempts. Try again in 15 minutes.'
				: `${portal === 'ADMIN' ? 'Invalid admin credentials.' : 'Invalid login ID or password.'}${left <= 2 ? ` ${left} attempt${left === 1 ? '' : 's'} left.` : ''}`
		};
	}
	await loginAttempts.deleteOne({ _id: key });

	return { ok: true, user };
}

// ---------------- Authorization ----------------

/** Only allow same-site relative redirects (prevents open-redirect via ?redirectTo=). */
export function safeRedirect(target: string | null | undefined, fallback: string): string {
	if (!target || !target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) return fallback;
	return target;
}

export function homeFor(user: User): string {
	if (user.role === 'ADMIN') return '/admin';
	if (user.role === 'SELLER') return user.sellerId ? '/seller' : '/seller/onboarding';
	return '/buyer/dashboard';
}

/** Which roles may open a path. null = public. Shared by hooks.server.ts and destinationFor(). */
export function rolesFor(pathname: string): Role[] | null {
	const under = (p: string) => pathname === p || pathname.startsWith(p + '/');
	if (under('/admin')) return pathname === '/admin/login' || pathname === '/admin/setup' ? null : ['ADMIN'];
	// Keep these two rules: they are the central lock on the buyer and seller areas.
	// Without them every page must remember its own check, and a wrong-role visitor gets a bare 403
	// instead of the friendly /denied page.
	if (under('/buyer')) return ['BUYER'];
	if (under('/seller')) return ['SELLER'];
	if (under('/notifications') || under('/api/notifications') || under('/api/contact-log')) return ['BUYER', 'SELLER'];
	return null;
}

/** Public pages that are closed to some roles (sellers can't post requirements). */
export function blockedRolesFor(pathname: string): Role[] {
	if (pathname === '/rfq/new' || pathname.startsWith('/rfq/new/')) return ['SELLER'];
	return [];
}

export function isAllowed(role: Role, path: string): boolean {
	const pathname = path.split('?')[0];
	const roles = rolesFor(pathname);
	if (roles && !roles.includes(role)) return false;
	return !blockedRolesFor(pathname).includes(role);
}

/** Where a user may land after login (never another role's area). */
export function destinationFor(user: User, redirectTo: string | null | undefined): string {
	if (user.role === 'SELLER' && !user.sellerId) return '/seller/onboarding';
	const target = safeRedirect(redirectTo, homeFor(user));
	return isAllowed(user.role, target) ? target : homeFor(user);
}

/** Defense in depth inside loads/actions: no user → that role's login portal; wrong role → 403. */
export function requireUser(locals: App.Locals, url: URL, roles?: Role[]): User {
	const user = locals.user;
	if (!user) {
		const login = roles?.length === 1 ? PORTAL_LOGIN[roles[0] as Portal] : '/login';
		redirect(303, `${login}?redirectTo=${encodeURIComponent(url.pathname + url.search)}`);
	}
	if (roles && !roles.includes(user.role)) error(403, 'You do not have access to this area.');
	return user;
}

// ---- Contact-unlock rules (Phase 1) ----

/** Buyer sees seller phone/WhatsApp only after posting at least one requirement. Admin always. */
export function canSeeSellerContacts(user: User | null): boolean {
	if (!user) return false;
	if (user.role === 'ADMIN') return true;
	return user.role === 'BUYER' && db.rfqs.some((r) => r.buyerUserId === user.id);
}

/** Why seller contacts are hidden, for the lock message on the page. */
export function sellerContactLock(user: User | null): 'login' | 'post-rfq' | 'role' {
	if (!user) return 'login';
	return user.role === 'BUYER' ? 'post-rfq' : 'role';
}

/** Seller sees buyer contacts only once their documents are verified (genuine leads both ways). */
export async function canSeeBuyerContacts(user: User | null): Promise<boolean> {
	if (!user) return false;
	if (user.role === 'ADMIN') return true;
	if (user.role !== 'SELLER' || !user.sellerId) return false;
	const seller = await findSellerById(user.sellerId);
	return !!seller && (seller.verification === 'DOCS_VERIFIED' || seller.verification === 'GROUND_VERIFIED');
}
