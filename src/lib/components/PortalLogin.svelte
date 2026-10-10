<!-- Role-specific login / sign-up form used by /login/buyer, /login/seller and /admin/login. -->
<script lang="ts">
	import { enhance } from "$app/forms";
	import PhoneInput from "#lib/components/PhoneInput.svelte";

	type Form = {
		mode?: "login" | "signup";
		loginId?: string;
		error?: string;
		wrongPortal?: string | null;
		values?: Record<string, string>;
		errors?: Record<string, string>;
	} | null;

	let {
		portal,
		redirectTo,
		initialMode,
		signedInAs,
		prefill = null,
		form,
	}: {
		portal: "BUYER" | "SELLER" | "ADMIN";
		redirectTo: string;
		initialMode: "login" | "signup";
		/** the person's OTHER signed-in side (e.g. "SELLER" on the buyer portal) — it stays signed in */
		signedInAs: string | null;
		/** sign-up details copied from that other account, so the second account takes seconds */
		prefill?: Record<string, string> | null;
		form: Form;
	} = $props();

	// Works on the server too: the tab the user clicked, else the last form result, else the URL's ?mode=.
	let picked = $state<"login" | "signup" | null>(null);
	const mode = $derived(picked ?? form?.mode ?? initialMode);
	let showPw = $state(false);
	let busy = $state(false);
	const pending = () => {
		busy = true;
		return async ({
			update,
		}: {
			update: (o?: { reset?: boolean }) => Promise<void>;
		}) => {
			picked = null; // let the server's answer (e.g. sign-up errors) decide the tab
			await update({ reset: false });
			busy = false;
		};
	};

	const COPY = {
		BUYER: {
			title: "Buyer login",
			sub: "Post requirements, compare quotations and track orders.",
			other: {
				label: "Are you a manufacturer? Seller login →",
				href: "/login/seller",
			},
		},
		SELLER: {
			title: "Seller login",
			sub: "Get matched buyer leads and send quotations.",
			other: {
				label: "Looking to buy? Buyer login →",
				href: "/login/buyer",
			},
		},
		ADMIN: {
			title: "eYantrik admin",
			sub: "Restricted access for the eYantrik team.",
			other: null,
		},
	};
	const copy = $derived(COPY[portal]);
	const errors = $derived(form?.errors ?? {});
	const v = $derived(form?.values ?? prefill ?? {});
	const qs = $derived(
		redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : "",
	);
</script>

<main class="container narrow">
	<div class="card" class:admin={portal === "ADMIN"}>
		<p class="eyebrow">
			{portal === "ADMIN"
				? "Restricted"
				: portal === "BUYER"
					? "For buyers"
					: "For manufacturers"}
		</p>
		<h1>
			{mode === "signup"
				? portal === "BUYER"
					? "Create a buyer account"
					: portal === "SELLER"
						? "Register as a seller"
						: "Create the first admin account"
				: copy.title}
		</h1>
		<p class="muted small">
			{mode === "signup" && portal === "ADMIN"
				? "One-time setup. This page closes as soon as an admin account exists."
				: copy.sub}
		</p>

		{#if signedInAs && signedInAs !== portal && portal !== "ADMIN"}
			<div class="alert info small">
				You're signed in as a <strong>{signedInAs.toLowerCase()}</strong> in
				this browser — that stays signed in. Buyer and seller accounts are
				separate (one of each per mobile number).
				{#if prefill && mode === "signup"}We've filled in your details from
					your {signedInAs.toLowerCase()} account.{/if}
			</div>
		{/if}

		{#if portal !== "ADMIN"}
			<div class="seg" role="tablist">
				<button
					role="tab"
					aria-selected={mode === "login"}
					class:on={mode === "login"}
					onclick={() => (picked = "login")}>Log in</button
				>
				<button
					role="tab"
					aria-selected={mode === "signup"}
					class:on={mode === "signup"}
					onclick={() => (picked = "signup")}>Create account</button
				>
			</div>
		{/if}

		{#if form?.error && mode === "login"}
			<div class="alert bad" role="alert">
				{form.error}
				{#if form.wrongPortal === "SELLER"}<a href="/login/seller"
						>Go to Seller login →</a
					>{:else if form.wrongPortal === "BUYER"}<a
						href="/login/buyer">Go to Buyer login →</a
					>{/if}
			</div>
		{/if}

		{#if mode === "login"}
			<form
				method="POST"
				action="?/login"
				use:enhance={pending}
			>
				<input type="hidden" name="redirectTo" value={redirectTo} />
				<div class="field">
					<label for="loginId"
						>{portal === "ADMIN"
							? "Admin ID"
							: "Email or mobile number"}</label
					>
					<input
						id="loginId"
						name="loginId"
						autocomplete="username"
						value={form?.loginId ?? ""}
						required
						maxlength="120"
					/>
				</div>
				<div class="field">
					<label for="password">Password</label>
					<div class="pw">
						<input
							id="password"
							name="password"
							type={showPw ? "text" : "password"}
							autocomplete="current-password"
							required
							maxlength="200"
						/>
						<button
							type="button"
							class="linkish small"
							onclick={() => (showPw = !showPw)}
							aria-label={showPw
								? "Hide password"
								: "Show password"}
							>{showPw ? "Hide" : "Show"}</button
						>
					</div>
				</div>
				<button
					class="btn block {portal === 'ADMIN'
						? 'dark'
						: portal === 'SELLER'
							? 'ok'
							: ''}"
					disabled={busy}>{busy ? "Signing in…" : "Log in"}</button
				>
			</form>
		{:else}
			<form
				method="POST"
				action="?/signup"
				use:enhance={pending}
				novalidate
			>
				<input type="hidden" name="redirectTo" value={redirectTo} />
				{#if errors.form}<div class="alert bad" role="alert">
						{errors.form}
					</div>{/if}
				<div class="form-grid">
					<div class="field" class:invalid={errors.name}>
						<label for="name"
							>Your name <span class="req">*</span></label
						><input
							id="name"
							name="name"
							autocomplete="name"
							value={v.name ?? ""}
						/>{#if errors.name}<span class="err">{errors.name}</span
							>{/if}
					</div>
					{#if portal !== "ADMIN"}<div
							class="field"
							class:invalid={errors.companyName}
						>
							<label for="companyName"
								>{portal === "SELLER"
									? "Factory / company name"
									: "Company name"}
								<span class="req">*</span></label
							><input
								id="companyName"
								name="companyName"
								autocomplete="organization"
								value={v.companyName ?? ""}
							/>{#if errors.companyName}<span class="err"
									>{errors.companyName}</span
								>{/if}
						</div>{/if}
					<div class="field" class:invalid={errors.phone}>
						<label for="phone"
							>Mobile <span class="req">*</span></label
						><PhoneInput id="phone" name="phone" value={v.phone ?? ""} />{#if errors.phone}<span class="err"
								>{errors.phone}</span
							>{:else}<span class="hint"
								>10 digits, starting with 6, 7, 8 or 9.</span
							>{/if}
					</div>
					<div class="field" class:invalid={errors.email}>
						<label for="email"
							>Email <span class="req">*</span></label
						><input
							id="email"
							name="email"
							type="email"
							autocomplete="email"
							value={v.email ?? ""}
						/>{#if errors.email}<span class="err"
								>{errors.email}</span
							>{/if}
					</div>
					<div class="field" class:invalid={errors.password}>
						<label for="newpw"
							>Password <span class="req">*</span></label
						><input
							id="newpw"
							name="password"
							type={showPw ? "text" : "password"}
							autocomplete="new-password"
						/>{#if errors.password}<span class="err"
								>{errors.password}</span
							>{:else}<span class="hint"
								>8+ characters with a letter and a number.</span
							>{/if}
					</div>
					<div class="field" class:invalid={errors.confirm}>
						<label for="confirm"
							>Confirm password <span class="req">*</span></label
						><input
							id="confirm"
							name="confirm"
							type={showPw ? "text" : "password"}
							autocomplete="new-password"
						/>{#if errors.confirm}<span class="err"
								>{errors.confirm}</span
							>{/if}
					</div>
				</div>
				<label class="row gap small mb" style="font-weight:400"
					><input
						type="checkbox"
						onchange={(e) => (showPw = e.currentTarget.checked)}
					/> Show passwords</label
				>
				{#if portal !== "ADMIN"}<label
						class="row gap small mb"
						class:invalid={errors.terms}
						style="font-weight:400"
						><input type="checkbox" name="terms" /> I agree to
						eYantrik's terms and to be contacted about my {portal ===
						"SELLER"
							? "leads"
							: "requirements"}.</label
					>{/if}
				{#if errors.terms}<div class="err mb">{errors.terms}</div>{/if}
				<button
					class="btn block {portal === 'SELLER'
						? 'ok'
						: portal === 'ADMIN'
							? 'dark'
							: ''}"
					disabled={busy}
					>{busy
						? "Creating account…"
						: portal === "SELLER"
							? "Create seller account"
							: portal === "ADMIN"
								? "Create admin account"
								: "Create buyer account"}</button
				>
				{#if portal === "SELLER"}<p class="tiny muted mt mb-0">
						Next you'll register your factory (GST, machines,
						photos) for verification.
					</p>{/if}
			</form>
		{/if}

		{#if copy.other}<p class="small mt mb-0">
				<a href="{copy.other.href}{qs}">{copy.other.label}</a>
			</p>{/if}
	</div>
</main>

<style>
	.admin {
		border-top: 4px solid var(--ink);
	}
	.seg {
		display: flex;
		background: #f1f5f9;
		border-radius: 8px;
		padding: 4px;
		margin: 12px 0 16px;
	}
	.seg button {
		flex: 1;
		border: none;
		background: none;
		padding: 8px;
		border-radius: 6px;
		font: inherit;
		font-weight: 700;
		color: var(--muted);
		cursor: pointer;
	}
	.seg button.on {
		background: #fff;
		color: var(--ink);
		box-shadow: var(--shadow);
	}
	.pw {
		display: flex;
		gap: 8px;
		align-items: center;
	}
	.pw input {
		flex: 1;
	}
</style>
