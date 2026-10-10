<script lang="ts">
	import PortalLogin from '#lib/components/PortalLogin.svelte';

	let { data, form } = $props();
</script>

<svelte:head><title>Buyer login · eYantrik</title><meta name="robots" content="noindex" /></svelte:head>

<PortalLogin portal="BUYER" redirectTo={data.redirectTo} initialMode={data.mode} signedInAs={data.signedInAs} prefill={data.prefill} {form} />
