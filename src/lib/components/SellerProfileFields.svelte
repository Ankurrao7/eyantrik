<!-- Seller profile fields, shared by /seller/onboarding (SELF), /admin Add seller (TEAM) and the
     seller's own profile page (EDIT). In EDIT mode the verified identity — company name, GSTIN and
     factory address — is shown locked (changing it needs re-verification through the help desk), and
     documents are replaced by "add more shop-floor photos". Section ids (#company, #capabilities,
     #machines, #photos) are the targets of the profile-completeness checklist links. -->
<script lang="ts">
	import PhoneInput from './PhoneInput.svelte';
	import ProcessPicker from './ProcessPicker.svelte';
	import { CERTIFICATIONS, INDIAN_STATES, INDUSTRIES, MATERIAL_CATEGORIES, ORDER_TYPES, PART_SIZES, TEAM_SIZES, TOLERANCES } from '../taxonomy.ts';
	import { SHOPS } from '../processes.ts';

	type Values = {
		companyName?: string; contactPerson?: string; phone?: string; whatsapp?: string; email?: string;
		gstin?: string; address?: string; city?: string; state?: string; pincode?: string;
		yearEstablished?: string; about?: string; processes?: string[]; materials?: string[]; industries?: string[];
		machines?: { name: string; count: string }[]; certChoices?: string[]; certifications?: string;
		mainShop?: string; orderTypes?: string[]; teamSize?: string; maxPartSize?: string; bestTolerance?: string;
	};

	let {
		values = {},
		errors = {},
		mode,
		fixedPhone,
		photoCount = 0,
		maxPhotos = 10
	}: { values?: Values; errors?: Record<string, string>; mode: 'SELF' | 'TEAM' | 'EDIT'; fixedPhone?: string; photoCount?: number; maxPhotos?: number } = $props();
	const editing = $derived(mode === 'EDIT');

	let machines = $state<{ name: string; count: string }[]>([{ name: '', count: '1' }]);
	$effect(() => {
		machines = values.machines?.length ? values.machines.map((m) => ({ ...m })) : [{ name: '', count: '1' }];
	});
	const docsRequired = $derived(mode === 'SELF');
</script>

<fieldset id="company">
	<legend>Company</legend>
	{#if editing}<p class="hint locked-note">🔒 Company name, GSTIN and factory address are verified details. To change them, contact the help desk — the change is verified again.</p>{/if}
	<div class="form-grid">
		<div class="field full" class:invalid={errors.companyName}>
			<label for="companyName">Registered company name {#if !editing}<span class="req">*</span>{/if}</label>
			{#if editing}<input id="companyName" value={values.companyName ?? ''} disabled />{:else}<input id="companyName" name="companyName" value={values.companyName ?? ''} required maxlength="120" />{/if}
			{#if errors.companyName}<span class="err">{errors.companyName}</span>{/if}
		</div>
		<div class="field" class:invalid={errors.gstin}>
			<label for="gstin">GSTIN {#if !editing}<span class="req">*</span>{/if}</label>
			{#if editing}<input id="gstin" value={values.gstin ?? ''} disabled />{:else}<input id="gstin" name="gstin" value={values.gstin ?? ''} required maxlength="15" style="text-transform:uppercase" placeholder="09ABCDE1234F1Z5" />{/if}
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
			<span class="label" id="cert-label">Certifications</span>
			<div class="checks" role="group" aria-labelledby="cert-label">
				{#each CERTIFICATIONS as c (c)}
					<label><input type="checkbox" name="certChoices" value={c} checked={values.certChoices?.includes(c)} /> {c}</label>
				{/each}
			</div>
			<input id="certifications" name="certifications" value={values.certifications ?? ''} placeholder="Other certifications, comma separated" aria-label="Other certifications" class="mt-xs" />
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
				<span class="hint">Your login number{editing ? ' — to change it, contact the help desk' : ''}.</span>
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
		{#if editing}
			<div class="field full">
				<label for="address">Factory address 🔒</label>
				<input id="address" value="{values.address}, {values.city}, {values.state} {values.pincode}" disabled />
			</div>
		{:else}
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
		{/if}
	</div>
</fieldset>

<fieldset id="capabilities">
	<legend>Capabilities</legend>
	<p class="hint">Fields marked <span class="req">*</span> use fixed choices, so buyers can find you by type of work, order size and factory size.</p>
	<div class="form-grid">
		<div class="field full" class:invalid={errors.mainShop}>
			<label for="mainShop">Main type of work <span class="req">*</span></label>
			<select id="mainShop" name="mainShop" value={values.mainShop ?? ''} required>
				<option value="" disabled>Choose what your factory mostly does…</option>
				{#each SHOPS as sh (sh.id)}<option value={sh.id}>{sh.emoji} {sh.label}</option>{/each}
			</select>
			<span class="hint">Your main category on eYantrik. You can still tick processes from other shops below.</span>
			{#if errors.mainShop}<span class="err">{errors.mainShop}</span>{/if}
		</div>
		<div class="field full" class:invalid={errors.orderTypes}>
			<span class="label" id="ord-label">Order sizes you take <span class="req">*</span></span>
			<div class="checks" role="group" aria-labelledby="ord-label">
				{#each ORDER_TYPES as o (o.id)}
					<label><input type="checkbox" name="orderTypes" value={o.id} checked={values.orderTypes?.includes(o.id)} /> {o.label}</label>
				{/each}
			</div>
			{#if errors.orderTypes}<span class="err">{errors.orderTypes}</span>{/if}
		</div>
		<div class="field" class:invalid={errors.teamSize}>
			<label for="teamSize">Team size <span class="req">*</span></label>
			<select id="teamSize" name="teamSize" value={values.teamSize ?? ''} required>
				<option value="" disabled>Select…</option>
				{#each TEAM_SIZES as t (t.id)}<option value={t.id}>{t.label}</option>{/each}
			</select>
			{#if errors.teamSize}<span class="err">{errors.teamSize}</span>{/if}
		</div>
		<div class="field" class:invalid={errors.maxPartSize}>
			<label for="maxPartSize">Largest part you can make</label>
			<select id="maxPartSize" name="maxPartSize" value={values.maxPartSize ?? ''}>
				<option value="">Not sure</option>
				{#each PART_SIZES as p (p.id)}<option value={p.id}>{p.label}</option>{/each}
			</select>
			{#if errors.maxPartSize}<span class="err">{errors.maxPartSize}</span>{/if}
		</div>
		<div class="field" class:invalid={errors.bestTolerance}>
			<label for="bestTolerance">Best tolerance you hold</label>
			<select id="bestTolerance" name="bestTolerance" value={values.bestTolerance ?? ''}>
				<option value="">Not sure</option>
				{#each TOLERANCES as t (t.id)}<option value={t.id}>{t.label}</option>{/each}
			</select>
			{#if errors.bestTolerance}<span class="err">{errors.bestTolerance}</span>{/if}
		</div>
	</div>
	<div class="field" class:invalid={errors.processes}>
		<span class="label" id="proc-label">What work does your factory do in-house? <span class="req">*</span></span>
		<span class="hint">Open a shop and tick everything you do yourself, or use the search box (e.g. VMC, wire cut, powder coating). Buyers only see requirements that match what you tick.</span>
		<ProcessPicker name="processes" selected={values.processes ?? []} mode="seller" />
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
	<div class="field" class:invalid={errors.industries}>
		<span class="label" id="ind-label">Industries you supply <span class="req">*</span></span>
		<span class="hint">Helps buyers in your industry find you first.</span>
		<div class="checks" role="group" aria-labelledby="ind-label">
			{#each INDUSTRIES as i (i.id)}
				<label><input type="checkbox" name="industries" value={i.id} checked={values.industries?.includes(i.id)} /> {i.label}</label>
			{/each}
		</div>
		{#if errors.industries}<span class="err">{errors.industries}</span>{/if}
	</div>

	<div class="field" class:invalid={errors.machines} id="machines">
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

{#if editing}
	<fieldset id="photos">
		<legend>Shop-floor photos</legend>
		<div class="field" class:invalid={errors.factoryPhotos}>
			<label for="factoryPhotos">Add more photos <span class="tiny muted">({photoCount} of {maxPhotos} on file)</span></label>
			<input id="factoryPhotos" name="factoryPhotos" type="file" accept=".jpg,.jpeg,.png,.webp" multiple disabled={photoCount >= maxPhotos} />
			<span class="hint">Machines, shop floor, finished parts. JPG/PNG/WebP, max 5 MB each. Profiles with 3+ photos get more buyer trust.</span>
			{#if errors.factoryPhotos}<span class="err">{errors.factoryPhotos}</span>{/if}
		</div>
	</fieldset>
{:else}
<fieldset id="photos">
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
			<span class="hint">Up to 10 photos, max 5 MB each. 3 or more photos complete your profile.</span>
			{#if errors.factoryPhotos}<span class="err">{errors.factoryPhotos}</span>{/if}
		</div>
	</div>
</fieldset>
{/if}

<style>
	.machine-row { display: grid; grid-template-columns: 1fr 90px auto; gap: 8px; margin-bottom: 6px; }
	fieldset { scroll-margin-top: 90px; }
	.field { scroll-margin-top: 90px; }
	.locked-note { margin: 0 0 10px; }
	.mt-xs { margin-top: 6px; }
</style>
