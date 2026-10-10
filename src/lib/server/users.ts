// Users, sessions and login attempts — stored in MongoDB.
// Collections + indexes are created by `npm run db:reset` (scripts/db-reset.ts).

import { nextMongoId } from './counters.ts';
import { mongo } from './mongo.ts';
import type { Role, User } from './db.ts';

export interface Session {
	_id: string; // the random session id stored in the cookie
	userId: string;
	role: Role; // each role has its own cookie, so a buyer and a seller can be signed in side by side
	expiresAt: Date; // TTL index → MongoDB deletes the session by itself once it expires
}

export interface LoginAttempt {
	_id: string; // `${portal}:${loginId}`
	fails: number;
	lockedUntil: number;
	expiresAt: Date; // TTL index → old counters clean themselves up
}

export const users = mongo.collection<User>('users');
export const sessions = mongo.collection<Session>('sessions');
export const loginAttempts = mongo.collection<LoginAttempt>('loginAttempts');

// Our code uses its own `id` ("U-1"). Leave MongoDB's internal `_id` out of results:
// it's an ObjectId, which pages can't serialise.
const noMongoId = { projection: { _id: 0 } } as const;

// findOne<User>: tells TypeScript the result is a plain User (no _id), matching the projection.
export const findUserById = (id: string) => users.findOne<User>({ id }, noMongoId);
// One mobile/email may have ONE account per role (a buyer account and a seller account) — never two of the same role.
// So lookups by email/phone always say which role. Unique indexes on { role, phone } / { role, email } enforce it.
export const findUserByEmail = (email: string, role: Role) => users.findOne<User>({ email, role }, noMongoId);
export const findUserByPhone = (phone: string, role: Role) => users.findOne<User>({ phone, role }, noMongoId);
export const findUsersByIds = (ids: string[]) => users.find<User>({ id: { $in: [...new Set(ids)] } }, noMongoId).toArray();

/** Map of id → user for showing names on lists (one query instead of one per row). */
export async function usersById(ids: (string | undefined)[]): Promise<Map<string, User>> {
	const list = await findUsersByIds(ids.filter((id): id is string => !!id));
	return new Map(list.map((u) => [u.id, u]));
}

export async function countUsers(filter: Partial<Pick<User, 'role'>> & { createdAfter?: string } = {}) {
	const { createdAfter, ...rest } = filter;
	return users.countDocuments(createdAfter ? { ...rest, createdAt: { $gt: createdAfter } } : rest);
}

/** Is there at least one admin? (The first-admin setup page closes once there is.) */
export async function adminExists(): Promise<boolean> {
	return (await users.countDocuments({ role: 'ADMIN' }, { limit: 1 })) > 0;
}

export async function insertUser(user: User) {
	await users.insertOne({ ...user }); // a copy: insertOne adds an _id to the object it's given
}

export async function updateUser(id: string, changes: Partial<Omit<User, 'id'>>) {
	await users.updateOne({ id }, { $set: changes });
}

export const nextUserId = () => nextMongoId('U');
