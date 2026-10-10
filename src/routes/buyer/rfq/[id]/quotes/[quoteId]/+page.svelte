<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import ContactButtons from '#lib/components/ContactButtons.svelte';
	import VerificationBadge from '#lib/components/VerificationBadge.svelte';
	import { PIN_ZONE_LABEL } from '#lib/geo.ts';
	import { INCLUSION_LABEL, inr, PAYMENT_TERMS, QUOTE_INCLUSIONS, QUOTE_STATUS_CLASS, QUOTE_STATUS_LABEL } from '#lib/quote.ts';
	import { PROCESS_LABEL } from '#lib/taxonomy.ts';

	let { data, form } = $props();
	const q = $derived(data.quote);
	const v = $derived(q.versions[q.versions.length - 1]);
	const prev = $derived(q.versions.length > 1 ? q.versions[q.versions.length - 2] : null);
	const s = $derived(data.seller);
	const cErr = $derived((form && 'counterErrors' in form ? form.counterErrors : {}) as Record<string, string>);

	let confirmAward = $state(false);
	let showDecline = $state(false);
	let busy = $state(false);
	const submit = () => {
		busy = true;
		return async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			busy = false;
		};
	};
	const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
	const eventText: Record<string, string> = {
		QUOTE: 'Supplier sent quotation', REVISION: 'Supplier sent a revision', COUNTER: 'You sent a counter-offer', SHORTLIST: 'You shortlisted this quote',
		ACCEPT_COUNTER: 'Supplier accepted your counter-offer', DECLINE_COUNTER: 'Supplier declined your counter-offer', AWARD: 'You awarded the order 🏆',
		DECLINE: 'You declined this quote', WITHDRAW: 'Supplier withdrew the quote', RFQ_EDITED: 'You edited the requirement — supplier asked to re-quote'
	};
	const delta = (a: number, b: number | undefined) => (b === undefined || a === b ? '' : a < b ? `▼ ${inr(b - a)}` : `▲ ${inr(a - b)}`);
</script>

<svelte:head><title>Quote from {s.companyName} · {data.rfq.title} · eYantrik</title></svelte:head>

<main class="container">
	<a href="/buyer/rfq/{data.rfq.id}" class="small">← All quotations for {data.rfq.title}</a>

	{#if page.url.searchParams.get('awarded') === '1'}
		<div class="alert ok mt"><strong>🏆 Order awarded to {s.companyName}!</strong> They've been notified, and other suppliers were told politely. Next: call them to confirm the purchase order. Don't forget to rate them after delivery.</div>
	{/if}
	{#if form && 'message' in form && form.message}<div class="alert ok mt" role="status">{form.message}</div>{/if}
	{#if form && 'error' in form && form.error}<div class="alert bad mt" role="alert">{form.error}</div>{/if}

	<div class="row between top gap mt">
		<div>
			<span class="badge {QUOTE_STATUS_CLASS[q.status]}">{QUOTE_STATUS_LABEL[q.status]}</span>
			<span class="badge neutral">v{v.v}</span>
			{#if data.priceRank}<span class="badge {data.priceRank.rank === 1 ? 'ground' : 'neutral'}">#{data.priceRank.rank} lowest of {data.priceRank.of}</span>{/if}
			<h1 class="mt mb-0">{s.companyName}</h1>
			<div class="row gap mt small"><VerificationBadge status={s.verification} /> {s.city}, {s.state} · {data.match.distanceKm === null ? '' : `~${data.match.distanceKm} km · `}{PIN_ZONE_LABEL[data.match.zone]} · {s.rating ? `★ ${s.rating} (${s.reviewCount})` : 'no reviews yet'} · <a href="/sellers/{s.slug}">profile</a></div>
		</div>
		<div class="price-box">
			<span class="tiny muted">LANDED PER PIECE</span>
			<div class="big">{inr(v.landed.perPiece, 2)}</div>
			{#if prev}<div class="tiny" class:down={v.landed.perPiece < prev.landed.perPiece}>{delta(v.landed.perPiece, prev.landed.perPiece)} vs v{prev.v}</div>{/if}
			<div class="small">{inr(v.landed.totalInclGst)} total incl. GST</div>
		</div>
	</div>

	<div class="grid main-aside mt">
		<div class="stack">
			<section class="card">
				<h2>Quotation breakdown</h2>
				<div class="table-wrap">
					<table>
						<tbody>
							<tr><td>Unit price</td><td class="num">{inr(v.unitPrice, 2)} × {v.quantity} pcs</td><td class="num">{inr(v.unitPrice * v.quantity)}</td></tr>
							{#if v.toolingCost}<tr><td>Tooling / die <span class="tiny muted">({v.toolOwnedByBuyer ? 'you own it' : 'supplier owns it'})</span></td><td class="num">one-time</td><td class="num">{inr(v.toolingCost)}</td></tr>{/if}
							{#if v.setupCost}<tr><td>Setup / NRE</td><td class="num">one-time</td><td class="num">{inr(v.setupCost)}</td></tr>{/if}
							{#if v.sampleCost}<tr><td>Samples</td><td class="num">one-time</td><td class="num">{inr(v.sampleCost)}</td></tr>{/if}
							<tr><td>Freight</td><td class="num">{v.freight === 'EX_WORKS' ? 'ex-works' : 'delivered'}</td><td class="num">{v.freight === 'EX_WORKS' ? 'not included' : inr(v.freightCost)}</td></tr>
							<tr><td>GST</td><td class="num">{v.gstPercent}%</td><td class="num">{inr(v.landed.gst)}</td></tr>
							<tr class="bold"><td>Total</td><td></td><td class="num">{inr(v.landed.totalInclGst)}</td></tr>
						</tbody>
					</table>
				</div>
				{#if v.priceBreaks.length}
					<p class="small mt mb-0"><strong>Larger orders:</strong> {v.priceBreaks.map((b) => `${b.qty} pcs @ ${inr(b.unitPrice)}`).join(' · ')}</p>
				{/if}

				<div class="grid two mt small">
					<div>
						<h3>Delivery & terms</h3>
						<p class="mb-0">Sample in <strong>{v.sampleDays} days</strong> · bulk in <strong>{v.bulkDays} days</strong>{#if v.monthlyCapacity} · capacity {v.monthlyCapacity}/month{/if}</p>
						<p class="mb-0">Payment: <strong>{v.paymentTerms}</strong></p>
						<p class="mb-0">Valid till: <strong>{new Date(v.validTill).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></p>
					</div>
					<div>
						<h3>Price includes</h3>
						{#each QUOTE_INCLUSIONS as i}<div class:muted={!v.includes.includes(i.id)}>{v.includes.includes(i.id) ? '✓' : '✗'} {INCLUSION_LABEL[i.id]}</div>{/each}
					</div>
				</div>

				<h3 class="mt">How they'll make it</h3>
				{#each v.processRoute as pr}<span class="chip" class:hit={pr.mode === 'IN_HOUSE'}>{PROCESS_LABEL[pr.process] ?? pr.process}: {pr.mode === 'IN_HOUSE' ? 'in-house' : 'outsourced'}</span>{/each}
				{#if v.notes}<p class="small mt">“{v.notes}”</p>{/if}
				{#if v.attachments.length}
					<p class="small mt mb-0"><strong>Supplier's quotation files:</strong> {#each v.attachments as a}<span class="chip">📎 {a}</span>{/each}<span class="tiny muted">(download arrives with real file storage)</span></p>
				{/if}
			</section>

			{#if data.insights.length}
				<section class="card">
					<h2>💡 Things to consider</h2>
					<ul class="insights">{#each data.insights as i}<li class={i.tone}>{i.text}</li>{/each}</ul>
				</section>
			{/if}

			<section class="card">
				<h3>Negotiation history</h3>
				<ol class="timeline">
					{#each q.thread as e (e.id)}
						<li class:mine={e.by === 'BUYER'}>
							<span class="tiny muted">{when(e.at)}</span>
							<div>{eventText[e.kind] ?? e.kind}{#if e.version} (v{e.version}){/if}</div>
							{#if e.target}<div class="small muted">{[e.target.unitPrice && `${inr(e.target.unitPrice)}/pc`, e.target.bulkDays && `${e.target.bulkDays} days`, e.target.paymentTerms].filter(Boolean).join(' · ')}</div>{/if}
							{#if e.message}<div class="small">“{e.message}”</div>{/if}
						</li>
					{/each}
				</ol>
			</section>
		</div>

		<aside class="stack">
			{#if data.canAct}
				<section class="card">
					<h3>Decide</h3>
					{#if data.pendingCounter}
						<div class="alert info small">Waiting for {s.companyName} to respond to your counter-offer.</div>
					{/if}
					{#if !confirmAward}
						<button class="btn ok block" disabled={!data.canAward} onclick={() => (confirmAward = true)}>🏆 Accept & award order</button>
					{:else}
						<form method="POST" action="?/award" use:enhance={submit} class="confirm">
							<p class="small mb-0">Award <strong>{data.rfq.title}</strong> to <strong>{s.companyName}</strong> at <strong>{inr(v.landed.perPiece)}/pc</strong> landed? The requirement closes and other suppliers are told.</p>
							<div class="row gap mt">
								<button class="btn ok" disabled={busy}>Yes, award</button>
								<button type="button" class="btn ghost" onclick={() => (confirmAward = false)}>Cancel</button>
							</div>
						</form>
					{/if}
					{#if q.status === 'SUBMITTED'}
						<form method="POST" action="?/shortlist" use:enhance={submit} class="mt"><button class="btn ghost block" disabled={busy}>⭐ Shortlist</button></form>
					{/if}
					<button class="linkish small mt" onclick={() => (showDecline = !showDecline)}>Decline this quote</button>
					{#if showDecline}
						<form method="POST" action="?/decline" use:enhance={submit} class="mt">
							<select name="reason" aria-label="Reason">
								<option value="">Reason (optional, shared with supplier)</option>
								<option>Price too high</option>
								<option>Lead time too long</option>
								<option>Payment terms not acceptable</option>
								<option>Went with a nearer supplier</option>
								<option>Requirement changed</option>
							</select>
							<button class="btn danger sm mt" disabled={busy}>Decline</button>
						</form>
					{/if}
				</section>

				<section class="card">
					<h3>🤝 Counter-offer</h3>
					{#if data.canCounter}
						<p class="small muted">Propose better terms. {data.roundsLeft} round{data.roundsLeft === 1 ? '' : 's'} left. The supplier can accept, revise or decline.</p>
						<form method="POST" action="?/counter" use:enhance={submit} novalidate>
							<div class="field" class:invalid={cErr.targetUnitPrice}>
								<label for="targetUnitPrice">Target unit price (₹/pc)</label>
								<input id="targetUnitPrice" name="targetUnitPrice" type="number" step="0.01" min="0" placeholder="now {v.unitPrice}" />
								{#if cErr.targetUnitPrice}<span class="err">{cErr.targetUnitPrice}</span>{/if}
							</div>
							<div class="field" class:invalid={cErr.targetBulkDays}>
								<label for="targetBulkDays">Target bulk lead time (days)</label>
								<input id="targetBulkDays" name="targetBulkDays" type="number" min="1" placeholder="now {v.bulkDays}" />
								{#if cErr.targetBulkDays}<span class="err">{cErr.targetBulkDays}</span>{/if}
							</div>
							<div class="field" class:invalid={cErr.targetPaymentTerms}>
								<label for="targetPaymentTerms">Payment terms</label>
								<input id="targetPaymentTerms" name="targetPaymentTerms" list="buyer-terms" maxlength="120" placeholder="Keep: {v.paymentTerms}" />
								<datalist id="buyer-terms">{#each PAYMENT_TERMS.filter((p) => p !== v.paymentTerms) as p}<option value={p}></option>{/each}</datalist>
								{#if cErr.targetPaymentTerms}<span class="err">{cErr.targetPaymentTerms}</span>{/if}
							</div>
							<div class="field">
								<label for="message">Message</label>
								<textarea id="message" name="message" maxlength="500" placeholder="e.g. Another supplier is at ₹3,100 landed — can you match if we commit to 500 pcs?"></textarea>
							</div>
							<button class="btn block" disabled={busy}>Send counter-offer</button>
						</form>
					{:else if data.pendingCounter}
						<p class="small muted mb-0">Your offer is with the supplier.</p>
					{:else}
						<p class="small muted mb-0">No counter-offer rounds left. Accept, decline, or call the supplier to close the gap.</p>
					{/if}
				</section>
			{/if}

			<section class="card">
				<h3>Contact</h3>
				{#if s.contact}
					<p class="mb-0"><strong>{s.contact.person}</strong></p>
					<ContactButtons size="sm" phone={s.contact.phone} whatsapp={s.contact.whatsapp} sellerId={s.id} rfqId={data.rfq.id} message={`Hi, about your quotation for ${data.rfq.title} (${data.rfq.id}) on eYantrik.`} />
				{:else}
					<p class="small muted mb-0">🔒 Contacts locked.</p>
				{/if}
				<p class="tiny muted mt mb-0">Want eYantrik to handle this order for you? <a href="/help?rfq={data.rfq.id}">Need assistance</a></p>
			</section>
		</aside>
	</div>
</main>

<style>
	.price-box { text-align: right; background: #fff; border: 1px solid var(--line); border-radius: var(--radius); padding: 12px 16px; }
	.big { font-size: 1.7rem; font-weight: 800; }
	.down { color: var(--ok-ink); }
	.confirm { background: var(--ok-soft); border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px; }
	.insights { margin: 0; padding-left: 0; list-style: none; display: grid; gap: 6px; }
	.insights li { font-size: 0.88rem; padding: 6px 10px; border-radius: 6px; }
	.insights li.good { background: var(--ok-soft); color: var(--ok-ink); }
	.insights li.good::before { content: '✓ '; }
	.insights li.warn { background: var(--warn-soft); color: var(--warn-ink); }
	.insights li.warn::before { content: '⚠ '; }
	.insights li.info { background: #f1f5f9; color: var(--ink-2); }
	.insights li.info::before { content: 'ℹ '; }
	.timeline { list-style: none; padding: 0; margin: 0; }
	.timeline li { border-left: 3px solid var(--ok); padding: 4px 0 10px 12px; }
	.timeline li.mine { border-left-color: var(--brand); }
</style>
