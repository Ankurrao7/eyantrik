// Which side (buyer or seller) THIS browser tab is being used for.
// Cookies are shared by every tab, so on shared pages (home, directory, help) the server can only
// guess "the side used last". sessionStorage is per tab, so each tab remembers its own side here:
// a tab that was on /seller… stays "seller" on the homepage even if another tab logged in as buyer.

export type Side = 'BUYER' | 'SELLER';
const KEY = 'ey_tab_side';

export const tabSide = $state<{ current: Side | null }>({ current: null });

/** The side a URL belongs to, or null for shared pages. */
export function sideOfPath(pathname: string): Side | null {
	const under = (p: string) => pathname === p || pathname.startsWith(p + '/');
	if (under('/seller')) return 'SELLER';
	if (under('/buyer') || under('/rfq/new')) return 'BUYER';
	return null;
}

/** Call after every navigation (browser only): role pages set the tab's side, shared pages keep it. */
export function rememberSide(pathname: string) {
	const side = sideOfPath(pathname);
	try {
		if (side) sessionStorage.setItem(KEY, side);
		const saved = sessionStorage.getItem(KEY);
		tabSide.current = saved === 'BUYER' || saved === 'SELLER' ? saved : null;
	} catch {
		tabSide.current = side ?? tabSide.current; // storage blocked (private mode): remember in memory
	}
}
