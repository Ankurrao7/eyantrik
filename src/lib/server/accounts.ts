// Suspend / deactivate / reactivate — admin only. The admin never edits a person's details
// (those stay in the user's hands); they only switch the account on or off.
//
//   SUSPENDED   — on hold for now (e.g. complaint under review). Reactivate when it's cleared.
//   DEACTIVATED — closed. Can still be reactivated by the team if the person comes back.
//
// Either way: the person can't sign in, is signed out at once, and disappears from the other side
// (a supplier from the directory, matching and lead alerts; a buyer's requirements from seller feeds).

import { db, now, type AccountEvent, type AccountStatus, type User } from './db.ts';
import { findSellerById, updateSeller } from './sellers.ts';
import { findUserById, sessions, updateUser } from './users.ts';

export const ACCOUNT_STATUSES: AccountStatus[] = ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'];

export const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = { ACTIVE: 'Active', SUSPENDED: 'Suspended', DEACTIVATED: 'Deactivated' };

/** Missing status = active (every account created before this feature). */
export function isActive(x: { accountStatus?: AccountStatus } | null | undefined): boolean {
	return !x?.accountStatus || x.accountStatus === 'ACTIVE';
}

/** What the person sees on the login page. */
export function blockedLoginMessage(user: User): string {
	return user.accountStatus === 'DEACTIVATED'
		? 'This account has been deactivated. Contact the eYantrik help desk if you want to reopen it.'
		: `This account is suspended${user.accountStatusReason ? `: ${user.accountStatusReason}` : ''}. Contact the eYantrik help desk.`;
}

export type StatusChange = { status: AccountStatus; reason: string; by: string };

/** Parse + validate the admin's form. A reason is required to suspend or deactivate. */
export function parseStatusForm(data: FormData): { ok: true; status: AccountStatus; reason: string } | { ok: false; error: string } {
	const status = data.get('status')?.toString() as AccountStatus;
	const reason = (data.get('reason')?.toString() ?? '').trim().slice(0, 300);
	if (!ACCOUNT_STATUSES.includes(status)) return { ok: false, error: 'Choose what to do with the account.' };
	if (status !== 'ACTIVE' && reason.length < 5) return { ok: false, error: 'Write the reason (at least 5 characters) — it is shown to the person and kept in the history.' };
	return { ok: true, status, reason };
}

async function applyToUser(user: User, change: StatusChange) {
	const event: AccountEvent = { at: now(), by: change.by, status: change.status, reason: change.reason || undefined };
	await updateUser(user.id, {
		accountStatus: change.status,
		accountStatusReason: change.status === 'ACTIVE' ? '' : change.reason,
		accountLog: [...(user.accountLog ?? []), event]
	});
	// Signed out everywhere at once (only this role's account — the person's other side is untouched).
	if (change.status !== 'ACTIVE') await sessions.deleteMany({ userId: user.id });
}

/** Buyer account: also hides / shows their requirements in seller feeds. */
export async function setBuyerStatus(userId: string, change: StatusChange): Promise<User | null> {
	const user = await findUserById(userId);
	if (!user || user.role !== 'BUYER') return null;
	await applyToUser(user, change);
	for (const r of db.rfqs) if (r.buyerUserId === user.id) r.hidden = change.status !== 'ACTIVE' || undefined;
	return user;
}

/** Supplier: the listing AND its owner's seller login. */
export async function setSellerStatus(sellerId: string, change: StatusChange): Promise<boolean> {
	const seller = await findSellerById(sellerId);
	if (!seller) return false;
	const active = change.status === 'ACTIVE';
	await updateSeller(seller.id, {
		accountStatus: active ? undefined : change.status,
		accountStatusReason: active ? undefined : change.reason,
		verificationLog: [
			...(seller.verificationLog ?? []),
			{ at: now(), by: change.by, action: active ? 'REACTIVATED' : change.status === 'SUSPENDED' ? 'SUSPENDED' : 'DEACTIVATED', note: change.reason || undefined }
		]
	});
	const owner = seller.userId ? await findUserById(seller.userId) : null;
	if (owner) await applyToUser(owner, change);
	return true;
}
