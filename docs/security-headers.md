# Public response headers

This document records the preview and production policy differences for
issue [#88](https://github.com/luinbytes/luinbytes.dev/issues/88).
Updated 9 November 2026 after Lu reported enabling Cloudflare protections.
This documentation change does not change browser policy, hosting, or security
configuration, and does not establish that every issue acceptance check is complete.

## Current production observations

At 09:04:41 UTC on 9 November 2026, independent QA used browser fetches with
`cache: 'no-store'` against `https://luinbytes.dev/` and
`https://luinbytes.dev/privacy`. All four GET and HEAD responses returned 200 and
`Content-Type: text/html; charset=utf-8`, with these headers:

| Header | Value on both routes and methods |
| --- | --- |
| Content-Security-Policy | `frame-ancestors 'none'` |
| X-Frame-Options | `DENY` |
| X-Content-Type-Options | `nosniff` |
| Strict-Transport-Security | `max-age=86400` |

Both pages' meta CSP values exactly matched `scripts/security-policy.mjs` at
[deployed commit 7cfa8a7](https://github.com/luinbytes/luinbytes.dev/blob/7cfa8a7111484e3c3d785e5103b9447439958c57/scripts/security-policy.mjs).
QA also observed the browser block an injected Cloudflare Insights beacon under
`script-src`. The existing policy was not relaxed for that script.
These are QA observations, not a Cloudflare account or rule inventory.

The first default cache homepage fetch lacked HSTS. Subsequent fresh GET and HEAD
samples included it on both routes. The initial omission did not recur in fresh
requests, but these samples do not prove coverage of all cached responses.

At 09:07 UTC, QA repeated GET and HEAD for `/404` and
`/header-check-nonexistent-20261109`. The former returned 200 and the latter 404.
All four responses had the same headers listed above, and both GET bodies retained
the exact full meta CSP. The `/404` status remains outside this header task.

QA also attempted ordinary home and privacy iframes from a controlled local HTTP
page. The browser refused both under `frame-ancestors 'none'`.
At 09:07:05 UTC, default trusted TLS handshakes with hostname validation passed for
the apex and `www`. Both certificates covered the apex and wildcard subdomains,
with validity from 26 October 2026 through 24 January 2027. This establishes current
trust and hostname coverage, not future renewal or an inventory of other subdomains.

## Preview and production differences

The preview values below come from `scripts/serve-preview.mjs` and
`scripts/security-policy.mjs` at the same deployed commit. Production values come
from the dated QA observations above.

| Policy | Local HTTP preview | Sampled production HTTPS |
| --- | --- | --- |
| HTML meta CSP | Full `contentSecurityPolicy` | Same full policy on all four sampled routes |
| CSP response header | Full `contentSecurityPolicy` plus `frame-ancestors 'none'` | Only `frame-ancestors 'none'` |
| X-Frame-Options | `DENY` | `DENY` |
| X-Content-Type-Options | `nosniff` | `nosniff` |
| Referrer-Policy | `no-referrer` | Not recorded by this QA check |
| Strict-Transport-Security | Absent on HTTP preview | `max-age=86400` |

Production combines the response framing restriction with the full meta policy.
Preview additionally sends the full policy in the response header. These delivery
mechanisms are distinct. A meta CSP cannot enforce `frame-ancestors` and applies
only after the browser encounters it. `frame-src 'none'` restricts frames embedded
by this site, not other sites embedding it. The current production response header
provides the framing restriction that the earlier samples lacked.

Response header parity with preview's `Referrer-Policy: no-referrer` is unverified.
Do not infer that header's presence or absence from its omission in the QA report.
The repository's home, privacy, and 404 HTML templates also contain
`<meta name="referrer" content="no-referrer" />`. That is distinct from an HTTP
response header and was not separately verified in the live QA sample.
Preview browser tests establish preview behaviour, not public header coverage.

## Historical observations before protections were enabled

The following table records the earlier state and does not describe the current
home and privacy samples above.

On 9 November 2026 at 00:43 UTC, certificate validated HTTPS GET and HEAD requests
to `https://luinbytes.dev` returned the following results. No request followed a
redirect to a different URL.

| Route | GET status | HEAD status | CSP response header | X-Frame-Options | X-Content-Type-Options | Strict-Transport-Security |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | 200 | 200 | Absent | Absent | Absent | Absent |
| `/privacy` | 200 | 200 | Absent | Absent | Absent | Absent |
| `/404` | 200 | 200 | Absent | Absent | Absent | Absent |
| `/header-check-nonexistent-20261109` | 404 | 404 | Absent | Absent | Absent | Absent |

Every GET contained the meta CSP from `scripts/security-policy.mjs`, with an
exact value match. All eight responses reported `Server: cloudflare`.
These observations establish public behaviour at that time, not account settings
or future responses. The `/404` status differs from the local preview server;
status changes are outside this header task.

To repeat the response check, run this command for each route in the table:

```bash
curl --silent --show-error --dump-header - --output /dev/null https://luinbytes.dev/privacy
curl --silent --show-error --head https://luinbytes.dev/privacy
```

## Hosting boundary and remaining verification

The Pages workflow uploads static files from `out`. It does not run
`scripts/serve-preview.mjs` in production. GitHub Pages has no supported custom
response header configuration. Adding `_headers`, `.htaccess`, or headers to the
local Node server does not configure Pages responses. See
[GitHub's response about custom headers](https://github.com/orgs/community/discussions/54257).
Cloudflare supports [response header transforms](https://developers.cloudflare.com/rules/transform/response-header-modification/),
but the QA observations do not verify the account's configured rules or their scope.

The earlier recommendation was to configure the full `contentSecurityPolicy` plus
`frame-ancestors 'none'` as a response CSP, alongside `DENY`, `nosniff`, and
`no-referrer`. That remains a proposed alignment, not a description of the current
production response CSP. Keep `scripts/security-policy.mjs` as the source for the
full policy if a future authorised hosting change adopts it.

The QA samples cover home, privacy, `/404`, and one nonexistent route. They do not
establish asset MIME types, every cached response, raw redirect statuses or
`Location` headers, direct `www` redirect response headers, certificate renewal,
or HTTPS coverage for other subdomains.
Browser entry checks for HTTP apex and `www` ended at HTTPS apex. HTTPS
`www/privacy` ended at apex `/privacy`. The browser had already received HSTS, so
these effective destinations do not prove the raw HTTP redirect chain for a new
client. QA did not disable or bypass security controls.

The observed HSTS value has neither `includeSubDomains` nor `preload`. Any increase
or broader HSTS scope needs separate coverage verification and Lu's decision.
See [Cloudflare's HSTS guidance](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/).
The trusted TLS checks support current apex and `www` HTTPS coverage within these limits.

Independent QA reports the scoped runtime checks passed. Documentation still needs review. This documentation records
current evidence and explicit differences without closing #88 or changing hosting.
