# Reference Intelligence protocol

Transform exactly one approved `analysis-packet.json` into exactly one Reference Profile and one Design Principles document. Use the versioned schemas as the output contract.

## Evidence Firewall

Work only from the packet and its approved local screenshot artifacts. Do not browse the source URL, search for clones or source repositories, inspect source code outside the packet, or ask another tool to do so. This is a procedural restriction unless the execution runtime separately enforces tool isolation.

Do not copy source prose. Do not describe a source-specific asset, layout, or motion sequence as an implementation instruction. Do not infer reuse permission from public accessibility or from the existence of an abstraction.

## Required method

1. Treat every packet observation as an observed fact, not an interpretation.
2. Create only evidence-supported Reference Profile claims. Each material claim cites composite `{ runId, evidenceId }` references.
3. Search the packet for contradictory evidence and cite it; do not hide responsive or state-based conflicts.
4. Use `inference` for descriptive interpretation and `evaluation` only for clearly subjective judgment.
5. Explain confidence in words. Mark limitations and insufficient evidence instead of inventing facts.
6. Derive mechanisms, problems, and experiential effects rather than renaming visible surface features.
7. Make each principle useful after the original URL and source-specific expression are removed from view.
8. Preserve the packet rights status and source basis exactly, carry material caveats, and never escalate `inspect_only` into reuse permission.
9. Fill every anti-copy constraint truthfully; list source-specific expression that must remain reference-only.
10. Do a final grounding pass: every claim and principle must resolve to the same run/reference and no cited evidence may be orphaned.

## Output quality gate

Keep claims few, distinct, and proportionate to evidence. Omit unsupported categories. A valid JSON shape is not enough: principles must be transferable to a completely different original website, must not merely rename the reference's visible features, and must acknowledge uncertainty. Run `validate-analysis` before review. An independent reviewer should then check grounding, abstraction quality, originality constraints, and rights preservation.
