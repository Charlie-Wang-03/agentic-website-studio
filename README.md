# Agentic Website Studio

Agentic Website Studio is an early private R&D foundation for evidence-first, rights-aware research into public website references. It is not a production website generator, crawler, cloning tool, or legal decision system.

This M0–M1 milestone implements one auditable slice:

`public URL → policy preflight → Playwright inspection → structured evidence → rights metadata → JSON Schema validation → local QA`

## Setup

Requires Node.js 24 or later. All dependencies, npm cache, and Chromium are repository-local.

```powershell
npm install
$Env:PLAYWRIGHT_BROWSERS_PATH="0"
npx playwright install chromium
npm run check
```

Capture one public page:

```powershell
npm run studio -- capture --url https://example.com --project example
```

Generated runs live below `runs/<project>/<run-id>/` and are ignored by Git. `--local-fixture` exists only for project-owned loopback fixtures; it does not authorize LAN/private targets.

## Boundaries

The capture records navigation facts, limited DOM/visual structure, a screenshot, sanitized network metadata, and privacy-preserving console metadata (message hashes, not message bodies). It blocks service workers and WebSockets in M1 and deliberately does not persist cookies, authorization headers, bodies, storage, browser profiles, full HTML, or reusable copies of site assets. A public resource remains `inspect_only` unless separate evidence establishes reuse permission. This metadata is a research aid, not legal advice.

Current limitations include one-page capture, no authenticated sources, no full archival fidelity, a DNS-rebinding residual risk common to application-layer checks, and no synthesis, design generation, UI, deployment, or CI. See [architecture](docs/ARCHITECTURE.md) and [policies](docs/POLICIES.md).
