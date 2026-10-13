<!-- Seller "My profile": completeness ring + what's missing (each item links to its field), then the edit form. -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import ProfileRing from '#lib/components/ProfileRing.svelte';
	import SellerProfileFields from '#lib/components/SellerProfileFields.svelte';

	let { data, form } = $props();
	const score = $derived(data.score);
	const errors = $derived((form?.errors ?? {}) as Record<string, string>);
	// After a failed save keep what the seller typed; locked identity always comes from the server.
	const values = $derived({ ...data.values, ...((form?.values ?? {}) as Record<string, unknown>) });
	let saving = $state(false);
</script>

<svelte:head><title>My profile · eYantrik</title></svelte:head>

<main class="container">
	<div class="row between gap">
		<div>
			<h1 class="mb-0">My profile</h1>
			<p class="muted small mb-0">What buyers see about your factory. <a href="/sellers/{data.slug}" target="_blank" rel="noopener">View public profile ↗</a></p>
		</div>
		<a class="btn ghost" href="/seller">← Lead feed</a>
	</div>

	{#if data.saved}<div class="alert ok mt" role="status">Profile saved ✓</div>{/if}
	{#if errors.form}<div class="alert bad mt" role="alert">{errors.form}</div>{/if}

	<section class="card score mt">
		<ProfileRing percent={score.percent} size={112} stroke={9} />
		<div class="score-main">
			<h2 class="mb-0">{score.percent === 100 ? 'Your profile is complete 🎉' : `Your profile is ${score.percent}% complete`}</h2>
			<p class="small muted">{score.percent === 100 ? 'Complete profiles rank higher in buyer matching — you get the most leads.' : 'Complete profiles rank higher in buyer matching and win more trust. Finish these to meet more leads:'}</p>
			{#if score.missing.length}
				<ul class="todo">
					{#each score.missing as m (m.id)}
						<li>
							<span class="pts">+{m.points}%</span>
							<span class="t"><strong>{m.label}</strong><span class="tiny muted">{m.hint}</span></span>
							{#if m.href}<a class="btn ghost sm" href={m.href}>{m.href.startsWith('/help') ? 'Ask' : 'Add'} →</a>{:else}<span class="tiny muted">eYantrik team</span>{/if}
						</li>
					{/each}
				</ul>
			{/if}
			<details class="done-list">
				<summary class="small">Done ({score.items.length - score.missing.length} of {score.items.length})</summary>
				<ul>{#each score.items.filter((i) => i.done) as i (i.id)}<li class="small">✓ {i.label}</li>{/each}</ul>
			</details>
		</div>
	</section>

	<form method="POST" enctype="multipart/form-data" novalidate class="mt" use:enhance={() => { saving = true; return async ({ update }) => { await update({ reset: false }); saving = false; }; }}>
		<SellerProfileFields mode="EDIT" {values} {errors} fixedPhone={data.phone} photoCount={data.photoCount} maxPhotos={data.maxPhotos} />
		<div class="save-bar">
			<span class="small muted">Changes show on your public profile right away.</span>
			<button class="btn ok" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
		</div>
	</form>
</main>

<style>
	.score { display: flex; gap: 22px; align-items: flex-start; }
	@media (max-width: 640px) { .score { flex-direction: column; align-items: center; text-align: left; } }
	.score-main { flex: 1; min-width: 0; }
	.score h2 { font-size: 1.15rem; }
	.todo { list-style: none; padding: 0; margin: 8px 0 0; display: grid; gap: 8px; }
	.todo li { display: flex; gap: 12px; align-items: center; border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; background: #fbfcfe; }
	.pts { font-weight: 800; font-size: 0.8rem; color: var(--brand); background: var(--brand-soft); border-radius: 999px; padding: 3px 9px; flex: none; }
	.t { flex: 1; min-width: 0; display: flex; flex-direction: column; }
	.done-list { margin-top: 10px; }
	.done-list ul { list-style: none; padding: 0; margin: 6px 0 0; display: grid; gap: 2px; color: var(--ok-ink, #05603f); }
	.save-bar { position: sticky; bottom: 0; display: flex; justify-content: space-between; align-items: center; gap: 12px; background: rgba(255, 255, 255, 0.95); border-top: 1px solid var(--line); padding: 12px 0; margin-top: 12px; }
</style>
