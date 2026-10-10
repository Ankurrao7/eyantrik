<script lang="ts">
	import RfqForm from '#lib/components/RfqForm.svelte';

	let { data, form } = $props();

	const values = $derived(form?.values ?? data.draft ?? {});
	const errors = $derived((form?.errors ?? {}) as Record<string, string>);
</script>

<svelte:head>
	<title>Post a manufacturing requirement — free · eYantrik</title>
	<meta name="description" content="Post your part requirement free. Get matched with verified CNC, casting, forging, moulding and fabrication suppliers and contact them directly." />
</svelte:head>

<main class="container mid">
	<p class="eyebrow">Free · takes 2 minutes</p>
	<h1>Post your requirement</h1>
	<p class="muted">We match it to verified suppliers who have the right process and machines, notify them, and their quotations come straight to your dashboard.</p>

	{#if data.draft && !form}
		<div class="alert info"><strong>Welcome back — your draft is saved.</strong> Review it below and press “Post requirement”. {#if !data.role}You'll log in first.{/if} (Re-attach the drawing if you added one.)</div>
	{/if}
	{#if !data.role}
		<div class="alert info small">You can fill this in now — we'll ask for a quick login when you submit.</div>
	{/if}
	{#if form?.formError}
		<div class="alert bad" role="alert">{form.formError}</div>
	{/if}

	<RfqForm {values} {errors}>
		{#snippet footer(submitting)}
			<div class="row between gap">
				<p class="small muted mb-0">By posting, matched verified suppliers can see your name, company and phone to send you quotes.</p>
				<button class="btn ok" disabled={submitting}>
					{submitting ? 'Posting…' : data.role ? 'Post requirement →' : 'Continue — login & post →'}
				</button>
			</div>
		{/snippet}
	</RfqForm>

	<p class="small muted mt-lg">Not sure what process you need? <a href="/help">Ask the help desk</a> — an engineer will call you.</p>
</main>
