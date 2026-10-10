<script lang="ts">
	import RfqForm from '#lib/components/RfqForm.svelte';

	let { data, form } = $props();
	const values = $derived(form?.values ?? data.rfq.values);
	const errors = $derived((form?.errors ?? {}) as Record<string, string>);
</script>

<svelte:head><title>Edit {data.rfq.id} · eYantrik</title></svelte:head>

<main class="container mid">
	<a href="/buyer/rfq/{data.rfq.id}" class="small">← Back to {data.rfq.id}</a>
	<h1 class="mt">Edit & re-post requirement</h1>

	{#if data.liveQuotes}
		<div class="alert warn">
			<strong>{data.liveQuotes} active quotation{data.liveQuotes === 1 ? '' : 's'} will restart.</strong>
			Re-posting marks them "needs re-quote", cancels pending counter-offers, opens a fresh quotation window and notifies suppliers to quote again on the new details.
		</div>
	{:else}
		<div class="alert info small">Re-posting opens a fresh quotation window and notifies matching suppliers.</div>
	{/if}
	{#if form?.formError}<div class="alert bad" role="alert">{form.formError}</div>{/if}

	<RfqForm {values} {errors} fileHint={data.rfq.drawings.length ? `Current drawings: ${data.rfq.drawings.map((d) => d.name).join(', ')}. Upload new files only to replace them.` : undefined}>
		{#snippet footer(submitting)}
			<div class="row between gap">
				<a class="btn ghost" href="/buyer/rfq/{data.rfq.id}">Cancel</a>
				<button class="btn ok" disabled={submitting}>{submitting ? 'Re-posting…' : 'Save & re-post →'}</button>
			</div>
		{/snippet}
	</RfqForm>
</main>
