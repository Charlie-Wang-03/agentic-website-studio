# Architecture

## Long-term direction

The intended pipeline is Reference Research → Evidence → Design Abstraction → Multi-reference Synthesis → Human Creative Gate → Implementation → Automated QA → Human Review → Release → Candidate Lessons. M1 stops after Evidence so later creative work cannot silently treat observations as design instructions or reuse permission.

## Implemented slice

`src/policy.ts` validates the requested URL and every browser request. `src/capture.ts` runs an isolated, non-persistent Chromium context and writes a manifest, evidence records, rights record, sanitized network/console metadata, and screenshot. JSON Schemas are versioned contracts; Ajv validates them in tests. Generated runs are ephemeral, repository-local, and ignored.

Evidence uses explicit epistemic types: `observed_fact`, `inference`, `evaluation`, and `transferable_principle`. The browser produces observed facts. Future stages must reference evidence IDs and carry confidence rather than rewriting inference as fact.

## Trust zones and artifacts

Public-reference research accepts public HTTP(S) only. Local generated-site QA is a separate zone with an explicit loopback-only fixture override. Authenticated sessions and private networks are outside M1. Each run has portable repository-relative paths and SHA-256 artifact hashes. Conversation is not a source of truth.

Future design work should transform evidence into abstract mechanisms, then synthesize original directions behind an originality firewall and human creative gate. It must not transform pixels directly into a clone. Deterministic validators and an independent reviewer precede release; one project lesson cannot automatically rewrite global rules.
