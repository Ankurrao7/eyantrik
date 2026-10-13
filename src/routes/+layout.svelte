<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { afterNavigate, beforeNavigate, invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Logo from '#lib/components/Logo.svelte';
	import NotificationToasts from '#lib/components/NotificationToasts.svelte';
	import ProfileRing from '#lib/components/ProfileRing.svelte';
	import { laneOfPath, rememberLane, switchLane, tabLane, writeLaneCookie, type Lane } from '#lib/tabSide.svelte.ts';

	let { data, children } = $props();
	let menuOpen = $state(false);
	afterNavigate(() => (menuOpen = false));
	afterNavigate(() => {
		rememberLane(page.url.pathname, data.lane);
		// Shared page rendered for another tab's lane (e.g. that tab was focused last)? Ask again for ours.
		if (!tabLane.blocked && !laneOfPath(page.url.pathname) && tabLane.current !== (data.lane ?? null)) invalidateAll();
	});
	// Keep the server in step with the tab in front of the user (see tabSide.svelte.ts / auth.ts).
	beforeNavigate(() => writeLaneCookie());
	onMount(() => {
		const sync = () => document.visibilityState === 'visible' && writeLaneCookie();
		window.addEventListener('focus', sync);
		document.addEventListener('visibilitychange', sync);
		// reload / typed address: tell the server this tab's lane before the page is requested
		window.addEventListener('pagehide', writeLaneCookie);
		window.addEventListener('beforeunload', writeLaneCookie);
		return () => {
			window.removeEventListener('focus', sync);
			document.removeEventListener('visibilitychange', sync);
			window.removeEventListener('pagehide', writeLaneCookie);
			window.removeEventListener('beforeunload', writeLaneCookie);
		};
	});

	// This tab's workspace: while a crossing is being confirmed, the tab it came from; else the area of
	// the URL; else what this tab remembers; else what the server rendered with.
	const lane = $derived<Lane | null>(tabLane.blocked?.from ?? laneOfPath(page.url.pathname) ?? tabLane.current ?? data.lane ?? null);
	// Who THIS tab is — only ever the lane's own account (an admin tab never shows a buyer/seller login).
	const me = $derived.by(() => {
		if (lane === 'ADMIN') return data.user?.role === 'ADMIN' ? data.user : null;
		if (lane) return data.sides[lane] ?? (data.user?.role === lane ? data.user : null);
		return data.user;
	});
	const onAdminPath = $derived(page.url.pathname === '/admin' || page.url.pathname.startsWith('/admin/'));
	const LANE_LABEL: Record<Lane, string> = { ADMIN: 'admin console', BUYER: 'buyer account', SELLER: 'seller account' };
	const LANE_HOME: Record<Lane, string> = { ADMIN: '/admin', BUYER: '/buyer/dashboard', SELLER: '/seller' };
	// name of the account the blocked page belongs to (role pages are rendered as that account)
	const blockedName = $derived(tabLane.blocked && data.user?.role === tabLane.blocked.to ? data.user.name : null);
	const other = $derived(me?.role === 'BUYER' ? data.sides.SELLER : me?.role === 'SELLER' ? data.sides.BUYER : null);

	const role = $derived(me?.role ?? null);
	// Live unread count from the pop-up poller; falls back to the server value on each navigation.
	let liveUnread = $state<number | null>(null);
	afterNavigate(() => (liveUnread = null));
	const unread = $derived(liveUnread ?? me?.unread ?? 0);
	const sellerHome = $derived(me?.home ?? '/seller');
	const initials = $derived(
		(me?.name ?? '')
			.split(' ')
			.filter(Boolean)
			.slice(0, 2)
			.map((w: string) => w[0]?.toUpperCase())
			.join('')
	);

	// Each side has its own inbox, so the bell in a buyer tab and a seller tab never mix.
	const inbox = $derived(role === 'SELLER' ? '/seller/notifications' : '/buyer/notifications');

	const isActive = (href: string) => page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	// Admin menu: console tabs (?tab=…) plus the supplier / buyer files under them.
	const adminTab = $derived.by(() => {
		const p = page.url.pathname;
		if (p.startsWith('/admin/review/seller')) return 'suppliers';
		if (p.startsWith('/admin/buyers')) return 'buyers';
		return p === '/admin' ? (page.url.searchParams.get('tab') ?? 'queue') : '';
	});
	const loginHref = $derived(`/login${page.url.pathname === '/' ? '' : `?redirectTo=${encodeURIComponent(page.url.pathname + page.url.search)}`}`);
</script>

<div class="shell">
	<header class="topbar">
		<div class="bar">
			<a href={lane === 'ADMIN' ? '/admin' : '/'} class="brand" aria-label={lane === 'ADMIN' ? 'Admin console' : 'eYantrik home'}><Logo /></a>

			<button class="menu-toggle" aria-expanded={menuOpen} aria-controls="main-nav" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onclick={() => (menuOpen = !menuOpen)}>
				<Icon name={menuOpen ? 'close' : 'menu'} size={22} />
			</button>

			<!-- Buyer and seller get separate menus: buying actions never show to sellers, and vice versa. -->
			<nav id="main-nav" class:open={menuOpen}>
				<div class="links">
					{#if lane === 'ADMIN' && !me}
						<!-- admin tab, not signed in as admin (login page) or on a public page: no buyer/seller menu -->
					{:else if role === 'SELLER'}
						<a href={sellerHome} class:active={isActive('/seller') && !isActive('/seller/settings') && !isActive('/seller/profile')}>Lead feed</a>
						{#if me?.hasSellerProfile}<a href="/seller/profile" class:active={isActive('/seller/profile')}>My profile</a>{/if}
						<a href="/seller/settings" class:active={isActive('/seller/settings')}>Quote settings</a>
						<a href="/help" class:active={isActive('/help')}>Help desk</a>
					{:else if role === 'ADMIN'}
						<!-- The admin works only inside the console: no buyer/seller pages, no blurred public views. -->
						<a href="/admin" class:active={adminTab === 'queue'}>Work queue</a>
						<a href="/admin?tab=suppliers" class:active={adminTab === 'suppliers'}>Suppliers</a>
						<a href="/admin?tab=buyers" class:active={adminTab === 'buyers'}>Buyers</a>
						<a href="/admin?tab=helpdesk" class:active={adminTab === 'helpdesk'}>Help desk tickets</a>
					{:else}
						<a href="/sellers" class:active={isActive('/sellers')}>Find suppliers</a>
						<a href="/rfq/new" class:active={isActive('/rfq/new')}>Post requirement</a>
						{#if role === 'BUYER'}<a href="/buyer/dashboard" class:active={isActive('/buyer')}>My requirements</a>{/if}
						<a href="/help" class:active={isActive('/help')}>Help desk</a>
					{/if}
				</div>

				<div class="actions">
					{#if me}
						{#if role !== 'ADMIN'}
							<a href={inbox} class="icon-btn" class:active={isActive(inbox)} aria-label="Notifications{unread ? `, ${unread} unread` : ''}">
								<Icon name="bell" size={20} />
								{#if unread}<span class="bell-count">{unread > 9 ? '9+' : unread}</span>{/if}
							</a>
						{/if}
						{#if other}
							<a href={other.home} class="switch" onclick={() => switchLane(other.role === 'SELLER' ? 'SELLER' : 'BUYER')} title="Switch this tab to {other.name} ({other.role === 'SELLER' ? 'seller' : 'buyer'})">
								Switch to {other.role === 'SELLER' ? 'seller' : 'buyer'}
							</a>
						{/if}
						{#if role === 'SELLER' && me.profilePct !== null}
							<!-- LinkedIn-style: the ring around the avatar shows how complete the factory profile is -->
							<a class="who link" href="/seller/profile" title="{me.companyName} — profile {me.profilePct}% complete">
								<ProfileRing percent={me.profilePct} size={38} stroke={3} label="Profile {me.profilePct}% complete">
									<span class="avatar seller">{initials}</span>
								</ProfileRing>
								<span class="who-text">
									<strong>{me.name.split(' ')[0]}</strong>
									<span>Profile {me.profilePct}%</span>
								</span>
							</a>
						{:else}
							<div class="who" title={me.companyName}>
								<span class="avatar" class:seller={role === 'SELLER'} class:admin={role === 'ADMIN'}>{initials}</span>
								<span class="who-text">
									<strong>{me.name.split(' ')[0]}</strong>
									<span>{role === 'ADMIN' ? 'Admin' : role === 'SELLER' ? 'Manufacturer' : 'Buyer'}</span>
								</span>
							</div>
						{/if}
						<form method="POST" action={role === 'ADMIN' ? '/admin/logout' : '/logout'}>
							<!-- logs out only this side; the other (buyer/seller) stays signed in -->
							{#if role !== 'ADMIN'}<input type="hidden" name="role" value={role} />{/if}
							<button type="submit" class="icon-btn" aria-label="Log out of this {role === 'ADMIN' ? 'admin' : role === 'SELLER' ? 'seller' : 'buyer'} account" title="Log out of this account"><Icon name="logout" size={19} /></button>
						</form>
					{:else if lane === 'ADMIN'}
						{#if !onAdminPath}<a href="/admin" class="btn sm">← Admin console</a>{/if}
					{:else}
						<a href={loginHref} class="btn ghost sm">Log in</a>
						<a href="/login/seller?mode=signup" class="btn grad sm">List your factory</a>
					{/if}
				</div>
			</nav>
		</div>
	</header>

	{#if lane === 'ADMIN' && !onAdminPath && !tabLane.blocked}
		<div class="lane-bar" role="status">
			<span>🛡 <strong>Admin tab</strong> — you're seeing the public site as a visitor. Buyer and seller logins are never used in this tab.</span>
			<a href="/admin">Back to admin console →</a>
		</div>
	{/if}

	<div class="content">
		{#if tabLane.blocked}
			<!-- This tab works in one account; opening another role's area needs an explicit switch. -->
			{@const b = tabLane.blocked}
			<main class="container lane-guard">
				<div class="card">
					<span class="lg-ico" aria-hidden="true">🔀</span>
					<h1>This tab is your {LANE_LABEL[b.from]}</h1>
					<p>You're opening the <strong>{LANE_LABEL[b.to]}</strong>{#if blockedName} ({blockedName}){/if}. To keep accounts apart, each tab works in one account only.</p>
					<div class="row gap mt">
						<a class="btn" href={LANE_HOME[b.from]}>Stay in the {LANE_LABEL[b.from]}</a>
						<button type="button" class="btn ghost" onclick={() => switchLane(b.to)}>Switch this tab to the {LANE_LABEL[b.to]}</button>
					</div>
					<p class="tiny muted mt mb-0">Tip: use one browser tab for each account, or log out of the accounts you don't need.</p>
				</div>
			</main>
		{:else}
			{@render children()}
		{/if}
	</div>

	{#if me && me.role !== 'ADMIN'}
		{#key me.id}<NotificationToasts userId={me.id} role={me.role === 'SELLER' ? 'SELLER' : 'BUYER'} onUnread={(n) => (liveUnread = n)} />{/key}
	{/if}

	<footer class="foot">
		<div class="foot-inner">
			<div class="foot-brand">
				<Logo light />
				<p>India's free marketplace for custom manufacturing. Find verified factories near you, compare quotations, and deal directly — or let our help desk manage it for you.</p>
			</div>
			{#if lane === 'ADMIN'}
				<div class="foot-col">
					<h4>Admin console</h4>
					<a href="/admin">Work queue</a>
					<a href="/admin?tab=suppliers">Suppliers</a>
					<a href="/admin?tab=buyers">Buyers</a>
					<a href="/admin?tab=requirements">Requirements</a>
				</div>
			{:else if role === 'SELLER'}
				<div class="foot-col">
					<h4>Your business</h4>
					<a href={sellerHome}>Lead feed</a>
					<a href="/seller/settings">Quote settings</a>
					<a href="/seller/notifications">Notifications</a>
				</div>
			{:else}
				<div class="foot-col">
					<h4>For buyers</h4>
					<a href="/sellers">Supplier directory</a>
					<a href="/rfq/new">Post a requirement</a>
					<a href="/help">Managed sourcing</a>
				</div>
				{#if !role}
					<div class="foot-col">
						<h4>For manufacturers</h4>
						<a href="/login/seller?mode=signup">List your factory</a>
						<a href="/login/seller">Seller login</a>
					</div>
				{/if}
			{/if}
			{#if lane !== 'ADMIN'}
				<div class="foot-col">
					<h4>Support</h4>
					<a href="/help">Help desk</a>
					{#if !role}<a href="/login/buyer">Buyer login</a>{/if}
				</div>
			{/if}
		</div>
		<div class="foot-base">
			<span>© {new Date().getFullYear()} eYantrik</span>
			<span>Made for Indian manufacturing</span>
		</div>
	</footer>
</div>

<style>
	.shell { min-height: 100vh; display: flex; flex-direction: column; }
	.content { flex: 1; }

	/* Header */
	.topbar { position: sticky; top: 0; z-index: 40; background: rgba(255, 255, 255, 0.82); backdrop-filter: saturate(180%) blur(14px); -webkit-backdrop-filter: saturate(180%) blur(14px); border-bottom: 1px solid rgba(231, 234, 240, 0.9); }
	.bar { max-width: 1180px; margin: 0 auto; padding: 12px 20px; display: flex; align-items: center; gap: 20px; }
	.brand { text-decoration: none; display: flex; }
	nav { flex: 1; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
	.links { display: flex; align-items: center; gap: 2px; }
	.links a { color: var(--ink-2); text-decoration: none; font-weight: 600; font-size: 0.92rem; padding: 8px 12px; border-radius: 9px; transition: background 0.15s ease, color 0.15s ease; }
	.links a:hover { background: #f2f4f8; color: var(--ink); }
	.links a.active { color: var(--brand); background: var(--brand-soft); }
	.actions { display: flex; align-items: center; gap: 8px; }
	.actions form { margin: 0; }
	.icon-btn { position: relative; display: inline-grid; place-items: center; width: 38px; height: 38px; border-radius: 10px; color: var(--ink-2); background: transparent; border: 1px solid transparent; cursor: pointer; transition: background 0.15s ease; }
	.icon-btn:hover, .icon-btn.active { background: #f2f4f8; color: var(--ink); }
	.bell-count { position: absolute; top: 3px; right: 2px; background: var(--accent); color: #fff; font-size: 0.62rem; font-weight: 800; border-radius: 999px; padding: 1px 5px; line-height: 1.35; border: 2px solid #fff; }
	.switch { font-size: 0.8rem; font-weight: 700; text-decoration: none; padding: 7px 11px; border-radius: 999px; color: var(--ok-ink); background: var(--ok-soft); border: 1px solid #b5ecd6; white-space: nowrap; }
	.switch:hover { color: var(--ok-ink); filter: brightness(0.97); }
	.who { display: flex; align-items: center; gap: 9px; padding: 4px 10px 4px 4px; border-radius: 999px; background: #f6f7fb; border: 1px solid var(--line); }
	.avatar { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; font-size: 0.75rem; font-weight: 800; color: #fff; background: var(--grad); }
	.avatar.seller { background: linear-gradient(135deg, #0e9f6e, #12b886); }
	.avatar.admin { background: linear-gradient(135deg, #111a33, #344054); }
	.who.link { text-decoration: none; color: inherit; padding: 2px 10px 2px 2px; }
	.lane-bar { display: flex; flex-wrap: wrap; gap: 6px 16px; justify-content: center; align-items: center; background: var(--navy); color: #e0e7ff; font-size: 0.86rem; padding: 9px 16px; }
	.lane-bar a { color: #fff; font-weight: 700; }
	.lane-guard { max-width: 620px; padding-top: 48px; padding-bottom: 48px; }
	.lane-guard .card { text-align: center; padding: 32px 24px; }
	.lane-guard .row { justify-content: center; flex-wrap: wrap; }
	.lg-ico { font-size: 2rem; }
	.who.link:hover { border-color: var(--ok); }
	.who.link .avatar { width: 28px; height: 28px; font-size: 0.7rem; }
	.who-text { display: flex; flex-direction: column; line-height: 1.15; }
	.who-text strong { font-size: 0.84rem; }
	.who-text span { font-size: 0.7rem; color: var(--muted); }
	.menu-toggle { display: none; margin-left: auto; background: none; border: 1px solid var(--line); border-radius: 10px; width: 40px; height: 40px; place-items: center; color: var(--ink); cursor: pointer; }

	@media (max-width: 900px) {
		.menu-toggle { display: grid; }
		.bar { flex-wrap: wrap; }
		nav { display: none; flex-basis: 100%; flex-direction: column; align-items: stretch; gap: 12px; padding: 8px 0 6px; }
		nav.open { display: flex; animation: rise 0.2s ease; }
		.links { flex-direction: column; align-items: stretch; }
		.links a { padding: 11px 12px; }
		.actions { justify-content: flex-start; flex-wrap: wrap; border-top: 1px solid var(--line); padding-top: 12px; }
	}

	/* Footer */
	.foot { background: var(--navy); color: #98a2b3; margin-top: 40px; }
	.foot-inner { max-width: 1180px; margin: 0 auto; padding: 48px 20px 32px; display: grid; grid-template-columns: 2fr repeat(3, minmax(0, 1fr)); gap: 32px; }
	.foot-brand p { margin-top: 14px; max-width: 360px; font-size: 0.88rem; line-height: 1.65; }
	.foot-col { display: flex; flex-direction: column; gap: 10px; }
	.foot-col h4 { color: #fff; font-family: var(--font); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
	.foot-col a { color: #b8c0cf; text-decoration: none; font-size: 0.9rem; }
	.foot-col a:hover { color: #fff; }
	.foot-base { max-width: 1180px; margin: 0 auto; padding: 18px 20px 28px; border-top: 1px solid #1c2640; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; font-size: 0.8rem; }
	@media (max-width: 800px) { .foot-inner { grid-template-columns: 1fr 1fr; } .foot-brand { grid-column: 1 / -1; } }
</style>
