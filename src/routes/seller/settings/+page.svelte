<script lang="ts">
	import { enhance } from '$app/forms';
	import { GST_RATES, PAYMENT_TERMS, QUOTE_INCLUSIONS } from '#lib/quote.ts';

	let { data, form } = $props();
	const v = $derived(form && 'values' in form && form.values ? form.values : data.values);
	const errors = $derived((form && 'errors' in form ? form.errors : {}) as Record<string, string>);
</script>

<svelte:head><title>Quote defaults · eYantrik</title></svelte:head>

<main class="container narrow">
	<a href="/seller" class="small">← Lead feed</a>
	<h1 class="mt">Quote defaults</h1>
	<p class="muted">Save the terms you use on most quotes. Turn on auto-fill to have every new quotation start with them — you can still change anything per quote.</p>

	{#if form && 'saved' in form}<div class="alert ok" role="status">Saved ✓</div>{/if}

	<form method="POST" use:enhance={() => async ({ update }) => update({ reset: false })} novalidate>
		<fieldset>
			<legend>Pre-fill</legend>
			<label class="row gap"><input type="checkbox" name="autoFill" checked={v.autoFill} /> <span><strong>Auto-fill new quotations</strong> with these defaults</span></label>
		</fieldset>

		<fieldset>
			<legend>Commercial terms</legend>
			<div class="form-grid">
				<div class="field" class:invalid={errors.gstPercent}>
					<label for="gstPercent">GST</label>
					<select id="gstPercent" name="gstPercent" value={v.gstPercent}>{#each GST_RATES as g}<option value={String(g)}>{g}%</option>{/each}</select>
				</div>
				<div class="field" class:invalid={errors.validityDays}>
					<label for="validityDays">Quote valid for (days)</label>
					<input id="validityDays" name="validityDays" type="number" min="1" max="180" value={v.validityDays} />
					{#if errors.validityDays}<span class="err">{errors.validityDays}</span>{/if}
				</div>
				<div class="field full" class:invalid={errors.paymentTerms}>
					<label for="paymentTerms">Payment terms</label>
					<input id="paymentTerms" name="paymentTerms" list="pt" maxlength="120" value={v.paymentTerms} />
					<datalist id="pt">{#each PAYMENT_TERMS as p}<option value={p}></option>{/each}</datalist>
					<span class="hint">Your own B2B terms — type anything, or pick a suggestion.</span>
					{#if errors.paymentTerms}<span class="err">{errors.paymentTerms}</span>{/if}
				</div>
				<div class="field full">
					<span class="label">Freight</span>
					<label class="row gap small" style="font-weight:400"><input type="radio" name="freight" value="EX_WORKS" checked={v.freight === 'EX_WORKS'} /> Ex-works</label>
					<label class="row gap small" style="font-weight:400"><input type="radio" name="freight" value="DELIVERED" checked={v.freight === 'DELIVERED'} /> Delivered to buyer</label>
				</div>
				<div class="field full">
					<span class="label">Price usually includes</span>
					<div class="checks">{#each QUOTE_INCLUSIONS as i}<label><input type="checkbox" name="includes" value={i.id} checked={v.includes.includes(i.id)} /> {i.label}</label>{/each}</div>
				</div>
			</div>
		</fieldset>

		<fieldset>
			<legend>Cost estimator rates</legend>
			<p class="small muted">Used by the 🧮 estimator on the quotation form.</p>
			<div class="form-grid">
				<div class="field" class:invalid={errors.machineHourRate}><label for="machineHourRate">Machine hour rate (₹)</label><input id="machineHourRate" name="machineHourRate" type="number" min="0" value={v.machineHourRate} />{#if errors.machineHourRate}<span class="err">{errors.machineHourRate}</span>{/if}</div>
				<div class="field" class:invalid={errors.overheadPct}><label for="overheadPct">Overhead %</label><input id="overheadPct" name="overheadPct" type="number" min="0" step="0.5" value={v.overheadPct} />{#if errors.overheadPct}<span class="err">{errors.overheadPct}</span>{/if}</div>
				<div class="field" class:invalid={errors.profitPct}><label for="profitPct">Profit %</label><input id="profitPct" name="profitPct" type="number" min="0" step="0.5" value={v.profitPct} />{#if errors.profitPct}<span class="err">{errors.profitPct}</span>{/if}</div>
			</div>
		</fieldset>

		<button class="btn ok block">Save defaults</button>
	</form>
</main>
