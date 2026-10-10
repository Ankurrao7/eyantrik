<script lang="ts">
	import { enhance } from '$app/forms';
	import SellerProfileFields from '#lib/components/SellerProfileFields.svelte';

	let { data, form } = $props();
	let busy = $state(false);
	const errors = $derived((form?.errors ?? {}) as Record<string, string>);
</script>

<svelte:head><title>Register your factory · eYantrik</title></svelte:head>

<main class="container mid">
	<p class="eyebrow">Free listing · Seller registration</p>
	<h1>Register your factory</h1>

	{#if data.rejectionReason}
		<div class="alert bad"><strong>Your previous submission was not approved.</strong> Reason: {data.rejectionReason}. Please correct and resubmit.</div>
	{/if}

	<div class="card flat mb">
		<h3>Self-registration rules</h3>
		<ol class="small rules">
			<li><strong>One GSTIN = one listing.</strong> The GSTIN must be active and registered in the same state as your factory.</li>
			<li><strong>Upload your GST certificate and real shop-floor photos</strong> showing the machines you list. Stock photos lead to rejection.</li>
			<li><strong>List only machines you own and run in-house.</strong> Outsourced processes should not be listed as your capability.</li>
			<li><strong>Documents are checked in 1–2 working days.</strong> Once approved you get the <em>Documents verified</em> badge, appear in the directory and start receiving buyer leads with full contact details.</li>
			<li><strong>Ground inspection:</strong> an eYantrik team member visits to confirm what you've listed. Matching reality earns the <em>Ground verified</em> badge and higher ranking. Mismatches can lead to removal.</li>
			<li><strong>Buyers rate you after each deal.</strong> Ratings are public on your profile.</li>
		</ol>
	</div>

	{#if errors.form}<div class="alert bad" role="alert">{errors.form}</div>{/if}

	<form
		method="POST"
		enctype="multipart/form-data"
		novalidate
		use:enhance={() => {
			busy = true;
			return async ({ update }) => {
				await update({ reset: false });
				busy = false;
				document.querySelector('.invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			};
		}}
	>
		<SellerProfileFields mode="SELF" fixedPhone={data.phone} values={form?.values ?? data.prefill} {errors} />

		<div class="field" class:invalid={errors.declaration}>
			<label class="row gap top small" style="font-weight:400">
				<input type="checkbox" name="declaration" />
				<span>I confirm the information and documents are genuine, and I agree to an on-ground inspection by eYantrik. I understand my listing can be removed if the details don't match what is found on site.</span>
			</label>
			{#if errors.declaration}<span class="err">{errors.declaration}</span>{/if}
		</div>

		<button class="btn ok block" disabled={busy}>{busy ? 'Submitting…' : 'Submit for verification'}</button>
	</form>
</main>

<style>
	.rules { padding-left: 20px; margin: 0; }
	.rules li { margin-bottom: 6px; }
</style>
