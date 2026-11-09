# Public response headers

Issue [#88](https://github.com/luinbytes/luinbytes.dev/issues/88) remains open for
production hardening. This document records the current limit and the hosting
decision needed to meet its acceptance criteria. It does not change hosting.

## Verified public behaviour

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

## What the repository can enforce

The Pages workflow uploads static files from `out`. It does not run
`scripts/serve-preview.mjs` in production. GitHub Pages has no supported custom
response header configuration. Adding `_headers`, `.htaccess`, or a header to the
local Node server does not configure the current Pages deployment. See
[GitHub's response about custom headers](https://github.com/orgs/community/discussions/54257).

The existing meta CSP remains useful and must stay intact. Its `frame-src 'none'`
blocks frames embedded by this site. It does not block other sites embedding this
site. Browsers require a response header for `frame-ancestors`; adding that directive,
`X-Frame-Options`, `nosniff`, or HSTS to HTML meta tags does not provide those protections.

The local preview adds the full CSP with `frame-ancestors 'none'`,
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and
`Referrer-Policy: no-referrer`. Preview HTTP has no HSTS header.
Browser tests against that server verify preview behaviour, not public headers.

## Hosting judgement for Lu

Prefer response header rules on the existing Cloudflare edge if Lu confirms the
zone is controlled by the intended account and that rules cover all public
responses, including cached pages and errors. Cloudflare documents
[response header transforms](https://developers.cloudflare.com/rules/transform/response-header-modification/).
The observed server header supports investigating this path; it does not prove
account access, plan eligibility, or configured rules. No account or DNS change
has been made.

The intended policy is the unchanged `contentSecurityPolicy` from
`scripts/security-policy.mjs`, plus `frame-ancestors 'none'` as a response CSP.
Also send `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and
`Referrer-Policy: no-referrer`. Keep the header policy aligned with that source
when the CSP changes. Apply it to successful HTML and error responses and check
asset MIME types before enabling `nosniff`.

HSTS needs its own coverage check. These apex HTTPS samples do not establish safe
coverage for HTTP redirects, `www`, other subdomains, or certificate renewal.
After those checks, begin with a short apex `max-age` and increase it only after
verification. Do not enable `includeSubDomains` or `preload` without a separate
inventory and decision. See [Cloudflare's HSTS guidance](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/).

If the existing edge cannot supply these headers, a host with explicit header
support is the alternative. For example, [Cloudflare Pages supports a `_headers`
file](https://developers.cloudflare.com/pages/configuration/headers/). That would
be a hosting migration requiring Lu's decision and deployment verification, not
a file fix for GitHub Pages. For this static portfolio, retaining Pages with the
documented gap is also a valid decision if Lu accepts it.

After any authorised hosting change, repeat GET and HEAD checks for all four
routes, check the meta CSP is preserved, and verify both pond modes and normal
navigation. Until those public checks pass, do not claim #88 is fixed or close
its production acceptance criteria.
