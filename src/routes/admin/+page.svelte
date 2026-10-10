<!-- src/routes/admin/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import SellerProfileFields from '#lib/components/SellerProfileFields.svelte';
	import VerificationBadge from '#lib/components/VerificationBadge.svelte';
	import { PROCESS_LABEL } from '#lib/taxonomy.ts';

	let { data, form } = $props();

	const tabs = $derived([
		{ id: 'overview', label: 'Overview' },
		{ id: 'requirements', label: 'Requirements', count: 0 },
		{ id: 'verification', label: 'Verification', count: data.kpis.pendingReview + data.kpis.awaitingVisit },
		{ id: 'add-seller', label: 'Add seller (team)' },
		{ id: 'helpdesk', label: 'Help desk', count: data.tickets.filter((t) => t.status === 'NEW').length },
		{ id: 'concierge', label: 'Concierge costing' },
		{ id: 'activity', label: 'Contact log' }
	]);

	const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
	const today = new Date().toISOString().slice(0, 10);
	const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

	const addSellerState = $derived(form && 'addSeller' in form ? form.addSeller : null);
	const addErr = $derived((addSellerState?.errors ?? {}) as Record<string, string>);
	const addVals = $derived((addSellerState?.values ?? {}) as Record<string, any>);

	// Concierge costing
	const job = $derived(data.jobs.find((j) => j.id === data.selectedJobId));
	let margin = $state(20);
	$effect(() => {
		if (job) margin = job.marginPercent;
	});
	const baseCost = $derived(job ? job.steps.reduce((n, s) => n + s.unitCost, 0) : 0);
	const quote = $derived(Math.round(baseCost * (1 + margin / 100)));
	const totalMargin = $derived(job ? (quote - baseCost) * job.quantity : 0);

	let rejecting = $state<string | null>(null);
	let inspecting = $state<string | null>(null);
	let ticketRole = $state<Record<string, string>>({});
	const keep = () => async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => update({ reset: false });
</script>

<svelte:head><title>Admin · eYantrik</title><meta name="robots" content="noindex" /></svelte:head>

<main class="container">
	<div class="row between gap mb">
		<div>
			<h1 class="mb-0">eYantrik operations</h1>
			<p class="muted mb-0 small">Phase 1 goal: grow users, verify supply, connect buyers and sellers.</p>
		</div>
	</div>

	<nav class="tabs" aria-label="Admin sections">
		{#each tabs as t}
			<a href="?tab={t.id}" class:active={data.tab === t.id} data-sveltekit-noscroll>{t.label}{#if t.count}<span class="count">{t.count}</span>{/if}</a>
		{/each}
	</nav>

	{#if form && 'message' in form && form.message}<div class="alert ok" role="status">{form.message}</div>{/if}
	{#if form && 'error' in form && form.error}<div class="alert bad" role="alert">{form.error}</div>{/if}

	{#if data.tab === 'overview'}
		<h3>Users</h3>
		<div class="grid four">
			<div class="stat"><div class="v">{data.kpis.buyers}</div><div class="k">Buyers</div></div>
			<div class="stat"><div class="v">{data.kpis.sellers}</div><div class="k">Seller accounts</div></div>
			<div class="stat"><div class="v">{data.kpis.newUsers7d}</div><div class="k">New users (7 days)</div></div>
			<div class="stat"><div class="v">{data.kpis.listed}</div><div class="k">Listed sellers ({data.kpis.groundVerified} ground verified)</div></div>
		</div>
		<h3 class="mt-lg">Connections (the Phase 1 north star)</h3>
		<div class="grid four">
			<div class="stat"><div class="v">{data.kpis.rfqsTotal}</div><div class="k">Requirements posted ({data.kpis.rfqsOpen} open)</div></div>
			<div class="stat"><div class="v">{data.kpis.buyerToSeller}</div><div class="k">Buyer → seller contacts</div></div>
			<div class="stat"><div class="v">{data.kpis.sellerToBuyer}</div><div class="k">Seller → buyer contacts</div></div>
			<div class="stat"><div class="v">{data.kpis.dealsDone}</div><div class="k">Deals reported done{data.kpis.avgRating ? ` · avg ★ ${data.kpis.avgRating}` : ''}</div></div>
		</div>
		<h3 class="mt-lg">Quotations</h3>
		<div class="grid three">
			<div class="stat"><div class="v">{data.kpis.quotes}</div><div class="k">Quotations submitted</div></div>
			<div class="stat"><div class="v">{data.kpis.negotiating}</div><div class="k">In negotiation</div></div>
			<div class="stat"><div class="v">{data.kpis.awarded}</div><div class="k">Orders awarded on platform</div></div>
		</div>
		<h3 class="mt-lg">Needs attention</h3>
		<div class="grid three">
			<a class="stat link" href="?tab=verification"><div class="v">{data.kpis.pendingReview}</div><div class="k">Sellers awaiting document review →</div></a>
			<a class="stat link" href="?tab=verification"><div class="v">{data.kpis.awaitingVisit}</div><div class="k">Sellers awaiting ground visit →</div></a>
			<a class="stat link" href="?tab=helpdesk"><div class="v">{data.kpis.ticketsOpen}</div><div class="k">Open help desk tickets →</div></a>
		</div>

	{:else if data.tab === 'requirements'}
		<p class="muted small">For the ground sales team: every buyer requirement with contact details — call buyers directly to offer eYantrik's managed service.</p>
		<div class="table-wrap">
			<table>
				<thead><tr><th>Requirement</th><th>Buyer</th><th>Delivery</th><th class="num">Interested</th><th class="num">Quotes</th><th class="num">Lowest / pc</th><th>Status</th></tr></thead>
				<tbody>
					{#each data.requirements as r (r.id)}
						<tr>
							<td><strong>{r.title}</strong><div class="tiny muted">{r.id} · {r.quantity} pcs · {fmt(r.createdAt)}{#if r.editCount} · edited ×{r.editCount}{/if}</div></td>
							<td>{#if r.buyer}<strong>{r.buyer.name}</strong><div class="tiny muted">{r.buyer.company}</div><a class="small" href="tel:+91{r.buyer.phone}">📞 +91 {r.buyer.phone}</a>{:else}—{/if}</td>
							<td class="small">{r.city}</td>
							<td class="num">{r.interested}</td>
							<td class="num">{r.quotes}</td>
							<td class="num">{r.lowest === null ? '—' : inr(r.lowest)}</td>
							<td><span class="badge {r.status === 'OPEN' ? 'docs' : r.status === 'AWARDED' ? 'ground' : 'neutral'}">{r.status.toLowerCase()}</span></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

	{:else if data.tab === 'verification'}
		{#if data.verificationQueue.length === 0}
			<div class="card center muted">Queue is empty 🎉</div>
		{/if}
		<div class="stack">
			{#each data.verificationQueue as s (s.id)}
				<article class="card">
					<div class="row between top gap">
						<div>
							<h3 class="mb-0">{s.companyName}</h3>
							<div class="small muted">{s.address}, {s.city}, {s.state} {s.pincode} · GSTIN <code>{s.gstin}</code> · {s.onboardedBy === 'SELF' ? 'Self-registered' : 'Team'} · {fmt(s.createdAt)}</div>
						</div>
						<VerificationBadge status={s.verification} />
					</div>
					<div class="grid two mt small">
						<div>
							<strong>Contact:</strong> {s.contactPerson} · +91 {s.phone}{#if s.email} · {s.email}{/if}<br />
							<strong>Processes:</strong> {s.processes.map((p) => PROCESS_LABEL[p] ?? p).join(', ')}<br />
							<strong>Machines:</strong> {s.machines.map((m) => `${m.count}× ${m.name}`).join(', ')}
						</div>
						<div>
							<strong>Documents:</strong>
							{#if s.documents.length === 0}<span class="muted">none</span>{/if}
							<ul class="docs">{#each s.documents as d}<li>📄 {d.kind.replace(/_/g, ' ').toLowerCase()}: {d.fileName}</li>{/each}</ul>
						</div>
					</div>

					<div class="row gap mt">
						{#if s.verification === 'DOCS_SUBMITTED'}
							<form method="POST" action="?/approveDocs" use:enhance><input type="hidden" name="sellerId" value={s.id} /><button class="btn ok sm">✓ Approve documents</button></form>
						{:else}
							<button class="btn sm" onclick={() => (inspecting = inspecting === s.id ? null : s.id)}>Record ground inspection</button>
						{/if}
						<button class="btn danger sm" onclick={() => (rejecting = rejecting === s.id ? null : s.id)}>Reject</button>
					</div>

					{#if rejecting === s.id}
						<form method="POST" action="?/rejectSeller" use:enhance={keep} class="mt">
							<input type="hidden" name="sellerId" value={s.id} />
							<div class="field"><label for="reason-{s.id}">Reason (shown to the seller)</label><input id="reason-{s.id}" name="reason" required minlength="5" placeholder="e.g. GST certificate unreadable; photos don't show listed machines" /></div>
							<button class="btn danger sm">Confirm rejection</button>
						</form>
					{/if}
					{#if inspecting === s.id}
						<form method="POST" action="?/groundVerify" use:enhance={keep} class="mt inspect">
							<input type="hidden" name="sellerId" value={s.id} />
							<div class="form-grid">
								<div class="field"><label for="insp-{s.id}">Inspector</label><input id="insp-{s.id}" name="inspector" required /></div>
								<div class="field"><label for="date-{s.id}">Visit date</label><input id="date-{s.id}" type="date" name="date" max={today} required /></div>
								<div class="field full"><label for="notes-{s.id}">Notes</label><textarea id="notes-{s.id}" name="notes" placeholder="What was checked, anything that differed from the listing"></textarea></div>
							</div>
							<label class="row gap small mb"><input type="checkbox" name="machinesMatch" /> Machines, address and documents match what was found on site</label>
							<button class="btn ok sm">Mark ground verified</button>
						</form>
					{/if}
				</article>
			{/each}
		</div>

	{:else if data.tab === 'add-seller'}
		<p class="muted">Use this after a team member has visited the factory. The seller is listed immediately as <strong>Ground verified</strong>, and a Seller login is created for the owner.</p>
		{#if addErr.form}<div class="alert bad">{addErr.form}</div>{/if}
		<form method="POST" action="?/addSeller" enctype="multipart/form-data" novalidate use:enhance={keep}>
			<fieldset>
				<legend>Ground inspection</legend>
				<div class="form-grid">
					<div class="field" class:invalid={addErr.inspector}><label for="inspector">Inspected by <span class="req">*</span></label><input id="inspector" name="inspector" value={addVals.inspector ?? ''} />{#if addErr.inspector}<span class="err">{addErr.inspector}</span>{/if}</div>
					<div class="field" class:invalid={addErr.inspectionDate}><label for="inspectionDate">Visit date <span class="req">*</span></label><input id="inspectionDate" type="date" max={today} name="inspectionDate" value={addVals.inspectionDate ?? ''} />{#if addErr.inspectionDate}<span class="err">{addErr.inspectionDate}</span>{/if}</div>
					<div class="field full"><label for="inspectionNotes">Inspection notes</label><textarea id="inspectionNotes" name="inspectionNotes">{addVals.inspectionNotes ?? ''}</textarea></div>
				</div>
			</fieldset>
			<fieldset>
				<legend>Owner's seller login</legend>
				<div class="form-grid">
					<div class="field" class:invalid={addErr.loginEmail}><label for="loginEmail">Login email <span class="req">*</span></label><input id="loginEmail" name="loginEmail" type="email" value={addVals.loginEmail ?? ''} autocomplete="off" />{#if addErr.loginEmail}<span class="err">{addErr.loginEmail}</span>{/if}</div>
					<div class="field" class:invalid={addErr.tempPassword}><label for="tempPassword">Temporary password <span class="req">*</span></label><input id="tempPassword" name="tempPassword" type="text" autocomplete="new-password" />{#if addErr.tempPassword}<span class="err">{addErr.tempPassword}</span>{:else}<span class="hint">8+ characters with a letter and a number. Share it with the owner.</span>{/if}</div>
				</div>
			</fieldset>
			<SellerProfileFields mode="TEAM" values={addVals} errors={addErr} />
			<button class="btn ok">Add ground-verified seller</button>
		</form>

	{:else if data.tab === 'helpdesk'}
		{#if data.tickets.length === 0}<div class="card center muted">No tickets yet.</div>{/if}
		<div class="stack">
			{#each data.tickets as t (t.id)}
				<article class="card" class:new-ticket={t.status === 'NEW'}>
					<div class="row between top gap">
						<div>
							<strong>{t.id}</strong> · <span class="badge neutral">{t.raisedBy.toLowerCase()}</span>
							<span class="small muted">· {fmt(t.createdAt)}</span>
							<div class="mt"><strong>{t.name}</strong> ({t.companyName || '—'}) · <a href="tel:+91{t.phone}">+91 {t.phone}</a> · prefers {t.preferredTime}</div>
							{#if t.rfqId}<div class="small">Requirement: <strong>{t.rfqId}</strong> {t.rfqTitle}</div>{/if}
							<p class="small mt mb-0">“{t.message}”</p>
						</div>
					</div>
					<form method="POST" action="?/updateTicket" use:enhance={keep} class="mt ticket-form">
						<input type="hidden" name="ticketId" value={t.id} />
						<div class="field">
							<label for="st-{t.id}">Status</label>
							<select id="st-{t.id}" name="status" value={t.status}>
								<option value="NEW">New</option>
								<option value="CONTACTED">Called / in discussion</option>
								<option value="EYANTRIK_HANDLING">eYantrik handling</option>
								<option value="RESOLVED">Resolved</option>
							</select>
						</div>
						<div class="field">
							<label for="role-{t.id}">eYantrik acts as</label>
							<select id="role-{t.id}" name="eyantrikRole" value={ticketRole[t.id] ?? t.eyantrikRole ?? ''} onchange={(e) => (ticketRole[t.id] = e.currentTarget.value)}>
								<option value="">— not stepping in —</option>
								<option value="AS_SELLER">Seller (we make / broker it)</option>
								<option value="AS_BUYER">Buyer (we source from this seller)</option>
							</select>
						</div>
						<div class="field notes"><label for="n-{t.id}">Internal notes</label><input id="n-{t.id}" name="adminNotes" value={t.adminNotes} /></div>
						<button class="btn sm">Save</button>
					</form>
					<div class="row gap mt">
						{#if t.jobId}
							<a class="btn ghost sm" href="?tab=concierge&job={t.jobId}">Open concierge job {t.jobId} →</a>
						{:else if t.raisedBy !== 'SELLER'}
							<form method="POST" action="?/ticketToJob" use:enhance><input type="hidden" name="ticketId" value={t.id} /><button class="btn dark sm">Start concierge job (eYantrik as seller)</button></form>
						{/if}
					</div>
				</article>
			{/each}
		</div>

	{:else if data.tab === 'concierge'}
		{#if !job}
			<div class="card center muted">No concierge jobs yet. Start one from a help desk ticket.</div>
		{:else}
			<div class="row gap mb">
				{#each data.jobs as j}
					<a class="btn sm {j.id === job.id ? '' : 'ghost'}" href="?tab=concierge&job={j.id}" data-sveltekit-noscroll>{j.id} · {j.clientName}</a>
				{/each}
			</div>
			<div class="grid main-aside">
				<section class="card">
					<div class="row between top gap">
						<div>
							<span class="badge dark">{job.id}</span> <span class="badge neutral">{job.status.replace('_', ' ')}</span>
							<h2 class="mt">{job.partName}</h2>
							<p class="small muted mb-0">Client: <strong>{job.clientName}</strong> (+91 {job.clientPhone}) · Qty <strong>{job.quantity}</strong>{#if job.ticketId} · from {job.ticketId}{/if}</p>
						</div>
					</div>

					<h4 class="mt">Process routing & cost (internal only)</h4>
					<div class="table-wrap">
						<table>
							<thead><tr><th>Process</th><th>Assigned to</th><th>Type</th><th class="num">Unit cost</th><th></th></tr></thead>
							<tbody>
								{#each job.steps as st (st.id)}
									<tr>
										<td><strong>{st.process}</strong></td>
										<td>{st.assignedTo}</td>
										<td><span class="badge {st.fulfillment === 'IN_HOUSE' ? 'ground' : 'pending'}">{st.fulfillment === 'IN_HOUSE' ? 'In-house' : 'Partner'}</span></td>
										<td class="num">{inr(st.unitCost)}</td>
										<td class="num">
											{#if job.status === 'COSTING'}
												<form method="POST" action="?/removeStep" use:enhance><input type="hidden" name="jobId" value={job.id} /><input type="hidden" name="stepId" value={st.id} /><button class="linkish small" aria-label="Remove {st.process}">Remove</button></form>
											{/if}
										</td>
									</tr>
								{:else}
									<tr><td colspan="5" class="muted small">No steps yet — add the first process below.</td></tr>
								{/each}
								<tr><td colspan="3" class="num bold">Base cost / pc</td><td class="num bold">{inr(baseCost)}</td><td></td></tr>
							</tbody>
						</table>
					</div>

					{#if job.status === 'COSTING'}
						<form method="POST" action="?/addStep" use:enhance class="step-form mt">
							<input type="hidden" name="jobId" value={job.id} />
							<input name="process" placeholder="Process, e.g. VMC finishing" aria-label="Process" required />
							<input name="assignedTo" list="partners" placeholder="Assigned to" aria-label="Assigned to" required />
							<select name="fulfillment" aria-label="Type"><option value="IN_HOUSE">In-house</option><option value="PARTNER">Partner</option></select>
							<input name="unitCost" type="number" min="0.01" step="0.01" placeholder="₹ / pc" aria-label="Unit cost" required />
							<button class="btn sm">+ Add</button>
							<datalist id="partners">{#each data.partners as p}<option value={p.isPlant ? `In-house — ${p.name}` : p.name}></option>{/each}</datalist>
						</form>
					{/if}
				</section>

				<aside class="card dark">
					<h3 style="color:#38bdf8">Margin & quote</h3>
					<form method="POST" action="?/finalizeQuote" use:enhance={keep}>
						<input type="hidden" name="jobId" value={job.id} />
						<div class="field">
							<label for="marginPercent" style="color:#cbd5e1">Margin %</label>
							<input id="marginPercent" type="number" name="marginPercent" min="0" max="100" bind:value={margin} disabled={job.status !== 'COSTING'} />
						</div>
						<div class="calc small">
							<div class="row between"><span>Base cost</span><span>{inr(baseCost)}</span></div>
							<div class="row between"><span>Margin ({margin}%)</span><span>+{inr(quote - baseCost)}</span></div>
							<div class="row between bold quote"><span>Client price / pc</span><span>{inr(quote)}</span></div>
							<div class="row between tiny"><span>Total margin ({job.quantity} pcs)</span><span>{inr(totalMargin)}</span></div>
						</div>
						{#if job.status === 'COSTING'}
							<button class="btn block mt" disabled={job.steps.length === 0}>Finalize & send quote</button>
						{/if}
					</form>
					{#if job.status === 'QUOTED' || job.status === 'IN_PRODUCTION'}
						<form method="POST" action="?/advanceJob" use:enhance class="mt">
							<input type="hidden" name="jobId" value={job.id} />
							<button class="btn ok block">{job.status === 'QUOTED' ? 'Client accepted → start production' : 'Mark delivered'}</button>
						</form>
					{/if}
					<p class="tiny mt mb-0" style="color:#94a3b8">Client is invoiced by eYantrik. Partners get individual job tickets; the client is not disclosed to them.</p>
				</aside>
			</div>

			<section class="card mt">
				<div class="row between gap">
					<h3 class="mb-0">📍 Order tracking</h3>
					<span class="small muted">{job.buyerUserId ? 'Buyer sees every update live on their dashboard.' : 'No buyer account linked — share updates by phone.'}</span>
				</div>
				<ol class="track mt">
					{#each data.orderStages as st}
						{@const m = job.milestones.findLast((x) => x.stage === st.id)}
						<li class:done={!!m}>
							<strong>{st.label}</strong>
							{#if m}<span class="tiny muted"> · {fmt(m.at)}</span>{#if m.note}<div class="small">{m.note}</div>{/if}{/if}
						</li>
					{/each}
				</ol>
				<form method="POST" action="?/addMilestone" use:enhance class="row gap mt">
					<input type="hidden" name="jobId" value={job.id} />
					<select name="stage" aria-label="Stage" style="width:auto">
						{#each data.orderStages as st}<option value={st.id}>{st.label}</option>{/each}
					</select>
					<input name="note" placeholder="Note for the buyer, e.g. 200 pcs dispatched via VRL, LR #1234" style="flex:1;min-width:240px" maxlength="500" />
					<button class="btn sm">Post update</button>
				</form>
			</section>
		{/if}

	{:else if data.tab === 'activity'}
		<p class="small muted">Every phone / WhatsApp tap made through eYantrik. This is the evidence of lead value for sellers in Phase 2.</p>
		<div class="table-wrap">
			<table>
				<thead><tr><th>When</th><th>From</th><th>To</th><th>Channel</th><th>Requirement</th></tr></thead>
				<tbody>
					{#each data.activity as a (a.id)}
						<tr><td class="small">{fmt(a.at)}</td><td>{a.from}</td><td>{a.to}</td><td>{a.channel === 'PHONE' ? '📞 Call' : '💬 WhatsApp'}</td><td>{a.rfqId ?? '—'}</td></tr>
					{:else}
						<tr><td colspan="5" class="muted">No contacts logged yet.</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</main>

<style>
	.stat.link { text-decoration: none; color: inherit; }
	.track { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
	.track li { border-left: 3px solid var(--line-2); padding: 2px 0 2px 10px; color: var(--muted); }
	.track li.done { border-left-color: var(--ok); color: var(--ink); }
	.stat.link:hover { border-color: var(--brand); }
	.docs { margin: 4px 0 0; padding-left: 0; list-style: none; }
	.inspect, .ticket-form { background: #f8fafc; border: 1px solid var(--line); border-radius: 8px; padding: 12px; }
	.ticket-form { display: grid; grid-template-columns: 180px 220px 1fr auto; gap: 10px; align-items: end; }
	.ticket-form .field { margin: 0; }
	@media (max-width: 900px) { .ticket-form { grid-template-columns: 1fr; } }
	.new-ticket { border-left: 4px solid var(--warn); }
	.step-form { display: grid; grid-template-columns: 1.3fr 1.3fr 110px 110px auto; gap: 8px; }
	@media (max-width: 700px) { .step-form { grid-template-columns: 1fr; } }
	.calc { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 12px; color: #cbd5e1; }
	.calc > div { margin-bottom: 4px; }
	.calc .quote { color: #4ade80; font-size: 1.05rem; border-top: 1px solid #334155; padding-top: 6px; }
	aside.dark input { background: #1e293b; color: #fff; border-color: #334155; }
</style>
