# Architecture

## Evidence-to-decision layers

```text
Public Website
  → policy-constrained passive browser research
  → Raw Evidence + research screenshots
  → deterministic Analysis Packet
  ───────────── Evidence Firewall ─────────────
  → Reference Profile
  → Design Principles
  → schema + semantic validation
  ─────── Reference Evidence Firewall ───────
  → source-neutral Synthesis Packet
  → classified Synthesis Map
  ─────────── Originality Firewall ──────────
  → Creative Packet + authoritative Project Brief
  → exactly 3 Creative Concepts
  → independent reviews
  → Human Creative Gate: pending_human_selection
  → explicit Human Concept Decision
  → source-neutral Implementation Contract
  → Smallest Playable Slice definition
  → deterministic project-native implementation
  → Source Manifest + Automated QA + independent implementation audit
  → Human Playtest Gate: pending_human_playtest
```

Raw Evidence is browser/deterministic inspection output and its schema fixes `epistemicType` to `observed_fact`. It may report measured geometry or computed-style frequencies; it may not call those observations effective, beautiful, transferable, or reusable.

A Reference Profile is derived single-reference interpretation. Every claim is an `inference` or, when genuinely subjective, an `evaluation`; every claim cites supporting composite evidence references, records counter-evidence when present, explains confidence, and states limitations.

A Design Principle is an abstract mechanism that can inform a wholly different original work. It cites profile claims and raw evidence, preserves source rights, and requires machine-readable anti-copy constraints. It cannot carry a reusable source artifact, source code, exact layout, or exact motion sequence.

A Synthesis Map is not another Reference Profile. It classifies cross-reference reasoning as convergence, complementary alternatives, unresolved tension, or a single-reference unique candidate. Deterministic validation resolves every contribution and prevents repeated evidence from masquerading as consensus; semantic similarity remains an independent-review question.

A Creative Concept is not a Synthesis Map. It answers the Project Brief using selected abstract units, explains its original expression, and records tradeoffs and influence. Concepts cannot bypass the Synthesis Map to cite raw evidence, profile claims, or principles.

Independent diversity/grounding and originality reviews are versioned artifacts bound to the exact concepts-file SHA-256. A failed review blocks gate construction; warnings flow into the Human Creative Gate. This prevents a passing review from being replayed after concepts change.

M4.1 begins only after an explicit human decision. The Human Concept Decision is a new provenance artifact; it does not mutate the historical M3 gate. It binds `projectId`, `synthesisId`, the exact concepts-file SHA-256, and the selected concept ID, and it inherits the gate's warnings and unresolved questions. The required statement—“Human selected this concept. Automation did not select or approve it.”—keeps authority legible to future builders and auditors.

The Implementation Contract binds the exact Human Concept Decision by SHA-256 and converts only the selected concept into engineering scope. It carries the selected concept's protected-expression prohibitions without weakening or substitution, states the experience and consequence models, defines explicit non-goals and future QA requirements, and describes a deterministic state machine for the smallest playable slice. Validation rejects stale M3 hashes, nonexistent selected concepts, substituted originality constraints, forbidden source material, unknown states, unreachable states, and duplicate `(state, event)` transitions.

For Three Bearings, the bounded slice is intentionally smaller than the complete concept: arrival and orientation lead to one choice among three bearings; the confirmed bearing selects one route/atmosphere consequence and one short reflective ending. The three branch outcomes do not rejoin inside this slice, which makes perceptible difference testable without creating a combinatorial content tree. A semantic document is the complete baseline; project-native styling and optional bounded motion may enhance it later.

M4.2 keeps the Wayfinder dogfood isolated under `pilots/wayfinder/`. Its browser UI dispatches events to one pure transition layer; contract-conformance tests compare that layer with the M4.1 JSON state machine. Vite is build/preview infrastructure only. Playwright operates on the local production build and checks the branch matrix, keyboard, emulated touch, reduced motion, representative axe states, network isolation, runtime errors, and deterministic replay.

The deterministic Source Manifest binds the Human Decision and Implementation Contract to sorted source-file, creative-asset, dependency, and build-output hashes. The QA Report binds that manifest and the independent implementation audit. The Human Playtest Gate binds both artifacts and can be emitted only as `pending_human_playtest`.

```text
machine validation ≠ human experience judgment
```

Automation can establish reachability, deterministic behavior, structural branch differences, and baseline technical accessibility. Choice clarity, felt agency, consequence perceptibility, pacing, visual coherence, and narrative tone remain human-only evaluations.

```text
References inform mechanisms.
Project Brief determines purpose.
Human decides creative direction.
Implementation contracts bound the approved direction.
```

## Identity and provenance

A Reference identifies the normalized final public URL with a deterministic `ref_<hash>` value. A Run identifies one timestamped capture. Therefore:

```text
Run identity ≠ Reference identity
```

Run-local evidence IDs intentionally repeat across captures. `ev_structure_desktop` alone is not globally valid provenance. Derived artifacts use `{ runId, evidenceId }`; the semantic validator resolves both fields against the actual source run and rejects missing, duplicate, or cross-run references.

## Capture responsibilities

`src/capture.ts` owns browser lifecycle, request policy, artifact assembly, and manifests. `src/intelligence.ts` performs bounded passive extraction for named viewports: semantic sections and geometry, layout counts, short headings/affordance labels, computed-style distributions, animation/transition/media/sticky signals, resource summaries, and three deterministic scroll positions. It stores neither a DOM clone nor complete stylesheets.

Navigation uses `domcontentloaded`, a bounded settle, passive inspection, and a bounded scroll sweep. This avoids treating indefinite network silence as page readiness. Each viewport uses an isolated non-persistent context with an explicit size. Overall navigation, settle, node, text, response, warning, screenshot-height, and scroll-position budgets prevent unbounded collection.

`src/analysis.ts` validates a source run and deterministically joins its bounded observations, rights record, warnings, and screenshot path/hash references into `analysis-packet.json`. Raw values are constrained by per-kind field allowlists, depth/item/byte budgets, and manifest-backed artifact references before packet preparation. The packet tells a downstream agent to work from approved evidence instead of revisiting the source. `src/analysis-validation.ts` combines JSON Schema with run/reference identity, evidence resolution, duplicate-ID, exact source-rights status/basis/notes preservation, and anti-copy checks.

Schemas and generated artifacts—not conversation—are the source of truth. M1 runs are ephemeral; the M2 schema correction deliberately requires stale captures to be recreated rather than migrated.

## Firewall enforcement

The M2 Evidence Firewall, M3 Reference Evidence Firewall, and M3 Originality Firewall are artifact contracts plus procedural execution protocols. The Synthesis Packet exposes only validated abstractions through an agent-facing projection. The Creative Packet removes URLs, names, screenshots, raw evidence, profile/principle IDs, source prose/assets/code, geometry, and exact motion. This repository does not cryptographically remove tools from an arbitrary model runtime, so each packet reports enforcement honestly as `protocol`.

M3 ends at a first-class Human Creative Gate whose automation schema can emit only `pending_human_selection`. M4.1 records the separate human decision and defines the approved playable slice. M4.2 implements and audits only that slice, then stops at a Human Playtest Gate whose automation schema can emit only `pending_human_playtest`. Expansion, release, and learning remain later stages.

The system does not clone websites. It converts observed design mechanisms into independently authored experiences. Reference evidence remains evidence; public access is never treated as permission to reuse names, characters, narrative, visual composition, assets, motion, or source-specific identifiers.
