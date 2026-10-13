<!-- Admin only: shows when an account is switched off (nothing for active accounts). -->
<script lang="ts">
	let { status }: { status?: string } = $props();
</script>

{#if status === 'SUSPENDED'}
	<span class="badge pending" title="On hold by the eYantrik team — cannot sign in, hidden from the other side">⏸ Suspended</span>
{:else if status === 'DEACTIVATED'}
	<span class="badge rejected" title="Closed by the eYantrik team — cannot sign in, hidden from the other side">⛔ Deactivated</span>
{/if}
