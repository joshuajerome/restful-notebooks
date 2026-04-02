# CI/CD Workflows

## CI (`ci.yml`)

Runs on pushes to `feat/**`, `bug/**`, `claude/**` and PRs to staging/integration.

**Jobs:**
- **Auto-label** — derives label from branch prefix, assigns to PR author
- **Backend Tests** — `uv run pytest tests/ -v`
- **Frontend Lint & Type Check** — `npx tsc --noEmit` + `npm run lint`
- **Docs Build** — `mkdocs build --strict`

## Docs (`docs.yml`)

Runs on PRs touching `docs/**` or `mkdocs.yml`, and pushes to staging/integration.

**Jobs:**
- **Build** — `mkdocs build --strict`
- **Deploy** — `mkdocs gh-deploy --force` (integration push only)

## Release (`release.yml`)

Runs when a `release/**` branch is pushed.

**Jobs:**
- Backend tests
- Frontend lint & type check
- Electron builds (macOS, Windows, Linux) with PyInstaller backend bundling
- GitHub Release with platform-specific artifacts

## Build (`build.yml`)

Standalone build workflow, can be manually triggered with platform selection.

**Jobs:**
- Frontend build → PyInstaller backend → electron-builder
- Artifacts uploaded per platform
