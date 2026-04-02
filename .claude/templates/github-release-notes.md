# GitHub Release Notes Template

Use this when running `gh release edit vX.Y.Z --notes "..."`.

Fill every `{placeholder}`. Write only user-facing changes.
Omit: CI fixes, doc cleanups, internal refactors, test changes.

**Format rules:**
- List capabilities added/fixed — one bullet per cap ID
- Do not list individual PRs, authors, or "What's Changed" auto-generated content
- Replace any GitHub-generated release notes entirely with this template

---

## GitHub Release page body

```
Restful Notebooks — visual REST workspace management, endpoint browsing,
request execution, and workflow orchestration.

## Features

- **cap{N} — {title}**: {one sentence — what the user can now do}
- **cap{M} — {title}**: {one sentence — what the user can now do}

## Patch Notes

- **cap{P} — {title}**: {one sentence — what error is fixed}
- **cap{Q} — {title}**: {one sentence — what error is fixed}

## Installation

**Desktop app** — download from the Assets section below:
- `restful-notebooks-macos.dmg` — macOS
- `restful-notebooks-windows.exe` — Windows
- `restful-notebooks-linux.AppImage` — Linux

**Development**:
```bash
cd backend && uv run python -m uvicorn app.main:app --reload --port 8000
cd frontend && npm run dev
cd electron && npm start  # optional
```

**Full Changelog**: https://github.com/joshuajerome/restful-notebooks/compare/v{A.B.C}...v{X.Y.Z}
```

Omit `## Features` entirely if no `feat/*` caps shipped in this release.
Omit `## Patch Notes` entirely if no `bug/*` caps shipped in this release.

---

## docs/patch-notes.md entry

Prepend this block after the `# Patch Notes` heading in `docs/patch-notes.md`:

```markdown
## v{X.Y.Z} ({YYYY-MM-DD})

### Features

- **cap{N}** — {title}: {what changed from a user perspective}
- **cap{M}** — {title}: {what the user can now do}

### Patch Notes

- **cap{P}** — {title}: {what was broken, what now works}
- **cap{Q}** — {title}: {behavioral impact}
```

Omit `### Features` if no feat caps. Omit `### Patch Notes` if no bug caps.
