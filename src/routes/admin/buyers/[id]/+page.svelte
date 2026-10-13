<!-- Buyer file (admin only): full contacts (never blurred), requirements, quotes, contacts, help desk,
     managed orders and account control. The admin can't edit the buyer's details. -->
<script lang="ts">
	import AccountBadge from '#lib/components/AccountBadge.svelte';
	import AccountControl from '#lib/components/AccountControl.svelte';

	let { data, form } = $props();
	const b = $derived(data.buyer);
	const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
	const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
	const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
</script>

<svelte:head><title>{b.name} · Buyer · Admin · eYantrik</title><meta name="robots" content="noindex" /></svelte:head>

<main class="container">
	<div class="row gap small"><a href="/admin?tab=buyers">← All buyers</a><a href="/admin">Work queue</a></div>
	<div class="row between top gap mt">
		<div>
			<h1 class="mb-0">{b.name}</h1>
			<p class="muted small mb-0">{b.companyName} · {b.id} · buyer since {day(b.createdAt)}</p>
		</div>
		<AccountBadge status={data.account.status} />
	</div>

	{#if form && 'message' in form && form.message}<div class="alert ok mt" role="status">{form.message}</div>{/if}
	{#if form && 'error' in form && form.error}<div class="alert bad mt" role="alert">{form.error}</div>{/if}

	<div class="layout mt">
		<div class="stack">
			<section class="card">
				<h2>Contact <span class="tiny muted">(entered by the buyer)</span></h2>
				<dl class="details">
					<dt>Name</dt><dd><strong>{b.name}</strong></dd>
					<dt>Company</dt><dd>{b.companyName || '—'}</dd>
					<dt>Mobile</dt><dd><a href="tel:+91{b.phone}">+91 {b.phone}</a></dd>
					<dt>Email</dt><dd>{#if b.email}<a href="mailto:{b.email}">{b.email}</a>{:else}—{/if}</dd>
				</dl>
				<div class="row gap mt">
					<a class="btn sm" href="tel:+91{b.phone}">📞 Call</a>
					<a class="btn wa sm" href="https://wa.me/91{b.phone}" target="_blank" rel="noopener">💬 WhatsApp</a>
					{#if b.email}<a class="btn ghost sm" href="mailto:{b.email}">✉ Email</a>{/if}
				</div>
			</section>

			<section class="card">
				<h2>Platform activity</h2>
				<div class="mini-stats">
					<div><strong>{data.stats.rfqs}</strong><span>requirements ({data.stats.open} open)</span></div>
					<div><strong>{data.stats.quotes}</strong><span>quotes received</span></div>
					<div><strong>{data.stats.awarded}</strong><span>orders awarded</span></div>
					<div><strong>{data.stats.contacts}</strong><span>suppliers contacted</span></div>
					<div><strong>{data.stats.contactedBy}</strong><span>times contacted by suppliers</span></div>
					<div><strong>{data.tickets.length}</strong><span>help requests</span></div>
				</div>

				<h3 class="mt">Requirements</h3>
				{#if data.requirements.length === 0}<p class="muted small mb-0">No requirements posted yet.</p>{:else}
					<div class="table-wrap"><table>
						<thead><tr><th>Requirement</th><th>Delivery</th><th class="num">Quotes</th><th class="num">Lowest / pc</th><th>Status</th></tr></thead>
						<tbody>
							{#each data.requirements as r (r.id)}
								<tr>
									<td><a href="/admin?tab=requirements#{r.id}"><strong>{r.title}</strong></a><div class="tiny muted">{r.id} · {r.quantity} pcs · {day(r.createdAt)}</div>{#if r.awardedTo}<div class="tiny">Awarded to {r.awardedTo}</div>{/if}</td>
									<td class="small">{r.city}</td>
									<td class="num">{r.quotes}</td>
									<td class="num">{r.lowest === null ? '—' : inr(r.lowest)}</td>
									<td><span class="badge {r.status === 'OPEN' ? 'docs' : r.status === 'AWARDED' ? 'ground' : 'neutral'}">{r.status.toLowerCase()}</span>{#if r.outcome}<div class="tiny muted">{r.outcome === 'DEAL_DONE' ? 'deal done' : 'no deal'}</div>{/if}</td>
								</tr>
							{/each}
						</tbody>
					</table></div>
				{/if}

				<h3 class="mt">Suppliers they contacted</h3>
				{#if data.contacts.length === 0}<p class="muted small mb-0">None yet.</p>{:else}
					<ul class="plain">{#each data.contacts as c (c.id)}<li class="small">{c.channel === 'PHONE' ? '📞' : '💬'} <a href="/admin/review/seller/{c.sellerId}"><strong>{c.seller}</strong></a> · {fmt(c.at)}{#if c.rfqId} · {c.rfqId}{/if}</li>{/each}</ul>
				{/if}

				<h3 class="mt">Suppliers who contacted them</h3>
				{#if data.contactedBy.length === 0}<p class="muted small mb-0">None yet.</p>{:else}
					<ul class="plain">{#each data.contactedBy as c (c.id)}<li class="small">{c.channel === 'PHONE' ? '📞' : '💬'} {#if c.sellerId}<a href="/admin/review/seller/{c.sellerId}"><strong>{c.seller}</strong></a>{:else}<strong>{c.seller}</strong>{/if} · {fmt(c.at)}{#if c.rfqId} · {c.rfqId}{/if}</li>{/each}</ul>
				{/if}

				<h3 class="mt">Feedback they gave</h3>
				{#if data.feedback.length === 0}<p class="muted small mb-0">None yet.</p>{:else}
					<ul class="plain">{#each data.feedback as f (f.id)}<li class="small"><strong>{'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</strong> · <a href="/admin/review/seller/{f.sellerId}">{f.seller}</a> · {f.outcome === 'DEAL_DONE' ? 'Deal done' : 'No deal'} · {day(f.at)}{#if f.comment}<div>“{f.comment}”</div>{/if}</li>{/each}</ul>
				{/if}
			</section>
		</div>

		<div class="stack side">
			<AccountControl who="buyer" status={data.account.status} reason={data.account.reason} history={b.accountLog} />

			<section class="card">
				<h2>Help desk requests</h2>
				{#if data.tickets.length === 0}<p class="muted small mb-0">None.</p>{:else}
					<ul class="plain">{#each data.tickets as t (t.id)}<li class="small"><a href="/admin?tab=helpdesk#{t.id}">{t.id}</a> · <span class="badge neutral">{t.status.toLowerCase().replace('_', ' ')}</span> · {day(t.createdAt)}<div class="muted">{t.message.slice(0, 140)}</div></li>{/each}</ul>
				{/if}
			</section>

			{#if data.jobs.length}
				<section class="card">
					<h2>Managed orders</h2>
					<ul class="plain">{#each data.jobs as j (j.id)}<li class="small"><a href="/admin?tab=concierge&job={j.id}">{j.id}</a> · {j.partName} · {j.quantity} pcs · <span class="badge neutral">{j.status.toLowerCase().replace('_', ' ')}</span></li>{/each}</ul>
				</section>
			{/if}
		</div>
	</div>
</main>

<style>
	.layout { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 18px; align-items: start; }
	@media (max-width: 960px) { .layout { grid-template-columns: minmax(0, 1fr); } }
	h2 { font-size: 1.05rem; }
	h3 { font-size: 0.9rem; }
	.details { display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 8px 14px; margin: 0; font-size: 0.9rem; }
	.details dt { color: var(--muted); font-weight: 600; }
	.details dd { margin: 0; }
	@media (max-width: 560px) { .details { grid-template-columns: minmax(0, 1fr); } .details dd { margin-bottom: 6px; } }
	.mini-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
	.mini-stats div { background: #f6f7fb; border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; display: flex; flex-direction: column; }
	.mini-stats strong { font-size: 1.1rem; }
	.mini-stats span { font-size: 0.75rem; color: var(--muted); }
	@media (max-width: 560px) { .mini-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
	.plain { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
</style>
