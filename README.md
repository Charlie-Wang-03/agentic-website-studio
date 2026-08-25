# Agentic Website Studio

Agentic Website Studio is a private R&D foundation for evidence-first, rights-aware research into public website references. It is not a website generator, crawler, cloning tool, or legal decision system.

M3 preserves the M2 single-reference flow and adds an auditable original-concept decision flow:

`public URL → policy preflight → passive desktop/mobile inspection → Raw Evidence → Analysis Packet → Reference Profile → Design Principles → semantic validation`

`3+ validated analyses → Synthesis Packet → Synthesis Map → Creative Packet → exactly 3 Creative Concepts → Human Creative Gate`

Raw Evidence is restricted to observed facts. A Reference Profile contains cited inference or evaluation. Design Principles contain cited, transferable abstractions with first-class rights and anti-copy constraints. These layers are intentionally not interchangeable.

## Setup and quality gate

Requires Node.js 24 or later. Dependencies, Chromium, npm cache, generated runs, and project-controlled temporary files remain repository-local and ignored.

```powershell
npm install
$Env:PLAYWRIGHT_BROWSERS_PATH="0"
npx playwright install chromium
npm run check
```

The scripts set process-local `TEMP`, `TMP`, and `TMPDIR` to `.tmp/`. They do not alter global environment variables. Third-party runtimes may still perform unavoidable transient operating-system writes; the project does not claim stronger isolation than those runtimes provide.

## Commands

Capture one public page passively at the documented desktop (1440×900) and mobile (390×844) viewports:

```powershell
npm run studio -- capture --url https://example.com --project example
```

For a modern page with a documented passive initialization period, `--settle-ms <0..5000>` can extend the bounded post-`DOMContentLoaded` settle without relying on `networkidle`.

`--disable-javascript` is a last-resort passive fallback for a public page whose execution context cannot stabilize. The run records the fallback as a material warning; enabled-runtime interaction and motion must then remain explicitly unknown.

Prepare the bounded evidence-only handoff:

```powershell
npm run studio -- prepare-analysis --run runs/example/<run-id>
```

After an evidence-only analysis agent creates the two derived artifacts according to [the protocol](docs/REFERENCE_INTELLIGENCE_PROTOCOL.md), validate their schemas and referential integrity:

```powershell
npm run studio -- validate-analysis --run runs/example/<run-id> --profile runs/example/<run-id>/reference-profile.json --principles runs/example/<run-id>/design-principles.json
```

Prepare and validate M3 artifacts with tuple descriptors that name the run, Analysis Packet, Profile, and Principles. Every tuple is revalidated and bound by hashes:

```powershell
npm run studio -- prepare-synthesis --brief docs/wayfinder.project-brief.json --reference runs/a/tuple.json --reference runs/b/tuple.json --reference runs/c/tuple.json --output-dir runs/wayfinder/m3
npm run studio -- validate-synthesis --packet runs/wayfinder/m3/synthesis-packet.json --synthesis runs/wayfinder/m3/synthesis-map.json
npm run studio -- prepare-creative --brief docs/wayfinder.project-brief.json --packet runs/wayfinder/m3/synthesis-packet.json --synthesis runs/wayfinder/m3/synthesis-map.json --output runs/wayfinder/m3/creative-packet.json
npm run studio -- validate-concepts --brief docs/wayfinder.project-brief.json --packet runs/wayfinder/m3/synthesis-packet.json --synthesis runs/wayfinder/m3/synthesis-map.json --creative-packet runs/wayfinder/m3/creative-packet.json --concepts runs/wayfinder/m3/concepts.json --concept-review runs/wayfinder/m3/concept-review.json --originality-review runs/wayfinder/m3/originality-review.json --gate runs/wayfinder/m3/human-gate.json
```

The provider-neutral [M3 protocol](docs/M3_CREATIVE_PROTOCOL.md) defines synthesis classification, false-consensus prevention, concept diversity, originality review, and the mandatory human gate.

Runs live below `runs/<project>/<run-id>/` and are ignored by Git. `--local-fixture` exists only for the project-owned loopback fixture; it does not authorize LAN/private targets. The early M2 contract correction is intentionally breaking: stale M1 runs may need recapture.

## Boundaries

Capture records bounded semantic geometry, computed-style distributions, short headings/labels, passive motion and affordance signals, deterministic scroll states, sanitized technical/network metadata, and research screenshots. It does not persist full HTML, stylesheets, JavaScript bodies, source maps, response bodies, cookies, authorization headers, storage, profiles, or downloaded assets for reuse. It does not click arbitrary links or submit forms.

Public accessibility permits inspection, not reuse. Screenshots and observed third-party media remain `inspect_only` unless independent rights evidence establishes otherwise. Design abstractions do not change that status and are not legal certification. See [architecture](docs/ARCHITECTURE.md) and [policies](docs/POLICIES.md).

M3 stops at `pending_human_selection`. It does not select a concept or implement a website. Production generation, model APIs, Figma, deployment, and CI remain deferred.
