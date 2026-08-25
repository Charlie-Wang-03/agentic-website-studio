# Reference-project research

No external code or documentation was copied or vendored. Licenses below describe upstream software, not the rights to websites inspected with it.

| Project | What it does / useful pattern | Do not inherit | License | Role |
|---|---|---|---|---|
| [Playwright](https://github.com/microsoft/playwright) | Cross-browser automation; isolated contexts, screenshots, request routing, console/network observation and future visual QA. | Its monorepo, browser patches, or unnecessary runner layers. | The used npm packages declare Apache-2.0; the upstream root LICENSE is currently absent. | `core` |
| [ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template) | Reconnaissance, component specs, bounded delegation, worktree isolation and visual iteration. | Pixel-perfect cloning, original-asset reuse, or hard-coded Claude/Next/Tailwind choices. | MIT | `inspiration` |
| [design-dna](https://github.com/zanwei/design-dna) | Machine-readable tokens, qualitative style and visual-effect intermediate representation. | Forced completeness, guessed fields, single-file generation, or brand copying; our future IR also needs provenance, confidence, rights and anti-copy constraints. | MIT | `inspiration` |
| [Browsertrix Crawler](https://github.com/webrecorder/browsertrix-crawler) | High-fidelity browser archiving with scopes, budgets, workers and WARC/WACZ artifacts. | Docker crawler, broad crawling, Brave/Puppeteer stack or derived AGPL implementation in M1. | AGPL-3.0-or-later | `not-for-v0.1` |
| [SingleFile](https://github.com/gildas-lormeau/SingleFile) | Self-contained page capture and provenance/rewriting ideas. | Vendored AGPL code or fidelity-losing cleanup as default evidence capture. | AGPL-3.0-or-later | `optional-later` |
| [mitmproxy](https://github.com/mitmproxy/mitmproxy) | Deep protocol-level flow inspection, filters, addons and replay. | CA installation, TLS interception, sensitive-body persistence or its proxy stack in M1. | MIT | `optional-later` |
| [screenshot-to-code](https://github.com/abi/screenshot-to-code) | Multi-model visual implementation candidates and render→screenshot→self-check loops. | Pixel-only guessing when DOM evidence exists, provider/UI stack, or subjective benchmarks as truth. | MIT | `optional-later` |

The architectural default remains `reference → evidence → abstraction → synthesis → original output`, never `reference → exact clone`.
