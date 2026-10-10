<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>{page.status} · eYantrik</title></svelte:head>

<main class="container narrow">
	<div class="card center">
		<p class="eyebrow">Error {page.status}</p>
		<h1>{page.status === 404 ? 'We couldn’t find that page' : page.error?.message}</h1>
		{#if page.status === 404}
			<p class="muted">The link may be old, or the listing may have been removed.</p>
		{/if}
		{#if page.error?.errorId}
			<p class="muted small">Reference: <code>{page.error.errorId}</code> — share this with support if it keeps happening.</p>
		{/if}
		<div class="row gap center-x">
			<a class="btn" href="/">Go home</a>
			<a class="btn ghost" href="/sellers">Browse suppliers</a>
		</div>
	</div>
</main>
