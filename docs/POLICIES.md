# Research and rights policies

## Public evidence boundary

Reference mode accepts explicit HTTP(S) URLs without credentials and rejects obvious loopback, private, reserved, and link-local destinations. DNS results and every browser request are checked; redirects and subresources are therefore subject to the same rule. The test override permits loopback only. Application-layer DNS checks reduce but cannot eliminate DNS-rebinding races.

Captures use a new, non-persistent browser context. Context-wide routing covers pages, popups, redirects and subresources; service workers and WebSockets are blocked because M1 does not require them. The browser does not load an existing signed-in profile or intentionally send credentials. The implementation does not store request/response bodies, cookies, authorization headers, storage, profiles, full HTML, or site mirrors. Network URLs lose credentials, query strings, and fragments; console bodies are replaced by bounded SHA-256 metadata.

## Rights model

Accessibility is not permission. `inspect_only`, `unknown`, `permission_required`, and `blocked` are conservative states; stronger states require explicit provenance. Automated classification supports risk management and is never a final legal opinion. Screenshots and observed third-party content are evidence, not reusable assets. Human/legal review decides uncertain reuse and release questions.

## Artifact lifecycle

Runs stay under the repository-local ignored `runs/` tree. Manifests use portable paths and hashes. Arbitrary public screenshots, browser binaries, caches, and generated research records are not committed by default. Only project-owned fixtures belong in source control. There is no GitHub Actions workflow; `npm run check` is the local quality gate.
