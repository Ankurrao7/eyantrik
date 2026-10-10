<script lang="ts">
	import { enhance } from '$app/forms';
	import ContactButtons from '#lib/components/ContactButtons.svelte';
	import { PIN_ZONE_LABEL } from '#lib/geo.ts';
	import { estimateUnitPrice, GST_RATES, INCLUSION_LABEL, inr, landed, PAYMENT_TERMS, QUOTE_INCLUSIONS, QUOTE_STATUS_CLASS, QUOTE_STATUS_LABEL } from '#lib/quote.ts';
	import { formatRfqValue, RFQ_FIELDS } from '#lib/rfqFields.ts';
	import { PROCESS_LABEL } from '#lib/taxonomy.ts';

	let { data, form } = $props();
	const r = $derived(data.rfq);
	const title = $derived(String(r.values.partName ?? r.id));
	const errors = $derived((form && 'errors' in form ? form.errors : {}) as Record<string, string>);

	// Live quote form state (re-seeded after each server response).
	type FormValues = typeof data.defaults;
	const seed = (): FormValues => structuredClone(form && 'values' in form && form.values ? (form.values as FormValues) : data.defaults);
	let f = $state(seed());
	$effect(() => {
		f = seed();
	});
	const n = (x: string) => Number(x) || 0;
	const preview = $derived(
		landed({
			unitPrice: n(f.unitPrice), quantity: n(f.quantity), toolingCost: n(f.toolingCost), setupCost: n(f.setupCost),
			sampleCost: n(f.sampleCost), gstPercent: n(f.gstPercent), freight: f.freight as 'EX_WORKS' | 'DELIVERED', freightCost: n(f.freightCost)
		})
	);

	// Simple cost estimator → fills the unit price (sellers with their own software can skip it and attach a PDF).
	let est = $state({ materialCost: '', machineMinutes: '', machineHourRate: '', outsideCost: '', packagingCost: '', overheadPct: '', profitPct: '' });
	$effect(() => {
		est = {
			materialCost: '', machineMinutes: '', outsideCost: '', packagingCost: '',
			machineHourRate: String(data.estimator.machineHourRate), overheadPct: String(data.estimator.overheadPct), profitPct: String(data.estimator.profitPct)
		};
	});
	const estimate = $derived(
		estimateUnitPrice({
			materialCost: n(est.materialCost), machineMinutes: n(est.machineMinutes), machineHourRate: n(est.machineHourRate),
			outsideCost: n(est.outsideCost), packagingCost: n(est.packagingCost), overheadPct: n(est.overheadPct), profitPct: n(est.profitPct)
		})
	);
	let attachNames = $state<string[]>([]);

	const latestV = $derived(data.quote ? data.quote.versions[data.quote.versions.length - 1] : null);
	const specFields = RFQ_FIELDS.filter((x) => x.type !== 'file' && x.name !== 'partName');
	let busy = $state(false);
	const submit = () => {
		busy = true;
		return async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			busy = false;
			document.querySelector('.invalid, .alert')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		};
	};
	const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
	const eventText: Record<string, string> = {
		QUOTE: 'You sent quotation', REVISION: 'You sent revision', COUNTER: 'Buyer sent a counter-offer', SHORTLIST: 'Buyer shortlisted your quote',
		ACCEPT_COUNTER: 'You accepted the counter-offer', DECLINE_COUNTER: 'You declined the counter-offer', AWARD: 'Buyer awarded you the order 🏆',
		DECLINE: 'Buyer declined your quote', WITHDRAW: 'You withdrew your quote', RFQ_EDITED: 'Buyer edited the requirement — please re-quote'
	};
	const closes = $derived.by(() => {
		const h = Math.round((Date.parse(r.deadline) - Date.now()) / 3_600_000);
		return h <= 0 ? 'Quotation window closed' : h < 48 ? `Quotes close in ${h} h` : `Quotes close in ${Math.round(h / 24)} days`;
	});
</script>

<svelte:head><title>{title} ({r.id}) · Lead · eYantrik</title></svelte:head>

<main class="container">
	<a href="/seller" class="small">← Lead feed</a>

	<div class="row between top gap mt">
		<div>
			<span class="badge dark">{r.id}</span>
			{#if data.quote}<span class="badge {QUOTE_STATUS_CLASS[data.quote.status]}">{QUOTE_STATUS_LABEL[data.quote.status]}</span>{/if}
			<h1 class="mt">{title}</h1>
			<p class="muted small mb-0">{closes} · {data.quoteCount === 0 ? 'no quotes yet — be the first' : `${data.quoteCount} quote${data.quoteCount === 1 ? '' : 's'} so far`}</p>
		</div>
		{#if !data.quote && !data.interested && r.status === 'OPEN'}
			<form method="POST" action="?/interested" use:enhance><button class="btn ghost">👋 I'm interested</button></form>
		{/if}
	</div>

	{#if data.requote}
		<div class="alert warn mt"><strong>The buyer updated this requirement.</strong> Your earlier quote is no longer active — review the changes below and send a fresh quote. {#if data.quote?.thread.at(-1)?.message}({data.quote?.thread.at(-1)?.message}){/if}</div>
	{/if}
	{#if form && 'message' in form && form.message}<div class="alert ok mt" role="status">{form.message}</div>{/if}
	{#if form && 'error' in form && form.error}<div class="alert bad mt" role="alert">{form.error}</div>{/if}

	<div class="grid main-aside mt">
		<section class="card">
			<h2>Requirement</h2>
			<div class="small mb">
				📍 {r.values.deliveryCity}, {r.values.deliveryState} {r.values.deliveryPincode}
				{#if data.match.distanceKm !== null}· ~{data.match.distanceKm} km from you{/if} · <em>{PIN_ZONE_LABEL[data.match.zone]}</em>
			</div>
			{#if !data.match.isMatch}<div class="alert warn small">Outside your listed processes. You can still quote — the buyer will see it flagged, so explain how you'll make it.</div>{/if}
			<dl class="specs">
				{#each specFields as fld (fld.name)}
					{@const v = formatRfqValue(fld, r.values)}
					{#if v !== '—'}<div class:wide={fld.type === 'textarea'}><dt>{fld.label}</dt><dd>{v}</dd></div>{/if}
				{/each}
			</dl>

			{#if data.drawingCount}
				<h3 class="mt">Drawings</h3>
				{#if data.drawings.length}
					<ul class="small">{#each data.drawings as d}<li>📎 {d.name} <span class="muted">({d.sizeKb} KB)</span></li>{/each}</ul>
				{:else if data.ndaRequired && data.verified}
					<form method="POST" action="?/acceptNda" use:enhance class="nda small">
						<span>🔒 {data.drawingCount} drawing(s) protected by the buyer's NDA. Accepting means you keep the drawings and part details confidential and use them only to quote.</span>
						<button class="btn sm">Accept NDA & view</button>
					</form>
				{:else}
					<p class="small muted">📎 {data.drawingCount} drawing(s) — visible after document verification.</p>
				{/if}
			{/if}
		</section>

		<aside class="stack">
			<div class="card">
				<h3>Buyer</h3>
				{#if data.buyer}
					<p class="mb-0"><strong>{data.buyer.name}</strong></p>
					<p class="small muted">{data.buyer.companyName}</p>
					<ContactButtons size="sm" phone={data.buyer.phone} whatsapp={data.buyer.phone} buyerUserId={data.buyer.userId} rfqId={r.id} message={`Namaste ${data.buyer.name}, this is ${data.sellerName} (eYantrik). About your requirement ${r.id} — ${title}.`} />
					<p class="tiny muted mt mb-0">Tip: send your quotation here too — buyers compare quotes side by side on eYantrik.</p>
				{:else}
					<div class="locked small">🔒 <span class="blur">Buyer Name · +91 98XXX XXXXX</span><br />Unlocks after document verification.</div>
				{/if}
			</div>
			{#if latestV}
				<div class="card">
					<h3>Your current quote (v{latestV.v})</h3>
					<div class="big">{inr(landed(latestV).perPiece)}<span class="small muted">/pc landed</span></div>
					<p class="small muted mb-0">{inr(landed(latestV).totalInclGst)} total incl. GST · bulk in {latestV.bulkDays} days</p>
					{#if data.quote?.live && data.quote.status !== 'ACCEPTED'}
						<form method="POST" action="?/withdraw" use:enhance class="mt"><button class="linkish small">Withdraw quote</button></form>
					{/if}
				</div>
			{/if}
		</aside>
	</div>

	{#if data.counter}
		<section class="card counter mt">
			<h2>🤝 Buyer's counter-offer</h2>
			<div class="grid three small">
				{#if data.counter.target?.unitPrice}<div><span class="muted">Target unit price</span><div class="big">{inr(data.counter.target.unitPrice)}</div><span class="tiny muted">your v{latestV?.v}: {inr(latestV?.unitPrice ?? 0)}</span></div>{/if}
				{#if data.counter.target?.bulkDays}<div><span class="muted">Target bulk lead time</span><div class="big">{data.counter.target.bulkDays} days</div><span class="tiny muted">yours: {latestV?.bulkDays} days</span></div>{/if}
				{#if data.counter.target?.paymentTerms}<div><span class="muted">Payment terms</span><div class="bold">{data.counter.target.paymentTerms}</div><span class="tiny muted">yours: {latestV?.paymentTerms}</span></div>{/if}
			</div>
			{#if data.counter.message}<p class="mt">“{data.counter.message}”</p>{/if}
			<div class="row gap mt">
				<form method="POST" action="?/acceptCounter" use:enhance={submit}><button class="btn ok" disabled={busy}>Accept these terms</button></form>
				<a class="btn ghost" href="#quote">Send a revised quote instead</a>
			</div>
			<form method="POST" action="?/declineCounter" use:enhance={submit} class="row gap mt">
				<input name="message" placeholder="Optional reason, e.g. material cost has risen" style="flex:1;min-width:220px" maxlength="500" />
				<button class="btn danger sm" disabled={busy}>Decline offer</button>
			</form>
		</section>
	{/if}

	<section id="quote" class="mt-lg">
		<h2>{latestV ? `Revise quotation (will be v${latestV.v + 1})` : 'Submit quotation'}</h2>
		{#if !data.canQuote}
			<div class="alert info">{data.cannotQuoteWhy}</div>
		{:else}
			{#if data.autoFilled}<p class="small muted">Pre-filled from your saved quote defaults. <a href="/seller/settings">Change defaults</a></p>{/if}

			<details class="card flat estimator mb">
				<summary class="bold">🧮 Cost estimator <span class="muted small">(optional — skip it if you use your own costing software and attach the PDF below)</span></summary>
				<div class="g4 mt">
					<div class="field"><label for="e-mat">Material ₹/pc</label><input id="e-mat" type="number" step="0.01" min="0" bind:value={est.materialCost} /></div>
					<div class="field"><label for="e-min">Machine minutes/pc</label><input id="e-min" type="number" step="0.1" min="0" bind:value={est.machineMinutes} /></div>
					<div class="field"><label for="e-rate">Machine hour rate ₹</label><input id="e-rate" type="number" step="1" min="0" bind:value={est.machineHourRate} /></div>
					<div class="field"><label for="e-out">Outside processes ₹/pc</label><input id="e-out" type="number" step="0.01" min="0" bind:value={est.outsideCost} /></div>
					<div class="field"><label for="e-pack">Packing / inspection ₹/pc</label><input id="e-pack" type="number" step="0.01" min="0" bind:value={est.packagingCost} /></div>
					<div class="field"><label for="e-oh">Overhead %</label><input id="e-oh" type="number" step="0.5" min="0" bind:value={est.overheadPct} /></div>
					<div class="field"><label for="e-pr">Profit %</label><input id="e-pr" type="number" step="0.5" min="0" bind:value={est.profitPct} /></div>
				</div>
				<div class="row between gap small">
					<span>Machining {inr(estimate.machining, 2)} + direct {inr(estimate.direct, 2)} + overhead {inr(estimate.overhead, 2)} + profit {inr(estimate.profit, 2)} = <strong>{inr(estimate.unitPrice, 2)}/pc</strong></span>
					<button type="button" class="btn sm" disabled={!estimate.unitPrice} onclick={() => (f.unitPrice = String(estimate.unitPrice))}>Use {inr(estimate.unitPrice, 2)} as unit price</button>
				</div>
			</details>

			<form method="POST" action="?/submitQuote" use:enhance={submit} novalidate enctype="multipart/form-data" class="quote-form">
				<fieldset>
					<legend>Pricing</legend>
					<div class="g3">
						<div class="field" class:invalid={errors.unitPrice}><label for="unitPrice">Unit price (₹/pc) <span class="req">*</span></label><input id="unitPrice" name="unitPrice" type="number" step="0.01" min="0" inputmode="decimal" bind:value={f.unitPrice} />{#if errors.unitPrice}<span class="err">{errors.unitPrice}</span>{/if}</div>
						<div class="field" class:invalid={errors.quantity}><label for="quantity">Quantity quoted <span class="req">*</span></label><input id="quantity" name="quantity" type="number" min="1" inputmode="numeric" bind:value={f.quantity} />{#if errors.quantity}<span class="err">{errors.quantity}</span>{/if}</div>
						<div class="field" class:invalid={errors.gstPercent}><label for="gstPercent">GST <span class="req">*</span></label><select id="gstPercent" name="gstPercent" bind:value={f.gstPercent}>{#each GST_RATES as g}<option value={String(g)}>{g}%</option>{/each}</select></div>
					</div>
					<div class="field" class:invalid={errors.priceBreaks}>
						<span class="label">Price breaks for larger orders <span class="muted">(optional)</span></span>
						<div class="g4">
							<input name="break1Qty" type="number" placeholder="Qty e.g. 500" aria-label="Break 1 quantity" bind:value={f.break1Qty} />
							<input name="break1Price" type="number" step="0.01" placeholder="₹/pc" aria-label="Break 1 unit price" bind:value={f.break1Price} />
							<input name="break2Qty" type="number" placeholder="Qty e.g. 1000" aria-label="Break 2 quantity" bind:value={f.break2Qty} />
							<input name="break2Price" type="number" step="0.01" placeholder="₹/pc" aria-label="Break 2 unit price" bind:value={f.break2Price} />
						</div>
						{#if errors.priceBreaks}<span class="err">{errors.priceBreaks}</span>{/if}
					</div>
					<div class="g3">
						<div class="field" class:invalid={errors.toolingCost}><label for="toolingCost">Tooling / die / fixture (₹, one-time)</label><input id="toolingCost" name="toolingCost" type="number" step="0.01" min="0" bind:value={f.toolingCost} />{#if errors.toolingCost}<span class="err">{errors.toolingCost}</span>{/if}
							<label class="row gap small" style="font-weight:400"><input type="checkbox" name="toolOwnedByBuyer" bind:checked={f.toolOwnedByBuyer} /> Buyer will own the tooling</label></div>
						<div class="field" class:invalid={errors.setupCost}><label for="setupCost">Setup / NRE (₹, one-time)</label><input id="setupCost" name="setupCost" type="number" step="0.01" min="0" bind:value={f.setupCost} />{#if errors.setupCost}<span class="err">{errors.setupCost}</span>{/if}</div>
						<div class="field" class:invalid={errors.sampleCost}><label for="sampleCost">Samples (₹, one-time)</label><input id="sampleCost" name="sampleCost" type="number" step="0.01" min="0" bind:value={f.sampleCost} />{#if errors.sampleCost}<span class="err">{errors.sampleCost}</span>{/if}</div>
					</div>
					<div class="g3">
						<div class="field" class:invalid={errors.freight}>
							<span class="label">Freight <span class="req">*</span></span>
							<label class="row gap small" style="font-weight:400"><input type="radio" name="freight" value="EX_WORKS" bind:group={f.freight} /> Ex-works (buyer arranges transport)</label>
							<label class="row gap small" style="font-weight:400"><input type="radio" name="freight" value="DELIVERED" bind:group={f.freight} /> Delivered to buyer</label>
						</div>
						{#if f.freight === 'DELIVERED'}
							<div class="field" class:invalid={errors.freightCost}><label for="freightCost">Freight (₹, whole order)</label><input id="freightCost" name="freightCost" type="number" step="0.01" min="0" bind:value={f.freightCost} />{#if errors.freightCost}<span class="err">{errors.freightCost}</span>{/if}</div>
						{/if}
					</div>
					<div class="field" class:invalid={errors.includes}>
						<span class="label">Price includes <span class="req">*</span></span>
						<div class="incl">
							{#each QUOTE_INCLUSIONS as i}<label><input type="checkbox" name="includes" value={i.id} bind:group={f.includes} /> {i.label}</label>{/each}
						</div>
						{#if errors.includes}<span class="err">{errors.includes}</span>{/if}
					</div>
				</fieldset>

				<fieldset>
					<legend>Delivery</legend>
					<div class="g3">
						<div class="field" class:invalid={errors.sampleDays}><label for="sampleDays">Sample / first article in (days) <span class="req">*</span></label><input id="sampleDays" name="sampleDays" type="number" min="1" bind:value={f.sampleDays} />{#if errors.sampleDays}<span class="err">{errors.sampleDays}</span>{/if}</div>
						<div class="field" class:invalid={errors.bulkDays}><label for="bulkDays">Bulk delivery in (days) <span class="req">*</span></label><input id="bulkDays" name="bulkDays" type="number" min="1" bind:value={f.bulkDays} />{#if errors.bulkDays}<span class="err">{errors.bulkDays}</span>{/if}</div>
						<div class="field" class:invalid={errors.monthlyCapacity}><label for="monthlyCapacity">Monthly capacity (pcs)</label><input id="monthlyCapacity" name="monthlyCapacity" type="number" min="1" bind:value={f.monthlyCapacity} />{#if errors.monthlyCapacity}<span class="err">{errors.monthlyCapacity}</span>{/if}</div>
					</div>
				</fieldset>

				<fieldset>
					<legend>Commercial terms</legend>
					<div class="g3">
						<div class="field" class:invalid={errors.paymentTerms}>
							<label for="paymentTerms">Payment terms <span class="req">*</span></label>
							<input id="paymentTerms" name="paymentTerms" list="payment-terms" maxlength="120" bind:value={f.paymentTerms} placeholder="Type or pick, e.g. 30 days credit" />
							<datalist id="payment-terms">{#each PAYMENT_TERMS as p}<option value={p}></option>{/each}</datalist>
							{#if errors.paymentTerms}<span class="err">{errors.paymentTerms}</span>{/if}
						</div>
						<div class="field" class:invalid={errors.validTill}><label for="validTill">Price valid till <span class="req">*</span></label><input id="validTill" name="validTill" type="date" bind:value={f.validTill} />{#if errors.validTill}<span class="err">{errors.validTill}</span>{/if}</div>
					</div>
				</fieldset>

				<fieldset>
					<legend>How you'll make it</legend>
					<p class="small muted">Buyers trust suppliers who are open about outsourcing.</p>
					{#each Object.keys(f.route) as p}
						<div class="route">
							<span>{PROCESS_LABEL[p] ?? p} {#if !data.match.covers.includes(p)}<span class="tiny muted">(not in your listed processes)</span>{/if}</span>
							<label><input type="radio" name="route_{p}" value="IN_HOUSE" bind:group={f.route[p]} /> In-house</label>
							<label><input type="radio" name="route_{p}" value="OUTSOURCED" bind:group={f.route[p]} /> Outsourced</label>
						</div>
					{/each}
					<div class="field mt" class:invalid={errors.attachments}>
						<label for="attachments">Attach your quotation (PDF / Excel / Word)</label>
						<input id="attachments" name="attachments" type="file" multiple accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.jpg,.jpeg,.png" onchange={(e) => (attachNames = Array.from(e.currentTarget.files ?? []).map((x) => x.name))} />
						<span class="hint">Up to 5 files, 10 MB each. Key numbers above are still needed so buyers can compare. {#if latestV?.attachments.length && !attachNames.length}Keeping: {latestV.attachments.join(', ')}{/if}</span>
						{#if errors.attachments}<span class="err">{errors.attachments}</span>{/if}
					</div>
					<div class="field mt"><label for="notes">Notes, assumptions & deviations</label><textarea id="notes" name="notes" maxlength="2000" placeholder="e.g. Price assumes ADC12; anodizing by partner in Noida; CMM report on first 5 pcs." bind:value={f.notes}></textarea></div>
				</fieldset>

				<div class="summary">
					<div>
						<span class="tiny muted">BUYER WILL SEE</span>
						<div class="big">{inr(preview.perPiece, 2)} <span class="small muted">/pc landed (before GST)</span></div>
						<div class="small">{inr(preview.totalExGst)} + GST {inr(preview.gst)} = <strong>{inr(preview.totalInclGst)}</strong> for {f.quantity || 0} pcs
							{#if preview.oneTime}<span class="muted"> · includes {inr(preview.oneTime)} one-time costs spread over the quantity</span>{/if}
							{#if f.freight === 'EX_WORKS'}<span class="muted"> · freight extra</span>{/if}</div>
						<div class="tiny muted mt">Includes: {f.includes.map((i: string) => INCLUSION_LABEL[i]).join(', ') || '—'}</div>
					</div>
					<div class="submit-col">
						<label class="row gap tiny" style="font-weight:400;color:#cbd5e1"><input type="checkbox" name="saveDefaults" /> Save GST, terms & inclusions as my defaults</label>
						<button class="btn ok" disabled={busy}>{busy ? 'Sending…' : data.requote ? 'Send fresh quote' : latestV ? `Send revision v${latestV.v + 1}` : 'Submit quotation'}</button>
					</div>
				</div>
			</form>
		{/if}
	</section>

	{#if data.quote?.thread.length}
		<section class="card mt-lg">
			<h3>History</h3>
			<ol class="timeline">
				{#each data.quote.thread as e (e.id)}
					<li class:buyer={e.by === 'BUYER'}>
						<span class="tiny muted">{when(e.at)}</span>
						<div>{eventText[e.kind] ?? e.kind}{#if e.version} (v{e.version}){/if}</div>
						{#if e.target}<div class="small muted">{[e.target.unitPrice && `${inr(e.target.unitPrice)}/pc`, e.target.bulkDays && `${e.target.bulkDays} days`, e.target.paymentTerms].filter(Boolean).join(' · ')}</div>{/if}
						{#if e.message}<div class="small">“{e.message}”</div>{/if}
					</li>
				{/each}
			</ol>
		</section>
	{/if}
</main>

<style>
	.specs { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 8px 16px; margin: 0; }
	.specs .wide { grid-column: 1 / -1; }
	.specs dt { color: var(--muted); font-size: 0.75rem; }
	.specs dd { margin: 0; font-size: 0.9rem; }
	.nda { display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; background: var(--warn-soft); border: 1px solid #fde68a; border-radius: 8px; padding: 10px 12px; }
	.big { font-size: 1.4rem; font-weight: 800; }
	.counter { border: 2px solid var(--warn); }
	.quote-form fieldset { background: #fff; }
	.g3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0 14px; }
	.g4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
	@media (max-width: 700px) { .g3, .g4 { grid-template-columns: minmax(0, 1fr); } }
	.incl { display: flex; flex-wrap: wrap; gap: 6px 18px; }
	.incl label { font-weight: 400; font-size: 0.9rem; display: flex; gap: 6px; align-items: center; }
	.route { display: grid; grid-template-columns: 1fr auto auto; gap: 14px; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--line); font-size: 0.9rem; }
	.route label { display: flex; gap: 6px; align-items: center; }
	.summary { position: sticky; bottom: 0; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; background: var(--ink); color: #fff; border-radius: var(--radius); padding: 14px 18px; box-shadow: 0 -4px 12px rgba(15, 23, 42, 0.15); }
	.summary .muted { color: #94a3b8; }
	.estimator { background: #fff; }
	.submit-col { display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
	.timeline { list-style: none; padding: 0; margin: 0; }
	.timeline li { border-left: 3px solid var(--ok); padding: 4px 0 10px 12px; }
	.timeline li.buyer { border-left-color: var(--brand); }
</style>
