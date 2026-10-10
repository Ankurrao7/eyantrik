<script lang="ts">
	import { VERIFICATION_LABEL, type VerificationStatus } from '../taxonomy.ts';

	let { status }: { status: VerificationStatus } = $props();

	const cls: Record<VerificationStatus, string> = {
		GROUND_VERIFIED: 'ground',
		DOCS_VERIFIED: 'docs',
		DOCS_SUBMITTED: 'pending',
		REJECTED: 'rejected'
	};
	const icon: Record<VerificationStatus, string> = {
		GROUND_VERIFIED: '✓✓',
		DOCS_VERIFIED: '✓',
		DOCS_SUBMITTED: '…',
		REJECTED: '✕'
	};
	const title: Record<VerificationStatus, string> = {
		GROUND_VERIFIED: 'Documents checked AND factory inspected in person by the eYantrik team',
		DOCS_VERIFIED: 'GST and business documents checked; field inspection pending',
		DOCS_SUBMITTED: 'Documents submitted, under review',
		REJECTED: 'Verification rejected'
	};
</script>

<span class="badge {cls[status]}" title={title[status]}>{icon[status]} {VERIFICATION_LABEL[status]}</span>
