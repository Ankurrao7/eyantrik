// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { User } from '#lib/server/db.ts';
import type { Lane } from '#lib/server/auth.ts';

declare global {
	namespace App {
		interface Error {
			message: string;
			errorId?: string;
		}
		interface Locals {
			/** The identity THIS request acts as (decided by the URL — see identityFor in auth.ts). */
			user: User | null;
			/**
			 * The browser's buyer/seller logins this request may see — filtered by area and tab lane
			 * (visibleSessions in auth.ts): none on /admin, only the tab's own side on shared pages.
			 */
			sessions: { BUYER: User | null; SELLER: User | null };
			/** Workspace of the tab in front of the user (ey_lane cookie), if it has one. */
			lane: Lane | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
