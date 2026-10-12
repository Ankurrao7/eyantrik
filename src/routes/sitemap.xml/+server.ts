// Sitemap for Google: home, directory, one page per process, one page per listed seller.
import { listedSellers } from '#lib/server/sellers.ts';
import { ALL_PROCESSES, SHOPS } from '#lib/processes.ts';
import type { RequestHandler } from './$types';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const GET: RequestHandler = async ({ url }) => {
	const origin = url.origin;
	const urls = [
		{ loc: `${origin}/`, priority: '1.0' },
		{ loc: `${origin}/sellers`, priority: '0.9' },
		{ loc: `${origin}/rfq/new`, priority: '0.8' },
		{ loc: `${origin}/help`, priority: '0.5' },
		...SHOPS.map((s) => ({ loc: `${origin}/sellers?process=${s.id}`, priority: '0.8' })),
		...ALL_PROCESSES.map((p) => ({ loc: `${origin}/sellers?process=${p.id}`, priority: '0.6' })),
		...(await listedSellers()).map((s) => ({ loc: `${origin}/sellers/${s.slug}`, priority: '0.6' }))
	];

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(u.loc)}</loc><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>`;

	return new Response(body, { headers: { 'content-type': 'application/xml', 'cache-control': 'max-age=3600' } });
};
