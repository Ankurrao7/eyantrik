<script lang="ts">
	import PhoneInput from '#lib/components/PhoneInput.svelte';
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	const v = $derived((form && 'values' in form ? form.values : {}) as Record<string, string>);
	const errors = $derived((form && 'errors' in form ? form.errors : {}) as Record<string, string>);
	let busy = $state(false);

	const needs = $derived(
		data.role === 'SELLER'
			? [
					{ id: 'FIND_BUYERS', label: 'Help me find buyers / fill spare capacity' },
					{ id: 'SUBCONTRACT', label: 'I need a sub-contractor for part of a job' },
					{ id: 'OTHER', label: 'Something else' }
				]
			: [
					{ id: 'MANAGE_ORDER', label: 'Manage my order end-to-end (one point of contact)' },
					{ id: 'FIND_SUPPLIER', label: 'Help me find the right supplier' },
					{ id: 'TECHNICAL', label: 'Technical / engineering advice before I order' },
					{ id: 'OTHER', label: 'Something else' }
				]
	);
</script>

<svelte:head>
	<title>Help desk — let eYantrik manage your sourcing</title>
	<meta name="description" content="Talk to eYantrik's manufacturing help desk. We can manage your order end-to-end, find the right supplier, or give engineering advice." />
</svelte:head>

<main class="container mid">
	<div class="grid main-aside">
		<section>
			<p class="eyebrow">eYantrik help desk</p>
			<h1>Need assistance? We'll step in.</h1>
			<p class="muted">Our engineers call you back, understand the job, and either guide you to the right supplier or take full responsibility — we make it in our own plant or manage partner factories, with one point of contact and one invoice.</p>

			{#if form && 'ok' in form && form.ok}
				<div class="alert ok">
					<strong>{form.duplicate ? 'You already have an open request for this requirement' : 'Request received ✓'}</strong>
					Ticket <code>{form.ticketId}</code>. Our team will call you {form.duplicate ? 'soon' : 'at your preferred time'}.
					{#if data.role === 'BUYER'}<a href="/buyer/dashboard">Back to dashboard →</a>{:else if data.role === 'SELLER'}<a href="/seller">Back to dashboard →</a>{/if}
				</div>
			{:else if data.existingTicket}
				<div class="alert info"><strong>Help desk is already on it.</strong> Ticket <code>{data.existingTicket.id}</code> is open for this requirement.</div>
			{:else}
				{#if errors.form}<div class="alert bad" role="alert">{errors.form}</div>{/if}
				<form
					method="POST"
					class="card"
					novalidate
					use:enhance={() => {
						busy = true;
						return async ({ update }) => {
							await update({ reset: false });
							busy = false;
						};
					}}
				>
					{#if data.rfq}
						<input type="hidden" name="rfqId" value={data.rfq.id} />
						<div class="alert info small">About requirement <strong>{data.rfq.id} — {data.rfq.title}</strong>. Our team will see its full details.</div>
					{/if}

					{#if data.prefill}
						<p class="small">Calling you on <strong>+91 {data.prefill.phone}</strong> ({data.prefill.name}, {data.prefill.companyName})</p>
					{:else}
						<div class="form-grid">
							<div class="field" class:invalid={errors.name}>
								<label for="name">Your name <span class="req">*</span></label>
								<input id="name" name="name" value={v.name ?? ''} required />
								{#if errors.name}<span class="err">{errors.name}</span>{/if}
							</div>
							<div class="field" class:invalid={errors.phone}>
								<label for="phone">Mobile <span class="req">*</span></label>
								<PhoneInput id="phone" name="phone" value={v.phone ?? ''} required />
								{#if errors.phone}<span class="err">{errors.phone}</span>{/if}
							</div>
							<div class="field full">
								<label for="companyName">Company</label>
								<input id="companyName" name="companyName" value={v.companyName ?? ''} />
							</div>
						</div>
					{/if}

					<div class="field">
						<label for="need">What do you need?</label>
						<select id="need" name="need" value={v.need ?? needs[0].id}>
							{#each needs as n}<option value={n.id}>{n.label}</option>{/each}
						</select>
					</div>
					<div class="field" class:invalid={errors.message}>
						<label for="message">Describe it <span class="req">*</span></label>
						<textarea id="message" name="message" maxlength="2000" placeholder="Part, quantity, deadline, what's been difficult so far…">{v.message ?? ''}</textarea>
						{#if errors.message}<span class="err">{errors.message}</span>{/if}
					</div>
					<div class="field">
						<label for="preferredTime">Best time to call</label>
						<select id="preferredTime" name="preferredTime" value={v.preferredTime ?? 'Anytime'}>
							<option>Anytime</option>
							<option>Morning (10 AM – 1 PM)</option>
							<option>Afternoon (2 PM – 5 PM)</option>
							<option>Evening (5 PM – 7 PM)</option>
						</select>
					</div>
					<button class="btn block" disabled={busy}>{busy ? 'Sending…' : 'Request a call back'}</button>
				</form>
			{/if}
		</section>

		<aside class="card dark">
			<h3>How eYantrik steps in</h3>
			<ul class="small how">
				<li><strong>As your seller:</strong> we take the order, make it in our own plant or with verified partners, inspect it (CMM), and deliver. One invoice.</li>
				<li><strong>As your buyer:</strong> for manufacturers — we bring you jobs from our managed orders.</li>
				<li><strong>As your advisor:</strong> process, material and tooling advice before you commit.</li>
			</ul>
			{#if data.helpdesk.phone}
				<p class="small mb-0" style="color:#94a3b8">📞 Help desk: <a href="tel:{data.helpdesk.phone.replace(/\s/g, '')}" style="color:#cbd5e1">{data.helpdesk.phone}</a>{#if data.helpdesk.hours}<br />{data.helpdesk.hours}{/if}</p>
			{/if}
		</aside>
	</div>
</main>

<style>
	.how { padding-left: 18px; color: #cbd5e1; }
	.how li { margin-bottom: 10px; }
	.how strong { color: #fff; }
</style>
