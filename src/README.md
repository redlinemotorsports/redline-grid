# TypeScript source

This directory is the home for modules migrated out of the legacy single-file application.

- Keep migrations small and behavior-preserving.
- Prefer pure utilities first, then move one feature at a time.
- Do not change the existing HTML/CSS presentation as part of tooling migrations.
- Keep the legacy application entry point in place until a feature has been migrated and verified.

The first migrated helper is `escapeHtml`, the typed equivalent of the legacy HTML-escaping helper. It is exported from `src/index.ts` for subsequent integration into feature modules.
