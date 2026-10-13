<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import ContactButtons from '#lib/components/ContactButtons.svelte';
	import VerificationBadge from '#lib/components/VerificationBadge.svelte';
	import { PIN_ZONE_LABEL } from '#lib/geo.ts';
	import { inr, QUOTE_STATUS_CLASS, QUOTE_STATUS_LABEL } from '#lib/quote.ts';
	import { formatRfqValue, RFQ_FIELDS } from '#lib/rfqFields.ts';
	import { PROCESS_LABEL } from '#lib/taxonomy.ts';

	let { data, form } = $props();

	const r = $derived(data.rfq);
	const title = $derived(String(r.values.partName ?? r.id));
	const wanted = $derived(data.wanted);
	const fbErrors = $derived((form && 'errors' in form ? form.errors : {}) as Record<string, string>);

	const liveQuotes = $derived(data.quotes.filter((q) => q.live));
	const best = $derived({
		price: Math.min(...liveQuotes.map((q) => q.landed.perPiece)),
		lead: Math.min(...liveQuotes.map((q) => q.bulkDays)),
		km: Math.min(...liveQuotes.map((q) => q.distanceKm ?? Infinity))
	});
	const closes = $derived.by(() => {
		const h = Math.round((Date.parse(r.quoteDeadline) - Date.now()) / 3_600_000);
		return h <= 0 ? 'Quotation window closed' : h < 48 ? `Quotes close in ${h} h` : `Quotes close in ${Math.round(h / 24)} days`;
	});
	const sorts = [
		{ id: 'price', label: 'Lowest price' },
		{ id: 'distance', label: 'Nearest' },
		{ id: 'lead', label: 'Fastest' },
		{ id: 'rating', label: 'Best rated' }
	];

	let rating = $state(0);
	let busy = $state(false);
	const submitting = () => {
		busy = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			busy = false;
			rating = 0;
		};
	};
</script>

<svelte:head><title>{title} ({r.id}) · eYantrik</title></svelte:head>

<main class="container">
	<a href="/buyer/dashboard" class="small">← My dashboard</a>

	{#if data.justPosted}
		<div class="alert ok mt">
			<strong>🎉 Requirement posted!</strong>
			{data.invited.length
				? `We invited the ${data.invited.length} best-matched verified supplier${data.invited.length === 1 ? '' : 's'} to quote — not everyone, so no flood of calls. Their quotations will appear here and you'll get a notification for each one. Questions? Message them below.`
				: 'No verified supplier matches it yet. Our help desk can find one for you.'}
		</div>
	{/if}
	{#if page.url.searchParams.get('edited') === '1'}
		<div class="alert ok mt"><strong>Requirement updated & re-posted.</strong> {page.url.searchParams.get('notified') ?? 0} invited supplier(s) told. Earlier quotes are marked "needs re-quote" — fresh quotes will appear here.</div>
	{/if}
	{#if form && 'error' in form && form.error}<div class="alert bad mt">{form.error}</div>{/if}
	{#if form && 'ok' in form && form.ok && form.action === 'feedback'}<div class="alert ok mt">Thanks for the feedback — it helps other buyers choose. {form.closed ? 'Requirement closed.' : ''}</div>{/if}
	{#if form && 'ok' in form && form.ok && form.action === 'reopen'}<div class="alert ok mt">Requirement reopened with a fresh 7-day quotation window{form.invitedMore ? ` — ${form.invitedMore} more supplier(s) invited` : ''}.</div>{/if}
	{#if form && 'ok' in form && form.ok && form.action === 'inviteMore'}<div class="alert ok mt">{form.invitedMore} more supplier(s) invited to quote.</div>{/if}
	{#if form && 'ok' in form && form.ok && form.action === 'shortlist'}<div class="alert ok mt">Shortlisted — the supplier has been told, and their phone & WhatsApp are now shared with you (and yours with them).</div>{/if}

	<div class="row between top gap mt">
		<div>
			<span class="badge dark">{r.id}</span>
			{#if r.status === 'OPEN'}<span class="badge docs">Open</span>{:else if r.outcome === 'DEAL_DONE'}<span class="badge ground">Deal done</span>{:else}<span class="badge neutral">Closed</span>{/if}
			{#if r.reopenCount}<span class="badge neutral">Reopened ×{r.reopenCount}</span>{/if}
			<h1 class="mt">{title}</h1>
			<p class="small muted mb-0">{r.status === 'OPEN' ? closes : r.awardedQuoteId ? 'Order awarded' : 'Closed'} · {data.interestedTotal} supplier{data.interestedTotal === 1 ? '' : 's'} interested · {liveQuotes.length} active quote{liveQuotes.length === 1 ? '' : 's'}{#if data.passed} · {data.passed} passed{/if}</p>
		</div>
		<div class="row gap">
			{#if data.openTicket}
				<span class="badge pending">Help desk: {data.openTicket.id}</span>
			{:else}
				<a class="btn dark" href="/help?rfq={r.id}">🤝 Need assistance</a>
			{/if}
			{#if !r.awardedQuoteId}<a class="btn ghost" href="/buyer/rfq/{r.id}/edit">✏️ Edit & re-post</a>{/if}
			{#if r.status === 'OPEN'}
				<form method="POST" action="?/close" use:enhance><button class="btn ghost">Close requirement</button></form>
			{:else}
				<form method="POST" action="?/reopen" use:enhance><button class="btn">Reopen & try other suppliers</button></form>
			{/if}
		</div>
	</div>

	<details class="card flat mt">
		<summary class="bold">Requirement details</summary>
		{#if r.values.ndaRequired === 'yes'}<p class="small mt mb-0">🔒 NDA required — drawings are visible only to suppliers who accept it ({data.ndaAcceptedCount} so far).</p>{/if}
		<dl class="details mt">
			{#each RFQ_FIELDS as f (f.name)}
				<dt>{f.label}</dt><dd>{formatRfqValue(f, r.values, r.files)}</dd>
			{/each}
		</dl>
	</details>

	<section class="mt-lg">
		<div class="row between gap">
			<h2 class="mb-0">Quotations ({data.quotes.length})</h2>
			{#if data.quotes.length > 1}
				<nav class="row gap small" aria-label="Sort quotations">
					<span class="muted">Sort:</span>
					{#each sorts as so}<a href="?sort={so.id}" class="sort" class:active={data.sort === so.id} data-sveltekit-noscroll>{so.label}</a>{/each}
				</nav>
			{/if}
		</div>
		<p class="small muted">Prices are <strong>landed per piece</strong>: unit price + tooling, setup and freight spread over the quantity, before GST, so you compare like with like.</p>

		{#if data.quotes.length === 0}
			<div class="card center">
				<p class="muted mb-0">{data.interestedTotal ? `${data.interestedTotal} supplier(s) are interested and preparing quotes.` : 'No quotations yet. The invited suppliers have been notified.'} {r.status === 'OPEN' ? closes + '.' : ''}</p>
			</div>
		{:else}
			<div class="table-wrap">
				<table class="quotes">
					<thead>
						<tr><th>Supplier</th><th class="num">Landed / pc</th><th class="num">Total incl. GST</th><th class="num">Tooling</th><th class="num">Lead time</th><th>Payment</th><th class="num">Distance</th><th>Status</th><th></th></tr>
					</thead>
					<tbody>
						{#each data.quotes as q (q.id)}
							<tr class:dead={!q.live} class:won={q.status === 'ACCEPTED'}>
								<td>
									<a href="/buyer/rfq/{r.id}/quotes/{q.id}"><strong>{q.seller.companyName}</strong></a>
									<div class="tiny muted">{q.seller.city} · {q.seller.rating ? `★ ${q.seller.rating}` : 'no reviews'} · {q.wanted ? `covers ${q.covers}/${q.wanted} itself` : q.covers ? 'does this work itself' : 'not in their listed work'}</div>
									<div class="mt-xs"><VerificationBadge status={q.seller.verification} /></div>
								</td>
								<td class="num"><strong class:best={q.live && q.landed.perPiece === best.price}>{inr(q.landed.perPiece)}</strong><div class="tiny muted">unit {inr(q.unitPrice)} · v{q.version}</div></td>
								<td class="num">{inr(q.landed.totalInclGst)}</td>
								<td class="num">{q.toolingCost ? inr(q.toolingCost) : '—'}{#if q.toolingCost}<div class="tiny {q.toolOwnedByBuyer ? '' : 'muted'}">{q.toolOwnedByBuyer ? 'you own it' : 'supplier owns'}</div>{/if}</td>
								<td class="num"><span class:best={q.live && q.bulkDays === best.lead}>{q.bulkDays} days</span><div class="tiny muted">sample {q.sampleDays} d</div></td>
								<td class="small">{q.paymentTerms}</td>
								<td class="num small"><span class:best={q.live && q.distanceKm === best.km}>{q.distanceKm === null ? '—' : `~${q.distanceKm} km`}</span><div class="tiny muted">{q.freight === 'EX_WORKS' ? 'ex-works' : 'delivered'}</div></td>
								<td>
									<span class="badge {QUOTE_STATUS_CLASS[q.status]}">{QUOTE_STATUS_LABEL[q.status]}</span>
									{#if q.counterPending}<div class="tiny muted">awaiting supplier</div>{/if}
								</td>
								<td class="num">
									<a class="btn sm" href="/buyer/rfq/{r.id}/quotes/{q.id}">{q.status === 'ACCEPTED' ? 'View' : 'Review & negotiate'}</a>
									{#if q.status === 'SUBMITTED' && r.status === 'OPEN'}
										<form method="POST" action="?/shortlist" use:enhance class="mt-xs"><input type="hidden" name="quoteId" value={q.id} /><button class="linkish tiny">⭐ Shortlist</button></form>
									{/if}
								</td>
							</tr>
							{#if q.live && q.insights.length}
								<tr class="insights-row">
									<td colspan="9">
										<details>
											<summary class="small">💡 Things to consider ({q.insights.length})</summary>
											<ul class="insights">
												{#each q.insights as i}<li class={i.tone}>{i.text}</li>{/each}
											</ul>
										</details>
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
		{#if data.interested.length}
			<p class="small muted mt">👋 Interested, quote coming: {data.interested.join(', ')}</p>
		{/if}
	</section>

	<section class="mt-lg">
		<div class="row between gap">
			<h2 class="mb-0">Invited suppliers ({data.invited.length})</h2>
			{#if data.moreAvailable && r.status === 'OPEN'}
				<form method="POST" action="?/inviteMore" use:enhance>
					<button class="btn ghost sm">+ Invite {Math.min(data.moreBatch, data.moreAvailable)} more ({data.moreAvailable} available)</button>
				</form>
			{/if}
		</div>
		<p class="small muted">The best-matched verified suppliers — nearest first, then fit and track record. If few quotes come in after 2 days, we invite more automatically. Phone & WhatsApp are shared when you shortlist a quote; until then, message them here.</p>

		{#if data.invited.length === 0}
			<div class="card center">
				<h3>No verified supplier covers this yet</h3>
				<p class="muted">Let the eYantrik team source it — we can make it in our plant or find a partner.</p>
				<a class="btn" href="/help?rfq={r.id}">Get help from eYantrik</a>
			</div>
		{:else}
			<div class="table-wrap">
				<table>
					<thead>
						<tr><th>Supplier</th><th>Covers</th><th class="num">Distance</th><th>Location</th><th>Status</th><th>Talk</th></tr>
					</thead>
					<tbody>
						{#each data.invited as m (m.seller.id)}
							<tr class:dead={m.state === 'PASSED'}>
								<td>
									<a href="/sellers/{m.seller.slug}"><strong>{m.seller.companyName}</strong></a>
									<div class="mt-xs"><VerificationBadge status={m.seller.verification} /></div>
									<div class="tiny muted">{m.seller.rating ? `★ ${m.seller.rating}` : 'no reviews yet'}{#if m.reason === 'PICKED'} · you asked them{/if}</div>
								</td>
								<td>
									{#if wanted.length}
										<strong>{m.covers.length}/{wanted.length}</strong>
										<div>{#each wanted as p}<span class="chip" class:hit={m.covers.includes(p)}>{PROCESS_LABEL[p] ?? p}</span>{/each}</div>
									{:else}
										<!-- buyer chose only a type of work: show what this supplier does in it -->
										<div>{#each m.covers.slice(0, 4) as p}<span class="chip hit">{PROCESS_LABEL[p] ?? p}</span>{/each}{#if m.covers.length > 4}<span class="chip">+{m.covers.length - 4} more</span>{/if}</div>
									{/if}
								</td>
								<td class="num small">{m.distanceKm === null ? '—' : `~${m.distanceKm} km`}<div class="tiny muted">{PIN_ZONE_LABEL[m.zone]}</div></td>
								<td class="small">{m.seller.city}, {m.seller.state}{#if m.materialMatch}<div class="tiny" style="color:var(--ok)">✓ Works with this material</div>{/if}</td>
								<td class="small">
									{#if m.state === 'QUOTED'}<span style="color:var(--ok)">💰 Quoted</span>
									{:else if m.state === 'INTERESTED'}👋 Interested
									{:else if m.state === 'PASSED'}<span class="muted">Passed</span>
									{:else}<span class="muted">Invited</span>{/if}
								</td>
								<td style="min-width:200px">
									{#if m.state !== 'PASSED' || m.messages}
										<a class="btn sm ghost" href="/buyer/rfq/{r.id}/suppliers/{m.seller.id}">💬 {m.messages ? `Messages (${m.messages})` : 'Message'}</a>
									{/if}
									{#if m.seller.contact}
										<div class="tiny bold mt-xs">{m.seller.contact.person}</div>
										<ContactButtons size="sm" phone={m.seller.contact.phone} whatsapp={m.seller.contact.whatsapp} sellerId={m.seller.id} rfqId={r.id} message={`Hi, about my requirement ${title} (${r.id}) on eYantrik.`} />
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if wanted.length > 1 && !data.invited.some((m) => m.covers.length === wanted.length)}
				<div class="alert warn mt"><strong>No single supplier covers all {wanted.length} processes.</strong> You can coordinate several suppliers yourself, or let eYantrik manage the whole chain. <a href="/help?rfq={r.id}">Get help →</a></div>
			{/if}
		{/if}
	</section>

	<div class="grid two mt-lg">
		<section class="card">
			<h3>How did it go?</h3>
			<p class="small muted">Rate a supplier you spoke to. Your feedback ranks suppliers for other buyers.</p>
			<form method="POST" action="?/feedback" use:enhance={submitting}>
				<div class="field" class:invalid={fbErrors.sellerId}>
					<label for="sellerId">Supplier</label>
					<select id="sellerId" name="sellerId" required>
						<option value="">Select…</option>
						{#each data.invited as m}<option value={m.seller.id}>{m.seller.companyName}{m.state === 'QUOTED' ? ' (quoted)' : ''}</option>{/each}
					</select>
					{#if fbErrors.sellerId}<span class="err">{fbErrors.sellerId}</span>{/if}
				</div>
				<div class="field" class:invalid={fbErrors.outcome}>
					<span class="label">Outcome</span>
					<label class="row gap small"><input type="radio" name="outcome" value="DEAL_DONE" /> Deal done with this supplier</label>
					<label class="row gap small"><input type="radio" name="outcome" value="NO_DEAL" /> Didn't work out</label>
					{#if fbErrors.outcome}<span class="err">{fbErrors.outcome}</span>{/if}
				</div>
				<div class="field" class:invalid={fbErrors.rating}>
					<span class="label" id="rating-label">Rating</span>
					<div class="stars" role="radiogroup" aria-labelledby="rating-label">
						{#each [1, 2, 3, 4, 5] as n}
							<label class:on={n <= rating}><input type="radio" name="rating" value={n} bind:group={rating} />★</label>
						{/each}
					</div>
					{#if fbErrors.rating}<span class="err">{fbErrors.rating}</span>{/if}
				</div>
				<div class="field">
					<label for="comment">Comment (shown on supplier profile)</label>
					<textarea id="comment" name="comment" maxlength="1000" placeholder="Quality, communication, delivery time…"></textarea>
				</div>
				{#if r.status === 'OPEN'}<label class="row gap small mb"><input type="checkbox" name="close" /> Also close this requirement</label>{/if}
				<button class="btn" disabled={busy || data.invited.length === 0}>{busy ? 'Saving…' : 'Submit feedback'}</button>
			</form>
		</section>

		<section class="card">
			<h3>Your feedback on this requirement</h3>
			{#if data.feedback.length === 0}
				<p class="small muted mb-0">None yet.</p>
			{:else}
				{#each data.feedback as f (f.id)}
					<div class="fb">
						<strong>{f.sellerName}</strong> · {'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}
						<span class="badge {f.outcome === 'DEAL_DONE' ? 'ground' : 'neutral'}">{f.outcome === 'DEAL_DONE' ? 'Deal done' : 'No deal'}</span>
						{#if f.comment}<p class="small mb-0">{f.comment}</p>{/if}
					</div>
				{/each}
			{/if}
			{#if r.status === 'CLOSED'}
				<p class="small mt mb-0">Not happy with the result? <strong>Reopen</strong> to invite other suppliers, or <a href="/help?rfq={r.id}">ask eYantrik to step in</a>.</p>
			{/if}
		</section>
	</div>
</main>

<style>
	.details { display: grid; grid-template-columns: 200px 1fr; gap: 6px 16px; margin: 0; font-size: 0.9rem; }
	.details dt { color: var(--muted); }
	.details dd { margin: 0; }
	@media (max-width: 600px) { .details { grid-template-columns: 1fr; } .details dd { margin-bottom: 8px; } }
	.mt-xs { margin-top: 4px; }
	.sort { text-decoration: none; padding: 4px 8px; border-radius: 6px; color: var(--ink-2); border: 1px solid var(--line); background: #fff; }
	.sort.active { background: var(--ink); color: #fff; border-color: var(--ink); }
	.quotes .best { color: var(--ok-ink); background: #dcfce7; padding: 1px 6px; border-radius: 4px; }
	tr.dead td { opacity: 0.55; }
	.quotes tr.won td { background: #f0fdf4; }
	.quotes tr:has(+ .insights-row) td { border-bottom: none; }
	.insights-row td { padding-top: 0; }
	.insights { margin: 6px 0 0; padding-left: 0; list-style: none; display: grid; gap: 4px; }
	.insights li { font-size: 0.83rem; padding: 4px 8px; border-radius: 6px; }
	.insights li.good { background: var(--ok-soft); color: var(--ok-ink); }
	.insights li.good::before { content: '✓ '; }
	.insights li.warn { background: var(--warn-soft); color: var(--warn-ink); }
	.insights li.warn::before { content: '⚠ '; }
	.insights li.info { background: #f1f5f9; color: var(--ink-2); }
	.insights li.info::before { content: 'ℹ '; }
	.stars { display: flex; gap: 4px; font-size: 1.6rem; }
	.stars label { cursor: pointer; color: #cbd5e1; }
	.stars label.on { color: #f59e0b; }
	.stars input { position: absolute; opacity: 0; width: 1px; height: 1px; }
	.fb { border-top: 1px solid var(--line); padding: 8px 0; }
	.fb:first-of-type { border-top: none; }
</style>
