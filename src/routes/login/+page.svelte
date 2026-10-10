<script lang="ts">
	let { data } = $props();
	const qs = $derived(data.redirectTo ? `?redirectTo=${encodeURIComponent(data.redirectTo)}` : '');
</script>

<svelte:head><title>Log in · eYantrik</title><meta name="robots" content="noindex" /></svelte:head>

<main class="container mid">
	<h1 class="center-text">Log in to eYantrik</h1>
	<p class="muted center-text">Buyer and seller accounts are separate — you can be signed in to both, one tab each.</p>
	<div class="grid two mt">
		<a class="card choice" href={data.buyer ? data.buyer.home : `/login/buyer${qs}`}>
			<span class="ic" aria-hidden="true">🛒</span>
			<h2>I'm a buyer</h2>
			<p class="small muted mb-0">Post requirements, compare quotations, negotiate and track orders.</p>
			<span class="btn mt">{data.buyer ? `Open buyer dashboard (${data.buyer.name.split(' ')[0]})` : 'Buyer login'}</span>
		</a>
		<a class="card choice" href={data.seller ? data.seller.home : `/login/seller${qs}`}>
			<span class="ic" aria-hidden="true">🏭</span>
			<h2>I'm a manufacturer</h2>
			<p class="small muted mb-0">Get matched buyer leads, send quotations and win orders.</p>
			<span class="btn ok mt">{data.seller ? `Open seller dashboard (${data.seller.name.split(' ')[0]})` : 'Seller login'}</span>
		</a>
	</div>
</main>

<style>
	.center-text { text-align: center; }
	.choice { display: flex; flex-direction: column; align-items: flex-start; text-decoration: none; color: inherit; }
	.choice:hover { border-color: var(--brand); }
	.ic { font-size: 2rem; }
</style>
