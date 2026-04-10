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
