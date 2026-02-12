# Contributing Guide

## Branch naming

Use this format:

`codex/<type>-<scope>-<short-desc>`

Examples:
- `codex/feat-owner-dashboard`
- `codex/fix-reservation-status`
- `codex/chore-ci-hardening`
- `codex/docs-deployment-guide`
- `codex/refactor-order-service`
- `codex/test-app-smoke`

Allowed `type` values:
- `feat`
- `fix`
- `chore`
- `docs`
- `refactor`
- `test`

## Commit message format

Use this format:

`<type>(<scope>): <clear action>`

Examples:
- `feat(owner): add reservation calendar view`
- `fix(reservations): handle accept/reject API error`
- `chore(ci): make audit report-only`
- `docs(deploy): add Vercel and Clever Cloud env setup`
- `refactor(menu): extract menu loading helper`
- `test(client): mock speed insights in App test`

Rules:
- Keep commit subject under 72 characters when possible.
- Use imperative voice (`add`, `fix`, `update`).
- One logical change per commit.

## Pull request title format

Use the same structure as commits:

`<type>(<scope>): <clear action>`

Examples:
- `feat(owner): reservation calendar + latest sorting`
- `fix(ci): stabilize backend smoke test with mysql wait`
- `chore(repo): untrack env and node_modules`

## Pull request description template

```md
## Summary
- what changed
- what changed
- what changed

## Why
- problem this solves

## Testing
- [ ] npm --prefix server ci
- [ ] CI=true npm --prefix client test -- --watchAll=false
- [ ] npm --prefix client run build

## Deployment
- env changes? (yes/no)
- DB migration needed? (yes/no)
```

## Protected main workflow

Do not push directly to `main`.

Standard flow:
1. Create branch from `main`.
2. Commit changes on branch.
3. Push branch to GitHub.
4. Open PR to `main`.
5. Wait for CI to pass.
6. Merge PR.

## Optional release tagging

Examples:
- `v0.1.0` initial demo
- `v0.2.0` owner panel + reports
- `v0.2.1` CI stabilization fixes
