<!-- "What kind of work is it?" — one card per shop with example parts, so people who don't know
     process names can still choose. A plain radio group underneath: works without JavaScript. -->
<script lang="ts">
	import { SHOPS, normalizeShop } from '../processes.ts';

	let { name, value = '', required = false }: { name: string; value?: string; required?: boolean } = $props();
	const current = $derived(normalizeShop(value));
</script>

<div class="cards" role="radiogroup">
	{#each SHOPS as s (s.id)}
		<label class="card-opt">
			<input type="radio" {name} value={s.id} checked={current === s.id} {required} />
			<span class="emoji" aria-hidden="true">{s.emoji}</span>
			<span class="text">
				<strong>{s.label}</strong>
				<span class="ex">{s.examples}</span>
			</span>
		</label>
	{/each}
</div>

<style>
	.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; }
	.card-opt { position: relative; display: flex; gap: 10px; align-items: flex-start; padding: 11px 12px; border: 1px solid var(--line-2); border-radius: 12px; background: #fff; cursor: pointer; font-weight: 400; transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease; }
	.card-opt:hover { border-color: #b4bccb; }
	.card-opt:has(input:checked) { border-color: var(--brand); background: var(--brand-soft); box-shadow: var(--ring); }
	.card-opt:has(input:focus-visible) { box-shadow: var(--ring); }
	.card-opt input { position: absolute; opacity: 0; pointer-events: none; }
	.emoji { font-size: 1.35rem; line-height: 1.2; }
	.text { display: flex; flex-direction: column; gap: 2px; }
	.text strong { font-size: 0.9rem; color: var(--ink); }
	.ex { font-size: 0.76rem; color: var(--muted); line-height: 1.35; }
	/* phones: two cards per row so the list stays short */
	@media (max-width: 520px) {
		.cards { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
		.card-opt { flex-direction: column; gap: 4px; padding: 9px 10px; }
		.text strong { font-size: 0.84rem; }
		.ex { font-size: 0.72rem; }
	}
</style>
