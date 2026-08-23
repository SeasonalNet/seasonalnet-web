import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const baseline = JSON.parse(readFileSync(new URL("./quality/baselines.json", import.meta.url), "utf8"))
const coverageUncovered = baseline.ceilings.coverageUncovered
const toVitestThresholds = (ceilings) => Object.fromEntries(
  Object.entries(ceilings).map(([metric, maximum]) => [metric, maximum === 0 ? 100 : -maximum]),
)
const appCoverageThresholds = Object.fromEntries(
  ["admin", "agent", "docs", "pbx", "prov", "radio", "www"].map((app) => [
    `apps/${app}/**`,
    toVitestThresholds(coverageUncovered.apps[app]),
  ]),
)

export default defineConfig({
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./tools/test/server-only.mjs", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["apps/**/*.test.{mjs,ts,tsx}", "packages/**/*.test.{mjs,ts,tsx}", "tools/**/*.test.{mjs,ts,tsx}"],
    passWithNoTests: false,
    coverage: {
      include: [
        "apps/*/src/lib/**/*.ts",
        "apps/docs/scripts/public-docs-policy.mjs",
        "packages/shell/src/lib/browser-safe.ts",
        "packages/shell/src/lib/fetch.ts",
        "packages/shell/src/lib/server/cache.ts",
        "tools/quality/check-suppressions.mjs",
      ],
      thresholds: {
        ...toVitestThresholds(coverageUncovered.global),
        ...appCoverageThresholds,
      },
    },
  },
})
