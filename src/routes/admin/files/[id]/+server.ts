// Admin-only file viewer (the /admin guard in hooks.server.ts already requires an admin session).
// ?download=1 forces a download instead of showing a PDF/photo in the browser.
import { error } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth.ts';
import { fileResponse, readUpload } from '#lib/server/files.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals, url }) => {
	requireUser(locals, url, ['ADMIN']);
	const f = await readUpload(params.id);
	if (!f) error(404, 'File not found');
	return fileResponse(f, url.searchParams.get('download') === '1');
};
