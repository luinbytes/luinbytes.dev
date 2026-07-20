# F1 Command Centre

`/f1` is a private race dashboard backed by OpenF1 data and a Cloudflare Worker. The F1 page and its versioned assets deploy with the Worker, independently of the public site's GitHub Pages build queue. The Worker also owns provider credentials, response caching, Access identity validation, and shared rooms.

## Runtime map

- `luinbytes-f1-gateway` serves `/f1`, `/f1-assets/*`, the manifest, the service worker, and `/f1/api/*` on Cloudflare.
- GitHub Pages continues to serve the public portfolio and can contain the same static export as a fallback.
- OpenF1 supplies timing, positions, telemetry, radio, race control, results, grids, pit stops, overtakes, and championship data.
- `F1Room` is a SQLite-backed Durable Object. It stores room ownership, the shared session, selected drivers, replay cursor, reactions, predictions, scores, and read-only mode. WebSocket Hibernation carries presence and updates.
- Cloudflare Access must protect `luinbytes.dev/f1*`. The Worker also verifies the `Cf-Access-Jwt-Assertion` signature, issuer, validity window, and audience before it accepts a room request.
- Room invite links expire after seven days and can be rotated by the owner. A one-minute, single-use ticket authorizes each WebSocket connection, so the reusable invite is not sent during the socket handshake.
- `/f1/api/mcp` is an Access-authenticated Streamable HTTP JSON-RPC endpoint. It exposes the ten read-only race tools listed in the product specification.
- `/f1/api/ai` accepts only a session key, replay timestamp, and selected driver numbers. The Worker rebuilds the race snapshot from OpenF1, excludes future replay data, rejects stale or mismatched context, and verifies every model evidence reference before returning it. OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter, Ollama, and OpenAI-compatible servers use server-side configuration.
- MCP is limited to 30 requests per Access identity per minute, AI is limited to 10 requests per identity per five minutes with one concurrent request, and all upstream calls have a ten-second timeout. Tool calls write a secret-free structured audit event to Worker observability.

## Worker configuration

`wrangler.jsonc` contains the public OpenF1 origin and the Durable Object binding. Configure these values in Cloudflare before enabling rooms:

- `ACCESS_TEAM_DOMAIN`: the Cloudflare Access team slug
- `ACCESS_AUD`: the Access application audience tag for `luinbytes.dev/f1*`
- `OPENF1_AUTHORIZATION`: optional secret containing the provider authorization value for real-time session access
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, or `OPENROUTER_API_KEY`: optional server-side AI provider secrets
- `OPENAI_MODEL`, `ANTHROPIC_MODEL`, `GEMINI_MODEL`, `DEEPSEEK_MODEL`, and `OPENROUTER_MODEL`: optional model overrides
- `OLLAMA_BASE_URL` and `OLLAMA_MODEL`: optional HTTPS Ollama endpoint and model, with `OLLAMA_API_KEY` for hosted instances
- `AI_COMPATIBLE_BASE_URL` and `AI_COMPATIBLE_MODEL`: optional HTTPS OpenAI-compatible endpoint and model, with `AI_COMPATIBLE_API_KEY` when required

Do not commit those values. Use Wrangler secrets or encrypted deployment variables.

For local Worker integration tests only, `ENVIRONMENT=test` plus `ACCESS_DEV_EMAIL` enables the matching `X-F1-Dev-Email` header or `__test_email` WebSocket query. Both gates are required. Never configure either value in production.

## ChatGPT MCP

Connect an MCP client to `https://luinbytes.dev/f1/api/mcp`. Cloudflare Access must authorize the client request before the Worker accepts JSON-RPC `initialize`, `tools/list`, or `tools/call`. Available tools are:

- `get_current_session`
- `get_driver_state`
- `compare_drivers`
- `get_recent_race_control`
- `get_recent_radio`
- `get_current_battles`
- `get_strategy_options`
- `get_session_summary`
- `seek_replay_timestamp`
- `get_source_health`

The tools are read-only. The Access JWT is the per-user credential, Access policy changes revoke that identity, and provider data is returned as structured content plus a text fallback for MCP clients. Requests are scoped to the listed tools, rate-limited per identity, and recorded in Worker audit logs without arguments or secrets.

## Checks

```sh
npx tsc --noEmit
npm run lint
npm run f1:gateway:check
npm run test:f1-gateway
.venv/bin/python -m unittest discover -s tests/browser -p '*_test.py' -v
npm run build
```

The Worker integration test proves that room, MCP, and AI routes reject missing Access assertions, exercises the authenticated MCP tool list and health tool, verifies the no-provider AI fallback, checks the per-user MCP quota, and sends real WebSocket prediction and reaction mutations through a room. It also proves prediction lock time is assigned by the server. The browser test stubs OpenF1 at the network boundary and covers replay seeking, driver comparison, expanded timing, telemetry metrics, radio bookmarks, saved preferences, upcoming sessions, the AI fallback, locked room fallback, PWA files, and mobile overflow.

## Release order

1. Create the Access application for `luinbytes.dev/f1*` and its allow policy.
2. Set `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD`.
3. Add `OPENF1_AUTHORIZATION` if real-time provider access is available.
4. Run `npm run f1:gateway:check`, then deploy the Worker with `npm run f1:gateway:deploy`. The build packages only the F1 export into the ignored `.f1-worker-assets` directory.
5. Merge the feature branch to `master`; the Pages workflow deploys the public portfolio independently.
6. Verify Access, `/f1/api/health`, a room invite, historical replay, desktop layout, and mobile layout on the live domain.

The service worker does not cache race data or authenticated HTML. It only supplies the install and notification lifecycle, so private responses cannot leak through a shared cache.
