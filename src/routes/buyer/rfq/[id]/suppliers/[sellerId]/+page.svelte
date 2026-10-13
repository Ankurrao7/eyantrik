<script lang="ts">
	import ContactButtons from '#lib/components/ContactButtons.svelte';
	import MessageThread from '#lib/components/MessageThread.svelte';
	import VerificationBadge from '#lib/components/VerificationBadge.svelte';
	import { inr, QUOTE_STATUS_CLASS, QUOTE_STATUS_LABEL } from '#lib/quote.ts';

	let { data, form } = $props();
	const s = $derived(data.seller);
</script>

<svelte:head><title>{s.companyName} · {data.rfq.title} · eYantrik</title></svelte:head>

<main class="container narrow">
	<a href="/buyer/rfq/{data.rfq.id}" class="small">← {data.rfq.title} ({data.rfq.id})</a>

	<div class="row between top gap mt">
		<div>
			<h1 class="mb-0">{s.companyName}</h1>
			<div class="row gap mt small"><VerificationBadge status={s.verification} /> {s.city}, {s.state}{#if data.distanceKm !== null} · ~{data.distanceKm} km{/if} · {s.rating ? `★ ${s.rating} (${s.reviewCount})` : 'no reviews yet'} · <a href="/sellers/{s.slug}">profile</a></div>
		</div>
		{#if data.quote}
			<a class="card hover quote-box" href="/buyer/rfq/{data.rfq.id}/quotes/{data.quote.id}">
				<span class="badge {QUOTE_STATUS_CLASS[data.quote.status]}">{QUOTE_STATUS_LABEL[data.quote.status]}</span>
				<div class="big">{inr(data.quote.perPiece)}<span class="small muted">/pc landed</span></div>
				<span class="small">Quote v{data.quote.version} — review & negotiate →</span>
			</a>
		{/if}
	</div>

	<div class="mt">
		<MessageThread messages={data.messages} me="BUYER" otherName={s.companyName} canSend={data.canSend} shared={data.shared} max={data.max} error={form && 'messageError' in form ? form.messageError : ''} />
	</div>

	<section class="card mt">
		<h3>Contact</h3>
		{#if s.contact}
			<p class="mb-0"><strong>{s.contact.person}</strong></p>
			<ContactButtons size="sm" phone={s.contact.phone} whatsapp={s.contact.whatsapp} sellerId={s.id} rfqId={data.rfq.id} message={`Hi, about my requirement ${data.rfq.title} (${data.rfq.id}) on eYantrik.`} />
		{:else}
			<p class="small muted mb-0">🔒 Phone & WhatsApp are shared both ways when you <strong>shortlist</strong> this supplier's quote{data.quote ? '' : ' (once they send one)'}. Until then, keep the conversation here — it stays on record for both of you.</p>
		{/if}
	</section>
</main>

<style>
	.quote-box { text-decoration: none; color: inherit; display: flex; flex-direction: column; gap: 4px; min-width: 220px; }
	.big { font-size: 1.5rem; font-weight: 800; }
</style>
