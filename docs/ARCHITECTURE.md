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
```

Raw Evidence is browser/deterministic inspection output and its schema fixes `epistemicType` to `observed_fact`. It may report measured geometry or computed-style frequencies; it may not call those observations effective, beautiful, transferable, or reusable.

A Reference Profile is derived single-reference interpretation. Every claim is an `inference` or, when genuinely subjective, an `evaluation`; every claim cites supporting composite evidence references, records counter-evidence when present, explains confidence, and states limitations.

A Design Principle is an abstract mechanism that can inform a wholly different original work. It cites profile claims and raw evidence, preserves source rights, and requires machine-readable anti-copy constraints. It cannot carry a reusable source artifact, source code, exact layout, or exact motion sequence.

A Synthesis Map is not another Reference Profile. It classifies cross-reference reasoning as convergence, complementary alternatives, unresolved tension, or a single-reference unique candidate. Deterministic validation resolves every contribution and prevents repeated evidence from masquerading as consensus; semantic similarity remains an independent-review question.

A Creative Concept is not a Synthesis Map. It answers the Project Brief using selected abstract units, explains its original expression, and records tradeoffs and influence. Concepts cannot bypass the Synthesis Map to cite raw evidence, profile claims, or principles.

Independent diversity/grounding and originality reviews are versioned artifacts bound to the exact concepts-file SHA-256. A failed review blocks gate construction; warnings flow into the Human Creative Gate. This prevents a passing review from being replayed after concepts change.

```text
References inform mechanisms.
Project Brief determines purpose.
Human decides creative direction.
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

M3 ends at a first-class Human Creative Gate whose automation schema can emit only `pending_human_selection`. Implementation, QA, release, and learning remain later stages.
