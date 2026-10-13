<!-- Admin only: suspend / deactivate / reactivate an account. The admin never edits the person's
     details — those stay in the user's hands. Posts to the page's ?/setStatus action. -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import AccountBadge from './AccountBadge.svelte';

	let {
		status,
		reason = '',
		who,
		history = []
	}: {
		status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
		reason?: string;
		/** "supplier" or "buyer" — used in the explanations */
		who: 'supplier' | 'buyer';
		history?: { at: string; by: string; status: string; reason?: string }[];
	} = $props();

	let choice = $state<'' | 'SUSPENDED' | 'DEACTIVATED'>('');
	const effect = $derived(
		who === 'supplier'
			? 'The owner is signed out and can’t log in. The company disappears from the directory, matching and lead alerts, and its quotes are hidden from buyers.'
			: 'The buyer is signed out and can’t log in. Their requirements are hidden from every seller’s lead feed.'
	);
	const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
	const label: Record<string, string> = { ACTIVE: 'Reactivated', SUSPENDED: 'Suspended', DEACTIVATED: 'Deactivated' };
	const confirmSubmit = (e: SubmitEvent) => {
		const msg = choice === 'DEACTIVATED' ? `Deactivate this ${who}? ${effect}` : choice === 'SUSPENDED' ? `Suspend this ${who}? ${effect}` : `Reactivate this ${who}?`;
		if (!confirm(msg)) e.preventDefault();
	};
</script>

<section class="card account">
	<div class="row between gap">
		<h2 class="mb-0">Account</h2>
		{#if status === 'ACTIVE'}<span class="badge ground">● Active</span>{:else}<AccountBadge {status} />{/if}
	</div>

	{#if status === 'ACTIVE'}
		<p class="small muted">Details are entered and updated only by the {who} themselves. You can put the account on hold or close it.</p>
		<form method="POST" action="?/setStatus" use:enhance onsubmit={confirmSubmit}>
			<div class="choices">
				<label class="opt" class:on={choice === 'SUSPENDED'}><input type="radio" name="status" value="SUSPENDED" bind:group={choice} /> <span><strong>Suspend</strong><span class="tiny muted">Temporary hold, e.g. a complaint under review.</span></span></label>
				<label class="opt" class:on={choice === 'DEACTIVATED'}><input type="radio" name="status" value="DEACTIVATED" bind:group={choice} /> <span><strong>Deactivate</strong><span class="tiny muted">Close the account (fake, duplicate, asked to leave).</span></span></label>
			</div>
			{#if choice}
				<p class="tiny muted mt">{effect}</p>
				<div class="field"><label for="acc-reason">Reason (shown to the {who} at login) <span class="req">*</span></label><input id="acc-reason" name="reason" maxlength="300" required minlength="5" placeholder="e.g. Buyer complaint about quality — under review" /></div>
				<button class="btn danger block">{choice === 'SUSPENDED' ? '⏸ Suspend account' : '⛔ Deactivate account'}</button>
			{/if}
		</form>
	{:else}
		<p class="small">{status === 'SUSPENDED' ? 'Suspended' : 'Deactivated'}{#if reason}: <strong>{reason}</strong>{/if}</p>
		<form method="POST" action="?/setStatus" use:enhance onsubmit={confirmSubmit}>
			<input type="hidden" name="status" value="ACTIVE" />
			<div class="field"><label for="acc-note">Note (optional)</label><input id="acc-note" name="reason" maxlength="300" placeholder="e.g. Complaint resolved" /></div>
			<button class="btn ok block">▶ Reactivate account</button>
		</form>
	{/if}

	{#if history.length}
		<h3 class="mt">Account history</h3>
		<ol class="hist">
			{#each [...history].reverse() as h, i (i)}
				<li><span class="tiny muted">{fmt(h.at)} · {h.by}</span><strong>{label[h.status] ?? h.status}</strong>{#if h.reason}<span class="small">{h.reason}</span>{/if}</li>
			{/each}
		</ol>
	{/if}
</section>

<style>
	h2 { font-size: 1.05rem; }
	h3 { font-size: 0.9rem; }
	.choices { display: grid; gap: 8px; margin-top: 8px; }
	.opt { display: flex; gap: 10px; align-items: flex-start; border: 1px solid var(--line-2); border-radius: 10px; padding: 10px 12px; cursor: pointer; font-weight: 400; }
	.opt.on { border-color: var(--bad, #c0392b); background: var(--bad-soft, #fff1f1); }
	.opt input { margin-top: 3px; flex: none; }
	.opt > span { display: flex; flex-direction: column; }
	.hist { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
	.hist li { display: flex; flex-direction: column; border-left: 3px solid var(--line-2); padding-left: 10px; }
</style>
