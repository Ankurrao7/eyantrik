<script lang="ts">
	import { page } from '$app/state';
	import ContactButtons from '#lib/components/ContactButtons.svelte';
	import VerificationBadge from '#lib/components/VerificationBadge.svelte';
	import { INDUSTRY_LABEL, MATERIAL_CATEGORY_LABEL, ORDER_TYPE_LABEL, PART_SIZE_LABEL, PROCESS_LABEL, TEAM_SIZE_LABEL, TOLERANCE_LABEL } from '#lib/taxonomy.ts';
	import { SHOP_BY_ID } from '#lib/processes.ts';

	let { data } = $props();
	const s = $derived(data.seller);

	// Context for the WhatsApp message + contact log when the buyer has open requirements.
	let selectedRfq = $state('');
	const rfq = $derived(data.buyerOpenRfqs.find((r) => r.id === selectedRfq));

	const jsonLd = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'LocalBusiness',
			name: s.companyName,
			description: s.about,
			url: page.url.origin + page.url.pathname,
			address: { '@type': 'PostalAddress', addressLocality: s.city, addressRegion: s.state, addressCountry: 'IN' },
			...(s.rating ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: s.rating, reviewCount: s.reviewCount } } : {})
		}).replace(/</g, '\\u003c')
	);
	const processNames = $derived(s.processes.map((p) => PROCESS_LABEL[p] ?? p));
	const mainShop = $derived(s.mainShop ? SHOP_BY_ID.get(s.mainShop) : undefined);
	// "At a glance": the fixed attributes, so buyers can compare suppliers on the same terms.
	const glance = $derived(
		[
			mainShop && { k: 'Main work', v: `${mainShop.emoji} ${mainShop.label}` },
			s.orderTypes?.length && { k: 'Order sizes', v: s.orderTypes.map((o) => (ORDER_TYPE_LABEL[o] ?? o).replace(/\s*\(.*\)$/, '')).join(' · ') },
			s.teamSize && { k: 'Team', v: TEAM_SIZE_LABEL[s.teamSize] },
			s.maxPartSize && { k: 'Largest part', v: PART_SIZE_LABEL[s.maxPartSize] },
			s.bestTolerance && { k: 'Best tolerance', v: TOLERANCE_LABEL[s.bestTolerance] }
		].filter((x): x is { k: string; v: string } => !!x)
	);
</script>

<svelte:head>
	<title>{s.companyName}, {s.city} — {processNames.slice(0, 3).join(', ')} · eYantrik</title>
	<meta name="description" content="{s.companyName} in {s.city}, {s.state}: {processNames.join(', ')}. {s.machines.length} machine types listed. {s.verification === 'GROUND_VERIFIED' ? 'Factory inspected by eYantrik.' : 'Documents verified by eYantrik.'}" />
	<link rel="canonical" href={page.url.origin + page.url.pathname} />
	{@html `<script type="application/ld+json">${jsonLd}</` + `script>`}
</svelte:head>

<main class="container mid">
	<a href="/sellers" class="small">← All suppliers</a>

	{#if data.isOwner && s.verification !== 'DOCS_VERIFIED' && s.verification !== 'GROUND_VERIFIED'}
		<div class="alert warn mt">This is a preview of your profile. It becomes public once your documents are verified.</div>
	{/if}

	<div class="card mt">
		<div class="row between top gap">
			<div>
				<h1 class="mb-0">{s.companyName}</h1>
				<div class="muted">📍 {s.city}, {s.state} {#if s.yearEstablished}· Established {s.yearEstablished}{/if}</div>
			</div>
			<div class="row gap">
				{#if s.isEyantrikPlant}<span class="badge dark">eYantrik plant</span>{/if}
				<VerificationBadge status={s.verification} />
			</div>
		</div>
		{#if s.rating}<p class="mt mb-0">★ <strong>{s.rating}</strong> <span class="muted small">from {s.reviewCount} buyer review{s.reviewCount === 1 ? '' : 's'}</span></p>{/if}
		{#if glance.length}
			<dl class="glance mt">
				{#each glance as g (g.k)}<div><dt>{g.k}</dt><dd>{g.v}</dd></div>{/each}
			</dl>
		{/if}
		<p class="mt">{s.about}</p>
		{#if s.groundInspectedOn}
			<p class="small muted mb-0">✓ Factory visited by the eYantrik team on {new Date(s.groundInspectedOn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Listed machines confirmed on site.</p>
		{/if}
	</div>

	<div class="card">
		<h2>Contact</h2>
		{#if s.contact}
			<p class="mb-0"><strong>{s.contact.person}</strong></p>
			<p class="small muted">{s.contact.address}{#if s.contact.email} · {s.contact.email}{/if}</p>
			{#if data.isOwner}
				<p class="small">📞 +91 {s.contact.phone} · WhatsApp +91 {s.contact.whatsapp}</p>
			{:else}
				{#if data.buyerOpenRfqs.length}
					<div class="field" style="max-width:380px">
						<label for="rfqCtx">Contacting about</label>
						<select id="rfqCtx" bind:value={selectedRfq}>
							<option value="">General enquiry</option>
							{#each data.buyerOpenRfqs as r}<option value={r.id}>{r.id} — {r.title}</option>{/each}
						</select>
					</div>
				{/if}
				<ContactButtons
					phone={s.contact.phone}
					whatsapp={s.contact.whatsapp}
					sellerId={s.id}
					rfqId={rfq?.id}
					message={rfq ? `Hi, I found ${s.companyName} on eYantrik. I need: ${rfq.title} (${rfq.id}).` : `Hi, I found ${s.companyName} on eYantrik.`}
				/>
				<p class="tiny muted mt mb-0">Tell them you found them on eYantrik. Deal didn't work out? Leave feedback from your dashboard.</p>
			{/if}
		{:else}
			<div class="locked">
				<p class="mb-0"><span class="blur">📞 +91 98XXX XXXXX · WhatsApp</span></p>
				<p class="small mt mb-0">
					🔒 {#if data.lockReason === 'login'}Login free and post a requirement to see this supplier's phone & WhatsApp.
					{:else if data.lockReason === 'post-rfq'}Post one requirement to unlock contacts of all suppliers.
					{:else}Supplier contacts are visible to buyer accounts.{/if}
				</p>
				{#if data.lockReason !== 'role'}
					<a class="btn sm mt" href={data.lockReason === 'login' ? '/login/buyer?redirectTo=%2Frfq%2Fnew' : '/rfq/new'}>Post requirement</a>
				{/if}
			</div>
		{/if}
	</div>

	<div class="grid two">
		<div class="card">
			<h2>Processes</h2>
			{#each processNames as p}<span class="chip">{p}</span>{/each}
			<h3 class="mt">Material families</h3>
			{#each s.materials as m}<span class="chip">{MATERIAL_CATEGORY_LABEL[m] ?? m}</span>{/each}
			{#if s.industries.length}
				<h3 class="mt">Industries supplied</h3>
				{#each s.industries as i}<span class="chip">{INDUSTRY_LABEL[i] ?? i}</span>{/each}
			{/if}
			{#if s.certifications.length}
				<h3 class="mt">Certifications</h3>
				{#each s.certifications as c}<span class="chip">{c}</span>{/each}
			{/if}
		</div>
		<div class="card">
			<h2>Machines</h2>
			<div class="table-wrap">
				<table>
					<thead><tr><th>Machine</th><th class="num">Qty</th></tr></thead>
					<tbody>
						{#each s.machines as m}<tr><td>{m.name}</td><td class="num">{m.count}</td></tr>{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>

	{#if data.reviews.length}
		<div class="card">
			<h2>Buyer feedback</h2>
			{#each data.reviews as r}
				<div class="review">
					<strong>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</strong>
					<span class="tiny muted">{r.outcome === 'DEAL_DONE' ? 'Deal done' : 'No deal'} · {new Date(r.at).toLocaleDateString('en-IN')}</span>
					<p class="small mb-0">{r.comment}</p>
				</div>
			{/each}
		</div>
	{/if}

	{#if !data.isOwner && data.lockReason !== 'role'}
		<!-- buyer / visitor offer only: sellers never see buying actions -->
		<div class="card dark row between gap">
			<span>Want eYantrik to manage this order for you?</span>
			<a class="btn ok sm" href="/help">Need assistance</a>
		</div>
	{/if}
</main>

<style>
	.review { border-top: 1px solid var(--line); padding: 10px 0; }
	.glance { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; margin-bottom: 0; }
	.glance div { background: #f6f7fb; border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; }
	.glance dt { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); }
	.glance dd { margin: 2px 0 0; font-size: 0.9rem; font-weight: 600; }
	.review:first-of-type { border-top: none; }
</style>
