<script lang="ts">
	import { ORDER_STAGES, stageIndex } from '#lib/orders.ts';
	import { inr } from '#lib/quote.ts';

	let { data } = $props();
	const o = $derived(data.order);
	const reached = $derived(stageIndex(o.milestones));
	const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
</script>

<svelte:head><title>Order {o.id} · eYantrik</title></svelte:head>

<main class="container mid">
	<a href="/buyer/dashboard" class="small">← My dashboard</a>
	<div class="row between top gap mt">
		<div>
			<span class="badge dark">{o.id}</span> <span class="badge {o.status === 'DELIVERED' ? 'ground' : 'docs'}">Managed by eYantrik</span>
			<h1 class="mt mb-0">{o.partName}</h1>
			<p class="muted small">{o.quantity} pcs{#if o.pricePerPiece} · {inr(o.pricePerPiece)}/pc{/if}{#if o.rfqId} · from {o.rfqId}{/if}</p>
		</div>
		<a class="btn dark" href="/help{o.rfqId ? `?rfq=${o.rfqId}` : ''}">Talk to your eYantrik manager</a>
	</div>

	<section class="card mt">
		<h2>Order progress</h2>
		<ol class="tracker">
			{#each ORDER_STAGES as st, i}
				{@const m = o.milestones.findLast((x) => x.stage === st.id)}
				<li class:done={i <= reached} class:current={i === reached}>
					<span class="dot" aria-hidden="true">{i <= reached ? '✓' : st.icon}</span>
					<div>
						<strong>{st.label}</strong>
						{#if m}<span class="tiny muted"> · {fmt(m.at)}</span>{#if m.note}<div class="small">{m.note}</div>{/if}{:else if i === reached + 1}<div class="tiny muted">Next</div>{/if}
					</div>
				</li>
			{/each}
		</ol>
		<p class="tiny muted mt mb-0">Updates are posted by the eYantrik team and you get a notification for each one.</p>
	</section>
</main>

<style>
	.tracker { list-style: none; padding: 0; margin: 0; }
	.tracker li { display: flex; gap: 12px; align-items: flex-start; padding: 8px 0 14px; position: relative; color: var(--muted); }
	.tracker li:not(:last-child)::after { content: ''; position: absolute; left: 14px; top: 38px; bottom: 0; width: 2px; background: var(--line); }
	.tracker li.done { color: var(--ink); }
	.tracker li.done:not(:last-child)::after { background: var(--ok); }
	.dot { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: #f1f5f9; border: 2px solid var(--line-2); flex: none; font-size: 0.85rem; }
	.done .dot { background: var(--ok); border-color: var(--ok); color: #fff; }
	.current .dot { box-shadow: 0 0 0 4px #bbf7d0; }
</style>
