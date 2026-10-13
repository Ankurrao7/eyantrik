<!-- On-platform conversation between a buyer and one supplier about one requirement (messages.ts).
     Posts to the page's ?/message action. Contacts typed in are masked by the server until shared. -->
<script lang="ts">
	import { enhance } from '$app/forms';

	let {
		messages,
		me,
		otherName,
		canSend,
		shared,
		max = 1000,
		error = ''
	}: {
		messages: { id: string; from: 'BUYER' | 'SELLER'; text: string; at: string }[];
		me: 'BUYER' | 'SELLER';
		otherName: string;
		canSend: boolean;
		shared: boolean;
		max?: number;
		error?: string;
	} = $props();

	let text = $state('');
	let busy = $state(false);
	const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
</script>

<section class="card thread" id="messages">
	<h3>💬 Messages with {otherName}</h3>
	{#if messages.length === 0}
		<p class="small muted">No messages yet. Ask about drawings, material, tolerances, quantities or timelines — everything stays on record here.</p>
	{:else}
		<ol class="msgs">
			{#each messages as m (m.id)}
				<li class:mine={m.from === me}>
					<p>{m.text}</p>
					<span class="tiny muted">{m.from === me ? 'You' : otherName} · {when(m.at)}</span>
				</li>
			{/each}
		</ol>
	{/if}

	{#if canSend}
		{#if error}<div class="alert bad small" role="alert">{error}</div>{/if}
		<form
			method="POST"
			action="?/message"
			use:enhance={() => {
				busy = true;
				return async ({ result, update }) => {
					await update({ reset: false });
					if (result.type === 'success') text = '';
					busy = false;
				};
			}}
		>
			<label class="sr-only" for="msg-text">Message</label>
			<textarea id="msg-text" name="text" maxlength={max} rows="3" placeholder="Write a message…" bind:value={text} required></textarea>
			<div class="row between gap mt-xs">
				<span class="tiny muted">{shared ? 'Contacts are shared for this requirement.' : 'Phone numbers, emails and links are hidden until the buyer shortlists the quote.'}</span>
				<button class="btn sm" disabled={busy || !text.trim()}>{busy ? 'Sending…' : 'Send'}</button>
			</div>
		</form>
	{:else}
		<p class="small muted mb-0">Messages are closed for this requirement.</p>
	{/if}
</section>

<style>
	.msgs { list-style: none; padding: 0; margin: 0 0 12px; display: flex; flex-direction: column; gap: 8px; max-height: 420px; overflow-y: auto; }
	.msgs li { align-self: flex-start; max-width: 85%; background: #f1f5f9; border-radius: 12px 12px 12px 4px; padding: 8px 12px; }
	.msgs li.mine { align-self: flex-end; background: var(--brand-soft); border-radius: 12px 12px 4px 12px; }
	.msgs p { margin: 0 0 2px; white-space: pre-wrap; overflow-wrap: anywhere; }
	textarea { width: 100%; }
	.mt-xs { margin-top: 4px; }
	.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
