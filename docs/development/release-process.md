# Release Process

## Overview

1. Version bump PR to staging
2. Merge staging → integration
3. Cut `release/vX.Y.Z` branch from integration
4. CI builds desktop apps for all platforms
5. GitHub Release created with artifacts
6. Edit release notes

## Detailed Steps

### 1. Version Bump

```bash
git checkout staging && git pull
git checkout -b feat/bump-vX.Y.Z
```

Edit `backend/pyproject.toml`:
```toml
version = "X.Y.Z"
```

Update `docs/patch-notes.md` with the release section.

### 2. PR and Merge

```bash
gh pr create --base staging \
  --title "bump: version A.B.C → X.Y.Z" \
  --body "Version bump for the X.Y.Z release." \
  --label "feature" \
  --assignee joshuajerome
```

### 3. Forward to Integration

```bash
git checkout integration && git pull
git merge origin/staging --no-edit
git push
```

### 4. Cut Release Branch

```bash
git checkout -b release/vX.Y.Z integration
git push -u origin release/vX.Y.Z
```

This triggers `release.yml` which builds macOS, Windows, and Linux desktop apps.

### 5. Edit Release Notes

After CI completes:

```bash
gh release edit vX.Y.Z --notes "..."
```

Use the template at `.claude/templates/github-release-notes.md`.

## restful Library Dependency

Restful Notebooks depends on the restful library. In development, this is an editable local dependency:

```toml
[tool.uv.sources]
restful = { path = "../../restful", editable = true }
```

For production builds, the release workflow installs the latest restful wheel from GitHub Releases:

```bash
pip install https://github.com/joshuajerome/restful/releases/latest/download/restful-X.Y.Z-py3-none-any.whl
```
