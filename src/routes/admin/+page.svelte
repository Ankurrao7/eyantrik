<!-- src/routes/admin/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import SellerProfileFields from '#lib/components/SellerProfileFields.svelte';
	import VerificationBadge from '#lib/components/VerificationBadge.svelte';
	import AccountBadge from '#lib/components/AccountBadge.svelte';
	import ProfileRing from '#lib/components/ProfileRing.svelte';

	let { data, form } = $props();

	const tabs = $derived([
		{ id: 'queue', label: 'Work queue', count: data.queue.length },
		{ id: 'overview', label: 'Overview' },
		{ id: 'suppliers', label: 'Suppliers', count: 0 },
		{ id: 'buyers', label: 'Buyers', count: 0 },
		{ id: 'requirements', label: 'Requirements', count: 0 },
		{ id: 'add-seller', label: 'Add seller (team)' },
		{ id: 'helpdesk', label: 'Help desk', count: data.tickets.filter((t) => t.status === 'NEW').length },
		{ id: 'concierge', label: 'Concierge costing' },
		{ id: 'activity', label: 'Contact log' }
	]);

	// ---------- Work queue ----------
	const TYPES = {
		DOCS: { label: 'Document review', icon: '📄' },
		VISIT: { label: 'Factory visit', icon: '🏭' },
		HELP: { label: 'Help request', icon: '🆘' },
		CALL: { label: 'Call new buyer', icon: '📞' },
		NO_QUOTES: { label: 'No quotes yet', icon: '⏳' }
	} as const;
	type QType = keyof typeof TYPES;
	let filter = $state<QType | 'ALL'>('ALL');
	let search = $state('');
	let calling = $state<string | null>(null);
	const countOf = (t: QType) => data.queue.filter((q) => q.type === t).length;
	const shownQueue = $derived(
		data.queue.filter(
			(q) => (filter === 'ALL' || q.type === filter) && (!search.trim() || `${q.title} ${q.sub} ${q.id}`.toLowerCase().includes(search.trim().toLowerCase()))
		)
	);
	const waiting = (iso: string) => {
		const h = (Date.now() - Date.parse(iso)) / 3_600_000;
		return { text: h < 1 ? 'just now' : h < 24 ? `${Math.round(h)} h` : `${Math.round(h / 24)} d`, late: h >= 48, soon: h >= 24 && h < 48 };
	};

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

	// ---------- Suppliers & buyers (full details, admin only) ----------
	const SUPPLIER_FILTER_LABEL: Record<string, string> = {
		ALL: 'All', DOCS_SUBMITTED: 'Awaiting review', DOCS_VERIFIED: 'Docs verified', GROUND_VERIFIED: 'Ground verified', REJECTED: 'Sent back', OFF: 'Suspended / deactivated'
	};
	let supplierSearch = $state('');
	let supplierState = $state('');
	const supplierStates = $derived([...new Set(data.suppliers.map((x) => x.state))].sort());
	const shownSuppliers = $derived(
		data.suppliers.filter((x) => {
			const f = data.supplierFilter;
			if (f === 'OFF' ? x.accountStatus === 'ACTIVE' : f !== 'ALL' && (x.verification !== f || x.accountStatus !== 'ACTIVE')) return false;
			if (supplierState && x.state !== supplierState) return false;
			const q = supplierSearch.trim().toLowerCase();
			return !q || `${x.companyName} ${x.id} ${x.city} ${x.contactPerson} ${x.phone} ${x.whatsapp} ${x.email} ${x.gstin} ${x.mainShop}`.toLowerCase().includes(q);
		})
	);
	let buyerSearch = $state('');
	let buyerStatus = $state<'ALL' | 'ACTIVE' | 'OFF'>('ALL');
	const shownBuyers = $derived(
		data.buyers.filter((x) => {
			if (buyerStatus === 'ACTIVE' && x.accountStatus !== 'ACTIVE') return false;
			if (buyerStatus === 'OFF' && x.accountStatus === 'ACTIVE') return false;
			const q = buyerSearch.trim().toLowerCase();
			return !q || `${x.name} ${x.companyName} ${x.id} ${x.phone} ${x.email}`.toLowerCase().includes(q);
		})
	);
	const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

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

	{#if data.tab === 'queue'}
		<div class="queue-head">
			<div class="filters" role="tablist" aria-label="Filter tasks">
				<button type="button" role="tab" aria-selected={filter === 'ALL'} class:on={filter === 'ALL'} onclick={() => (filter = 'ALL')}>All <span>{data.queue.length}</span></button>
				{#each Object.entries(TYPES) as [id, t] (id)}
					<button type="button" role="tab" aria-selected={filter === id} class:on={filter === id} onclick={() => (filter = id as QType)}>{t.icon} {t.label} <span>{countOf(id as QType)}</span></button>
				{/each}
			</div>
			<input type="search" class="q-search" placeholder="Search company, buyer, GSTIN, ID…" bind:value={search} aria-label="Search tasks" />
		</div>

		{#if shownQueue.length === 0}
			<div class="card center muted">{data.queue.length === 0 ? 'All caught up — nothing waiting. 🎉' : 'Nothing matches this filter.'}</div>
		{:else}
			<ul class="queue">
				{#each shownQueue as q (q.type + q.id)}
					{@const w = waiting(q.at)}
					<li class="q-item">
						<span class="q-icon" aria-hidden="true">{TYPES[q.type].icon}</span>
						<div class="q-main">
							<div class="q-top">
								<span class="q-type">{TYPES[q.type].label}</span>
								<span class="q-age" class:late={w.late} class:soon={w.soon} title="Waiting since {fmt(q.at)}">waiting {w.text}</span>
							</div>
							<strong class="q-title">{q.title}</strong>
							<span class="small muted">{q.sub}</span>
							{#if calling === q.id}
								<form method="POST" action="?/markCalled" use:enhance={keep} class="row gap mt">
									<input type="hidden" name="rfqId" value={q.id} />
									<input name="note" placeholder="What did the buyer say? (optional)" maxlength="300" class="call-note" />
									<button class="btn ok sm">Save</button>
									<button type="button" class="btn ghost sm" onclick={() => (calling = null)}>Cancel</button>
								</form>
							{/if}
						</div>
						<div class="q-actions">
							{#if q.phone}<a class="btn ghost sm" href="tel:+91{q.phone}">📞 Call</a>{/if}
							{#if q.type === 'CALL' && calling !== q.id}<button type="button" class="btn ghost sm" onclick={() => (calling = q.id)}>Mark as called</button>{/if}
							<a class="btn sm" href={q.href}>{q.cta} →</a>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	{:else if data.tab === 'overview'}
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
			<a class="stat link" href="?tab=suppliers&status=DOCS_SUBMITTED"><div class="v">{data.kpis.pendingReview}</div><div class="k">Sellers awaiting document review →</div></a>
			<a class="stat link" href="?tab=suppliers&status=DOCS_VERIFIED"><div class="v">{data.kpis.awaitingVisit}</div><div class="k">Sellers awaiting ground visit →</div></a>
			<a class="stat link" href="?tab=helpdesk"><div class="v">{data.kpis.ticketsOpen}</div><div class="k">Open help desk tickets →</div></a>
		</div>

	{:else if data.tab === 'suppliers'}
		<p class="muted small">Every company on eYantrik at every stage, with full contact details. Open one to see its documents, verification record, activity — and to suspend or deactivate it.</p>
		<div class="queue-head">
			<div class="filters" aria-label="Filter suppliers">
				{#each data.supplierFilters as f (f)}
					<a class="chip-link" class:on={data.supplierFilter === f} href="?tab=suppliers{f === 'ALL' ? '' : `&status=${f}`}" data-sveltekit-noscroll>{SUPPLIER_FILTER_LABEL[f]} <span>{data.supplierCounts[f]}</span></a>
				{/each}
			</div>
			<div class="row gap">
				<select bind:value={supplierState} aria-label="State" class="q-select"><option value="">All states</option>{#each supplierStates as st}<option value={st}>{st}</option>{/each}</select>
				<input type="search" class="q-search" placeholder="Company, person, phone, GSTIN, work…" bind:value={supplierSearch} aria-label="Search suppliers" />
			</div>
		</div>
		<div class="table-wrap">
			<table>
				<thead><tr><th>Company</th><th>Contact</th><th>GSTIN</th><th>Status</th><th>Profile</th><th class="num">Docs</th><th class="num">Quotes / won</th><th>Joined</th><th></th></tr></thead>
				<tbody>
					{#each shownSuppliers as x (x.id)}
						<tr>
							<td><a href="/admin/review/seller/{x.id}"><strong>{x.companyName}</strong></a><div class="tiny muted">{x.id} · {x.city}, {x.state}{x.onboardedBy === 'TEAM' ? ' · added by team' : ''}</div>{#if x.mainShop}<div class="tiny">{x.mainShop}</div>{:else}<div class="tiny muted">Main work not set</div>{/if}</td>
							<td class="small"><strong>{x.contactPerson}</strong><div><a href="tel:+91{x.phone}">📞 +91 {x.phone}</a></div><div><a href="https://wa.me/91{x.whatsapp}" target="_blank" rel="noopener">💬 +91 {x.whatsapp}</a></div>{#if x.email}<div><a href="mailto:{x.email}">{x.email}</a></div>{/if}</td>
							<td class="small"><code>{x.gstin}</code></td>
							<td><VerificationBadge status={x.verification} />{#if x.accountStatus !== 'ACTIVE'}<div class="mt-xs"><AccountBadge status={x.accountStatus} /></div>{/if}</td>
							<td><ProfileRing percent={x.profilePct} size={38} stroke={4} /></td>
							<td class="num">{x.documents}</td>
							<td class="num">{x.quotes} / {x.won}{#if x.rating}<div class="tiny muted">★ {x.rating} ({x.reviewCount})</div>{/if}</td>
							<td class="small">{day(x.createdAt)}</td>
							<td><a class="btn sm" href="/admin/review/seller/{x.id}">Open →</a></td>
						</tr>
					{:else}
						<tr><td colspan="9" class="muted">{data.suppliers.length === 0 ? 'No suppliers yet.' : 'Nothing matches this filter.'}</td></tr>
					{/each}
				</tbody>
			</table>
		</div>

	{:else if data.tab === 'buyers'}
		<p class="muted small">Every buyer account with full contact details and what they did on the platform. Open one to see their requirements and to suspend or deactivate it.</p>
		<div class="queue-head">
			<div class="filters" role="tablist" aria-label="Filter buyers">
				<button type="button" role="tab" aria-selected={buyerStatus === 'ALL'} class:on={buyerStatus === 'ALL'} onclick={() => (buyerStatus = 'ALL')}>All <span>{data.buyers.length}</span></button>
				<button type="button" role="tab" aria-selected={buyerStatus === 'ACTIVE'} class:on={buyerStatus === 'ACTIVE'} onclick={() => (buyerStatus = 'ACTIVE')}>Active <span>{data.buyers.filter((x) => x.accountStatus === 'ACTIVE').length}</span></button>
				<button type="button" role="tab" aria-selected={buyerStatus === 'OFF'} class:on={buyerStatus === 'OFF'} onclick={() => (buyerStatus = 'OFF')}>Suspended / deactivated <span>{data.buyers.filter((x) => x.accountStatus !== 'ACTIVE').length}</span></button>
			</div>
			<input type="search" class="q-search" placeholder="Name, company, phone, email…" bind:value={buyerSearch} aria-label="Search buyers" />
		</div>
		<div class="table-wrap">
			<table>
				<thead><tr><th>Buyer</th><th>Contact</th><th class="num">Requirements</th><th class="num">Quotes</th><th class="num">Awarded</th><th class="num">Help</th><th>Joined</th><th></th></tr></thead>
				<tbody>
					{#each shownBuyers as x (x.id)}
						<tr>
							<td><a href="/admin/buyers/{x.id}"><strong>{x.name}</strong></a><div class="tiny muted">{x.companyName || '—'} · {x.id}</div>{#if x.accountStatus !== 'ACTIVE'}<div class="mt-xs"><AccountBadge status={x.accountStatus} /></div>{/if}</td>
							<td class="small"><div><a href="tel:+91{x.phone}">📞 +91 {x.phone}</a></div><div><a href="https://wa.me/91{x.phone}" target="_blank" rel="noopener">💬 WhatsApp</a></div>{#if x.email}<div><a href="mailto:{x.email}">{x.email}</a></div>{/if}</td>
							<td class="num">{x.rfqs}{#if x.openRfqs}<div class="tiny muted">{x.openRfqs} open</div>{/if}</td>
							<td class="num">{x.quotes}</td>
							<td class="num">{x.awarded}</td>
							<td class="num">{x.tickets}</td>
							<td class="small">{day(x.createdAt)}</td>
							<td><a class="btn sm" href="/admin/buyers/{x.id}">Open →</a></td>
						</tr>
					{:else}
						<tr><td colspan="8" class="muted">{data.buyers.length === 0 ? 'No buyers yet.' : 'Nothing matches this filter.'}</td></tr>
					{/each}
				</tbody>
			</table>
		</div>

	{:else if data.tab === 'requirements'}
		<p class="muted small">For the ground sales team: every buyer requirement with contact details — call buyers directly to offer eYantrik's managed service.</p>
		<div class="table-wrap">
			<table>
				<thead><tr><th>Requirement</th><th>Buyer</th><th>Delivery</th><th class="num">Interested</th><th class="num">Quotes</th><th class="num">Lowest / pc</th><th>Status</th></tr></thead>
				<tbody>
					{#each data.requirements as r (r.id)}
						<tr id={r.id} class="target">
							<td>
								<strong>{r.title}</strong><div class="tiny muted">{r.id} · {r.quantity} pcs · {fmt(r.createdAt)}{#if r.editCount} · edited ×{r.editCount}{/if}</div>
								{#if r.salesCalledAt}<div class="tiny" style="color:var(--ok-ink)">✓ Called {fmt(r.salesCalledAt)}{#if r.salesNote} — “{r.salesNote}”{/if}</div>{/if}
								{#if r.files.length}
									<ul class="file-links">{#each r.files as f}<li>{#if f.url}<a href={f.url} target="_blank" rel="noopener">📎 {f.label}</a>{:else}<span class="muted">📎 {f.label} (not kept)</span>{/if}</li>{/each}</ul>
								{/if}
							</td>
							<td>{#if r.buyer}<a href="/admin/buyers/{r.buyerUserId}"><strong>{r.buyer.name}</strong></a><div class="tiny muted">{r.buyer.company}</div><a class="small" href="tel:+91{r.buyer.phone}">📞 +91 {r.buyer.phone}</a>{#if r.buyerOnHold}<div class="tiny" style="color:var(--warn-ink)">⏸ Buyer on hold — hidden from sellers</div>{/if}{:else}—{/if}</td>
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
				<article class="card target" id={t.id} class:new-ticket={t.status === 'NEW'}>
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
	.file-links { list-style: none; padding: 0; margin: 4px 0 0; font-size: 0.78rem; display: grid; gap: 2px; }
	/* the work queue links to #id — highlight the row it opens */
	:global(.target:target) { outline: 3px solid var(--brand); outline-offset: 2px; scroll-margin-top: 90px; }
	.queue-head { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; margin-bottom: 14px; }
	.filters { display: flex; flex-wrap: wrap; gap: 6px; }
	.filters button { border: 1px solid var(--line-2); background: #fff; border-radius: 999px; padding: 6px 12px; font: inherit; font-size: 0.84rem; font-weight: 600; cursor: pointer; color: var(--ink-2); }
	.filters button span { margin-left: 4px; color: var(--muted); font-weight: 700; }
	.filters button.on { background: var(--navy); border-color: var(--navy); color: #fff; }
	.filters button.on span { color: #c7d2fe; }
	.q-search { max-width: 280px; }
	.q-select { width: auto; }
	.chip-link { border: 1px solid var(--line-2); background: #fff; border-radius: 999px; padding: 6px 12px; font-size: 0.84rem; font-weight: 600; color: var(--ink-2); text-decoration: none; }
	.chip-link span { margin-left: 4px; color: var(--muted); font-weight: 700; }
	.chip-link.on { background: var(--navy); border-color: var(--navy); color: #fff; }
	.chip-link.on span { color: #c7d2fe; }
	.mt-xs { margin-top: 4px; }
	.queue { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
	.q-item { display: flex; gap: 14px; align-items: flex-start; background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; box-shadow: var(--shadow); }
	.q-icon { font-size: 1.4rem; line-height: 1; margin-top: 2px; }
	.q-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
	.q-top { display: flex; gap: 10px; align-items: center; }
	.q-type { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--brand); }
	.q-age { font-size: 0.72rem; font-weight: 700; color: var(--muted); background: #f0f2f7; border-radius: 999px; padding: 1px 8px; }
	.q-age.soon { background: var(--warn-soft); color: var(--warn-ink); }
	.q-age.late { background: var(--bad-soft); color: #a8262b; }
	.q-title { font-size: 0.98rem; }
	.q-actions { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; align-items: center; }
	.call-note { flex: 1; min-width: 180px; }
	@media (max-width: 700px) { .q-item { flex-wrap: wrap; } .q-actions { width: 100%; justify-content: flex-start; } .q-search { max-width: none; width: 100%; } }
	.stat.link { text-decoration: none; color: inherit; }
	.track { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
	.track li { border-left: 3px solid var(--line-2); padding: 2px 0 2px 10px; color: var(--muted); }
	.track li.done { border-left-color: var(--ok); color: var(--ink); }
	.stat.link:hover { border-color: var(--brand); }
	.ticket-form { background: #f8fafc; border: 1px solid var(--line); border-radius: 8px; padding: 12px; }
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
