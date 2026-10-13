<script lang="ts">
	import { page } from '$app/state';
	import SellerCard from '#lib/components/SellerCard.svelte';
	import { PROCESS_LABEL } from '#lib/taxonomy.ts';
	import { isShopId, shopLabel } from '#lib/processes.ts';

	let { data } = $props();

	const heading = $derived.by(() => {
		const parts: string[] = [];
		if (data.filters.process) parts.push(isShopId(data.filters.process) ? shopLabel(data.filters.process) : (PROCESS_LABEL[data.filters.process] ?? data.filters.process));
		parts.push('manufacturers');
		if (data.filters.state) parts.push(`in ${data.filters.state}`);
		const h = parts.join(' ');
		return h.charAt(0).toUpperCase() + h.slice(1);
	});

	function pageHref(n: number) {
		const params = new URLSearchParams(page.url.searchParams.toString());
		params.set('page', String(n));
		return `/sellers?${params}`;
	}
</script>

<svelte:head>
	<title>{heading} — verified suppliers · eYantrik</title>
	<meta name="description" content="{data.total} verified {heading.toLowerCase()} on eYantrik. See machine lists, ground-verification status and contact suppliers directly." />
</svelte:head>

<main class="container">
	<h1>{heading}</h1>
	<p class="muted">{data.total} verified supplier{data.total === 1 ? '' : 's'} · contacts unlock after you post a requirement</p>

	<div class="grid sidebar mt">
		<aside class="card flat">
			<form method="GET" action="/sellers">
				<div class="field">
					<label for="q">Keyword</label>
					<input id="q" type="search" name="q" value={data.filters.q} placeholder="e.g. VMC, wire cut, aluminium, Faridabad" />
				</div>
				<div class="field">
					<label for="process">Type of work or process</label>
					<select id="process" name="process" value={data.filters.process}>
						<option value="">Any kind of work</option>
						{#each data.processGroups as g (g.id)}
							<optgroup label={g.label}>
								<option value={g.id}>All · {g.label}</option>
								{#each g.processes as p (p.id)}<option value={p.id}>{p.label}</option>{/each}
							</optgroup>
						{/each}
					</select>
				</div>
				<div class="field">
					<label for="state">State</label>
					<select id="state" name="state" value={data.filters.state}>
						<option value="">All states</option>
						{#each data.stateOptions as s}<option value={s}>{s}</option>{/each}
					</select>
				</div>
				<label class="row gap small mb"><input type="checkbox" name="ground" value="1" checked={data.filters.groundOnly} /> Ground-verified only</label>
				<button class="btn block">Apply filters</button>
				<a class="small" href="/sellers" style="display:block;text-align:center;margin-top:8px">Clear</a>
			</form>
		</aside>

		<section>
			{#if data.lockReason !== 'role' && !data.sellers[0]?.contact && data.sellers.length}
				<div class="alert info">
					<strong>Want to call these suppliers?</strong>
					{#if data.lockReason === 'login'}Login free and post your requirement — every supplier's phone & WhatsApp will unlock.{:else}Post one requirement and every supplier's phone & WhatsApp will unlock.{/if}
					<div class="mt"><a class="btn sm" href={data.lockReason === 'login' ? '/login/buyer?redirectTo=%2Frfq%2Fnew' : '/rfq/new'}>Post requirement</a></div>
				</div>
			{/if}

			{#if data.sellers.length === 0}
				<div class="card center">
					<h3>No suppliers match these filters yet</h3>
					<p class="muted">We're onboarding new factories every week. Post your requirement and our help desk will find one for you.</p>
					<div class="row gap center-x">
						{#if data.lockReason !== 'role'}<a class="btn" href="/rfq/new">Post requirement</a>{/if}
						{#if data.lockReason !== 'role'}<a class="btn ghost" href="/help">Ask the help desk</a>{/if}
					</div>
				</div>
			{:else}
				<div class="stack">
					{#each data.sellers as s (s.id)}
						<SellerCard seller={s} highlight={data.filters.process ? [data.filters.process] : []} lockReason={data.lockReason} />
					{/each}
				</div>
				{#if data.totalPages > 1}
					<nav class="row gap center-x mt" aria-label="Pagination">
						{#if data.page > 1}<a class="btn ghost sm" href={pageHref(data.page - 1)}>← Prev</a>{/if}
						<span class="small muted">Page {data.page} of {data.totalPages}</span>
						{#if data.page < data.totalPages}<a class="btn ghost sm" href={pageHref(data.page + 1)}>Next →</a>{/if}
					</nav>
				{/if}
			{/if}
		</section>
	</div>
</main>
