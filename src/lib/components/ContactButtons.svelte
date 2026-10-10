<!-- Phone + WhatsApp buttons. Every tap is logged to /api/contact-log so we can show
     sellers how many genuine leads reached them through eYantrik. -->
<script lang="ts">
	let {
		phone,
		whatsapp,
		message = '',
		sellerId,
		buyerUserId,
		rfqId,
		size = ''
	}: {
		phone: string;
		whatsapp: string;
		message?: string;
		sellerId?: string;
		buyerUserId?: string;
		rfqId?: string;
		size?: '' | 'sm';
	} = $props();

	let logged = $state<string | null>(null);

	function log(channel: 'PHONE' | 'WHATSAPP') {
		const body = JSON.stringify({ channel, sellerId, buyerUserId, rfqId });
		// Which of the person's accounts is calling: a seller calls buyers, a buyer calls sellers.
		const url = `/api/contact-log?as=${buyerUserId ? 'SELLER' : 'BUYER'}`;
		try {
			const sent = navigator.sendBeacon?.(url, new Blob([body], { type: 'application/json' }));
			if (!sent) fetch(url, { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => {});
		} catch {
			// Logging must never block the call itself.
		}
		logged = channel === 'PHONE' ? 'Opening dialer…' : 'Opening WhatsApp…';
		setTimeout(() => (logged = null), 2500);
	}

	const waHref = $derived(`https://wa.me/91${whatsapp}${message ? `?text=${encodeURIComponent(message)}` : ''}`);
</script>

<div class="row gap">
	<a class="btn {size}" href="tel:+91{phone}" onclick={() => log('PHONE')}>📞 +91 {phone.slice(0, 5)} {phone.slice(5)}</a>
	<a class="btn wa {size}" href={waHref} target="_blank" rel="noopener noreferrer" onclick={() => log('WHATSAPP')}>WhatsApp</a>
	{#if logged}<span class="tiny muted" role="status">{logged}</span>{/if}
</div>
