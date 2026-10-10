// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { User } from '#lib/server/db.ts';

declare global {
	namespace App {
		interface Error {
			message: string;
			errorId?: string;
		}
		interface Locals {
			/** The identity THIS request acts as (decided by the URL — see identityFor in auth.ts). */
			user: User | null;
			/** Everyone signed in through this browser (a person may be signed in as buyer and seller at once). */
			sessions: { BUYER: User | null; SELLER: User | null };
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
