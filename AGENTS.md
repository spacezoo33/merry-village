# Merry Village development rules

- Work in the existing checkout and current development branch, `feat/elliptical-train-ride`. Do not create another branch/worktree unless requested. Never merge into main or delete branches without user approval.
- Daily validation: `npm ci` when dependencies need refreshing, then `npm run build`. This runs TypeScript, web/policy tests, the web build and web artifact verification only.
- **Do not generate AIT during development.** Do not run `npm run build:ait`, `npm run release:ait`, `npm run test:ait`, `ait build` or dispatch the release workflow unless the user explicitly requests the final completed-app release build. Manual AIT tests create temporary package files and must also stay out of routine validation.
- Do not run a broad test-discovery command over `tests/manual`; use `npm test` for development. `npm run verify:build` is a web-only compatibility alias.
- Keep `apps-in-toss.config.ts` and `appName: merry-village` unchanged. Preserve the official SDK and manual release workflow.
- Keep all original miniature PNG assets, including currently unused `train-directions.png`, until the user decides their future use. Retired animation is recoverable from commit d7b8cb8.
- Publish only `dist/` as web preview/Pages content. Never pass credentials as VITE_* variables or bundle environment/key files. Do not deploy PR code to Pages.
- Read README.md and docs/development.md for the Pages enablement steps, branch inclusion audit, and the remaining old workflow on main before approval.
