# Research, rights, and originality policies

## Public evidence boundary

Reference mode accepts explicit HTTP(S) URLs without credentials and rejects obvious loopback, private, reserved, and link-local destinations. DNS results and every browser request are checked; redirects, popups, and subresources therefore remain subject to policy. The fixture override permits only the requested loopback origin. Application-layer DNS checks reduce but cannot eliminate DNS-rebinding races.

Capture uses fresh non-persistent desktop and mobile contexts. Service workers, WebSockets, and `window.open` popup creation are blocked; a defensive popup cap fails the context closed. Inspection is passive: no arbitrary click, typing, submission, account action, source-map retrieval, bundle de-minification, or asset mirroring. A bounded scroll sweep is allowed.

The system does not intentionally store request/response bodies, cookies, authorization headers, storage, profiles, full HTML, complete stylesheets, JavaScript source, or site mirrors. URLs lose credentials, query strings, and fragments. Console bodies are replaced by bounded SHA-256 metadata. Headings and affordance labels are short and capped; downstream artifacts describe content roles instead of reproducing prose.

## Rights and anti-copy model

Accessibility is not permission. `inspect_only`, `unknown`, `permission_required`, and `blocked` are conservative states; stronger states require independent explicit provenance. Automated metadata supports risk management and is never a legal opinion or fair-use certification.

Screenshots and observed third-party content are research evidence, not reusable assets. Inference and abstraction cannot escalate rights. Every Design Principle requires abstraction-only use, an independently designed visual expression, and prohibitions on source asset/prose reuse, exact layout or motion replication, and source-code reconstruction. Source-specific elements remain reference-only. These are engineering guardrails, not a conclusion that similarity is legally safe.

## Evidence Firewall

The abstraction agent receives the Analysis Packet, approved screenshot evidence, schemas, and [Reference Intelligence protocol](REFERENCE_INTELLIGENCE_PROTOCOL.md). It must not browse the original URL, search for cloned implementations, inspect excluded source, or translate source pixels/text/assets into implementation instructions. Current enforcement is procedural and contract-based, not a claim of network isolation.

## M3 firewalls and creative rights

The Reference Evidence Firewall gives synthesis only validated M2 abstractions and opaque reference identities. Source metadata may remain in an internal provenance section for deterministic validation, but it is excluded from the agent-facing projection. The synthesis protocol prohibits feature concatenation and requires problem → experience → mechanism → tradeoff → original-expression reasoning.

The Originality Firewall gives creative work the Project Brief and source-neutral Synthesis Units. It excludes URLs, source names, screenshots, raw evidence, M2 claim/principle IDs, source prose/assets/code, layout measurements, and exact motion sequences. Influence is an auditable ledger, not a fabricated originality percentage.

`original`, `permissioned_or_licensed`, and `third_party_adaptation_requires_human_review` are workflow modes, not legal conclusions. In `original` mode, identifiable protected expression is prohibited. No stage escalates reference rights, declares fair use, or supplies legal clearance.

Automated M3 output cannot approve a concept. Only explicit future human provenance may change the gate from `pending_human_selection` to an approval, revision request, or rejection.

## Artifact lifecycle

Runs stay under ignored repository-local `runs/`; test artifacts and process-controlled temporary files stay under ignored `.tmp/`. Manifests and packets use portable repository-relative paths and SHA-256 hashes. Third-party runs, screenshots, browser binaries, caches, and reports are not committed. Only project-owned fixtures belong in source control. There is no GitHub Actions workflow; `npm run check` is the canonical local gate.

## M4.2 implementation and playtest boundary

An approved source-neutral Implementation Contract may produce independently authored code, prose, CSS, and inline vector forms under an isolated pilot directory. Creative assets must be classified separately from build/test dependencies, hashed in the Source Manifest, and remain project-native unless an explicit license record says otherwise. Runtime content may not contact references, CDNs, analytics, external fonts, media, or APIs.

Automated QA may establish deterministic and browser-observable properties but may not claim aesthetic success, meaningful pacing, perceptual sufficiency, WCAG conformance, physical-device behavior, or human approval. The M4.2 gate status is fixed to `pending_human_playtest`; only a later explicit human action may approve expansion, request revision, or reject the direction.

Human feedback does not rewrite a historical gate or manifest. A revision requires a separate feedback artifact that preserves exact evaluated and `not_evaluated` dimensions, distinguishes human observation from derived design inference, and binds the failed implementation. A revision contract may amend the interaction only when bound to an explicit `request_revision` action.

M4.2R automation may emit only `pending_human_replaytest`. Passing structural prerequisites—observation, deliberation, explicit commitment, continuous-scene identity, immediate world response, and continuation before reflection—does not prove that the prior human failures are resolved. Those claims require the second human evaluation.
