# Quality governance

`quality/baselines.json` records the measured starting debt and the currently
governed ceilings. The initial measurement is historical evidence; only the
`ceilings` object controls acceptance.

All current non-coverage debt ceilings are zero. Behavioral coverage is
ratcheted to its exact measured debt as maximum uncovered statement, branch,
function, and line counts. Those ceilings are applied globally and
independently to every SPA, so a well-tested app cannot hide an untested sibling
and any additional uncovered item fails the gate. A zero uncovered ceiling is
translated to a 100% Vitest threshold. The guardrails are enforced in
complementary ways:

- ESLint, TypeScript, coverage-enabled Vitest, and strict Knip fail directly on
  findings or inadequate coverage.
- `tools/quality/check-suppressions.mjs` scans source, configuration, tests,
  and CI files for bypasses and verifies that no configured debt or coverage
  ceiling exceeds its hard-coded governed maximum.

The anti-suppression categories cover TypeScript diagnostic directives,
ESLint disable comments, coverage exclusions, disabled or focused tests,
weakened strict TypeScript settings, tool-ignore directives, disabled ESLint
rules, and CI failure allowances. The checker also rejects attempts to permit
more uncovered code. Generated output and installed dependencies are excluded
from the scan.

Run `make quality` locally. Forgejo runs the same target before `make build`.
