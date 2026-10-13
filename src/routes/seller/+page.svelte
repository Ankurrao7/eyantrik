<!-- src/routes/seller/+page.svelte — Seller Dashboard / Lead Feed -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import LatestUpdates from '#lib/components/LatestUpdates.svelte';
	import VerificationBadge from '#lib/components/VerificationBadge.svelte';
	import ProfileRing from '#lib/components/ProfileRing.svelte';
	import { PIN_ZONES, PIN_ZONE_LABEL } from '#lib/geo.ts';
	import { inr, QUOTE_STATUS_CLASS, QUOTE_STATUS_LABEL } from '#lib/quote.ts';
	import { BUDGET_LABEL, PROCESS_LABEL, TIMELINE_LABEL } from '#lib/taxonomy.ts';

	let { data, form } = $props();
	const s = $derived(data.seller);

	const tabs = [
		{ id: 'matched', label: 'Matched for you' },
		{ id: 'all', label: 'All open RFQs' },
		{ id: 'interested', label: 'Interested' },
		{ id: 'quoted', label: 'Quoted' },
		{ id: 'negotiating', label: 'Negotiating' },
		{ id: 'won', label: 'Won' },
		{ id: 'lost', label: 'Lost' }
	] as const;

	const steps = $derived([
		{ label: 'Registered', done: true },
		{ label: 'Documents submitted', done: true },
		{ label: 'Documents verified', done: s.verification === 'DOCS_VERIFIED' || s.verification === 'GROUND_VERIFIED' },
		{ label: 'Ground verified', done: s.verification === 'GROUND_VERIFIED' }
	]);

	function closesIn(iso: string) {
		const h = Math.round((Date.parse(iso) - Date.now()) / 3_600_000);
		if (h <= 0) return 'Quotes closed';
		return h < 48 ? `Closes in ${h} h` : `Closes in ${Math.round(h / 24)} days`;
	}
	const tabHref = (t: string) => `?tab=${t}${data.maxZone < 4 ? `&zone=${data.maxZone}` : ''}`;
	let passing = $state<string | null>(null);
</script>

<svelte:head><title>Seller dashboard · eYantrik</title></svelte:head>

<main class="container">
	<div class="row between gap">
		<div>
			<h1 class="mb-0">{s.companyName}</h1>
			<div class="row gap mt"><VerificationBadge status={s.verification} />{#if s.rating}<span class="small">★ {s.rating} ({s.reviewCount})</span>{/if}</div>
		</div>
		<div class="row gap">
			<a class="btn ghost" href="/seller/profile">✏️ My profile</a>
			<a class="btn ghost" href="/seller/settings">⚙️ Quote defaults</a>
			<a class="btn ghost" href="/sellers/{s.slug}">Public profile</a>
			<a class="btn dark" href="/help">🤝 Help desk</a>
		</div>
	</div>

	{#if data.submitted}<div class="alert ok mt"><strong>Submitted for verification ✓</strong> We'll check your documents in 1–2 working days, then schedule a factory visit.</div>{/if}
	{#if s.verification === 'REJECTED'}<div class="alert bad mt"><strong>Verification not approved.</strong> {s.rejectionReason} <a href="/seller/onboarding">Correct & resubmit →</a></div>{/if}
	{#if form && 'error' in form && form.error}<div class="alert bad mt" role="alert">{form.error}</div>{/if}
	{#if form && 'interestedIn' in form}<div class="alert ok mt">Marked interested in {form.interestedIn} — the buyer has been notified. {#if data.verified}Send your quotation from the Interested tab.{/if}</div>{/if}
	{#if form && 'hidden' in form}<div class="alert info mt">Got it — {form.hidden} is hidden. Thanks for telling us why; it improves your future leads.</div>{/if}

	{#if data.profile.percent < 100}
		<a class="card profile-nudge mt" href="/seller/profile">
			<ProfileRing percent={data.profile.percent} size={64} stroke={6} />
			<div class="pn-main">
				<strong>Your profile is {data.profile.percent}% complete — complete it to meet more leads</strong>
				<span class="small muted">Complete profiles rank higher when buyers' requirements are matched. Next: {data.profile.missing.map((m) => m.label.toLowerCase()).join(' · ')}{data.profile.missingCount > 3 ? ` +${data.profile.missingCount - 3} more` : ''}.</span>
			</div>
			<span class="btn ok sm">Complete profile →</span>
		</a>
	{/if}

	<div class="grid four mt">
		<div class="stat"><div class="v">{data.counts.matched}</div><div class="k">New matched leads</div></div>
		<div class="stat"><div class="v">{data.stats.quotesSent}</div><div class="k">Quotations sent</div></div>
		<div class="stat"><div class="v">{data.stats.won}</div><div class="k">Orders won</div></div>
		<div class="stat"><div class="v">{data.stats.winRate === null ? '—' : data.stats.winRate + '%'}</div><div class="k">Win rate</div></div>
	</div>

	<div class="mt"><LatestUpdates items={data.updates} /></div>

	{#if s.verification !== 'GROUND_VERIFIED'}
		<section class="card mt">
			<h3>Verification progress</h3>
			<ol class="progress">
				{#each steps as st}<li class:done={st.done}><span class="dot">{st.done ? '✓' : ''}</span>{st.label}</li>{/each}
			</ol>
			{#if !data.verified}
				<p class="small muted mb-0">You can browse leads and mark <strong>Interested</strong> now. Sending quotations and seeing buyer contacts unlock once your documents are verified.</p>
			{:else}
				<p class="small muted mb-0">You're live. Ground verification by our team will rank you higher.</p>
			{/if}
		</section>
	{/if}

	<nav class="tabs mt-lg" aria-label="Lead filters">
		{#each tabs as t}
			<a href={tabHref(t.id)} class:active={data.tab === t.id} data-sveltekit-noscroll>{t.label} <span class="badge neutral">{data.counts[t.id]}</span></a>
		{/each}
	</nav>

	<form method="GET" class="row gap mb small">
		<input type="hidden" name="tab" value={data.tab} />
		<label for="zone" class="bold">Show leads within</label>
		<select id="zone" name="zone" value={String(data.maxZone)} onchange={(e) => e.currentTarget.form?.requestSubmit()} style="width:auto">
			{#each PIN_ZONES as z}<option value={String(z.zone)}>{z.zone === 4 ? 'All of India' : z.label}</option>{/each}
		</select>
		<noscript><button class="btn sm">Apply</button></noscript>
		<span class="muted">Sorted nearest first from your pincode {s.pincode}.</span>
	</form>

	{#if data.list.length === 0}
		<div class="card center muted">
			{#if data.tab === 'matched'}No new matching requirements right now — we'll notify you the moment one is posted. Check <a href={tabHref('all')}>All open RFQs</a> too.
			{:else}Nothing here yet.{/if}
		</div>
	{:else}
		<div class="stack">
			{#each data.list as l (l.id)}
				<article class="card lead">
					<div class="row between top gap">
						<div>
							<span class="badge dark">{l.id}</span>
							<span class="tiny muted">{closesIn(l.deadline)}</span>
							<h3 class="mt"><a href="/seller/rfq/{l.id}">{l.title}</a></h3>
						</div>
						<div class="row gap">
							{#if l.myQuote}<span class="badge {QUOTE_STATUS_CLASS[l.myQuote.status]}">{QUOTE_STATUS_LABEL[l.myQuote.status]}</span>{/if}
							<span class="badge neutral">{l.quoteCount === 0 ? 'No quotes yet — be first' : `${l.quoteCount} quote${l.quoteCount === 1 ? '' : 's'} so far`}</span>
						</div>
					</div>

					<div class="facts small">
						<span>📦 <strong>{l.quantity} pcs</strong></span>
						<span>📍 {l.values.deliveryCity} {l.values.deliveryPincode}{#if l.distanceKm !== null} · ~{l.distanceKm} km{/if} · <em>{PIN_ZONE_LABEL[l.zone]}</em></span>
						<span>💰 {BUDGET_LABEL[String(l.values.budgetRange)] ?? '—'}</span>
						<span>⏱ {TIMELINE_LABEL[String(l.values.deliveryTimeline)] ?? '—'}</span>
					</div>
					<div class="mt">
						{#if l.anyOf}<span class="chip">Any · {l.anyOf}</span>{/if}{#each l.wanted as p}<span class="chip" class:hit={l.covers.includes(p)}>{l.covers.includes(p) ? '✓' : '✗'} {PROCESS_LABEL[p] ?? p}</span>{/each}
					</div>
					{#if !l.isMatch}<p class="tiny muted mb-0">Outside your listed processes — you can still quote; the buyer will see it flagged.</p>{/if}

					<div class="row gap mt">
						{#if l.myQuote}
							{#if l.myQuote.status === 'OUTDATED'}
								<span class="badge pending">🔄 Buyer updated the requirement</span>
								<a class="btn ok sm" href="/seller/rfq/{l.id}#quote">Review changes & re-quote →</a>
							{:else}
								<span class="small">Your quote v{l.myQuote.version}: <strong>{inr(l.myQuote.perPiece)}/pc</strong> landed</span>
								{#if l.myQuote.counterPending}<span class="badge pending">Buyer sent a counter-offer</span>{/if}
								<a class="btn sm" href="/seller/rfq/{l.id}">{l.myQuote.counterPending ? 'Respond to offer →' : 'View / revise →'}</a>
							{/if}
						{:else if l.quotingOpen}
							{#if !l.interested}
								<form method="POST" action="?/interested" use:enhance><input type="hidden" name="rfqId" value={l.id} /><button class="btn ghost sm">👋 I'm interested</button></form>
							{:else}
								<span class="badge ground">✓ Interested</span>
							{/if}
							{#if data.verified}
								<a class="btn ok sm" href="/seller/rfq/{l.id}#quote">Submit quotation →</a>
							{:else}
								<a class="btn ghost sm" href="/seller/rfq/{l.id}">View details</a>
							{/if}
							<button class="linkish small" onclick={() => (passing = passing === l.id ? null : l.id)}>Not for us</button>
						{/if}
					</div>

					{#if passing === l.id}
						<form method="POST" action="?/notForUs" use:enhance class="row gap mt pass">
							<input type="hidden" name="rfqId" value={l.id} />
							<select name="reason" required aria-label="Reason" style="width:auto">
								<option value="">Why not?</option>
								{#each data.reasons as r}<option>{r}</option>{/each}
							</select>
							<button class="btn ghost sm">Hide this lead</button>
						</form>
					{/if}
				</article>
			{/each}
		</div>
	{/if}
</main>

<style>
	.lead h3 a { color: var(--ink); text-decoration: none; }
	.lead h3 a:hover { text-decoration: underline; }
	.facts { display: flex; flex-wrap: wrap; gap: 6px 18px; color: var(--ink-2); }
	.progress { list-style: none; padding: 0; margin: 8px 0 12px; display: flex; flex-wrap: wrap; gap: 8px 24px; }
	.progress li { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 0.9rem; }
	.progress li.done { color: var(--ok-ink); font-weight: 700; }
	.dot { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--line-2); display: grid; place-items: center; font-size: 0.75rem; }
	.done .dot { background: var(--ok); border-color: var(--ok); color: #fff; }
	.pass { background: #f8fafc; border: 1px solid var(--line); border-radius: 8px; padding: 8px; }
	.profile-nudge { display: flex; gap: 16px; align-items: center; text-decoration: none; color: inherit; border-left: 4px solid var(--ok); }
	.profile-nudge:hover { border-color: var(--ok); box-shadow: var(--shadow); }
	.pn-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
	@media (max-width: 640px) { .profile-nudge { flex-wrap: wrap; } }
</style>
