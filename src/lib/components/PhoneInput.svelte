<!-- Indian mobile number with a country-code dropdown (+91 India).
     Accepts any 10-digit number starting with 6, 7, 8 or 9 (e.g. 70…, 71…, 98…); spaces are fine.
     The server re-checks everything (normalizePhone in auth.ts) — this only helps people type it right. -->
<script lang="ts">
	let {
		id,
		name,
		value = '',
		required = false,
		placeholder = '98765 43210'
	}: { id: string; name: string; value?: string; required?: boolean; placeholder?: string } = $props();
</script>

<div class="phone">
	<select name="{name}Country" aria-label="Country code" class="cc">
		<option value="+91" selected>🇮🇳 +91</option>
	</select>
	<input
		{id}
		{name}
		type="tel"
		inputmode="numeric"
		autocomplete="tel-national"
		maxlength="14"
		{placeholder}
		{value}
		{required}
	/>
</div>

<style>
	.phone { display: flex; align-items: stretch; }
	.cc { width: auto; flex: none; border-top-right-radius: 0; border-bottom-right-radius: 0; border-right: none; background: #f9fafc; font-weight: 600; padding-right: 28px; }
	.phone input { flex: 1; min-width: 0; border-top-left-radius: 0; border-bottom-left-radius: 0; }
</style>
