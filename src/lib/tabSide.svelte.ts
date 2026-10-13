// Every browser tab works in ONE workspace ("lane"): ADMIN, BUYER or SELLER.
//
// Why: cookies are shared by all tabs, so one browser can hold an admin, a buyer and a seller login at
// the same time. Without lanes, a page that isn't tied to a role (home, directory, help, the admin login
// page) would show whichever login the browser used last — e.g. the admin tab showing a seller's
// profile ring. sessionStorage is per tab, so each tab remembers its own lane here.
//
// Rules (enforced in +layout.svelte, and on the server through the ey_lane cookie — see auth.ts):
//  • role areas set the lane: /admin… → ADMIN · /seller… → SELLER · /buyer…, /rfq/new → BUYER
//  • login portals set it too (/login/buyer, /login/seller, /admin/login): logging in is an explicit choice
//  • shared pages keep the lane and show ONLY that lane's account; an ADMIN tab sees them as a visitor
//  • opening ANOTHER role's area from a tab is stopped with "Switch this tab?" — only an explicit
//    switch (that button, the header's "Switch to …", or logging in) moves a tab to another lane.

export type Lane = 'ADMIN' | 'BUYER' | 'SELLER';
export type Side = 'BUYER' | 'SELLER';

const KEY = 'ey_tab_lane';
/** Not a secret: tells the server which of this browser's logins the focused tab is using. */
export const LANE_COOKIE = 'ey_lane';

export const isLane = (v: unknown): v is Lane => v === 'ADMIN' || v === 'BUYER' || v === 'SELLER';

export const tabLane = $state<{ current: Lane | null; blocked: { from: Lane; to: Lane } | null }>({ current: null, blocked: null });

const under = (pathname: string, p: string) => pathname === p || pathname.startsWith(p + '/');

/** The lane a URL belongs to, or null for shared pages (home, directory, help, denied…). */
export function laneOfPath(pathname: string): Lane | null {
	if (under(pathname, '/admin')) return 'ADMIN';
	if (under(pathname, '/seller') || under(pathname, '/login/seller')) return 'SELLER';
	if (under(pathname, '/buyer') || under(pathname, '/rfq/new') || under(pathname, '/login/buyer')) return 'BUYER';
	return null;
}

/** Login portals: entering one is an explicit choice, so it switches the tab without asking. */
const isPortal = (pathname: string) => under(pathname, '/login') || pathname === '/admin/login' || pathname === '/admin/setup';

function read(): Lane | null {
	try {
		const v = sessionStorage.getItem(KEY);
		return isLane(v) ? v : null;
	} catch {
		return tabLane.current; // storage blocked (private mode): memory only
	}
}

function save(lane: Lane | null) {
	try {
		if (lane) sessionStorage.setItem(KEY, lane);
		else sessionStorage.removeItem(KEY);
	} catch {
		/* memory only */
	}
	tabLane.current = lane;
	writeLaneCookie();
}

/** Tell the server which lane the tab in front of the user is in (called on navigation and on focus). */
export function writeLaneCookie() {
	try {
		document.cookie = tabLane.current
			? `${LANE_COOKIE}=${tabLane.current}; path=/; samesite=lax; max-age=604800`
			: `${LANE_COOKIE}=; path=/; samesite=lax; max-age=0`;
	} catch {
		/* no document (server) */
	}
}

/**
 * Call after every navigation (browser only). `serverLane` = the lane the server rendered with —
 * a brand-new tab adopts it, so it starts where the user was last working.
 */
export function rememberLane(pathname: string, serverLane: Lane | null) {
	const stored = read();
	const target = laneOfPath(pathname);
	if (!stored) {
		// brand-new tab: it belongs to the area it opened, else to where the user was last working
		tabLane.blocked = null;
		save(target ?? serverLane);
		return;
	}
	if (target && target !== stored && !isPortal(pathname)) {
		tabLane.current = stored;
		tabLane.blocked = { from: stored, to: target };
		writeLaneCookie();
		return;
	}
	tabLane.blocked = null;
	save(target ?? stored);
}

/** Explicit switch (header button, "Switch this tab" on the guard). */
export function switchLane(to: Lane) {
	tabLane.blocked = null;
	save(to);
}
