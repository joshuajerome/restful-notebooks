# Feature or Bug Fix — End-to-End Playbook

Follow this playbook **completely** for every `feat/cap{N}` or `bug/cap{N}` deliverable.
Do not stop at PR creation. Finish when all completion criteria are met.

---

## Completion Criteria

- [ ] Tests pass locally (backend + frontend)
- [ ] PR opened with correct body, assignee, and label
- [ ] All CI checks green
- [ ] PR merged to staging
- [ ] staging forwarded to integration
- [ ] Merged branch pruned locally
- [ ] Final summary printed

---

## Step 1 — Assign a Cap ID

1. Read `docs/capabilities.md`
2. Find the highest existing `cap{N}` ID and increment by 1
3. Announce: **"Assigning cap{N}: {title}. Branch: `{feat|bug}/cap{N}-{slug}`."**

Desktop caps start at **cap030** to distinguish from restful library caps.

---

## Step 2 — Branch from staging

```bash
git checkout staging && git pull origin staging
git checkout -b {feat|bug}/cap{N}-{slug}
```

---

## Step 3 — Read before editing

**Never edit a file you haven't read in this session.**

---

## Step 4 — Implement

- Keep the diff minimal
- Use MUI components — no raw HTML where an MUI equivalent exists

---

## Step 5 — Run tests

```bash
# Backend
cd ~/dev/cutip-related/restful-notebooks/backend && uv run pytest tests/ -v

# Frontend
cd ~/dev/cutip-related/restful-notebooks/frontend && npm run lint
```

---

## Step 6 — Commit and push

```bash
git add <specific files>
git commit -m "[cap{N}] {feat|fix}: {short imperative description}"
git push -u origin {feat|bug}/cap{N}-{slug}
```

---

## Step 7 — Open PR

```bash
gh pr create \
  --base staging \
  --head {feat|bug}/cap{N}-{slug} \
  --title "[cap{N}] {description}" \
  --body-file /tmp/pr-body.md \
  --label "{feat|bug}" \
  --assignee joshuajerome
```

---

## Step 8 — Watch CI

```bash
gh pr checks <PR_NUMBER> --watch
```

---

## Step 9 — Merge

```bash
gh pr merge <PR_NUMBER> --merge --delete-branch
```

---

## Step 10 — Forward staging → integration

```bash
git checkout integration && git pull origin integration
git merge origin/staging --no-edit
git push origin integration
```

---

## Step 11 — Prune merged branches

```bash
git fetch --prune
git branch -d {feat|bug}/cap{N}-{slug} 2>/dev/null || true
```

---

## Step 12 — Final report

```
✓ cap{N} — {title}
✓ Branch: {feat|bug}/cap{N}-{slug}
✓ PR #{N} merged to staging
✓ staging forwarded to integration
✓ Branch pruned locally
```

---

## Rules

- Never merge with failing CI
- One cap ID per PR
- Always use `[cap{N}]` prefix on commits and PR titles
- Stage specific files — never `git add -A`
- Use MUI MCP server when making UI changes
