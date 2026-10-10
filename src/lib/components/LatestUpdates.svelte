<!-- Dashboard panel: most recent notifications (unread highlighted). -->
<script lang="ts">
	let { items }: { items: { id: string; title: string; body: string; at: string; read: boolean }[] } = $props();
	const ago = (iso: string) => {
		const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
		if (m < 60) return m < 1 ? 'just now' : `${m} min ago`;
		const h = Math.round(m / 60);
		return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
	};
</script>

<section class="card updates">
	<div class="row between gap">
		<h3 class="mb-0">🔔 Latest updates</h3>
		<a class="small" href="/notifications">See all</a>
	</div>
	{#if items.length === 0}
		<p class="small muted mt mb-0">Nothing yet — updates about leads, quotes and orders appear here.</p>
	{:else}
		<ul>
			{#each items as n (n.id)}
				<li class:unread={!n.read}>
					<form method="POST" action="/notifications?/open">
						<input type="hidden" name="id" value={n.id} />
						<button><strong>{n.title}</strong><span class="small">{n.body}</span><span class="tiny muted">{ago(n.at)}</span></button>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	ul { list-style: none; padding: 0; margin: 10px 0 0; }
	li + li { border-top: 1px solid var(--line); }
	button { display: flex; flex-direction: column; gap: 2px; width: 100%; text-align: left; background: none; border: none; padding: 8px 6px; cursor: pointer; font: inherit; color: inherit; border-radius: 6px; }
	button:hover { background: #f8fafc; }
	li.unread button { background: var(--brand-soft); }
</style>
