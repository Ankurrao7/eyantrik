<script lang="ts">
	import type { PublicSeller } from '../types.ts';
	import { PROCESS_LABEL } from '../taxonomy.ts';
	import VerificationBadge from './VerificationBadge.svelte';
	import ContactButtons from './ContactButtons.svelte';

	let {
		seller,
		highlight = [],
		rfqId,
		rfqTitle,
		lockReason = 'login'
	}: {
		seller: PublicSeller;
		highlight?: string[];
		rfqId?: string;
		rfqTitle?: string;
		lockReason?: 'login' | 'post-rfq' | 'role';
	} = $props();

	const machineCount = $derived(seller.machines.reduce((n, m) => n + m.count, 0));
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
		{#if seller.contact}
			<div class="small mb-0"><strong>{seller.contact.person}</strong></div>
			<ContactButtons
				size="sm"
				phone={seller.contact.phone}
				whatsapp={seller.contact.whatsapp}
				sellerId={seller.id}
				{rfqId}
				message={rfqTitle ? `Hi, I found ${seller.companyName} on eYantrik. I need: ${rfqTitle} (${rfqId}).` : `Hi, I found ${seller.companyName} on eYantrik.`}
			/>
		{:else}
			<div class="locked row between gap small">
				<span><span class="blur">📞 +91 98XXX XXXXX</span> &nbsp;🔒
					{#if lockReason === 'post-rfq'}Post a requirement to unlock contacts
					{:else if lockReason === 'role'}Contacts are visible to buyers
					{:else}Login & post a requirement to see contacts{/if}
				</span>
				{#if lockReason === 'post-rfq'}
					<a class="btn sm" href="/rfq/new">Post requirement</a>
				{:else if lockReason === 'login'}
					<a class="btn sm" href="/login/buyer?redirectTo=%2Frfq%2Fnew">Login free</a>
				{/if}
			</div>
		{/if}
	</div>
</article>

<style>
	.seller h3 a { color: var(--ink); text-decoration: none; }
	.seller h3 a:hover { text-decoration: underline; }
</style>
