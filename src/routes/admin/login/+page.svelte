<script lang="ts">
	import PortalLogin from '#lib/components/PortalLogin.svelte';

	let { data, form } = $props();
</script>

<svelte:head><title>Admin login · eYantrik</title><meta name="robots" content="noindex, nofollow" /></svelte:head>

{#if data.needsSetup}
	<div class="container narrow"><div class="alert info">No admin account exists yet. <a href="/admin/setup">Set up the first admin →</a></div></div>
{/if}

<PortalLogin portal="ADMIN" redirectTo={data.redirectTo} initialMode="login" signedInAs={null} {form} />
