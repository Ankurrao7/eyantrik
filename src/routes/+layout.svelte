<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import Icon from '#lib/components/Icon.svelte';
	import Logo from '#lib/components/Logo.svelte';
	import NotificationToasts from '#lib/components/NotificationToasts.svelte';
	import { rememberSide, sideOfPath, tabSide } from '#lib/tabSide.svelte.ts';

	let { data, children } = $props();
	let menuOpen = $state(false);
	afterNavigate(() => (menuOpen = false));
	afterNavigate(() => rememberSide(page.url.pathname));

	// Who THIS tab is: the side of the current URL (/buyer…, /seller…), else the side this tab was
	// last used for (per-tab memory), else the server's guess. So a seller tab stays a seller tab on
	// the homepage even after you logged in as buyer in another tab.
	const me = $derived.by(() => {
		if (data.user?.role === 'ADMIN') return data.user;
		const side = sideOfPath(page.url.pathname) ?? tabSide.current;
		return (side && data.sides[side]) || data.user;
	});
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
	const loginHref = $derived(`/login${page.url.pathname === '/' ? '' : `?redirectTo=${encodeURIComponent(page.url.pathname + page.url.search)}`}`);
</script>

<div class="shell">
	<header class="topbar">
		<div class="bar">
			<a href="/" class="brand" aria-label="eYantrik home"><Logo /></a>

			<button class="menu-toggle" aria-expanded={menuOpen} aria-controls="main-nav" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onclick={() => (menuOpen = !menuOpen)}>
				<Icon name={menuOpen ? 'close' : 'menu'} size={22} />
			</button>

			<!-- Buyer and seller get separate menus: buying actions never show to sellers, and vice versa. -->
			<nav id="main-nav" class:open={menuOpen}>
				<div class="links">
					{#if role === 'SELLER'}
						<a href={sellerHome} class:active={isActive('/seller')}>Lead feed</a>
						<a href="/seller/settings" class:active={isActive('/seller/settings')}>Quote settings</a>
						<a href="/help" class:active={isActive('/help')}>Help desk</a>
					{:else if role === 'ADMIN'}
						<a href="/admin" class:active={isActive('/admin')}>Admin console</a>
						<a href="/sellers" class:active={isActive('/sellers')}>Supplier directory</a>
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
							<a href={other.home} class="switch" title="You're also signed in as {other.name} ({other.role === 'SELLER' ? 'seller' : 'buyer'})">
								Switch to {other.role === 'SELLER' ? 'seller' : 'buyer'}
							</a>
						{/if}
						<div class="who" title={me.companyName}>
							<span class="avatar" class:seller={role === 'SELLER'} class:admin={role === 'ADMIN'}>{initials}</span>
							<span class="who-text">
								<strong>{me.name.split(' ')[0]}</strong>
								<span>{role === 'ADMIN' ? 'Admin' : role === 'SELLER' ? 'Manufacturer' : 'Buyer'}</span>
							</span>
						</div>
						<form method="POST" action={role === 'ADMIN' ? '/admin/logout' : '/logout'}>
							<!-- logs out only this side; the other (buyer/seller) stays signed in -->
							{#if role !== 'ADMIN'}<input type="hidden" name="role" value={role} />{/if}
							<button type="submit" class="icon-btn" aria-label="Log out of this {role === 'ADMIN' ? 'admin' : role === 'SELLER' ? 'seller' : 'buyer'} account" title="Log out of this account"><Icon name="logout" size={19} /></button>
						</form>
					{:else}
						<a href={loginHref} class="btn ghost sm">Log in</a>
						<a href="/login/seller?mode=signup" class="btn grad sm">List your factory</a>
					{/if}
				</div>
			</nav>
		</div>
	</header>

	<div class="content">
		{@render children()}
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
			{#if role === 'SELLER'}
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
					{#if role !== 'ADMIN'}<a href="/rfq/new">Post a requirement</a>{/if}
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
			<div class="foot-col">
				<h4>Support</h4>
				<a href="/help">Help desk</a>
				{#if !role}<a href="/login/buyer">Buyer login</a>{/if}
			</div>
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
