<!-- Profile-completeness ring (LinkedIn-style) drawn around an avatar or a big percentage.
     Red < 50 %, amber < 80 %, green ≥ 80 %. The arc animates in on first paint. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { scoreTone } from '../profileScore.ts';

	let { percent, size = 40, stroke = 3, label, children }: { percent: number; size?: number; stroke?: number; label?: string; children?: Snippet } = $props();

	const r = $derived((size - stroke) / 2);
	const c = $derived(2 * Math.PI * r);
	const pct = $derived(Math.max(0, Math.min(100, Math.round(percent))));
	const tone = $derived(scoreTone(pct));
</script>

<span class="ring {tone}" style="--size:{size}px; --stroke:{stroke}px" role="img" aria-label={label ?? `Profile ${pct}% complete`} title={label ?? `Profile ${pct}% complete`}>
	<svg width={size} height={size} viewBox="0 0 {size} {size}" aria-hidden="true">
		<circle class="track" cx={size / 2} cy={size / 2} {r} stroke-width={stroke} />
		<circle class="arc" cx={size / 2} cy={size / 2} {r} stroke-width={stroke} stroke-dasharray={c} stroke-dashoffset={c * (1 - pct / 100)} style="--full:{c}" />
	</svg>
	<span class="inner">
		{#if children}{@render children()}{:else}<strong>{pct}%</strong>{/if}
	</span>
</span>

<style>
	.ring { position: relative; display: inline-grid; place-items: center; width: var(--size); height: var(--size); flex: none; }
	svg { position: absolute; inset: 0; transform: rotate(-90deg); }
	circle { fill: none; }
	.track { stroke: #e7eaf0; }
	.arc { stroke-linecap: round; transition: stroke-dashoffset 0.9s cubic-bezier(0.22, 1, 0.36, 1); animation: draw 1.1s cubic-bezier(0.22, 1, 0.36, 1); }
	.low .arc { stroke: var(--bad); }
	.mid .arc { stroke: var(--warn); }
	.high .arc { stroke: var(--ok); }
	@keyframes draw { from { stroke-dashoffset: var(--full); } }
	@media (prefers-reduced-motion: reduce) { .arc { animation: none; transition: none; } }
	.inner { position: relative; display: grid; place-items: center; width: calc(var(--size) - var(--stroke) * 2 - 4px); height: calc(var(--size) - var(--stroke) * 2 - 4px); border-radius: 50%; }
	.inner strong { font-size: calc(var(--size) * 0.24); line-height: 1; }
	.low .inner strong { color: #b42318; }
	.mid .inner strong { color: var(--warn-ink); }
	.high .inner strong { color: #05603f; }
</style>
