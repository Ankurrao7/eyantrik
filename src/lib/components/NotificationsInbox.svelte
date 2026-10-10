<!-- Notification inbox list — used by /buyer/notifications and /seller/notifications.
     Form actions are relative (?/open, ?/readAll), so they go to whichever inbox shows this list. -->
<script lang="ts">
	import { enhance } from '$app/forms';

	let { items }: { items: { id: string; type: string; title: string; body: string; at: string; read: boolean }[] } = $props();

	const icon: Record<string, string> = {
		NEW_LEAD: '📥', LEAD_TEASER: '🔒', INTERESTED: '👋', QUOTE_RECEIVED: '💰', QUOTE_REVISED: '✏️',
		COUNTER: '🤝', COUNTER_ACCEPTED: '✅', COUNTER_DECLINED: '✖️', SHORTLISTED: '⭐', AWARDED: '🏆',
		DECLINED: '✖️', NOT_SELECTED: '📭', WITHDRAWN: '↩️', VERIFICATION: '🛡️', NOT_FOR_US: '🙅', RFQ_UPDATED: '🔄', ORDER_UPDATE: '📍'
	};
	const ago = (iso: string) => {
		const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
		if (m < 1) return 'just now';
		if (m < 60) return `${m} min ago`;
		const h = Math.round(m / 60);
		return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
	};
</script>

<svelte:head><title>Notifications · eYantrik</title></svelte:head>

<main class="container mid">
	<div class="row between gap mb">
		<h1 class="mb-0">Notifications</h1>
		{#if items.some((n) => !n.read)}
			<form method="POST" action="?/readAll" use:enhance><button class="btn ghost sm">Mark all as read</button></form>
		{/if}
	</div>

	{#if items.length === 0}
		<div class="card center muted">You're all caught up. New leads, quotes and offers will appear here.</div>
	{:else}
		<ul class="list">
			{#each items as n (n.id)}
				<li class:unread={!n.read}>
					<form method="POST" action="?/open">
						<input type="hidden" name="id" value={n.id} />
						<button class="item">
							<span class="ic" aria-hidden="true">{icon[n.type] ?? '🔔'}</span>
							<span class="body">
								<strong>{n.title}</strong>
								<span class="small">{n.body}</span>
								<span class="tiny muted">{ago(n.at)}</span>
							</span>
							{#if !n.read}<span class="dot" aria-label="unread"></span>{/if}
						</button>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
</main>

<style>
	.list { list-style: none; padding: 0; margin: 0; background: #fff; border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow); }
	.list li + li { border-top: 1px solid var(--line); }
	.item { display: flex; gap: 12px; align-items: flex-start; width: 100%; text-align: left; background: none; border: none; padding: 14px 16px; cursor: pointer; font: inherit; color: inherit; }
	.item:hover { background: #fafbfe; }
	.unread .item { background: var(--brand-soft); }
	.ic { font-size: 1.3rem; }
	.body { display: flex; flex-direction: column; gap: 2px; flex: 1; }
	.dot { width: 9px; height: 9px; border-radius: 50%; background: var(--brand); margin-top: 6px; }
</style>
