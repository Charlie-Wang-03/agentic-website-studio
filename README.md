# Agentic Website Studio

Agentic Website Studio is a private R&D foundation for evidence-first, rights-aware research and implementation from source-neutral creative contracts. It is not a website cloning tool, crawler, or legal decision system.

M4.1 preserves the M2/M3 flow and adds an auditable bridge from a human creative decision to a bounded implementation contract:

`public URL → policy preflight → passive desktop/mobile inspection → Raw Evidence → Analysis Packet → Reference Profile → Design Principles → semantic validation`

`3+ validated analyses → Synthesis Packet → Synthesis Map → Creative Packet → exactly 3 Creative Concepts → Human Creative Gate`

`Human Creative Gate → Human Concept Decision → Implementation Contract → Smallest Playable Slice`

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

After a human—not automation—selects a concept, validate the M4.1 decision and implementation contract against the exact M3 concepts artifact and its reviews:

```powershell
npm run studio -- validate-implementation-contract --contract docs/wayfinder.m4-implementation-contract.json --decision docs/wayfinder.m4-human-decision.json --concepts runs/wayfinder/m3/concepts.json --gate runs/wayfinder/m3/human-gate.json --concept-review runs/wayfinder/m3/concept-review.json --originality-review runs/wayfinder/m3/originality-review.json
```

The checked-in [human decision](docs/wayfinder.m4-human-decision.json) records the explicit selection of `concept_three_bearings`, binds the exact concepts SHA-256, carries M3 warnings and questions without rewriting history, and states that automation did not select or approve it. Its timestamp is the time the human attestation was recorded in M4.1, not an inferred time for the earlier manual act.

The checked-in [implementation contract](docs/wayfinder.m4-implementation-contract.json) turns that selected concept into a source-neutral, machine-readable experience definition and a smallest playable slice: arrival, orientation, one bearing choice, a deterministic state change, a perceptible consequence, and a short ending. It specifies only future implementation work; no production frontend is included in M4.1.

M4.2 implemented that bounded contract under `pilots/wayfinder/` and passed machine QA, but its first Human Playtest requested revision: choice motivation, pre-ending consequence, felt agency, pacing, and visual medium failed; narrative tone and physical-mobile usability were not evaluated. M4.2R preserves that failed experiment and its gate, records the human feedback separately, and amends the interaction into a continuous world with active observation, reversible tradeoff previews, explicit commitment, immediate environmental response, and a lived continuation before reflection. Human Re-Playtest then partially supported decision motivation, passed situation, consequence, agency, visual medium, and pacing, did not evaluate narrative tone, required `zh-CN`/English support, deferred mobile optimization, and explicitly `approve_for_expansion`.

M4.3 expands that approved interaction into the first complete Three Bearings journey: three differentiated decisions across orientation, a history-shaped watercourse, and a final dusk commitment. All 27 ordered histories are deterministic and compositional; earlier routes remain visible and condition later situations. The project-native locale model supports natural Simplified Chinese and English with a keyboard-accessible, state-preserving switch.

Run the complete current local gate:

```powershell
npm run wayfinder:qa
```

After a successful build, manually play the exact audited slice at `http://127.0.0.1:4173`:

```powershell
npm run wayfinder:preview
```

Press `Ctrl+C` to stop the preview. M4.3 supports desktop layouts tested at 1024×768, 1440×900, and 1920×1080. Mobile optimization is deferred by human decision; it is not a claimed supported target or a recorded failure. Historical M4.2 and M4.2R gates remain immutable. The current gate status is `pending_human_expansion_playtest`; automation cannot approve the complete experience or release it.

The empirical chain is first-class and machine-bound:

`M4.2 machine QA PASS → Human Playtest request_revision → M4.2R Revision Contract → revised Source Manifest/QA → Human Re-Playtest approve_for_expansion → M4.3 complete-experience expansion → Human Expansion Playtest`

Runs live below `runs/<project>/<run-id>/` and are ignored by Git. `--local-fixture` exists only for the project-owned loopback fixture; it does not authorize LAN/private targets. The early M2 contract correction is intentionally breaking: stale M1 runs may need recapture.

## Boundaries

Capture records bounded semantic geometry, computed-style distributions, short headings/labels, passive motion and affordance signals, deterministic scroll states, sanitized technical/network metadata, and research screenshots. It does not persist full HTML, stylesheets, JavaScript bodies, source maps, response bodies, cookies, authorization headers, storage, profiles, or downloaded assets for reuse. It does not click arbitrary links or submit forms.

Public accessibility permits inspection, not reuse. Screenshots and observed third-party media remain `inspect_only` unless independent rights evidence establishes otherwise. Design abstractions do not change that status and are not legal certification. See [architecture](docs/ARCHITECTURE.md) and [policies](docs/POLICIES.md).

M3 automation stops at `pending_human_selection`. M4.1 binds the selected concept to the smallest playable slice. M4.2 machine validation did not override a failed Human Playtest; M4.2R performed the authorized bounded revision and returned to a human. M4.3 implements only the subsequently authorized complete-experience expansion and stops at `pending_human_expansion_playtest`. Release readiness, deployment, model APIs, Figma, backend services, accounts, analytics, and CI remain deferred.

The system does not clone websites. It converts observed design mechanisms into independently authored experiences while preserving rights metadata, provenance, originality constraints, independent audit, and later human release review.
