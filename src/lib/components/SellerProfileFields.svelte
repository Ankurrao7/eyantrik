<!-- Seller profile fields, shared by /seller/onboarding (self) and /admin Add seller (team). -->
<script lang="ts">
	import PhoneInput from './PhoneInput.svelte';
	import { INDIAN_STATES, INDUSTRIES, MATERIAL_CATEGORIES, PROCESSES } from '../taxonomy.ts';

	type Values = {
		companyName?: string; contactPerson?: string; phone?: string; whatsapp?: string; email?: string;
		gstin?: string; address?: string; city?: string; state?: string; pincode?: string;
		yearEstablished?: string; about?: string; processes?: string[]; materials?: string[]; industries?: string[];
		machines?: { name: string; count: string }[]; certifications?: string;
	};

	let {
		values = {},
		errors = {},
		mode,
		fixedPhone
	}: { values?: Values; errors?: Record<string, string>; mode: 'SELF' | 'TEAM'; fixedPhone?: string } = $props();

	let machines = $state<{ name: string; count: string }[]>([{ name: '', count: '1' }]);
	$effect(() => {
		machines = values.machines?.length ? values.machines.map((m) => ({ ...m })) : [{ name: '', count: '1' }];
	});
	const docsRequired = $derived(mode === 'SELF');
</script>

<fieldset>
	<legend>Company</legend>
	<div class="form-grid">
		<div class="field full" class:invalid={errors.companyName}>
			<label for="companyName">Registered company name <span class="req">*</span></label>
			<input id="companyName" name="companyName" value={values.companyName ?? ''} required maxlength="120" />
			{#if errors.companyName}<span class="err">{errors.companyName}</span>{/if}
		</div>
		<div class="field" class:invalid={errors.gstin}>
			<label for="gstin">GSTIN <span class="req">*</span></label>
			<input id="gstin" name="gstin" value={values.gstin ?? ''} required maxlength="15" style="text-transform:uppercase" placeholder="09ABCDE1234F1Z5" />
			{#if errors.gstin}<span class="err">{errors.gstin}</span>{/if}
		</div>
		<div class="field" class:invalid={errors.yearEstablished}>
			<label for="yearEstablished">Year established</label>
			<input id="yearEstablished" name="yearEstablished" type="number" min="1900" max={new Date().getFullYear()} value={values.yearEstablished ?? ''} />
			{#if errors.yearEstablished}<span class="err">{errors.yearEstablished}</span>{/if}
		</div>
		<div class="field full" class:invalid={errors.about}>
			<label for="about">What do you make? <span class="req">*</span></label>
			<textarea id="about" name="about" maxlength="1000" placeholder="e.g. Precision turned and milled parts for auto & pump OEMs, tolerances to ±0.01 mm">{values.about ?? ''}</textarea>
			{#if errors.about}<span class="err">{errors.about}</span>{/if}
		</div>
		<div class="field full">
			<label for="certifications">Certifications</label>
			<input id="certifications" name="certifications" value={values.certifications ?? ''} placeholder="Comma separated, e.g. ISO 9001:2015, IATF 16949" />
		</div>
	</div>
</fieldset>

<fieldset>
	<legend>Contact & factory address</legend>
	<div class="form-grid">
		<div class="field" class:invalid={errors.contactPerson}>
			<label for="contactPerson">Contact person <span class="req">*</span></label>
			<input id="contactPerson" name="contactPerson" value={values.contactPerson ?? ''} required />
			{#if errors.contactPerson}<span class="err">{errors.contactPerson}</span>{/if}
		</div>
		<div class="field" class:invalid={errors.phone}>
			<label for="phone">Mobile (shown to buyers) <span class="req">*</span></label>
			{#if fixedPhone}
				<input id="phone" value="+91 {fixedPhone}" disabled />
				<span class="hint">Your login number.</span>
			{:else}
				<PhoneInput id="phone" name="phone" value={values.phone ?? ''} required />
				<span class="hint">The owner can later log in with this number.</span>
			{/if}
			{#if errors.phone}<span class="err">{errors.phone}</span>{/if}
		</div>
		<div class="field" class:invalid={errors.whatsapp}>
			<label for="whatsapp">WhatsApp number</label>
			<PhoneInput id="whatsapp" name="whatsapp" value={values.whatsapp ?? ''} placeholder="Leave blank if same as mobile" />
			{#if errors.whatsapp}<span class="err">{errors.whatsapp}</span>{/if}
		</div>
		<div class="field" class:invalid={errors.email}>
			<label for="email">Email</label>
			<input id="email" name="email" type="email" value={values.email ?? ''} />
			{#if errors.email}<span class="err">{errors.email}</span>{/if}
		</div>
		<div class="field full" class:invalid={errors.address}>
			<label for="address">Factory address <span class="req">*</span></label>
			<input id="address" name="address" value={values.address ?? ''} required placeholder="Plot / shed no., sector / industrial area" />
			{#if errors.address}<span class="err">{errors.address}</span>{/if}
		</div>
		<div class="field" class:invalid={errors.city}>
			<label for="city">City <span class="req">*</span></label>
			<input id="city" name="city" value={values.city ?? ''} required />
			{#if errors.city}<span class="err">{errors.city}</span>{/if}
		</div>
		<div class="field" class:invalid={errors.state}>
			<label for="state">State <span class="req">*</span></label>
			<select id="state" name="state" value={values.state ?? ''} required>
				<option value="" disabled>Select…</option>
				{#each INDIAN_STATES as st}<option value={st}>{st}</option>{/each}
			</select>
			{#if errors.state}<span class="err">{errors.state}</span>{/if}
		</div>
		<div class="field" class:invalid={errors.pincode}>
			<label for="pincode">Pincode <span class="req">*</span></label>
			<input id="pincode" name="pincode" inputmode="numeric" maxlength="6" value={values.pincode ?? ''} required />
			{#if errors.pincode}<span class="err">{errors.pincode}</span>{/if}
		</div>
	</div>
</fieldset>

<fieldset>
	<legend>Capabilities</legend>
	<div class="field" class:invalid={errors.processes}>
		<span class="label" id="proc-label">Processes you do in-house <span class="req">*</span></span>
		<div class="checks" role="group" aria-labelledby="proc-label">
			{#each PROCESSES as p (p.id)}
				<label><input type="checkbox" name="processes" value={p.id} checked={values.processes?.includes(p.id)} /> {p.label}</label>
			{/each}
		</div>
		{#if errors.processes}<span class="err">{errors.processes}</span>{/if}
	</div>
	<div class="field" class:invalid={errors.materials}>
		<span class="label" id="mat-label">Material families you work with <span class="req">*</span></span>
		<div class="checks" role="group" aria-labelledby="mat-label">
			{#each MATERIAL_CATEGORIES as m (m.id)}
				<label><input type="checkbox" name="materials" value={m.id} checked={values.materials?.includes(m.id)} /> {m.label}</label>
			{/each}
		</div>
		{#if errors.materials}<span class="err">{errors.materials}</span>{/if}
	</div>
	<div class="field">
		<span class="label" id="ind-label">Industries you supply</span>
		<span class="hint">Helps buyers in your industry find you first.</span>
		<div class="checks" role="group" aria-labelledby="ind-label">
			{#each INDUSTRIES as i (i.id)}
				<label><input type="checkbox" name="industries" value={i.id} checked={values.industries?.includes(i.id)} /> {i.label}</label>
			{/each}
		</div>
	</div>

	<div class="field" class:invalid={errors.machines}>
		<span class="label">Machine list <span class="req">*</span></span>
		<span class="hint">Make & model where possible. Our inspector checks these on the shop floor.</span>
		{#each machines as m, i}
			<div class="machine-row">
				<input name="machineName" placeholder="e.g. Haas VF-2 VMC" bind:value={m.name} aria-label="Machine {i + 1} name" maxlength="80" />
				<input name="machineCount" type="number" min="1" max="999" bind:value={m.count} aria-label="Machine {i + 1} quantity" />
				<button type="button" class="btn ghost sm" onclick={() => machines.splice(i, 1)} disabled={machines.length === 1} aria-label="Remove machine {i + 1}">✕</button>
			</div>
		{/each}
		<button type="button" class="btn ghost sm" style="align-self:flex-start" onclick={() => machines.push({ name: '', count: '1' })} disabled={machines.length >= 40}>+ Add machine</button>
		{#if errors.machines}<span class="err">{errors.machines}</span>{/if}
	</div>
</fieldset>

<fieldset>
	<legend>Documents {docsRequired ? '' : '(optional for team onboarding)'}</legend>
	<div class="form-grid">
		<div class="field" class:invalid={errors.gstCertificate}>
			<label for="gstCertificate">GST registration certificate {#if docsRequired}<span class="req">*</span>{/if}</label>
			<input id="gstCertificate" name="gstCertificate" type="file" accept=".pdf,.jpg,.jpeg,.png" />
			<span class="hint">PDF/JPG/PNG, max 5 MB</span>
			{#if errors.gstCertificate}<span class="err">{errors.gstCertificate}</span>{/if}
		</div>
		<div class="field" class:invalid={errors.udyam}>
			<label for="udyam">Udyam / MSME certificate</label>
			<input id="udyam" name="udyam" type="file" accept=".pdf,.jpg,.jpeg,.png" />
			{#if errors.udyam}<span class="err">{errors.udyam}</span>{/if}
		</div>
		<div class="field full" class:invalid={errors.factoryPhotos}>
			<label for="factoryPhotos">Shop-floor photos showing machines {#if docsRequired}<span class="req">*</span>{/if}</label>
			<input id="factoryPhotos" name="factoryPhotos" type="file" accept=".jpg,.jpeg,.png,.webp" multiple />
			<span class="hint">Up to 10 photos, max 5 MB each. (Demo: only file names are stored.)</span>
			{#if errors.factoryPhotos}<span class="err">{errors.factoryPhotos}</span>{/if}
		</div>
	</div>
</fieldset>

<style>
	.machine-row { display: grid; grid-template-columns: 1fr 90px auto; gap: 8px; margin-bottom: 6px; }
</style>
