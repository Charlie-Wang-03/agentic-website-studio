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

## Artifact lifecycle

Runs stay under ignored repository-local `runs/`; test artifacts and process-controlled temporary files stay under ignored `.tmp/`. Manifests and packets use portable repository-relative paths and SHA-256 hashes. Third-party runs, screenshots, browser binaries, caches, and reports are not committed. Only project-owned fixtures belong in source control. There is no GitHub Actions workflow; `npm run check` is the canonical local gate.
