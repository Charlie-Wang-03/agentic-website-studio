# Agentic Website Studio

Agentic Website Studio is a frozen experimental toy demo exploring evidence-first, rights-aware, human-in-the-loop workflows for reference-driven creative web development. It is experimental, not production-ready, and not a website cloner.

## What it demonstrates

- Passive public-reference evidence capture.
- Separation of observations from derived design principles.
- Multi-reference synthesis with originality constraints.
- Explicit Human Gates that automation cannot approve.
- Local browser and QA automation.
- One completed internal dogfood example: Wayfinder / Three Bearings.

## Architecture

```text
References
   ↓
Evidence
   ↓
Design abstraction
   ↓
Multi-reference synthesis
   ↓
Original concept
   ↓
Human gate
   ↓
Implementation
   ↓
Automated QA
   ↓
Human evaluation
```

This is an experiment in workflow and governance, not a replacement for modern agent platforms. Advanced readers can start with the [architecture](docs/ARCHITECTURE.md), [policies](docs/POLICIES.md), and [reference-project notes](docs/REFERENCE_PROJECTS.md).

## Wayfinder demo

Wayfinder / Three Bearings is included as original, project-native dogfood work that demonstrates the workflow. It is not a released product.

Requires Node.js 24 or later:

```powershell
npm install
$Env:PLAYWRIGHT_BROWSERS_PATH="0"
npx playwright install chromium
npm run wayfinder:preview
```

Open `http://127.0.0.1:4173` after the preview server starts. Run the full local QA gate with `npm run wayfinder:qa`.

## Research CLI

The evidence tooling remains available for local experimentation:

```powershell
npm run studio -- capture --url https://example.com --project example
npm run studio -- prepare-analysis --run runs/example/<run-id>
npm run studio -- validate-analysis --run runs/example/<run-id> --profile runs/example/<run-id>/reference-profile.json --principles runs/example/<run-id>/design-principles.json
```

Runs are local, ignored artifacts. See the detailed [reference-intelligence protocol](docs/REFERENCE_INTELLIGENCE_PROTOCOL.md) and [creative protocol](docs/M3_CREATIVE_PROTOCOL.md) for the full workflow.

## Status

**Frozen toy demo. No active roadmap.**

- Wayfinder: completed internal dogfood.
- Release: not requested.
- Pilot 2: not started.

The committed [freeze record](docs/project-freeze.json) is the project-level current-state decision. Historical pilot artifacts remain as historical evidence; they do not reopen any Human Gate.

## Limitations

- Not production hardened.
- Procedural rather than cryptographic agent isolation.
- No hosted service.
- No guaranteed legal determination or automatic rights clearance.
- No active maintenance commitment.
- No claim that this workflow outperforms modern native agent platforms.

## Rights and originality

Public accessibility does not imply reuse permission. The demo separates research evidence from reuse rights and does not treat reference assets as reusable by default.

## License

Project-authored source is available under the [MIT License](LICENSE). npm dependencies retain their own licenses; public references are research/inspiration, not vendored source or creative assets. See [third-party materials](THIRD_PARTY.md).
