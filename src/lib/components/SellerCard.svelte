<script lang="ts">
	import type { PublicSeller } from '../types.ts';
	import { PROCESS_LABEL, TEAM_SIZE_LABEL } from '../taxonomy.ts';
	import { SHOP_BY_ID } from '../processes.ts';
	import VerificationBadge from './VerificationBadge.svelte';

	let {
		seller,
		highlight = [],
		lockReason = 'login'
	}: {
		seller: PublicSeller;
		highlight?: string[];
		lockReason?: 'login' | 'buyer' | 'role';
	} = $props();

	const machineCount = $derived(seller.machines.reduce((n, m) => n + m.count, 0));
	const mainShop = $derived(seller.mainShop ? SHOP_BY_ID.get(seller.mainShop) : undefined);
</script>

<article class="card seller">
	<div class="row between top gap">
		<div>
			<h3 class="mb-0"><a href="/sellers/{seller.slug}">{seller.companyName}</a></h3>
			<div class="small muted">
				📍 {seller.city}, {seller.state}
				{#if seller.yearEstablished}· Since {seller.yearEstablished}{/if}
				{#if seller.rating}· ★ {seller.rating} ({seller.reviewCount}){/if}
			</div>
		</div>
		<div class="row gap">
			{#if seller.isEyantrikPlant}<span class="badge dark">eYantrik plant</span>{/if}
			<VerificationBadge status={seller.verification} />
		</div>
	</div>

	{#if mainShop}
		<div class="small mt main-work"><span aria-hidden="true">{mainShop.emoji}</span> <strong>{mainShop.label}</strong>{#if seller.teamSize} <span class="muted">· {TEAM_SIZE_LABEL[seller.teamSize]}</span>{/if}</div>
	{/if}
	<div class="mt small">
		{#each seller.processes as p}
			<span class="chip" class:hit={highlight.includes(p)}>{PROCESS_LABEL[p] ?? p}</span>
		{/each}
	</div>

	<div class="small muted">
		<strong>{machineCount} machines:</strong>
		{seller.machines.map((m) => `${m.count}× ${m.name}`).join(' · ')}
	</div>

	<div class="mt">
		<!-- Contacts are never listed: they are shared when a buyer shortlists this supplier's quote (2026-10-13). -->
		{#if lockReason !== 'role'}
			<div class="locked row between gap small">
				<span>🔒 Phone & WhatsApp are shared when you shortlist their quote</span>
				{#if lockReason === 'buyer'}
					<a class="btn sm" href="/sellers/{seller.slug}#ask">Ask for a quote</a>
				{:else}
					<a class="btn sm" href="/login/buyer?redirectTo=%2Frfq%2Fnew">Get quotes free</a>
				{/if}
			</div>
		{/if}
	</div>
</article>

<style>
	.seller h3 a { color: var(--ink); text-decoration: none; }
	.seller h3 a:hover { text-decoration: underline; }
</style>
