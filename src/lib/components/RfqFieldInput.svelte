<!-- Renders one RFQ_FIELDS entry. Keeps the form fully driven by src/lib/rfqFields.ts. -->
<script lang="ts">
	import type { RfqField } from '../rfqFields.ts';
	import { MATERIAL_CATEGORIES, processesForCommodity } from '../taxonomy.ts';

	let {
		field,
		value,
		error,
		context = {}
	}: {
		field: RfqField;
		value: string | string[] | undefined;
		error?: string;
		/** live values of other fields this one depends on */
		context?: { commodityCategory?: string; materialCategory?: string };
	} = $props();

	const id = $derived(`f-${field.name}`);
	const str = $derived(Array.isArray(value) ? '' : (value ?? field.defaultValue ?? ''));
	const list = $derived(Array.isArray(value) ? value : []);
	const today = new Date().toISOString().slice(0, 10);

	// Process list narrowed by the chosen commodity category (all options when none chosen).
	// Already-ticked options always stay visible so a choice is never silently dropped.
	let showAll = $state(false);
	let selected = $state<string[]>([]);
	$effect(() => {
		selected = [...list];
	});
	const visibleOptions = $derived.by(() => {
		if (field.filterBy !== 'commodityCategory' || !context.commodityCategory || showAll) return field.options ?? [];
		const allowed = processesForCommodity(context.commodityCategory);
		return (field.options ?? []).filter((o) => allowed.includes(o.value) || selected.includes(o.value));
	});

	const suggestions = $derived(
		field.suggestFrom === 'materialCategory'
			? (MATERIAL_CATEGORIES.find((m) => m.id === context.materialCategory)?.examples ?? MATERIAL_CATEGORIES.flatMap((m) => m.examples))
			: []
	);

	let fileNames = $state<string[]>([]);
	let fileInput = $state<HTMLInputElement>();
	let dragging = $state(false);
</script>

<div class="field w-{field.width ?? 'full'}" class:invalid={!!error}>
	{#if field.type === 'checkbox'}
		<label class="check-card">
			<input type="checkbox" name={field.name} checked={str === 'yes'} />
			<span>
				<strong>{field.label}</strong>
				{#if field.help}<span class="hint">{field.help}</span>{/if}
			</span>
		</label>
	{:else if field.type === 'multiselect'}
		<span class="label" id="{id}-label">{field.label} {#if field.required}<span class="req">*</span>{/if}</span>
		{#if field.filterBy && !context.commodityCategory}
			<span class="hint">Choose a commodity category to narrow this list.</span>
		{:else if field.filterBy}
			<label class="hint row gap" style="font-weight:400"><input type="checkbox" bind:checked={showAll} /> Show all processes (multi-process part)</label>
		{/if}
		<div class="checks" role="group" aria-labelledby="{id}-label">
			{#each visibleOptions as o (o.value)}
				<label><input type="checkbox" name={field.name} value={o.value} bind:group={selected} /> {o.label}</label>
			{/each}
		</div>
	{:else if field.type === 'file'}
		<span class="label" id="{id}-label">{field.label} {#if field.required}<span class="req">*</span>{/if}</span>
		<label
			class="drop"
			class:dragging
			for={id}
			ondragover={(e) => {
				e.preventDefault();
				dragging = true;
			}}
			ondragleave={() => (dragging = false)}
			ondrop={(e) => {
				// Without this the browser would open the dropped file instead of attaching it.
				e.preventDefault();
				dragging = false;
				if (fileInput && e.dataTransfer?.files.length) {
					fileInput.files = e.dataTransfer.files;
					fileNames = Array.from(e.dataTransfer.files).map((f) => f.name);
				}
			}}
		>
			<span class="drop-icon" aria-hidden="true">⇪</span>
			<span><strong>Drag & drop files, or click to browse</strong></span>
			<input
				bind:this={fileInput}
				{id}
				type="file"
				name={field.name}
				accept={field.accept}
				multiple={(field.maxFiles ?? 1) > 1}
				required={field.required}
				onchange={(e) => (fileNames = Array.from(e.currentTarget.files ?? []).map((f) => f.name))}
			/>
		</label>
		{#if fileNames.length}<span class="hint">Selected: {fileNames.join(', ')}</span>{/if}
	{:else}
		<label for={id}>
			{field.label} {#if field.unit}<span class="muted">({field.unit})</span>{/if}
			{#if field.required}<span class="req">*</span>{/if}
		</label>
		{#if field.type === 'textarea'}
			<textarea {id} name={field.name} placeholder={field.placeholder} maxlength={field.maxLength} value={str}></textarea>
		{:else if field.type === 'select'}
			<select {id} name={field.name} required={field.required} value={str}>
				<option value="" disabled={field.required}>Select {field.label.toLowerCase()}</option>
				{#each field.options ?? [] as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
			</select>
		{:else if field.type === 'number'}
			<input {id} type="number" name={field.name} min={field.min} max={field.max} step={field.decimals ? 'any' : '1'} required={field.required} placeholder={field.placeholder} value={str} inputmode={field.decimals ? 'decimal' : 'numeric'} />
		{:else if field.type === 'date'}
			<input {id} type="date" name={field.name} min={today} required={field.required} value={str} />
		{:else}
			<input {id} type="text" name={field.name} minlength={field.minLength} maxlength={field.maxLength} required={field.required} placeholder={field.placeholder} value={str} list={suggestions.length ? `${id}-list` : undefined} />
			{#if suggestions.length}
				<datalist id="{id}-list">{#each suggestions as s}<option value={s}></option>{/each}</datalist>
			{/if}
		{/if}
	{/if}
	{#if field.help && field.type !== 'checkbox'}<span class="hint">{field.help}</span>{/if}
	{#if error}<span class="err" role="alert">{error}</span>{/if}
</div>

<style>
	.w-full { grid-column: 1 / -1; }
	.w-half { grid-column: span 3; }
	.w-third { grid-column: span 2; }
	@media (max-width: 600px) { .w-half, .w-third { grid-column: 1 / -1; } }
	.check-card { display: flex; gap: 10px; align-items: flex-start; background: #f8fafc; border: 1px solid var(--line); border-radius: 8px; padding: 12px; font-weight: 400; cursor: pointer; }
	.check-card input { margin-top: 4px; }
	.check-card .hint { display: block; }
	.drop { display: flex; flex-direction: column; align-items: center; gap: 6px; border: 2px dashed var(--line-2); border-radius: 10px; padding: 22px; text-align: center; cursor: pointer; background: #fff; font-weight: 400; }
	.drop.dragging, .drop:hover { border-color: var(--brand); background: var(--brand-soft); }
	.drop-icon { font-size: 1.6rem; color: var(--muted); }
	.drop input { max-width: 100%; }
</style>
