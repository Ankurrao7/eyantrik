// robots.txt — built per request so the sitemap link always uses the real domain
// (localhost in development, the live domain in production). No hardcoded URL.
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
	const body = `# allow crawling everything public; keep dashboards and account pages out of search
User-agent: *
Disallow: /admin
Disallow: /buyer
Disallow: /seller$
Disallow: /seller/
Disallow: /login
Disallow: /notifications
Disallow: /denied
Disallow: /api

Sitemap: ${url.origin}/sitemap.xml
`;
	return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'max-age=3600' } });
};
