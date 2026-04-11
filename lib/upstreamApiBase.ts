/**
 * Single upstream root for auth + indents proxies (server Route Handlers only).
 * JWTs from `/auth/agent-login` must be verified by the same host that handles POST `/indents`.
 *
 * Set `INDENT_UPSTREAM_API_BASE` in `.env.local` (e.g. `http://localhost:3001/api`) so all
 * proxies use one backend; otherwise a token from host A will 401 on host B.
 */
export function getUpstreamApiBase(): string {
  const raw =
    process.env.INDENT_UPSTREAM_API_BASE?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE?.trim() ||
    'https://production.srichakramilk.com/api';
  return raw.replace(/\/$/, '');
}

const PRODUCTION_CATEGORIES_API_BASE = 'https://production.srichakramilk.com/api';

/**
 * Base URL for category list proxies (`/categories`, `/categories/products`).
 * Defaults to production `https://production.srichakramilk.com/api` so categories work even when
 * `INDENT_UPSTREAM_API_BASE` points at a local plant server that does not host the same catalog.
 *
 * Override with `CATEGORIES_UPSTREAM_API_BASE` or `NEXT_PUBLIC_CATEGORIES_API_BASE` if needed.
 */
export function getCategoriesUpstreamBase(): string {
  const raw =
    process.env.CATEGORIES_UPSTREAM_API_BASE?.trim() ||
    process.env.NEXT_PUBLIC_CATEGORIES_API_BASE?.trim() ||
    PRODUCTION_CATEGORIES_API_BASE;
  return raw.replace(/\/$/, '');
}
