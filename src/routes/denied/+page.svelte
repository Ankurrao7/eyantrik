<script lang="ts">
	let { data } = $props();
	const label: Record<string, string> = { BUYER: 'buyer', SELLER: 'seller', ADMIN: 'eYantrik admin' };
	const loginFor: Record<string, string> = { BUYER: '/login/buyer', SELLER: '/login/seller', ADMIN: '/admin/login' };
	const needText = $derived(data.need.map((r) => label[r]).join(' or ') || 'another type of');
	const isPostRfq = $derived(data.from.startsWith('/rfq/new'));
</script>

<svelte:head><title>Access denied · eYantrik</title><meta name="robots" content="noindex" /></svelte:head>

<main class="container narrow">
	<div class="card center">
		<p class="eyebrow" style="color:var(--bad)">403 · Access denied</p>
		<h1>{isPostRfq ? 'Posting requirements is for buyer accounts' : `This area is only for ${needText} accounts`}</h1>
		{#if data.role}
			<p class="muted">You're signed in as a <strong>{label[data.role]}</strong>. Buyer and seller accounts are separate — log in with (or create) a {needText} account too; both can stay signed in, one tab each.</p>
		{/if}
		<div class="row gap center-x mt">
			<a class="btn" href={data.home}>Go to my {data.role ? label[data.role] : ''} dashboard</a>
			{#if data.need.length === 1 && data.need[0] !== 'ADMIN'}
				<a class="btn ghost" href="{loginFor[data.need[0]]}?redirectTo={encodeURIComponent(data.from)}">Log in as {label[data.need[0]]}</a>
				<a class="btn ghost" href="{loginFor[data.need[0]]}?mode=signup&redirectTo={encodeURIComponent(data.from)}">Create a {label[data.need[0]]} account</a>
			{/if}
		</div>
	</div>
</main>
