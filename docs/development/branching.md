# Branching Guide

Restful Notebooks follows the same branching model as restful and CUTIP.

## Branches

| Branch | Purpose | Push directly? |
|--------|---------|---------------|
| `integration` | Stable, deploys docs to GitHub Pages | Never — merge from staging |
| `staging` | Development target | Never — merge from feat/bug branches |
| `feat/cap{N}-slug` | New feature | Yes |
| `bug/cap{N}-slug` | Bug fix | Yes |
| `docs/slug` | Documentation update | Yes |
| `release/vX.Y.Z` | Release branch (triggers build + release) | Created from integration |

## Flow

```
feat/cap030-request-builder
    └→ PR → staging
                └→ merge → integration
                                └→ release/v0.1.0
```

## Capability IDs

Desktop capabilities start at **cap030** to distinguish from restful library caps.

- Format: `cap030`, `cap031`, ... (zero-padded, 3 digits)
- Used in: branch name, commit prefix, PR title

## Commit Messages

```
[cap030] feat: add request builder page
[cap031] fix: endpoint autocomplete not filtering by method
```
