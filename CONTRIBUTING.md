# Contributing to astrologo-app

Thanks for your interest. Quick guide for filing issues and opening pull requests.

---

## Before you start

1. **Read the [README](./README.md)** — it covers what the app does, the architecture, and how to deploy your own fork.
2. **Read [SECURITY.md](./SECURITY.md)** — for security reports, do NOT open a public issue.
3. **Check existing issues** before opening a new one.

---

## Filing issues

- **Bug reports**: include steps to reproduce, the URL/route hit, the expected vs actual behavior, and (if applicable) browser console / network errors.
- **Feature requests**: explain the use case and why it doesn't fit a downstream fork.
- **Documentation gaps**: open an issue or a PR directly.

---

## Opening a pull request

### Local gates

Install and validate the repository-level tooling from the root:

```powershell
npm ci
npm run lint
npm run format:public:check
```

The actual app lives under `astrologo-frontend/`. Then run its existing gates:

```powershell
cd astrologo-frontend
npm ci
npm run lint              # ESLint
npm run biome             # Biome
npm test                  # Swiss WASM preparation + Vitest
npm run build             # Swiss WASM preparation + TypeScript + Vite
npm run build:functions   # Swiss WASM preparation + Wrangler Pages Functions build
```

All gates must be GREEN. CI repeats them on PRs to `main`; the production Deploy
workflow repeats them on a push to `main` before publication.

### PR description

Include what changed, why, how you tested. Public surface changes (UI, API response shape, D1 schema) need careful review.

Agents working on the fleet reform must present the complete local change report
and obtain the operator's approval before committing, pushing or opening a PR.
GitHub configuration changes require separate explicit approval.

### Action pinning

This repo enforces SHA-pinned GitHub Actions. Don't downgrade pinned actions to floating tags. Dependabot opens version-bump PRs with new SHAs + tag comments.

---

## License

By contributing, you agree your contribution is licensed under [AGPL-3.0-or-later](./LICENSE). AGPL §13 applies to network-service operators of forks.

Admission also follows [INBOUND.md](./INBOUND.md): copyrightable material not
demonstrably owned by LCV Ideas & Software requires a separate written inbound
license or copyright assignment, executed and verified before merge. Opening an
issue or PR alone does not transfer copyright or replace that written instrument.

---

## Code of Conduct

By participating, you agree to follow [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) (Contributor Covenant 3.0). General support: `chamados@lcv.dev`. Code of Conduct violations: `conductcode@lcv.dev`.

---

## Maintainer

Single maintainer: [@example-beneficiary](https://github.com/example-beneficiary). Response time best-effort.
