# F1 Command Centre

`/f1` is a private race dashboard backed by OpenF1 data and a Cloudflare Worker. The F1 page and its versioned assets deploy with the Worker, independently of the public site's GitHub Pages build queue. The Worker also owns provider credentials, response caching, Access identity validation, and shared rooms.

## Runtime map

- `luinbytes-f1-gateway` serves `/f1`, `/f1-assets/*`, the manifest, the service worker, and `/f1/api/*` on Cloudflare.
- GitHub Pages continues to serve the public portfolio and can contain the same static export as a fallback.
- OpenF1 supplies timing, positions, telemetry, radio, race control, results, grids, pit stops, overtakes, and championship data.
- `F1Room` is a SQLite-backed Durable Object. It stores room ownership, the shared session, selected drivers, and replay cursor. WebSocket Hibernation carries presence and updates.
- Cloudflare Access must protect `luinbytes.dev/f1*`. The Worker also verifies the `Cf-Access-Jwt-Assertion` signature, issuer, validity window, and audience before it accepts a room request.
- Room invite links expire after seven days and can be rotated by the owner. A one-minute, single-use ticket authorizes each WebSocket connection, so the reusable invite is not sent during the socket handshake.

## Worker configuration

`wrangler.jsonc` contains the public OpenF1 origin and the Durable Object binding. Configure these values in Cloudflare before enabling rooms:

- `ACCESS_TEAM_DOMAIN`: the Cloudflare Access team slug
- `ACCESS_AUD`: the Access application audience tag for `luinbytes.dev/f1*`
- `OPENF1_AUTHORIZATION`: optional secret containing the provider authorization value for real-time session access

Do not commit those values. Use Wrangler secrets or encrypted deployment variables.

## Checks

```sh
npx tsc --noEmit
npm run lint
npm run f1:gateway:check
npm run test:f1-gateway
.venv/bin/python -m unittest discover -s tests/browser -p '*_test.py' -v
npm run build
```

The Worker smoke test proves that room routes reject missing and malformed Access assertions. The browser test stubs OpenF1 at the network boundary and covers replay seeking, driver comparison, expanded timing, telemetry metrics, radio bookmarks, saved preferences, upcoming sessions, the locked room fallback, PWA files, and mobile overflow.

## Release order

1. Create the Access application for `luinbytes.dev/f1*` and its allow policy.
2. Set `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD`.
3. Add `OPENF1_AUTHORIZATION` if real-time provider access is available.
4. Run `npm run f1:gateway:check`, then deploy the Worker with `npm run f1:gateway:deploy`. The build packages only the F1 export into the ignored `.f1-worker-assets` directory.
5. Merge the feature branch to `master`; the Pages workflow deploys the public portfolio independently.
6. Verify Access, `/f1/api/health`, a room invite, historical replay, desktop layout, and mobile layout on the live domain.

The service worker does not cache race data or authenticated HTML. It only supplies the install and notification lifecycle, so private responses cannot leak through a shared cache.
