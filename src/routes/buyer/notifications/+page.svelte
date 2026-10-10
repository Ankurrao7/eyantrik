<script lang="ts">
	import NotificationsInbox from '#lib/components/NotificationsInbox.svelte';

	let { data } = $props();
</script>

<NotificationsInbox items={data.items} />
