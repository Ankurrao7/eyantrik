// Password hashing with PBKDF2-SHA256 (Web Crypto — no native deps).
// Stored format: pbkdf2$<iterations>$<saltB64>$<hashB64>

const ITERATIONS = 120_000;
const KEY_BITS = 256;

const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
	const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
	const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, KEY_BITS);
	return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	return `pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(await derive(password, salt, ITERATIONS))}`;
}

export async function verifyPassword(password: string, stored: string | undefined): Promise<boolean> {
	if (!stored) return false;
	const [scheme, iter, saltB64, hashB64] = stored.split('$');
	if (scheme !== 'pbkdf2' || !iter || !saltB64 || !hashB64) return false;
	const expected = unb64(hashB64);
	const actual = await derive(password, unb64(saltB64), Number(iter));
	// constant-time compare
	let diff = expected.length ^ actual.length;
	for (let i = 0; i < Math.max(expected.length, actual.length); i++) diff |= (expected[i] ?? 0) ^ (actual[i] ?? 0);
	return diff === 0;
}

/** Password rule shown to users: 8–64 chars, at least one letter and one number. */
export function passwordProblem(pw: string): string | null {
	if (pw.length < 8) return 'Use at least 8 characters.';
	if (pw.length > 64) return 'Use at most 64 characters.';
	if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'Include at least one letter and one number.';
	return null;
}
