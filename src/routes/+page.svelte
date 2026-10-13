<!-- src/routes/+page.svelte — home page. One address, three versions (decided per tab by tabSide):
     • visitor — public landing page for both audiences (SEO)
     • buyer   — the buying page + a "your requirements" strip; no seller sign-up prompts
     • seller  — leads, profile-completeness ring, seller steps & benefits, buyer demand by type of work;
                 no supplier search, quote-comparison picture, directory or "post a requirement" -->
<script lang="ts">
	import Icon, { type IconName } from '#lib/components/Icon.svelte';
	import SellerCard from '#lib/components/SellerCard.svelte';
	import ProfileRing from '#lib/components/ProfileRing.svelte';
	import VerificationBadge from '#lib/components/VerificationBadge.svelte';
	import type { VerificationStatus } from '#lib/taxonomy.ts';
	import { tabLane } from '#lib/tabSide.svelte.ts';

	let { data } = $props();
	// The page follows THIS tab's workspace (tabSide.svelte.ts): a seller tab gets the seller home, a buyer
	// tab the buyer home, an admin tab the public page as a visitor; a tab without one, the server's guess.
	const lane = $derived(tabLane.current ?? data.lane);
	const side = $derived(lane === 'ADMIN' ? 'ADMIN' : lane ? (data.sides[lane] ? lane : null) : data.role);
	const sideHasProfile = $derived(side === 'SELLER' ? !!data.sides.SELLER?.hasSellerProfile : data.hasSellerProfile);

	const guest = $derived(!side);
	const quickProcesses = $derived(data.categories.slice(0, 6));
	const hasSuppliers = $derived(data.stats.sellers > 0);

	const steps: { icon: IconName; title: string; text: string }[] = [
		{ icon: 'doc', title: 'Post your requirement', text: 'Part, material, quantity, drawings and delivery city — in about two minutes.' },
		{ icon: 'pin', title: 'Matched nearest first', text: 'Verified factories with the right process see it instantly, closest to you first.' },
		{ icon: 'chart', title: 'Compare real quotes', text: 'Landed cost per piece, lead time and terms side by side. Negotiate in-app.' },
		{ icon: 'handshake', title: 'Award & deal directly', text: 'Call or WhatsApp the factory. No middlemen, no commission.' }
	];

	const features: { icon: IconName; title: string; text: string; tone: string }[] = [
		{ icon: 'shield', title: 'Verified, twice', text: 'Documents checked by our team. Ground-verified factories were visited — machines confirmed on the shop floor.', tone: 'blue' },
		{ icon: 'pin', title: 'Nearby first', text: 'Matching ranks suppliers by pincode zone and distance, so samples and visits stay quick and cheap.', tone: 'orange' },
		{ icon: 'chart', title: 'True landed cost', text: 'Tooling, freight and GST rolled into one per-piece number — compare quotes like-for-like.', tone: 'violet' },
		{ icon: 'phone', title: 'Direct contact', text: 'Phone and WhatsApp straight to the factory owner once you post a requirement.', tone: 'green' },
		{ icon: 'bolt', title: 'Fast negotiation', text: 'Counter-offers on price, lead time and payment terms — up to three rounds, all tracked.', tone: 'blue' },
		{ icon: 'headset', title: 'Help desk on call', text: 'Multiple processes or a tight deadline? Our team can manage the whole order for you.', tone: 'orange' }
	];

	// ---------- seller home ----------
	const sh = $derived(data.sellerHome);
	const sellerSteps: { icon: IconName; title: string; text: string }[] = [
		{ icon: 'bolt', title: 'Get matching leads', text: 'Requirements for the work you do reach you first — nearest factories ranked on top.' },
		{ icon: 'check', title: 'Mark interested', text: 'One tap tells the buyer you can make it. Not for you? Pass and your feed gets sharper.' },
		{ icon: 'doc', title: 'Send your quote', text: 'Quote in minutes with saved defaults and the cost estimator. Revise as you negotiate.' },
		{ icon: 'handshake', title: 'Win the order', text: 'The buyer awards on the platform and calls you directly. No commission, ever.' }
	];
	const sellerFeatures: { icon: IconName; title: string; text: string; tone: string }[] = [
		{ icon: 'pin', title: 'Leads near your factory', text: 'Matching ranks by pincode zone and distance, so local buyers find you before far-away competitors.', tone: 'orange' },
		{ icon: 'chart', title: 'Quote in minutes', text: 'Saved defaults for GST, payment terms and freight, plus a cost estimator for machine hours.', tone: 'violet' },
		{ icon: 'shield', title: 'Badge buyers trust', text: 'Documents verified, then factory visited — verified suppliers win more shortlists.', tone: 'blue' },
		{ icon: 'spark', title: 'Complete profile, more leads', text: 'Complete profiles rank higher in matching. The ring on your photo shows what to add next.', tone: 'green' },
		{ icon: 'phone', title: 'Direct buyer contact', text: 'Once verified you see the buyer’s name and number — call or WhatsApp straight away.', tone: 'blue' },
		{ icon: 'headset', title: 'Help desk for growth', text: 'Spare capacity or a process you don’t do? Our team finds buyers and sub-contractors.', tone: 'orange' }
	];
	const myCategories = $derived(
		[...data.categories]
			.map((c) => ({ ...c, demand: data.demand.byShop[c.id] ?? 0, mine: sh?.registered && sh.mainShop === c.id }))
			.sort((a, b) => Number(b.mine) - Number(a.mine) || b.demand - a.demand)
	);

	const preview = [
		{ name: 'Supplier A', meta: 'Ground verified · 8 km', price: '₹412', tag: 'Lowest', best: true },
		{ name: 'Supplier B', meta: 'Docs verified · 23 km', price: '₹438', tag: '', best: false },
		{ name: 'Supplier C', meta: 'Ground verified · 61 km', price: '₹455', tag: '', best: false }
	];
</script>

<svelte:head>
	<title>eYantrik — Get parts made by verified factories near you</title>
	<meta name="description" content="India's free marketplace for custom manufacturing. Post your requirement, get quotes from verified CNC, casting, forging, moulding and sheet metal factories nearby, and deal directly by phone or WhatsApp." />
</svelte:head>

{#snippet helpBand()}
	<!-- ============ HELP DESK ============ -->
	<section class="help-band">
		<div class="hb-glow"></div>
		<div class="hb-copy">
			<span class="hb-ico"><Icon name="headset" size={26} /></span>
			<!-- each side sees its own kind of help: sellers are never offered "we'll make your order" -->
			{#if side === 'SELLER'}
				<div>
					<h2>Need more orders or a sub-contractor?</h2>
					<p class="mb-0">Tell the eYantrik help desk — we help you find buyers for your spare capacity, or a partner for the processes you don't do in-house.</p>
				</div>
			{:else}
				<div>
					<h2>Multiple processes? Tight deadline?</h2>
					<p class="mb-0">Hand it to the eYantrik help desk — we make it in our own plant or manage partner factories, with one point of contact and quality checks.</p>
				</div>
			{/if}
		</div>
		<a class="btn accent lg" href="/help">Talk to the help desk <Icon name="arrow" size={18} /></a>
	</section>
{/snippet}

{#if side === 'SELLER' && sh}
	<!-- ============ SELLER HOME ============ -->
	<section class="hero">
		<div class="glow g1"></div>
		<div class="glow g2"></div>
		<div class="glow g3 green"></div>
		<div class="gridlines"></div>
		<div class="hero-inner">
			<div class="hero-copy">
				<span class="pill-tag rise"><span class="dot"></span> Free for manufacturers — no commission</span>
				<h1 class="rise" style="animation-delay:.05s">Fill your machines with <span class="hl">real orders</span> near you.</h1>
				<p class="lead rise" style="animation-delay:.1s">
					{#if sh.registered}Welcome back, {sh.name}. Buyers post requirements every day — the ones that match {sh.companyName} land in your lead feed first.{:else}Welcome, {sh.name}. Register your factory once and every matching requirement near you reaches your lead feed — free.{/if}
				</p>
				<div class="cta-row rise" style="animation-delay:.2s">
					{#if sh.registered}
						<a class="btn ok lg" href="/seller">Open your lead feed <Icon name="arrow" size={18} /></a>
						{#if sh.percent < 100}<a class="btn glass lg" href="/seller/profile">Complete profile · {sh.percent}%</a>{/if}
					{:else}
						<a class="btn ok lg" href="/seller/onboarding">Register your factory <Icon name="arrow" size={18} /></a>
					{/if}
				</div>
			</div>

			<div class="hero-visual rise" style="animation-delay:.2s">
				{#if sh.registered}
					<a class="mock pcard" href="/seller/profile">
						<div class="pc-top">
							<ProfileRing percent={sh.percent} size={96} stroke={8} />
							<div>
								<div class="mock-eyebrow">Your profile</div>
								<div class="mock-title">{sh.percent === 100 ? 'Complete — top of the list' : `${sh.percent}% complete`}</div>
								<div class="mock-sub">{sh.percent === 100 ? 'You get the most leads.' : 'Complete it to meet more leads.'}</div>
							</div>
						</div>
						{#if sh.missing.length}
							<ul class="pc-list">
								{#each sh.missing as m (m.id)}<li><span class="pc-pts">+{m.points}%</span> {m.label}</li>{/each}
							</ul>
						{/if}
						<span class="mock-btn primary">{sh.percent === 100 ? 'View my profile' : 'Complete my profile'}</span>
					</a>
				{:else}
					<div class="mock pcard">
						<div class="mock-eyebrow">Get started</div>
						<div class="mock-title">3 steps to your first lead</div>
						<ul class="pc-list">
							<li><span class="pc-pts">1</span> Register factory, machines & GST</li>
							<li><span class="pc-pts">2</span> Documents verified (1–2 days)</li>
							<li><span class="pc-pts">3</span> Matching leads in your feed</li>
						</ul>
						<a class="mock-btn primary" href="/seller/onboarding">Register now</a>
					</div>
				{/if}
			</div>
		</div>
	</section>

	<section class="trust">
		<div class="trust-inner">
			{#if sh.registered}
				<a class="t-item link" href="/seller"><strong>{sh.matchingLeads}</strong><span>new matching leads</span></a>
				<a class="t-item link" href="/seller?tab=quoted"><strong>{sh.quotesSent}</strong><span>quotes sent</span></a>
				<a class="t-item link" href="/seller?tab=won"><strong>{sh.won}</strong><span>orders won</span></a>
				<div class="t-item"><VerificationBadge status={sh.verification as VerificationStatus} /><span>verification</span></div>
			{:else}
				<div class="t-item"><strong>{data.demand.openRfqs}</strong><span>open requirements</span></div>
				<div class="t-item"><strong>{data.demand.buyers}</strong><span>buyers on eYantrik</span></div>
				<div class="t-item"><strong>{data.demand.cities}</strong><span>cities with demand</span></div>
				<div class="t-item v"><Icon name="spark" size={22} /><span><b>Zero</b> commission</span></div>
			{/if}
		</div>
	</section>

	<main class="page">
		{#if sh.registered}
			<section class="section demand-strip">
				<div class="d-item"><strong>{data.demand.openRfqs}</strong><span>open requirements on eYantrik</span></div>
				<div class="d-item"><strong>{data.demand.buyers}</strong><span>buyers looking for factories</span></div>
				<div class="d-item"><strong>{data.demand.cities}</strong><span>cities with open demand</span></div>
			</section>
		{/if}

		<section class="section">
			<div class="section-head">
				<span class="eyebrow">How it works for manufacturers</span>
				<h2>From lead to order in four steps</h2>
				<p class="muted">No bidding fees, no brokers — buyers come to you.</p>
			</div>
			<div class="steps">
				{#each sellerSteps as st, i (st.title)}
					<div class="step">
						<div class="step-top"><span class="step-ico"><Icon name={st.icon} size={22} /></span><span class="step-no">0{i + 1}</span></div>
						<h3>{st.title}</h3>
						<p class="muted small mb-0">{st.text}</p>
					</div>
				{/each}
			</div>
		</section>

		<section class="section">
			<div class="section-head">
				<span class="eyebrow">Why eYantrik</span>
				<h2>Built to keep your machines busy</h2>
			</div>
			<div class="features">
				{#each sellerFeatures as f (f.title)}
					<div class="feature card hover">
						<span class="f-ico {f.tone}"><Icon name={f.icon} size={22} /></span>
						<h3>{f.title}</h3>
						<p class="muted small mb-0">{f.text}</p>
					</div>
				{/each}
			</div>
		</section>

		<section class="section">
			<div class="section-head">
				<span class="eyebrow">Buyer demand</span>
				<h2>Open requirements by type of work</h2>
				<p class="muted">What buyers need right now. Your main type of work is on top.</p>
			</div>
			<div class="cats">
				{#each myCategories as c (c.id)}
					<a href={sh.registered ? '/seller?tab=all' : '/seller/onboarding'} class="cat" class:mine={c.mine}>
						<span class="cat-mark" aria-hidden="true">{c.emoji}</span>
						<span class="cat-label">{c.label}{#if c.mine} <em class="mine-tag">your work</em>{/if}<small>{c.examples}</small></span>
						<span class="cat-count" title="Open requirements">{c.demand > 0 ? c.demand : ''}</span>
						<Icon name="arrow" size={16} class="cat-arrow" />
					</a>
				{/each}
			</div>
		</section>

		{@render helpBand()}
	</main>
{:else}
<!-- ============ HERO ============ -->
<section class="hero">
	<div class="glow g1"></div>
	<div class="glow g2"></div>
	<div class="glow g3"></div>
	<div class="gridlines"></div>

	<div class="hero-inner">
		<div class="hero-copy">
			{#if side === 'BUYER' && data.buyerHome}
				<a class="me-strip rise" href="/buyer/dashboard">
					<span>👋 Welcome back, <strong>{data.buyerHome.name}</strong></span>
					{#if data.buyerHome.total}
						<span>· <strong>{data.buyerHome.open}</strong> open requirement{data.buyerHome.open === 1 ? '' : 's'}</span>
						{#if data.buyerHome.quotesWaiting}<span class="hot">· {data.buyerHome.quotesWaiting} new quote{data.buyerHome.quotesWaiting === 1 ? '' : 's'} waiting</span>{/if}
					{:else}
						<span>· Post your first requirement to unlock supplier contacts</span>
					{/if}
					<span class="go">My requirements →</span>
				</a>
			{:else}
				<span class="pill-tag rise"><span class="dot"></span> 100% free for buyers & manufacturers</span>
			{/if}
			<h1 class="rise" style="animation-delay:.05s">
				Get parts made by <span class="hl">verified factories</span> near you.
			</h1>
			<p class="lead rise" style="animation-delay:.1s">
				Post a requirement, compare quotes on true landed cost, and deal directly with the factory owner — CNC, casting, forging, moulding, sheet metal and more.
			</p>

			<form class="search rise" style="animation-delay:.15s" method="GET" action="/sellers" role="search">
				<Icon name="search" size={20} class="search-ico" />
				<input type="search" name="q" placeholder="What do you need made? e.g. CNC machining, Pune" aria-label="Search suppliers" />
				<button class="btn grad">Search</button>
			</form>

			<div class="quick rise" style="animation-delay:.2s">
				<span>Popular:</span>
				{#each quickProcesses as c (c.id)}
					<a href="/sellers?process={c.id}">{c.label}</a>
				{/each}
			</div>

			<div class="cta-row rise" style="animation-delay:.25s">
				{#if side === 'SELLER'}
					<a class="btn ok lg" href={sideHasProfile ? '/seller' : '/seller/onboarding'}>Open your lead feed <Icon name="arrow" size={18} /></a>
				{:else if side === 'ADMIN'}
					<a class="btn lg" href="/admin">Open admin console <Icon name="arrow" size={18} /></a>
				{:else}
					<a class="btn accent lg" href="/rfq/new">Post a requirement — free <Icon name="arrow" size={18} /></a>
					{#if guest}<a class="btn glass lg" href="/login/seller?mode=signup">I'm a manufacturer</a>{/if}
				{/if}
			</div>
		</div>

		<!-- Product preview (illustration) -->
		<div class="hero-visual rise" style="animation-delay:.2s" aria-hidden="true">
			<div class="mock">
				<div class="mock-head">
					<div>
						<div class="mock-eyebrow">Requirement · Example</div>
						<div class="mock-title">Hydraulic valve block</div>
						<div class="mock-sub">500 pcs · Aluminium 6061 · Pune</div>
					</div>
					<span class="mock-live"><span class="dot"></span> 3 quotes</span>
				</div>
				<div class="mock-sort">Sorted: nearest first · landed ₹/pc</div>
				{#each preview as q, i (q.name)}
					<div class="quote-row" class:best={q.best} style="animation-delay:{0.45 + i * 0.12}s">
						<div class="q-avatar">{q.name.slice(-1)}</div>
						<div class="q-info">
							<strong>{q.name}</strong>
							<span>{q.meta}</span>
						</div>
						<div class="q-price">
							<strong>{q.price}</strong>
							{#if q.tag}<span class="q-tag">{q.tag}</span>{:else}<span class="q-per">/pc</span>{/if}
						</div>
					</div>
				{/each}
				<div class="mock-actions">
					<span class="mock-btn primary">Award order</span>
					<span class="mock-btn">Counter-offer</span>
				</div>
			</div>
			<div class="float f1"><Icon name="shield" size={16} /> Ground verified</div>
			<div class="float f2"><Icon name="phone" size={16} /> Call the factory directly</div>
		</div>
	</div>
</section>

<!-- ============ TRUST STRIP ============ -->
<section class="trust">
	<div class="trust-inner">
		{#if hasSuppliers}
			<div class="t-item"><strong>{data.stats.sellers}</strong><span>verified suppliers</span></div>
			<div class="t-item"><strong>{data.stats.groundVerified}</strong><span>inspected on the ground</span></div>
			<div class="t-item"><strong>{data.stats.cities}</strong><span>cities covered</span></div>
			<div class="t-item"><strong>{data.stats.openRfqs}</strong><span>open requirements</span></div>
		{:else}
			<div class="t-item v"><Icon name="shield" size={22} /><span><b>Verified</b> factories only</span></div>
			<div class="t-item v"><Icon name="pin" size={22} /><span><b>Nearest-first</b> matching</span></div>
			<div class="t-item v"><Icon name="phone" size={22} /><span><b>Direct</b> phone & WhatsApp</span></div>
			<div class="t-item v"><Icon name="spark" size={22} /><span><b>Zero</b> commission</span></div>
		{/if}
	</div>
</section>

<main class="page">
	<!-- ============ HOW IT WORKS ============ -->
	<section class="section">
		<div class="section-head">
			<span class="eyebrow">How it works</span>
			<h2>From drawing to delivery in four steps</h2>
			<p class="muted">No tenders, no brokers, no waiting for callbacks.</p>
		</div>
		<div class="steps">
			{#each steps as s, i (s.title)}
				<div class="step">
					<div class="step-top">
						<span class="step-ico"><Icon name={s.icon} size={22} /></span>
						<span class="step-no">0{i + 1}</span>
					</div>
					<h3>{s.title}</h3>
					<p class="muted small mb-0">{s.text}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- ============ FEATURES ============ -->
	<section class="section">
		<div class="section-head">
			<span class="eyebrow">Why eYantrik</span>
			<h2>Built for how Indian manufacturing really works</h2>
		</div>
		<div class="features">
			{#each features as f (f.title)}
				<div class="feature card hover">
					<span class="f-ico {f.tone}"><Icon name={f.icon} size={22} /></span>
					<h3>{f.title}</h3>
					<p class="muted small mb-0">{f.text}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- ============ SUPPLIERS ============ -->
	<section class="section">
		<div class="section-head row between">
			<div>
				<span class="eyebrow">Supplier directory</span>
				<h2 class="mb-0">Verified suppliers</h2>
			</div>
			{#if data.featured.length}<a href="/sellers" class="see-all">View all <Icon name="arrow" size={16} /></a>{/if}
		</div>
		{#if data.featured.length}
			<div class="grid two mt">
				{#each data.featured as s (s.id)}
					<SellerCard seller={s} lockReason={data.lockReason} />
				{/each}
			</div>
		{:else}
			<div class="empty card">
				<span class="empty-ico"><Icon name="factory" size={28} /></span>
				<div>
					<h3>Be one of the first verified factories</h3>
					<p class="muted small mb-0">The directory is opening now. Early members get listed first and receive every matching requirement in their area — free.</p>
				</div>
				{#if side !== 'BUYER' && side !== 'ADMIN'}
					<a class="btn ok" href={side === 'SELLER' ? (sideHasProfile ? '/seller' : '/seller/onboarding') : '/login/seller?mode=signup'}>List your factory</a>
				{/if}
			</div>
		{/if}
	</section>

	<!-- ============ PROCESSES ============ -->
	<section class="section">
		<div class="section-head">
			<span class="eyebrow">Capabilities</span>
			<h2>Browse by type of work</h2>
			<p class="muted">Not sure what the process is called? Pick by the kind of parts you need.</p>
		</div>
		<div class="cats">
			{#each data.categories as c (c.id)}
				<a href="/sellers?process={c.id}" class="cat">
					<span class="cat-mark" aria-hidden="true">{c.emoji}</span>
					<span class="cat-label">{c.label}<small>{c.examples}</small></span>
					<span class="cat-count">{c.count > 0 ? c.count : ''}</span>
					<Icon name="arrow" size={16} class="cat-arrow" />
				</a>
			{/each}
		</div>
	</section>

	<!-- ============ AUDIENCES ============ -->
	{#if guest}
		<section class="section audiences">
			<div class="aud buyer">
				<span class="eyebrow">For buyers</span>
				<h3>Source smarter, from people you can visit</h3>
				<ul>
					<li><Icon name="check" size={16} /> Free requirement posting, unlimited</li>
					<li><Icon name="check" size={16} /> Quotes compared on landed cost</li>
					<li><Icon name="check" size={16} /> Factory owner's phone & WhatsApp</li>
				</ul>
				<a class="btn lg" href="/rfq/new">Post a requirement <Icon name="arrow" size={18} /></a>
			</div>
			<div class="aud seller">
				<span class="eyebrow">For manufacturers</span>
				<h3>Fill your machines with real orders</h3>
				<ul>
					<li><Icon name="check" size={16} /> Matching leads near your factory</li>
					<li><Icon name="check" size={16} /> Quote in minutes with saved defaults</li>
					<li><Icon name="check" size={16} /> Verified badge that buyers trust</li>
				</ul>
				<a class="btn ok lg" href="/login/seller?mode=signup">Register your factory <Icon name="arrow" size={18} /></a>
			</div>
		</section>
	{/if}

	{@render helpBand()}
</main>
{/if}

<style>
	/* ---------- Buyer strip / seller home ---------- */
	.me-strip { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 0.86rem; color: #e0e7ff; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.16); padding: 8px 14px; border-radius: 14px; margin-bottom: 20px; text-decoration: none; }
	.me-strip:hover { background: rgba(255,255,255,.14); color: #fff; }
	.me-strip .hot { color: #fdba74; font-weight: 700; }
	.me-strip .go { font-weight: 700; color: #fff; margin-left: 4px; }
	.g3.green { background: #12b886; }
	a.pcard { display: block; text-decoration: none; }
	.pcard { color: var(--ink); }
	.pc-top { display: flex; gap: 16px; align-items: center; }
	.pc-list { list-style: none; padding: 0; margin: 16px 0 14px; display: grid; gap: 8px; font-size: 0.86rem; font-weight: 600; }
	.pc-list li { display: flex; align-items: center; gap: 10px; border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; }
	.pc-pts { font-size: 0.72rem; font-weight: 800; color: var(--ok-ink); background: var(--ok-soft); border-radius: 999px; padding: 2px 8px; min-width: 38px; text-align: center; }
	.pcard .mock-btn { display: block; }
	.t-item.link { text-decoration: none; color: inherit; border-radius: 12px; padding: 4px; }
	.t-item.link:hover { background: #f6f7fb; }
	.demand-strip { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; padding-bottom: 0; }
	.d-item { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; display: flex; flex-direction: column; }
	.d-item strong { font-family: var(--font-display); font-size: 1.5rem; }
	.d-item span { font-size: 0.82rem; color: var(--muted); }
	@media (max-width: 640px) { .demand-strip { grid-template-columns: minmax(0, 1fr); } }
	.cat.mine { border-color: var(--ok); background: #f3fbf7; }
	.mine-tag { font-style: normal; font-size: 0.66rem; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: var(--ok-ink); background: var(--ok-soft); border-radius: 999px; padding: 1px 7px; margin-left: 4px; }

	/* ---------- Hero ---------- */
	.hero { position: relative; overflow: hidden; background: var(--navy); color: #fff; isolation: isolate; }
	.glow { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.55; z-index: -1; animation: drift 14s ease-in-out infinite alternate; }
	.g1 { width: 520px; height: 520px; background: #3355ff; top: -180px; left: -120px; }
	.g2 { width: 460px; height: 460px; background: #6b4dff; top: 40px; right: -140px; animation-delay: -5s; }
	.g3 { width: 300px; height: 300px; background: #ff6a2b; bottom: -160px; left: 40%; opacity: 0.35; animation-delay: -9s; }
	@keyframes drift { to { transform: translate(40px, 30px) scale(1.08); } }
	.gridlines { position: absolute; inset: 0; z-index: -1; background-image: linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px); background-size: 44px 44px; mask-image: radial-gradient(ellipse at 50% 30%, #000 30%, transparent 75%); }

	.hero-inner { max-width: 1180px; margin: 0 auto; padding: 72px 20px 88px; display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr); gap: 56px; align-items: center; }
	.pill-tag { display: inline-flex; align-items: center; gap: 8px; font-size: 0.8rem; font-weight: 600; color: #c7d2fe; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.12); padding: 6px 12px; border-radius: 999px; margin-bottom: 20px; }
	.dot { width: 7px; height: 7px; border-radius: 50%; background: #34d399; box-shadow: 0 0 0 0 rgba(52,211,153,.6); animation: pulse 2s infinite; }
	@keyframes pulse { 70% { box-shadow: 0 0 0 8px rgba(52,211,153,0); } 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0); } }
	.hero h1 { color: #fff; font-size: clamp(2.1rem, 5vw, 3.6rem); line-height: 1.05; letter-spacing: -0.035em; margin-bottom: 18px; }
	.hl { background: linear-gradient(120deg, #8ea2ff 0%, #c4b5fd 45%, #ffb38a 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
	.lead { color: #b8c2d9; font-size: 1.1rem; line-height: 1.6; max-width: 560px; margin-bottom: 26px; }

	.search { position: relative; display: flex; align-items: center; gap: 8px; background: #fff; border-radius: 14px; padding: 6px; max-width: 580px; box-shadow: 0 20px 40px -20px rgba(0,0,0,.6); }
	.search :global(.search-ico) { color: #98a2b3; margin-left: 10px; }
	.search input { flex: 1; border: none; box-shadow: none; padding: 12px 6px; font-size: 1rem; background: transparent; }
	.search input:focus { box-shadow: none; }
	.search .btn { padding: 12px 22px; }
	.quick { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 16px; font-size: 0.82rem; color: #8892ab; }
	.quick a { color: #d5dcf0; text-decoration: none; padding: 5px 11px; border-radius: 999px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); transition: background .15s ease, border-color .15s ease; }
	.quick a:hover { background: rgba(255,255,255,.14); border-color: rgba(255,255,255,.25); color: #fff; }
	.cta-row { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 28px; }
	.btn.glass { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.2); color: #fff; box-shadow: none; }
	.btn.glass:hover { background: rgba(255,255,255,.16); box-shadow: none; }

	/* product preview */
	.hero-visual { position: relative; }
	.mock { background: rgba(255,255,255,.97); color: var(--ink); border-radius: 20px; padding: 20px; box-shadow: 0 40px 80px -24px rgba(0,0,0,.65), 0 0 0 1px rgba(255,255,255,.1); transform: perspective(1200px) rotateY(-6deg) rotateX(3deg); animation: bob 7s ease-in-out infinite; }
	@keyframes bob { 50% { transform: perspective(1200px) rotateY(-6deg) rotateX(3deg) translateY(-8px); } }
	.mock-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
	.mock-eyebrow { font-size: 0.68rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--brand); }
	.mock-title { font-family: var(--font-display); font-weight: 800; font-size: 1.12rem; margin-top: 2px; }
	.mock-sub { font-size: 0.8rem; color: var(--muted); }
	.mock-live { display: inline-flex; align-items: center; gap: 6px; font-size: 0.72rem; font-weight: 700; background: var(--ok-soft); color: var(--ok-ink); padding: 4px 9px; border-radius: 999px; white-space: nowrap; }
	.mock-sort { font-size: 0.72rem; color: var(--muted); margin: 14px 0 8px; padding-top: 12px; border-top: 1px dashed var(--line); }
	.quote-row { display: flex; align-items: center; gap: 12px; padding: 11px 12px; border: 1px solid var(--line); border-radius: 12px; margin-top: 8px; animation: rise .5s cubic-bezier(.2,.7,.2,1) both; }
	.quote-row.best { border-color: #b5ecd6; background: linear-gradient(90deg, #f0fbf6, #fff); }
	.q-avatar { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; font-weight: 800; color: #fff; background: var(--grad); font-size: 0.85rem; }
	.quote-row.best .q-avatar { background: linear-gradient(135deg, #0e9f6e, #12b886); }
	.q-info { flex: 1; display: flex; flex-direction: column; line-height: 1.25; }
	.q-info strong { font-size: 0.9rem; }
	.q-info span { font-size: 0.74rem; color: var(--muted); }
	.q-price { text-align: right; display: flex; flex-direction: column; align-items: flex-end; line-height: 1.2; }
	.q-price strong { font-family: var(--font-display); font-size: 1.05rem; }
	.q-tag { font-size: 0.64rem; font-weight: 800; text-transform: uppercase; color: var(--ok-ink); background: #dcfae9; padding: 1px 6px; border-radius: 999px; margin-top: 2px; }
	.q-per { font-size: 0.72rem; color: var(--muted); }
	.mock-actions { display: flex; gap: 8px; margin-top: 14px; }
	.mock-btn { flex: 1; text-align: center; font-size: 0.82rem; font-weight: 700; padding: 9px; border-radius: 10px; border: 1px solid var(--line-2); }
	.mock-btn.primary { background: var(--ok); border-color: var(--ok); color: #fff; }
	.float { position: absolute; display: inline-flex; align-items: center; gap: 7px; background: #fff; color: var(--ink); font-size: 0.8rem; font-weight: 700; padding: 9px 13px; border-radius: 12px; box-shadow: 0 16px 32px -12px rgba(0,0,0,.45); animation: bob2 6s ease-in-out infinite; }
	.f1 { top: -18px; right: 18px; color: var(--ok-ink); }
	.f2 { bottom: -20px; left: -24px; color: var(--brand-ink); animation-delay: -3s; }
	@keyframes bob2 { 50% { transform: translateY(-7px); } }

	@media (max-width: 960px) {
		.hero-inner { grid-template-columns: minmax(0, 1fr); padding: 52px 20px 72px; gap: 48px; }
		.mock { transform: none; animation: none; }
		.f2 { left: 8px; }
	}
	@media (max-width: 600px) {
		.search { flex-wrap: wrap; }
		.search input { min-width: 0; }
		.search .btn { width: 100%; }
		.float { display: none; }
	}

	/* ---------- Trust strip ---------- */
	.trust { background: #fff; border-bottom: 1px solid var(--line); }
	.trust-inner { max-width: 1180px; margin: 0 auto; padding: 22px 20px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
	.t-item { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 2px; }
	.t-item strong { font-family: var(--font-display); font-size: 1.8rem; letter-spacing: -0.02em; }
	.t-item span { font-size: 0.82rem; color: var(--muted); }
	.t-item.v { flex-direction: row; justify-content: center; gap: 10px; color: var(--brand); }
	.t-item.v span { font-size: 0.92rem; color: var(--ink-2); }
	.t-item.v b { color: var(--ink); }
	@media (max-width: 760px) { .trust-inner { grid-template-columns: repeat(2, minmax(0, 1fr)); } .t-item.v { justify-content: flex-start; text-align: left; } }

	/* ---------- Sections ---------- */
	.page { max-width: 1180px; margin: 0 auto; padding: 0 20px; }
	.section { padding-top: 72px; }
	.section-head { margin-bottom: 28px; max-width: 640px; }
	.section-head.row { max-width: none; align-items: flex-end; }
	.section-head h2 { font-size: clamp(1.5rem, 3vw, 2.1rem); }
	.see-all { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; text-decoration: none; }

	.steps { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; counter-reset: s; }
	.step { position: relative; background: #fff; border: 1px solid var(--line); border-radius: var(--radius); padding: 22px; box-shadow: var(--shadow); }
	.step-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
	.step-ico { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; background: var(--brand-soft); color: var(--brand); }
	.step-no { font-family: var(--font-display); font-weight: 800; font-size: 1.6rem; color: #e3e7f2; }
	@media (max-width: 900px) { .steps { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
	@media (max-width: 560px) { .steps { grid-template-columns: minmax(0, 1fr); } }

	.features { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
	.feature h3 { margin-top: 14px; }
	.f-ico { width: 46px; height: 46px; border-radius: 13px; display: grid; place-items: center; }
	.f-ico.blue { background: var(--brand-soft); color: var(--brand); }
	.f-ico.orange { background: var(--accent-soft); color: var(--accent); }
	.f-ico.violet { background: #f1edff; color: #6b4dff; }
	.f-ico.green { background: var(--ok-soft); color: var(--ok); }
	@media (max-width: 900px) { .features { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
	@media (max-width: 560px) { .features { grid-template-columns: minmax(0, 1fr); } }

	.empty { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; background: linear-gradient(135deg, #fff 0%, #f5f7ff 100%); }
	.empty > div { flex: 1; min-width: 240px; }
	.empty-ico { width: 60px; height: 60px; border-radius: 16px; display: grid; place-items: center; background: var(--ok-soft); color: var(--ok); }

	.cats { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px; }
	.cat { display: flex; align-items: center; gap: 12px; background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; text-decoration: none; color: var(--ink); transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease; }
	.cat:hover { color: var(--ink); border-color: #c7d0ff; box-shadow: var(--shadow-md); transform: translateY(-1px); }
	.cat-mark { width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center; font-size: 1.15rem; background: var(--brand-soft); flex: none; }
	.cat-label { flex: 1; font-weight: 600; font-size: 0.9rem; display: flex; flex-direction: column; gap: 2px; }
	.cat-label small { font-weight: 400; font-size: 0.76rem; color: var(--muted); line-height: 1.35; }
	.cat-count { font-size: 0.75rem; font-weight: 700; color: var(--muted); }
	.cat :global(.cat-arrow) { color: #b4bccb; transition: transform .15s ease, color .15s ease; }
	.cat:hover :global(.cat-arrow) { color: var(--brand); transform: translateX(2px); }

	.audiences { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
	.aud { border-radius: 20px; padding: 32px; border: 1px solid var(--line); }
	.aud.buyer { background: linear-gradient(160deg, #eef1ff 0%, #fff 70%); }
	.aud.seller { background: linear-gradient(160deg, #e9f9f2 0%, #fff 70%); }
	.aud.seller .eyebrow { color: var(--ok); }
	.aud h3 { font-size: 1.4rem; margin-bottom: 16px; }
	.aud ul { list-style: none; padding: 0; margin: 0 0 24px; display: grid; gap: 10px; }
	.aud li { display: flex; align-items: center; gap: 10px; font-weight: 500; color: var(--ink-2); }
	.aud.buyer li :global(.icon) { color: var(--brand); }
	.aud.seller li :global(.icon) { color: var(--ok); }
	@media (max-width: 760px) { .audiences { grid-template-columns: minmax(0, 1fr); } .aud { padding: 24px; } }

	.help-band { position: relative; overflow: hidden; margin-top: 72px; border-radius: 24px; padding: 36px; background: var(--navy); color: #fff; display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; isolation: isolate; }
	.hb-glow { position: absolute; z-index: -1; width: 420px; height: 420px; right: -100px; top: -200px; border-radius: 50%; background: radial-gradient(circle, rgba(107,77,255,.55), transparent 70%); }
	.hb-copy { display: flex; gap: 18px; align-items: flex-start; flex: 1; min-width: 280px; }
	.hb-ico { width: 54px; height: 54px; border-radius: 15px; display: grid; place-items: center; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12); color: #ffb38a; flex: none; }
	.help-band h2 { color: #fff; margin-bottom: 6px; }
	.help-band p { color: #b8c2d9; max-width: 560px; }
</style>
