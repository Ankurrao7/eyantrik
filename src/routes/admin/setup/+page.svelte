<script lang="ts">
	import PortalLogin from '#lib/components/PortalLogin.svelte';

	let { form } = $props();
</script>

<svelte:head><title>Admin setup · eYantrik</title><meta name="robots" content="noindex, nofollow" /></svelte:head>

<PortalLogin portal="ADMIN" redirectTo="" initialMode="signup" signedInAs={null} {form} />
