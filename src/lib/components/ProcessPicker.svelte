<!-- Pick processes from the 13-shop list — simple for engineers and non-engineers:
     • search understands shop-floor words (VMC, wire cut, CO2 welding, powder coat…)
     • every process shows a one-line plain explanation
     • buyer mode: only the chosen type of work (optional), with "show other types too"
     • seller mode: collapsible shops with a count of what's ticked
     All checkboxes are always in the form (just hidden), so ticked items are never lost. -->
<script lang="ts">
	import { SHOPS, normalizeProcesses, processById, searchProcesses } from '../processes.ts';

	let {
		name,
		selected = [],
		mode,
		shop = ''
	}: { name: string; selected?: readonly string[]; mode: 'buyer' | 'seller'; shop?: string } = $props();

	let picked = $state<string[]>([]);
	$effect(() => {
		picked = normalizeProcesses(selected); // old ids (before 2026-10-12) are converted
	});
	let query = $state('');
	let showOthers = $state(false);

	const matches = $derived(query.trim() ? new Set(searchProcesses(query).map((p) => p.id)) : null);
	// Buyers see nothing until they choose a kind of work (or search) — no wall of options up front.
	const shopVisible = (shopId: string) => mode === 'seller' || showOthers || shopId === shop;
	const isVisible = (shopId: string, id: string) => (matches ? matches.has(id) : shopVisible(shopId)) || (mode === 'buyer' && picked.includes(id));
	const countIn = (shopId: string) => SHOPS.find((s) => s.id === shopId)!.groups.flatMap((g) => g.processes).filter((p) => picked.includes(p.id)).length;
	const remove = (id: string) => (picked = picked.filter((p) => p !== id));
</script>

<div class="picker">
	<div class="search">
		<input type="search" placeholder="Search — e.g. VMC, wire cut, powder coating, lost wax" bind:value={query} aria-label="Search processes" />
		{#if mode === 'buyer' && !query}
			<label class="others"><input type="checkbox" bind:checked={showOthers} /> {shop ? 'Part needs other types of work too' : 'Show the full list'}</label>
		{/if}
	</div>

	{#if picked.length}
		<div class="chosen" aria-live="polite">
			{#each picked as id (id)}
				<button type="button" class="pill" onclick={() => remove(id)} aria-label="Remove {processById(id)?.label}">{processById(id)?.label ?? id} <span aria-hidden="true">×</span></button>
			{/each}
		</div>
	{/if}

	{#if matches && matches.size === 0}
		<p class="none">No process matches “{query}”. Try another word — or describe it in the description box.</p>
	{/if}

	{#each SHOPS as s (s.id)}
		{@const anyVisible = s.groups.some((g) => g.processes.some((p) => isVisible(s.id, p.id)))}
		<details class="shop" open={mode === 'buyer' || !!matches || countIn(s.id) > 0} hidden={!anyVisible}>
			<summary>
				<span aria-hidden="true">{s.emoji}</span> <strong>{s.label}</strong>
				{#if countIn(s.id)}<span class="count">{countIn(s.id)} selected</span>{/if}
				{#if mode === 'seller'}<span class="ex">{s.examples}</span>{/if}
			</summary>
			{#each s.groups as g (g.label)}
				<div class="group" hidden={!g.processes.some((p) => isVisible(s.id, p.id))}>
					{#if s.groups.length > 1}<div class="g-label">{g.label}</div>{/if}
					<div class="opts">
						{#each g.processes as p (p.id)}
							<label class="opt" hidden={!isVisible(s.id, p.id)}>
								<input type="checkbox" {name} value={p.id} bind:group={picked} />
								<span><strong>{p.label}</strong><span class="hint">{p.hint}</span></span>
							</label>
						{/each}
					</div>
				</div>
			{/each}
		</details>
	{/each}
</div>

<style>
	.picker { display: flex; flex-direction: column; gap: 10px; }
	.search { display: flex; flex-direction: column; gap: 6px; }
	.others { display: flex; gap: 8px; align-items: center; font-weight: 400; font-size: 0.84rem; color: var(--ink-2); cursor: pointer; }
	.chosen { display: flex; flex-wrap: wrap; gap: 6px; }
	.pill { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #c7d0ff; background: var(--brand-soft); color: var(--brand-ink); border-radius: 999px; padding: 4px 10px; font: inherit; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
	.pill:hover { background: #e0e6ff; }
	.none { font-size: 0.86rem; color: var(--muted); margin: 0; }
	.shop { border: 1px solid var(--line); border-radius: 12px; background: #fff; }
	.shop[hidden] { display: none; }
	summary { cursor: pointer; padding: 10px 12px; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; list-style: none; }
	summary::-webkit-details-marker { display: none; }
	summary::before { content: '▸'; color: var(--muted); font-size: 0.8rem; transition: transform 0.15s ease; }
	details[open] > summary::before { transform: rotate(90deg); }
	summary strong { font-size: 0.9rem; }
	.count { font-size: 0.72rem; font-weight: 700; color: #fff; background: var(--brand); border-radius: 999px; padding: 1px 8px; }
	.ex { flex-basis: 100%; font-size: 0.76rem; color: var(--muted); padding-left: 18px; }
	.group { padding: 2px 12px 10px; }
	.group[hidden], .opt[hidden] { display: none; }
	.g-label { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin: 6px 0 6px; }
	.opts { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 6px; }
	.opt { display: flex; gap: 9px; align-items: flex-start; padding: 8px 10px; border: 1px solid var(--line); border-radius: 10px; font-weight: 400; cursor: pointer; transition: border-color 0.15s ease, background 0.15s ease; }
	.opt:hover { border-color: #b4bccb; }
	.opt:has(input:checked) { border-color: var(--brand); background: var(--brand-soft); }
	.opt input { margin-top: 3px; flex: none; }
	.opt span { display: flex; flex-direction: column; gap: 1px; }
	.opt strong { font-size: 0.86rem; color: var(--ink); }
	.hint { font-size: 0.75rem; color: var(--muted); line-height: 1.35; }
</style>
