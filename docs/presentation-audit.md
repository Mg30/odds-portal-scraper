# Repository presentation audit

Audit date: 2026-11-01. Scope: documentation, package/About metadata, and tracked
environment-file hygiene. Application code, dependencies, workflows, and public
interfaces are unchanged.

## Corrected presentation

- Replace promotional performance/reliability claims with the capabilities
  visible in the source: historical/upcoming soccer odds, Playwright, JSON,
  local files, and S3.
- Fix the placeholder support URL.
- Remove the README's MIT claim. package.json, the root lockfile metadata, and
  the published npm package declare ISC. No standalone LICENSE exists; this
  cleanup does not invent one or change the declared license.
- Remove .env from the index. The inspected file contains only LOG_LEVEL.
  Keep local configuration ignored and add a non-secret .env.example.
  No history rewrite is performed.
- Document that environment variables are not loaded from .env automatically.
- Correct --odds-format: it is required, has no default, and uses lower-case
  keys from lib/constants.js.
- Document that an output destination must be supplied, local directories must
  already exist, and season start years are inclusive.
- Add Chromium installation, AWS configuration, honest Node/CI status, and
  valid illustrative JSON instead of ellipsis placeholders.
- Improve package description and discoverability metadata without changing
  versions, scripts, dependency declarations, or lockfile resolutions.

## Implementation observations intentionally left unchanged

- index.js uses logger in the next-matches conflicting-output branch without
  importing it. Avoid selecting both outputs; this cleanup does not fix the
  runtime path.
- Both CLI scrape commands do nothing when neither output destination is set.
- lib/commands/index.js catches and logs scraping failures without setting a
  process exit code; downstream handling can also skip failed matches. An exit
  code of zero does not establish a complete export.
- Historical year parsing and several page-dependent fallbacks are permissive.
  The README no longer promises comprehensive input validation.
- The tests include live browser/site behavior. The workflow's pull_request
  branch filters target feature/hotfix/bugfix branches, not develop, so PRs
  into the default branch are not covered by that trigger.
- The publish workflow and source package metadata say 2.10.5, while npm's
  latest published version at audit time is 2.10.6. No version bump, publication,
  or attempt to reconcile release history is included.
- No standalone license grant is present. Adding one remains a maintainer
  decision; the cleanup reports the existing ISC declaration accurately.

## Sources checked

- index.js, lib/constants.js, lib/logger.js, lib/browser.js, lib/exporters.js
- lib/utils/leagues.js and lib/scraping/match/*
- tests/*, .github/workflows/*, package.json, package-lock.json, tracked .env
- [Published npm metadata](https://registry.npmjs.org/odds-portal-scraper/latest)
- [Playwright browser installation](https://playwright.dev/docs/browsers)
- [AWS SDK credential resolution](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html)

## Validation

Validated on Node.js 24.22.1 / npm 11.19.1:

- Locked dependency installation with lifecycle scripts disabled.
- CLI help, command-specific help, league listing, and format listing.
- Four existing exporter tests passed (mocked S3 and local files).
- Markdown local links and illustrative JSON parsed successfully.
- npm package dry-run excludes .env and includes .env.example.
- .env and .env.production are ignored; .env.example is trackable.
- Application source, tests, workflows, lockfile, dependency declarations,
  package version, and ISC declaration are unchanged.

The full browser/live-site suite was not run for this presentation-only change;
these checks do not establish current live scraping success.
