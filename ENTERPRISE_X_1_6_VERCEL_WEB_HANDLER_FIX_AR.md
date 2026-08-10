# Enterprise X 1.6 — Vercel Web Handler Fix

## Root cause
`/api/ops` was exported using the legacy single-function signature while returning a Web `Response`. On current Vercel Functions this can be interpreted as the legacy Node req/res handler. The business logic could finish, but the HTTP response was not committed, so the invocation stayed open until Vercel terminated it at 60 seconds with 504.

## Fix
- Converted `api/ops.js` to the current Web Handler export: `export default { fetch(request) { ... } }`.
- Converted `api/health.js` and Gmail OAuth callback to the same format.
- Removed legacy header fallbacks: the handler now receives a real Web `Request`.
- Build/version bumped to 1.6.0.

No environment variables need to be changed.
