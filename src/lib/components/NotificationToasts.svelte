<!-- In-app pop-up notifications ("cloud" toasts). Polls /api/notifications while logged in and
     pops up anything not shown yet in this browser tab session. Mobile / email push is Phase 2. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';

	let { userId, role, onUnread }: { userId: string; role: 'BUYER' | 'SELLER'; onUnread: (n: number) => void } = $props();
	// Each tab polls for its own side (buyer or seller), so the two never mix.
	const inbox = $derived(`/${role.toLowerCase()}/notifications`);

	type Item = { id: string; type: string; title: string; body: string };
	let toasts = $state<Item[]>([]);
	const POLL_MS = 15_000;
	const key = $derived(`ey_toasted_${userId}`);

	function seen(): Set<string> {
		try {
			return new Set(JSON.parse(sessionStorage.getItem(key) ?? '[]'));
		} catch {
			return new Set();
		}
	}
	function remember(ids: string[]) {
		try {
			const s = seen();
			ids.forEach((id) => s.add(id));
			sessionStorage.setItem(key, JSON.stringify([...s].slice(-200)));
		} catch {
			// storage unavailable (private mode) — toasts may repeat, which is harmless
		}
	}

	async function poll() {
		try {
			const res = await fetch(`/api/notifications?as=${role}`, { headers: { accept: 'application/json' } });
			if (!res.ok) return;
			const data: { unread: number; items: Item[] } = await res.json();
			onUnread(data.unread);
			const already = seen();
			const fresh = data.items.filter((i) => !already.has(i.id)).slice(0, 3);
			if (fresh.length) {
				remember(fresh.map((f) => f.id));
				toasts = [...fresh, ...toasts].slice(0, 4);
				for (const f of fresh) setTimeout(() => dismiss(f.id), 9000);
			}
		} catch {
			// offline / server restarting — try again next tick
		}
	}

	function dismiss(id: string) {
		toasts = toasts.filter((t) => t.id !== id);
	}

	onMount(() => {
		poll();
		const t = setInterval(poll, POLL_MS);
		return () => clearInterval(t);
	});
	afterNavigate(() => poll());

	const icon: Record<string, string> = {
		NEW_LEAD: '📥', LEAD_TEASER: '🔒', INTERESTED: '👋', QUOTE_RECEIVED: '💰', QUOTE_REVISED: '✏️', COUNTER: '🤝',
		COUNTER_ACCEPTED: '✅', COUNTER_DECLINED: '✖️', SHORTLISTED: '⭐', AWARDED: '🏆', NOT_SELECTED: '📭', DECLINED: '✖️',
		WITHDRAWN: '↩️', VERIFICATION: '🛡️', RFQ_UPDATED: '🔄', ORDER_UPDATE: '📍', MESSAGE: '💬', MORE_INVITED: '📣'
	};
</script>

<div class="toasts" aria-live="polite">
	{#each toasts as t (t.id)}
		<div class="toast" role="status">
			<form method="POST" action="{inbox}?/open">
				<input type="hidden" name="id" value={t.id} />
				<button class="body">
					<span class="ic" aria-hidden="true">{icon[t.type] ?? '🔔'}</span>
					<span><strong>{t.title}</strong><span class="small">{t.body}</span></span>
				</button>
			</form>
			<button class="x" aria-label="Dismiss" onclick={() => dismiss(t.id)}>✕</button>
		</div>
	{/each}
</div>

<style>
	.toasts { position: fixed; right: 16px; bottom: 16px; z-index: 60; display: flex; flex-direction: column; gap: 10px; width: min(380px, calc(100vw - 32px)); }
	.toast { display: flex; align-items: flex-start; background: #fff; border: 1px solid var(--line); border-left: 4px solid var(--brand); border-radius: 12px; box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18); animation: pop 0.25s ease-out; }
	.toast form { flex: 1; }
	.body { display: flex; gap: 10px; align-items: flex-start; width: 100%; text-align: left; background: none; border: none; padding: 12px; cursor: pointer; font: inherit; color: var(--ink); }
	.body span { display: flex; flex-direction: column; gap: 2px; }
	.ic { font-size: 1.3rem; }
	.x { background: none; border: none; color: var(--muted); cursor: pointer; padding: 10px; font-size: 0.9rem; }
	@keyframes pop { from { transform: translateY(12px); opacity: 0; } to { transform: none; opacity: 1; } }
	@media (prefers-reduced-motion: reduce) { .toast { animation: none; } }
</style>
