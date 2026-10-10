<!-- The RFQ form (all fields from rfqFields.ts) — shared by Post Requirement and Edit Requirement. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import RfqFieldInput from './RfqFieldInput.svelte';
	import { RFQ_FIELDS, RFQ_SECTIONS, type RfqValues } from '../rfqFields.ts';

	let {
		values,
		errors = {},
		action = '',
		fileHint,
		footer
	}: {
		values: RfqValues;
		errors?: Record<string, string>;
		action?: string;
		/** extra note under the file field (e.g. "existing drawings are kept") */
		fileHint?: string;
		footer: Snippet<[boolean]>;
	} = $props();

	let submitting = $state(false);

	// Live values that other fields depend on (process list ← commodity, material hints ← family).
	let context = $state<{ commodityCategory?: string; materialCategory?: string }>({});
	$effect(() => {
		context = { commodityCategory: String(values.commodityCategory ?? ''), materialCategory: String(values.materialCategory ?? '') };
	});
	function trackDependencies(e: Event) {
		const t = e.target as HTMLSelectElement;
		if (t.name === 'commodityCategory' || t.name === 'materialCategory') context = { ...context, [t.name]: t.value };
	}
</script>

<form
	method="POST"
	{action}
	enctype="multipart/form-data"
	novalidate
	onchange={trackDependencies}
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			await update({ reset: false });
			submitting = false;
			document.querySelector('.invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		};
	}}
>
	{#each RFQ_SECTIONS as section}
		<fieldset>
			<legend>{section}</legend>
			<div class="grid6">
				{#each RFQ_FIELDS.filter((f) => f.section === section) as field (field.name)}
					<RfqFieldInput {field} value={values[field.name]} error={errors[field.name]} {context} />
				{/each}
			</div>
			{#if fileHint && section === 'Drawings & Attachments'}<p class="small muted mb-0">{fileHint}</p>{/if}
		</fieldset>
	{/each}

	{@render footer(submitting)}
</form>

<style>
	.grid6 { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 0 14px; }
</style>
