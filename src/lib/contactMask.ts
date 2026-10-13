// Hides phone numbers, emails and links typed into free text (messages, quote notes, counter-offer
// notes) until the buyer shortlists the supplier — so contacts aren't swapped around the rule
// "contacts are shared after shortlisting" (decision 2026-10-13). The stored text is kept as typed;
// only what is shown is masked, so it reads normally once contacts are shared.

export const MASKED = '[contact shared after shortlisting]';

// 10+ digits, optionally with +91 and spaces/dashes/dots in between (dates and prices don't reach 10 digits)
const PHONE = /(?:\+?\s*91[\s.-]*)?(?:\d[\s.-]?){9,}\d/g;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const LINK = /\b(?:https?:\/\/|www\.)\S+|\b(?:wa\.me|t\.me|api\.whatsapp\.com)\/\S*/gi;

export function maskContacts(text: string): string {
	return text.replace(LINK, MASKED).replace(EMAIL, MASKED).replace(PHONE, MASKED);
}

/** Mask only when contacts are not shared yet. */
export function showText(text: string, shared: boolean): string {
	return shared ? text : maskContacts(text);
}
