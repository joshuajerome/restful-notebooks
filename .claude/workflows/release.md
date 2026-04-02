# Release — End-to-End Playbook

Follow this playbook **completely** when cutting a release.
Do not stop until the GitHub Release page is edited and the final report is printed.

---

## Completion Criteria

- [ ] Version bumped in `backend/pyproject.toml`, PR merged to staging
- [ ] `docs/patch-notes.md` updated with release section
- [ ] `docs/capabilities.md` — all shipped caps marked `merged`
- [ ] staging forwarded to integration (`git merge`)
- [ ] `release/vX.Y.Z` branch pushed, `release.yml` passed
- [ ] GitHub Release notes edited (using `.claude/templates/github-release-notes.md`)
- [ ] Desktop builds attached (macOS, Windows, Linux)
- [ ] Local release branch cleaned up
- [ ] Final report printed

---

## Step 1 — Determine version

Read current version from `backend/pyproject.toml`.
Ask: "What version? (current: {X.Y.Z})"
If not specified, suggest next patch: `X.Y.{Z+1}`.

---

## Step 2 — Identify what's shipping

Read `docs/capabilities.md`. List every cap merged since the last release.

```bash
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```

---

## Step 3 — Draft release notes

Fill the template at `.claude/templates/github-release-notes.md`.
Save to `/tmp/release-notes.md` and `/tmp/patch-note-entry.md`.

---

## Step 4 — Version bump PR

```bash
git checkout staging && git pull origin staging
git checkout -b feat/bump-v{X.Y.Z}
```

Edit `backend/pyproject.toml`:
```toml
version = "{X.Y.Z}"
```

Prepend `/tmp/patch-note-entry.md` content into `docs/patch-notes.md`.

```bash
git add backend/pyproject.toml docs/patch-notes.md
git commit -m "bump: version {A.B.C} → {X.Y.Z}"
git push -u origin feat/bump-v{X.Y.Z}

gh pr create \
  --base staging \
  --title "bump: version {A.B.C} → {X.Y.Z}" \
  --body "Version bump for the {X.Y.Z} release." \
  --assignee joshuajerome
```

Watch CI, then merge:
```bash
gh pr checks <PR_NUMBER> --watch
gh pr merge <PR_NUMBER> --merge --delete-branch
```

---

## Step 5 — Update capabilities.md

Ensure all shipped caps have `status: merged`.

---

## Step 6 — Forward staging → integration

```bash
git checkout integration && git pull origin integration
git merge origin/staging --no-edit
git push origin integration
```

---

## Step 7 — Cut the release branch

```bash
git checkout -b release/v{X.Y.Z} origin/integration
git push -u origin release/v{X.Y.Z}
```

Watch the release workflow:
```bash
gh run watch $(gh run list --branch release/v{X.Y.Z} --workflow release.yml \
  --limit 1 --json databaseId --jq '.[0].databaseId')
```

---

## Step 8 — Edit the GitHub Release page

```bash
gh release edit v{X.Y.Z} --notes "$(cat /tmp/release-notes.md)"
```

Verify:
```bash
gh release view v{X.Y.Z}
```

---

## Step 9 — Clean up branches

```bash
git checkout integration
git branch -d feat/bump-v{X.Y.Z} 2>/dev/null || true
git branch -d release/v{X.Y.Z} 2>/dev/null || true
```

---

## Step 10 — Final report

```
✓ Version bumped: {A.B.C} → {X.Y.Z}
✓ docs/patch-notes.md updated
✓ docs/capabilities.md — all shipped caps marked merged
✓ staging → integration forwarded
✓ release/v{X.Y.Z} pushed — release.yml passed
✓ GitHub Release: https://github.com/joshuajerome/restful-notebooks/releases/tag/v{X.Y.Z}
✓ Desktop builds: macOS, Windows, Linux artifacts attached
```

---

## Rules

- Never push directly to `integration` — always merge staging in
- The release branch is created from `integration`, not staging
- Do not tag manually — `release.yml` creates the git tag via `softprops/action-gh-release`
- Restful Notebooks installs the latest restful wheel from GitHub Releases during CI builds
