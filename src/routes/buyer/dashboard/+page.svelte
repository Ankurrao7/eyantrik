<!-- src/routes/buyer/dashboard/+page.svelte -->
<script lang="ts">
	import LatestUpdates from '#lib/components/LatestUpdates.svelte';
	import { ORDER_STAGE_LABEL } from '#lib/orders.ts';
	import { inr } from '#lib/quote.ts';
	import { ORDER_TYPE_LABEL } from '#lib/taxonomy.ts';

	let { data } = $props();

	const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
	const stageLabel: Record<string, string> = { AWAITING: 'Awaiting quotes', QUOTES: 'Compare quotes', NEGOTIATING: 'Negotiating', AWARDED: 'Awarded', CLOSED: 'Closed' };
	const stageClass: Record<string, string> = { AWAITING: 'neutral', QUOTES: 'docs', NEGOTIATING: 'pending', AWARDED: 'ground', CLOSED: 'neutral' };
	const ticketLabel: Record<string, string> = { NEW: 'Received', CONTACTED: 'We called you', EYANTRIK_HANDLING: 'eYantrik handling', RESOLVED: 'Resolved' };
</script>

<svelte:head><title>My dashboard · eYantrik</title></svelte:head>

<main class="container">
	<div class="row between gap">
		<div>
			<h1 class="mb-0">Namaste, {data.buyer.name.split(' ')[0]}</h1>
			<p class="muted mb-0">{data.buyer.companyName}</p>
		</div>
		<div class="row gap">
			<a class="btn ok" href="/rfq/new">+ Post requirement</a>
			<a class="btn ghost" href="/sellers">Browse suppliers</a>
		</div>
	</div>

	{#if !data.unlocked}
		<div class="alert info mt"><strong>Post your first requirement — it's free.</strong> We invite the few best-matched verified suppliers to quote, so you compare real quotes without a flood of sales calls.</div>
	{/if}

	<div class="grid four mt">
		<div class="stat"><div class="v">{data.pipeline.AWAITING}</div><div class="k">Waiting for quotes</div></div>
		<div class="stat"><div class="v">{data.pipeline.QUOTES}</div><div class="k">Quotes to compare</div></div>
		<div class="stat"><div class="v">{data.pipeline.NEGOTIATING}</div><div class="k">Negotiating</div></div>
		<div class="stat"><div class="v">{data.pipeline.AWARDED}</div><div class="k">Orders awarded</div></div>
	</div>

	<section class="mt">
		<h2>My requirements</h2>
		{#if data.rfqs.length === 0}
			<div class="card center">
				<p class="muted">You haven't posted a requirement yet.</p>
				<a class="btn" href="/rfq/new">Post your first requirement</a>
			</div>
		{:else}
			<div class="table-wrap">
				<table>
					<thead><tr><th>Requirement</th><th>Type</th><th class="num">Interested</th><th class="num">Quotes</th><th class="num">Lowest / pc</th><th>Stage</th><th></th></tr></thead>
					<tbody>
						{#each data.rfqs as r (r.id)}
							<tr>
								<td><strong>{r.title}</strong><div class="tiny muted">{r.id} · {r.quantity} pcs · {fmt(r.createdAt)}</div></td>
								<td class="small">{ORDER_TYPE_LABEL[r.orderType]?.split(' (')[0] ?? r.orderType}</td>
								<td class="num">{r.interested}</td>
								<td class="num"><strong>{r.quoteCount}</strong></td>
								<td class="num">{r.lowest === null ? '—' : inr(r.lowest)}</td>
								<td>
									<span class="badge {stageClass[r.stage]}">{stageLabel[r.stage]}</span>
									{#if r.stage === 'AWAITING' || r.stage === 'QUOTES'}<div class="tiny muted">{r.quotingOpen ? 'quotes open' : 'quote window closed'}</div>{/if}
								</td>
								<td class="num"><a class="btn sm {r.needsAction ? '' : 'ghost'}" href="/buyer/rfq/{r.id}">{r.needsAction ? 'Review →' : 'Open →'}</a></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	{#if data.orders.length}
		<section class="mt-lg">
			<h2>Orders managed by eYantrik</h2>
			<div class="stack">
				{#each data.orders as o (o.id)}
					<a class="card order" href="/buyer/orders/{o.id}">
						<div class="row between gap">
							<div><span class="badge dark">{o.id}</span> <strong>{o.partName}</strong> <span class="muted small">· {o.quantity} pcs</span></div>
							<span class="badge {o.status === 'DELIVERED' ? 'ground' : 'docs'}">{o.last ? ORDER_STAGE_LABEL[o.last.stage] : 'Being planned'}</span>
						</div>
						{#if o.last?.note}<p class="small muted mb-0 mt">{o.last.note}</p>{/if}
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<div class="mt-lg"><LatestUpdates items={data.updates} /></div>

	<div class="grid two mt-lg">
		<section class="card">
			<h3>Recent contacts</h3>
			{#if data.contacts.length === 0}
				<p class="small muted mb-0">Calls and WhatsApp messages you start from eYantrik show up here.</p>
			{:else}
				<ul class="plain">
					{#each data.contacts as c (c.id)}
						<li class="small">
							{c.direction === 'OUT' ? '→' : '←'} {c.channel === 'PHONE' ? '📞' : '💬'}
							<strong>{c.seller}</strong>
							{c.direction === 'IN' ? 'contacted you' : ''}
							{#if c.rfqId}<span class="muted">· {c.rfqId}</span>{/if}
							<span class="muted">· {fmt(c.at)}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
		<section class="card">
			<div class="row between"><h3 class="mb-0">Help desk requests</h3><a class="btn sm" href="/help">Need assistance</a></div>
			{#if data.tickets.length === 0}
				<p class="small muted mt mb-0">Want eYantrik to manage an order end-to-end? Raise a request and our team will call you.</p>
			{:else}
				<ul class="plain mt">
					{#each data.tickets as t (t.id)}
						<li class="small"><strong>{t.id}</strong> {#if t.rfqId}({t.rfqId}){/if} — <span class="badge {t.status === 'RESOLVED' ? 'ground' : 'pending'}">{ticketLabel[t.status]}</span><div class="muted">{t.message}</div></li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</main>

<style>
	.plain { list-style: none; padding: 0; margin: 0; }
	.plain li { padding: 6px 0; border-bottom: 1px solid var(--line); }
	.plain li:last-child { border-bottom: none; }
	.inline { display: inline; }
	.order { display: block; text-decoration: none; color: inherit; }
	.order:hover { border-color: var(--brand); }
</style>
