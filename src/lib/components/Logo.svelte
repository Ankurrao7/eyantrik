<!-- eYantrik logo: hex-nut mark + wordmark. `light` = for dark backgrounds. -->
<script lang="ts">
	let { light = false, size = 30 }: { light?: boolean; size?: number } = $props();
	const uid = $props.id(); // same id on server and browser
	const gid = `lg-${uid}`;
</script>

<span class="logo" class:light>
	<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
		<defs>
			<linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
				<stop offset="0" stop-color="#3355ff" />
				<stop offset="1" stop-color="#6b4dff" />
			</linearGradient>
		</defs>
		<path d="M16 1.5 28.6 8.75v14.5L16 30.5 3.4 23.25V8.75z" fill="url(#{gid})" />
		<circle cx="16" cy="16" r="6.2" fill="none" stroke="#fff" stroke-width="2.6" />
		<circle cx="16" cy="16" r="1.9" fill="#ff6a2b" />
	</svg>
	<span class="word">e<b>Yantrik</b></span>
</span>

<style>
	.logo { display: inline-flex; align-items: center; gap: 9px; }
	.word { font-family: var(--font-display); font-weight: 800; font-size: 1.28rem; letter-spacing: -0.03em; color: var(--ink); }
	.word b { font-weight: 800; }
	.light .word { color: #fff; }
</style>
