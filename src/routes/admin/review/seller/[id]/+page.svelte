<!-- Supplier file (admin only) — everything about one company on one screen, at every stage:
     automatic checks · full details & contacts (never blurred) · documents (viewed in place) ·
     verification decision · platform activity · account control · history.
     The admin can't edit the supplier's details: those are entered by the supplier only. -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import VerificationBadge from '#lib/components/VerificationBadge.svelte';
	import AccountBadge from '#lib/components/AccountBadge.svelte';
	import AccountControl from '#lib/components/AccountControl.svelte';
	import ProfileRing from '#lib/components/ProfileRing.svelte';

	let { data, form } = $props();
	const s = $derived(data.seller);

	// document viewer
	let shown = $state(0);
	const doc = $derived(s.documents[shown]);
	const isPdf = $derived(doc?.type === 'application/pdf' || /\.pdf$/i.test(doc?.fileName ?? ''));
	const docLabel = (kind: string, i: number) =>
		kind === 'GST_CERTIFICATE' ? 'GST certificate' : kind === 'UDYAM_MSME' ? 'Udyam / MSME' : kind === 'FACTORY_PHOTO' ? `Photo ${s.documents.slice(0, i + 1).filter((d) => d.kind === 'FACTORY_PHOTO').length}` : 'Document';

	// checklist: Approve unlocks only when every required box is ticked (the server checks again)
	let ticked = $state<string[]>([]);
	const ready = $derived(data.reviewChecks.filter((c) => c.required).every((c) => ticked.includes(c.id)));
	let reason = $state('');
	let showChanges = $state(false);
	const today = new Date().toISOString().slice(0, 10);

	const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
	const ago = (iso?: string) => {
		if (!iso) return '';
		const h = Math.round((Date.now() - Date.parse(iso)) / 3_600_000);
		return h < 1 ? 'just now' : h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
	};
	const actionLabel: Record<string, string> = {
		SUBMITTED: 'Submitted documents', RESUBMITTED: 'Resubmitted after changes', ADDED_BY_TEAM: 'Added by the team',
		DOCS_VERIFIED: 'Documents verified', CHANGES_REQUESTED: 'Sent back for changes', GROUND_VERIFIED: 'Factory visit recorded', NOTE: 'Note',
		SUSPENDED: 'Account suspended', DEACTIVATED: 'Account deactivated', REACTIVATED: 'Account reactivated', PROFILE_UPDATED: 'Profile updated by seller'
	};
	const a = $derived(data.activity);
	const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
	const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
	const quoteStatus: Record<string, string> = {
		SUBMITTED: 'Submitted', SHORTLISTED: 'Shortlisted', NEGOTIATING: 'Negotiating', ACCEPTED: 'Won', DECLINED: 'Declined',
		NOT_SELECTED: 'Not selected', WITHDRAWN: 'Withdrawn', OUTDATED: 'Needs re-quote'
	};
	const keep = () => async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => {
		await update({ reset: false });
		ticked = [];
	};
</script>

<svelte:head><title>{s.companyName} · Supplier · Admin · eYantrik</title><meta name="robots" content="noindex" /></svelte:head>

<main class="container">
	<div class="row gap small"><a href="/admin?tab=suppliers">← All suppliers</a><a href="/admin">Work queue</a></div>
	<div class="row between top gap mt">
		<div>
			<h1 class="mb-0">{s.companyName}</h1>
			<p class="muted small mb-0">
				{s.id} · {s.city}, {s.state} · {s.onboardedBy === 'SELF' ? 'Self-registered' : 'Added by the team'} · joined {day(s.createdAt)} · submitted {ago(s.submittedAt ?? s.createdAt)}
			</p>
		</div>
		<div class="row gap"><VerificationBadge status={s.verification} /><AccountBadge status={data.account.status} /></div>
	</div>

	{#if form && 'message' in form && form.message}<div class="alert ok mt" role="status">{form.message} <a href="/admin">Back to the work queue →</a></div>{/if}
	{#if form && 'error' in form && form.error}<div class="alert bad mt" role="alert">{form.error}</div>{/if}

	<div class="review mt">
		<!-- ============ LEFT: checks, details, history ============ -->
		<div class="stack">
			<section class="card">
				<h2>Automatic checks</h2>
				<ul class="checks-list">
					{#each data.checks as c (c.label)}
						<li class={c.ok === true ? 'pass' : c.ok === false ? 'problem' : 'info'}>
							<span class="mark" aria-hidden="true">{c.ok === true ? '✓' : c.ok === false ? '!' : 'i'}</span>
							<span><strong>{c.label}</strong><span class="small muted">{c.detail}</span></span>
						</li>
					{/each}
				</ul>
			</section>

			<section class="card">
				<h2>Contact</h2>
				<dl class="details">
					<dt>Contact person</dt><dd><strong>{s.contactPerson}</strong></dd>
					<dt>Mobile</dt><dd><a href="tel:+91{s.phone}">+91 {s.phone}</a></dd>
					<dt>WhatsApp</dt><dd><a href="https://wa.me/91{s.whatsapp}" target="_blank" rel="noopener">+91 {s.whatsapp}</a></dd>
					<dt>Email</dt><dd>{#if s.email}<a href="mailto:{s.email}">{s.email}</a>{:else}—{/if}</dd>
					<dt>Factory address</dt><dd>{s.address}, {s.city}, {s.state} {s.pincode}</dd>
					<dt>Login account</dt>{#if data.owner}<dd>{data.owner.name} · {data.owner.email || '—'} · +91 {data.owner.phone}<div class="tiny muted">{data.owner.id} · since {day(data.owner.createdAt)}</div></dd>{:else}<dd class="muted">No seller login linked</dd>{/if}
				</dl>
				<div class="row gap mt">
					<a class="btn sm" href="tel:+91{s.phone}">📞 Call</a>
					<a class="btn wa sm" href="https://wa.me/91{s.whatsapp}" target="_blank" rel="noopener">💬 WhatsApp</a>
					{#if s.email}<a class="btn ghost sm" href="mailto:{s.email}">✉ Email</a>{/if}
				</div>
			</section>

			<section class="card">
				<h2>Company details <span class="tiny muted">(entered by the supplier)</span></h2>
				<dl class="details">
					<dt>GSTIN</dt><dd><code>{s.gstin}</code></dd>
					<dt>Main type of work</dt><dd>{s.attributes.mainShop || '—'}</dd>
					<dt>Order sizes</dt><dd>{s.attributes.orderTypes.join(', ') || '—'}</dd>
					<dt>Team size</dt><dd>{s.attributes.teamSize || '—'}</dd>
					<dt>Largest part</dt><dd>{s.attributes.maxPartSize || '—'}</dd>
					<dt>Best tolerance</dt><dd>{s.attributes.bestTolerance || '—'}</dd>
					{#if s.yearEstablished}<dt>Established</dt><dd>{s.yearEstablished}</dd>{/if}
					<dt>About</dt><dd>{s.about}</dd>
					<dt>Work they do</dt><dd>{#each s.processLabels as p}<span class="chip">{p}</span>{/each}</dd>
					<dt>Materials</dt><dd>{s.materialLabels.join(', ') || '—'}</dd>
					<dt>Industries</dt><dd>{s.industryLabels.join(', ') || '—'}</dd>
					<dt>Machines</dt><dd>{s.machines.map((m) => `${m.count}× ${m.name}`).join(', ') || '—'}</dd>
					<dt>Certifications</dt><dd>{s.certifications.join(', ') || '—'}</dd>
					{#if s.isEyantrikPlant}<dt>eYantrik plant</dt><dd>Yes — our own plant</dd>{/if}
				</dl>
			</section>

			<section class="card">
				<div class="row gap profile-row">
					<ProfileRing percent={data.profile.percent} size={56} stroke={5} />
					<div>
						<strong>Profile {data.profile.percent}% complete</strong>
						<div class="tiny muted">{data.profile.missing.length ? `Missing: ${data.profile.missing.map((m) => m.label.toLowerCase()).join(', ')}` : 'Everything filled in.'}</div>
					</div>
				</div>
				<h2 class="mt">Platform activity</h2>
				<div class="mini-stats">
					<div><strong>{a.invitedOpen}</strong><span>open invitations</span></div>
					<div><strong>{a.matchedOpen}</strong><span>open requirements matching</span></div>
					<div><strong>{a.interested}</strong><span>marked interested</span></div>
					<div><strong>{a.quotes.length}</strong><span>quotes sent</span></div>
					<div><strong>{a.won}</strong><span>orders won</span></div>
					<div><strong>{a.contactsInTotal}</strong><span>buyer calls / chats</span></div>
					<div><strong>{a.rating ?? '—'}</strong><span>rating ({a.reviewCount} review{a.reviewCount === 1 ? '' : 's'})</span></div>
				</div>

				<h3 class="mt">Quotations</h3>
				{#if a.quotes.length === 0}<p class="muted small mb-0">No quotations yet.</p>{:else}
					<div class="table-wrap"><table>
						<thead><tr><th>Requirement</th><th>Status</th><th class="num">Landed / pc</th><th>Updated</th></tr></thead>
						<tbody>{#each a.quotes as q (q.id)}<tr><td><a href="/admin?tab=requirements#{q.rfqId}">{q.title}</a><div class="tiny muted">{q.rfqId} · v{q.version}</div></td><td><span class="badge {q.status === 'ACCEPTED' ? 'ground' : 'neutral'}">{quoteStatus[q.status] ?? q.status}</span></td><td class="num">{inr(q.perPiece)}</td><td class="small">{day(q.updatedAt)}</td></tr>{/each}</tbody>
					</table></div>
				{/if}

				<h3 class="mt">Buyers who contacted them {#if a.contactsInTotal > a.contactsIn.length}<span class="tiny muted">(latest {a.contactsIn.length} of {a.contactsInTotal})</span>{/if}</h3>
				{#if a.contactsIn.length === 0}<p class="muted small mb-0">None yet.</p>{:else}
					<ul class="plain">{#each a.contactsIn as c (c.id)}<li class="small">{c.channel === 'PHONE' ? '📞' : '💬'} <strong>{c.who}</strong> · {fmt(c.at)}{#if c.rfqId} · {c.rfqId}{/if}</li>{/each}</ul>
				{/if}

				<h3 class="mt">Buyers they contacted {#if a.contactsOutTotal > a.contactsOut.length}<span class="tiny muted">(latest {a.contactsOut.length} of {a.contactsOutTotal})</span>{/if}</h3>
				{#if a.contactsOut.length === 0}<p class="muted small mb-0">None yet.</p>{:else}
					<ul class="plain">{#each a.contactsOut as c (c.id)}<li class="small">{c.channel === 'PHONE' ? '📞' : '💬'} <strong>{c.who}</strong> · {fmt(c.at)}{#if c.rfqId} · {c.rfqId}{/if}</li>{/each}</ul>
				{/if}

				<h3 class="mt">Buyer reviews</h3>
				{#if a.reviews.length === 0}<p class="muted small mb-0">No reviews yet.</p>{:else}
					<ul class="plain">{#each a.reviews as r (r.id)}<li class="small"><strong>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</strong> · {r.outcome === 'DEAL_DONE' ? 'Deal done' : 'No deal'} · {r.buyer} · {day(r.at)}{#if r.comment}<div>“{r.comment}”</div>{/if}</li>{/each}</ul>
				{/if}

				{#if a.tickets.length}
					<h3 class="mt">Help desk requests</h3>
					<ul class="plain">{#each a.tickets as t (t.id)}<li class="small"><a href="/admin?tab=helpdesk#{t.id}">{t.id}</a> · <span class="badge neutral">{t.status.toLowerCase().replace('_', ' ')}</span> · {day(t.createdAt)}<div class="muted">{t.message.slice(0, 120)}</div></li>{/each}</ul>
				{/if}
			</section>

			<section class="card">
				<h2>History</h2>
				{#if s.history.length === 0}<p class="muted small mb-0">No history yet.</p>{/if}
				<ol class="timeline">
					{#each s.history as h, i (i)}
						<li><span class="tiny muted">{fmt(h.at)} · {h.by}</span><strong>{actionLabel[h.action] ?? h.action}</strong>{#if h.note}<span class="small">{h.note}</span>{/if}</li>
					{/each}
				</ol>
				<form method="POST" action="?/note" use:enhance={keep} class="row gap mt note-form">
					<input name="note" placeholder="Add an internal note (e.g. called, waiting for clearer photo)" maxlength="500" />
					<button class="btn ghost sm">Add note</button>
				</form>
			</section>
		</div>

		<!-- ============ RIGHT: documents + decision ============ -->
		<div class="stack side">
			<section class="card">
				<h2>Submitted documents <span class="tiny muted">({s.documents.length})</span></h2>
				{#if s.verification === 'DOCS_VERIFIED' || s.verification === 'GROUND_VERIFIED'}<p class="tiny muted">Verified — kept on file for the team.</p>{/if}
				{#if s.documents.length === 0}
					<p class="muted small mb-0">No documents uploaded.</p>
				{:else}
					<div class="doc-tabs" role="tablist">
						{#each s.documents as d, i (i)}
							<button type="button" role="tab" aria-selected={shown === i} class:on={shown === i} onclick={() => (shown = i)}>{docLabel(d.kind, i)}</button>
						{/each}
					</div>
					<div class="viewer">
						{#if !doc.url}
							<p class="muted small">“{doc.fileName}” was uploaded before files were being kept. Ask the seller to upload it again (send back for changes).</p>
						{:else if isPdf}
							<iframe src="{doc.url}#view=FitH" title={docLabel(doc.kind, shown)}></iframe>
						{:else}
							<img src={doc.url} alt={docLabel(doc.kind, shown)} />
						{/if}
					</div>
					{#if doc.url}
						<div class="row gap small mt">
							<a href={doc.url} target="_blank" rel="noopener">Open in new tab ↗</a>
							<a href="{doc.url}?download=1">Download</a>
							<span class="muted">{doc.fileName}{#if doc.sizeKb} · {doc.sizeKb} KB{/if}</span>
						</div>
					{/if}
				{/if}
			</section>

			<section class="card decision">
				{#if s.verification === 'DOCS_SUBMITTED'}
					<h2>Your decision</h2>
					<p class="small muted">Open each document above and confirm:</p>
					<form method="POST" action="?/approve" use:enhance={keep}>
						{#each data.reviewChecks as c (c.id)}
							<label class="tick"><input type="checkbox" name="check" value={c.id} bind:group={ticked} /> <span>{c.label}{#if c.required} <span class="req">*</span>{/if}</span></label>
						{/each}
						<button class="btn ok block mt" disabled={!ready}>✓ Approve documents</button>
						{#if !ready}<p class="tiny muted center-text mb-0">Tick every check marked * to approve.</p>{/if}
					</form>
				{:else if s.verification === 'DOCS_VERIFIED'}
					<h2>Factory visit</h2>
					<p class="small muted">Documents are verified (seller is listed). Record the ground visit to give them the ✓✓ badge.</p>
					<form method="POST" action="?/groundVerify" use:enhance={keep}>
						<div class="form-grid">
							<div class="field"><label for="inspector">Visited by</label><input id="inspector" name="inspector" required /></div>
							<div class="field"><label for="date">Visit date</label><input id="date" type="date" name="date" max={today} required /></div>
						</div>
						{#each data.visitChecks as c (c.id)}
							<label class="tick"><input type="checkbox" name="visit" value={c.id} /> <span>{c.label} <span class="req">*</span></span></label>
						{/each}
						<div class="field mt"><label for="notes">Notes from the visit</label><textarea id="notes" name="notes" placeholder="What was checked, anything different from the listing"></textarea></div>
						<button class="btn ok block">✓✓ Mark ground verified</button>
					</form>
				{:else if s.verification === 'GROUND_VERIFIED'}
					<h2>Fully verified ✓✓</h2>
					<p class="small mb-0">Factory visited {s.groundInspection?.date} by {s.groundInspection?.inspector}.{#if s.groundInspection?.notes} “{s.groundInspection.notes}”{/if}</p>
				{:else}
					<h2>Waiting for the seller</h2>
					<p class="small mb-0">Sent back for changes: <strong>{s.rejectionReason}</strong>. It returns to the work queue when they resubmit.</p>
				{/if}

				{#if s.verification === 'DOCS_SUBMITTED' || s.verification === 'DOCS_VERIFIED'}
					<div class="changes">
						{#if !showChanges && !(form && 'changes' in form)}
							<button type="button" class="linkish small" onclick={() => (showChanges = true)}>Something's wrong? Send back for changes</button>
						{:else}
							<form method="POST" action="?/requestChanges" use:enhance={keep}>
								<div class="field"><label for="reason">What should the seller fix?</label>
									<select id="reason" name="reason" bind:value={reason} required>
										<option value="" disabled>Choose a reason</option>
										{#each data.changeReasons as r}<option value={r}>{r}</option>{/each}
									</select>
								</div>
								<div class="field"><label for="note">Details for the seller {reason === 'Other' ? '(required)' : '(optional)'}</label><input id="note" name="note" maxlength="500" placeholder="e.g. Upload a clearer photo of page 1" /></div>
								<button class="btn danger block">Send back for changes</button>
							</form>
						{/if}
					</div>
				{/if}
			</section>

			<AccountControl who="supplier" status={data.account.status} reason={data.account.reason} history={data.owner?.accountLog ?? []} />
		</div>
	</div>
</main>

<style>
	.review { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); gap: 18px; align-items: start; }
	@media (max-width: 960px) { .review { grid-template-columns: minmax(0, 1fr); } .side { order: -1; } }
	.side { position: sticky; top: 84px; }
	@media (max-width: 960px) { .side { position: static; } }
	h2 { font-size: 1.05rem; }
	.checks-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
	.checks-list li { display: flex; gap: 10px; align-items: flex-start; }
	.checks-list li > span:last-child { display: flex; flex-direction: column; }
	.mark { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font-size: 0.75rem; font-weight: 800; flex: none; }
	.pass .mark { background: var(--ok-soft); color: var(--ok); }
	.problem .mark { background: var(--warn-soft); color: var(--warn); }
	.info .mark { background: var(--brand-soft); color: var(--brand); }
	.details { display: grid; grid-template-columns: 140px minmax(0, 1fr); gap: 8px 14px; margin: 0; font-size: 0.9rem; }
	.details dt { color: var(--muted); font-weight: 600; }
	.details dd { margin: 0; }
	@media (max-width: 560px) { .details { grid-template-columns: minmax(0, 1fr); } .details dd { margin-bottom: 6px; } }
	.timeline { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
	.timeline li { display: flex; flex-direction: column; border-left: 3px solid var(--line-2); padding-left: 10px; }
	.note-form input { flex: 1; min-width: 200px; }
	.doc-tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
	.doc-tabs button { border: 1px solid var(--line-2); background: #fff; border-radius: 999px; padding: 5px 12px; font: inherit; font-size: 0.82rem; font-weight: 600; cursor: pointer; }
	.doc-tabs button.on { background: var(--brand); border-color: var(--brand); color: #fff; }
	.viewer { border: 1px solid var(--line); border-radius: 12px; background: #f6f7fb; min-height: 220px; display: grid; place-items: center; overflow: hidden; }
	.viewer iframe { width: 100%; height: 560px; border: 0; background: #fff; }
	.viewer img { max-width: 100%; max-height: 560px; object-fit: contain; display: block; }
	.viewer p { padding: 20px; }
	.tick { display: flex; gap: 10px; align-items: flex-start; font-weight: 400; padding: 7px 0; border-bottom: 1px solid var(--line); cursor: pointer; }
	.tick input { margin-top: 3px; flex: none; }
	.changes { margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--line-2); }
	.center-text { text-align: center; margin-top: 6px; }
	h3 { font-size: 0.9rem; }
	.mini-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
	.mini-stats div { background: #f6f7fb; border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; display: flex; flex-direction: column; }
	.mini-stats strong { font-size: 1.1rem; }
	.mini-stats span { font-size: 0.75rem; color: var(--muted); }
	@media (max-width: 560px) { .mini-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
	.plain { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
</style>
