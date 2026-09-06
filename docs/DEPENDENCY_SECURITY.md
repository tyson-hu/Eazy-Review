# Dependency security dispositions

Reviewed on 2026-09-06 against the dependency graph at
`2bc6a200fb0e4d8505b809b39083091ab1d8269d`. No dependencies or lockfile entries
were changed and neither GitHub alert was dismissed. Reassess these conclusions
when the dependency graph or call sites change. Report new issues through the
[security policy](SECURITY.md).

## decode-uri-component — unresolved compatible update

[GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr),
GitHub Dependabot alert #14, medium severity.

The locked runtime chain is `expo-router@57.0.19` → `query-string@7.1.3` →
`decode-uri-component@0.2.2`. Expo Router's
`build/react-navigation/core/getStateFromPath.js` calls `queryString.parse`
for query parameters. Query-string calls the decoder when decoding is enabled.
This is a potentially reachable URL-processing path, not an unused build-only
dependency. No native exploit, input-size bound or runtime mitigation was
established by this static review.

The advisory describes excessive CPU use on malformed percent-encoded input
and identifies 0.5.0 as patched. Registry metadata on the review date shows
57.0.19 is the latest stable Expo Router 57 release and 7.1.3 is the latest
query-string 7 release; both retain this dependency chain.

The patched decoder is ESM (`type: module`, default export), while the installed
query-string uses `require('decode-uri-component')` as a directly callable
function. A forced 0.5.0 override changes that module contract. Query-string
9.5.1 uses the patched decoder but is itself an ESM major-version change outside
Expo Router's declared range. Neither is a demonstrated compatible drop-in fix.

**Disposition:** keep the alert open and track an Expo-supported fix. Before
release, recheck a compatible Expo Router/query-string update or explicitly
select a bounded URL-input mitigation. Any mitigation must cover native and web
entry points before the vulnerable parser and preserve valid recovery and
navigation links. Validate malformed-input responsiveness and ordinary routing
in disposable environments; do not infer that an auth-screen guard protects
the earlier router parser.

Sources: [Expo Router 57.0.19 metadata](https://registry.npmjs.org/expo-router/57.0.19),
[query-string 7.1.3](https://registry.npmjs.org/query-string/7.1.3),
[patched decoder metadata](https://registry.npmjs.org/decode-uri-component/0.5.0),
[query-string 9.5.1](https://registry.npmjs.org/query-string/9.5.1).

## uuid — affected API not used by the observed parent

[GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq),
GitHub Dependabot alert #1, medium severity.

The only locked parent of `uuid@7.0.3` is `xcode@3.0.1`, used by Expo config
plugins for native project generation. Its `lib/pbxProject.js` generates project
identifiers with `uuid.v4()` without an external output buffer. The advisory
concerns v3/v5/v6 API methods with caller-provided buffers; it explicitly
distinguishes v4. The vulnerable API was not found in this parent call path.
That conclusion is limited to the inspected graph and call site.

The first patched compatible release line named by the advisory starts at
uuid 11.1.1, outside xcode's declared `^7.0.3` range. The registry still lists
xcode 3.0.1 as latest on the review date. A cross-major override solely to clear
the alert would need separate native-generation compatibility evidence.

**Disposition:** retain the dependency and leave the alert open with this
documented call-site assessment. Revisit when Expo/xcode offers a supported
update or any caller starts using v3/v5/v6 or external buffers. A later dismissal
requires an explicit decision and current evidence; this review performs none.

Sources: [xcode 3.0.1 metadata](https://registry.npmjs.org/xcode/3.0.1),
[upstream advisory](https://github.com/uuidjs/uuid/security/advisories/GHSA-w5hq-g745-h8pq).
