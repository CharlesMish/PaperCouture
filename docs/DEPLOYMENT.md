# Hosting Paper Couture

Paper Couture is a static Three.js/Vite application. `npm run build` writes
`dist/`; the relative Vite base allows hosting at a root or subpath. No backend,
API key, or external image service is required. This setup does not create or
link a hosting account.

## Connect the repository

Import `CharlesMish/PaperCouture` into the owner's preferred static host.

- Root directory: repository root.
- Node.js: 24.x, consistent with `.nvmrc` and `package.json`.
- Install: `npm ci --include=dev --no-audit --no-fund`.
- Build: `npm run build`.
- Output directory: `dist`.
- Production branch: `main`; use a PR branch for the first preview.

For Vercel, the checked-in `vercel.json` sets the Vite framework and these commands.
For Cloudflare Pages, configure the same build command/output and Node 24 in
that project's build settings. Both are suitable static hosting paths; choose one
canonical host.

Confirm that the deployed commit matches the requested branch. Record the
HTTPS URL and commit in the PR. A Git-connected host can supply future previews.

## Verify the hosted preview

Open the actual URL on desktop and phone. Finish all six folds, reverse a fold,
reset, change and rotate paper, and enter/leave Display. Confirm a refresh works.
On a phone check the scrolling paper picker, orbit, and pinch. Existing headless
Chromium checks do not establish real-phone behavior.

## Checks

`.github/workflows/ci.yml` runs Node 24 typecheck, geometry/controller checks, and
a production build on PRs and pushes to main. It does not deploy. Once its first
GitHub run passes, `Node 24 checks` is the check name available for a branch rule.
Branch protection is managed separately in repository settings.

Provider reference: https://vercel.com/docs/project-configuration/vercel-json
