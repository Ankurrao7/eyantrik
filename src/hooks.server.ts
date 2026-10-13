import { redirect } from '@sveltejs/kit';
import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import { ACTIVE_COOKIE, blockedRolesFor, identityFor, LANE_COOKIE, PORTAL_LOGIN, readLane, resolveSessions, rolesFor, setActive, visibleSessions, type Portal } from '#lib/server/auth.ts';

/**
 * Central access control. Runs before every request:
 *  - reads every session in this browser (buyer, seller, admin — one cookie each)
 *  - the URL decides which one this request acts as (identityFor), so a buyer tab and a seller tab
 *    can be open at the same time without logging each other out; on shared pages the tab's lane
 *    (ey_lane) decides, so an admin tab never shows the browser's buyer/seller login
 *  - admin screens never receive buyer/seller data (visibleSessions)
 *  - not signed in for this area → that role's login portal (pages) or 401 (API / form posts)
 *  - wrong role → /denied (pages) or 403 (API / form posts)
 */
export const handle: Handle = async ({ event, resolve }) => {
	const { pathname, search } = event.url;
	const signedIn = await resolveSessions(event.cookies, pathname);
	const active = event.cookies.get(ACTIVE_COOKIE);
	const lane = readLane(event.cookies.get(LANE_COOKIE));
	const role = identityFor(event.url, signedIn, active, lane);
	const user = role ? signedIn[role] : null;
	event.locals.user = user;
	event.locals.lane = lane;
	event.locals.sessions = visibleSessions(pathname, signedIn, lane);

	// Remember the side used last, so shared pages (home, directory, help) show that one.
	if (user && (user.role === 'BUYER' || user.role === 'SELLER') && active !== user.role && event.request.method === 'GET') setActive(event.cookies, user.role);

	const isPage = event.request.method === 'GET' && !pathname.startsWith('/api/');
	const roles = rolesFor(pathname);
	// e.g. /rfq/new while signed in only as a seller: sellers never get the "post requirement" form.
	const blocked = !user && (['BUYER', 'SELLER'] as const).some((r) => event.locals.sessions[r] && blockedRolesFor(pathname).includes(r));

	if (blocked) {
		if (!isPage) return json(403, 'You do not have access to this area');
		redirect(303, `/denied?need=BUYER&from=${encodeURIComponent(pathname)}`);
	}
	if (roles && !user) {
		if (!isPage) return json(401, 'Login required');
		const login = roles.length === 1 ? PORTAL_LOGIN[roles[0] as Portal] : '/login';
		redirect(303, `${login}?redirectTo=${encodeURIComponent(pathname + search)}`);
	}
	if (roles && user && !roles.includes(user.role)) {
		if (!isPage) return json(403, 'You do not have access to this area');
		redirect(303, `/denied?need=${roles.join(',')}&from=${encodeURIComponent(pathname)}`);
	}

	const response = await resolve(event);
	// Signed-in pages must not be cached by shared proxies.
	if (user || signedIn.BUYER || signedIn.SELLER) response.headers.set('cache-control', 'private, no-store');
	return response;
};

function json(status: number, message: string) {
	return new Response(JSON.stringify({ error: message }), { status, headers: { 'content-type': 'application/json' } });
}

// App errors (thrown with error(404, '...')) and framework errors keep their own status/message.
// Only unexpected crashes are logged with a reference id the user can quote to support.
export const handleError: HandleServerError = (caught) => {
	if (caught.kind !== 'unknown') return;
	const errorId = crypto.randomUUID().slice(0, 8);
	console.error(`[eYantrik error ${errorId}] ${caught.event.request.method} ${caught.event.url.pathname}`, caught.error);
	return { message: 'Something went wrong on our side. Please try again.', errorId };
};
