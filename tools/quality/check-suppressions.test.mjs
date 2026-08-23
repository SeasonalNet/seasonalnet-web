import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import {
  checkSuppressions,
  readGovernedBaselines,
  scanRepository,
} from "./check-suppressions.mjs"

const temporaryRoots = []

function createRoot() {
  const root = mkdtempSync(path.join(tmpdir(), "seasonalnet-suppressions-"))
  temporaryRoots.push(root)
  return root
}

function write(root, relativePath, contents) {
  const destination = path.join(root, relativePath)
  mkdirSync(path.dirname(destination), { recursive: true })
  writeFileSync(destination, contents)
}

function zeroBaseline(root, overrides = {}) {
  const suppressions = {
    typescript: 0,
    eslint: 0,
    coverage: 0,
    tests: 0,
    configuration: 0,
    ci: 0,
    ...overrides,
  }
  write(
    root,
    "quality/baselines.json",
    JSON.stringify({
      schemaVersion: 1,
      ceilings: {
        eslintErrors: 0,
        eslintWarnings: 0,
        knipFindings: 0,
        typecheckDiagnostics: 0,
        coverageUncovered: {
          global: { statements: 83, branches: 196, functions: 9, lines: 43 },
          apps: {
            admin: { statements: 29, branches: 97, functions: 4, lines: 13 },
            agent: { statements: 3, branches: 12, functions: 0, lines: 0 },
            docs: { statements: 1, branches: 6, functions: 0, lines: 1 },
            pbx: { statements: 10, branches: 21, functions: 2, lines: 3 },
            prov: { statements: 0, branches: 6, functions: 0, lines: 0 },
            radio: { statements: 7, branches: 20, functions: 0, lines: 1 },
            www: { statements: 0, branches: 6, functions: 0, lines: 0 },
          },
        },
        suppressions,
      },
    }),
  )
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe("anti-suppression checker", () => {
  it("accepts strict source and zero governed ceilings", () => {
    const root = createRoot()
    zeroBaseline(root)
    write(root, "src/example.ts", "export const answer: number = 42\n")
    write(
      root,
      "tsconfig.json",
      JSON.stringify({
        compilerOptions: {
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
        },
      }),
    )

    expect(checkSuppressions(root)).toMatchObject({
      counts: {
        typescript: 0,
        eslint: 0,
        coverage: 0,
        tests: 0,
        configuration: 0,
        ci: 0,
      },
      exceeded: [],
      findings: [],
    })
  })

  it("finds source, test, configuration, and CI bypasses", () => {
    const root = createRoot()
    zeroBaseline(root)
    write(root, "src/types.ts", ["// @ts-", "ignore\nconst value = 1\n"].join(""))
    write(root, "src/lint.ts", ["// eslint-", "disable-next-line no-console\n"].join(""))
    write(root, "src/coverage.ts", ["/* c8 ", "ignore next */\n"].join(""))
    write(root, "src/example.test.ts", ["it.", "skip(\"later\", () => {})\n"].join(""))
    write(
      root,
      "tsconfig.json",
      JSON.stringify({
        compilerOptions: {
          strict: false,
          noUnusedLocals: true,
          noUnusedParameters: true,
        },
      }),
    )
    write(root, ".forgejo/workflows/bypass.yml", ["continue-on-", "error: true\n"].join(""))

    const findings = scanRepository(root)
    expect(new Set(findings.map(({ category }) => category))).toEqual(new Set([
      "ci",
      "configuration",
      "coverage",
      "eslint",
      "tests",
      "typescript",
    ]))
    expect(findings.filter(({ category }) => category === "configuration")).toHaveLength(2)
  })

  it("requires the central quality and build gates in Forgejo CI", () => {
    const root = createRoot()
    zeroBaseline(root)
    write(root, ".forgejo/workflows/ci.yml", "steps:\n  - run: make quality\n")

    expect(scanRepository(root)).toContainEqual({
      category: "ci",
      label: "Forgejo CI does not run make build",
      path: ".forgejo/workflows/ci.yml",
      line: 1,
      column: 1,
    })
  })

  it("rejects an upward ceiling change", () => {
    const root = createRoot()
    zeroBaseline(root, { typescript: 1 })

    expect(() => readGovernedBaselines(path.join(root, "quality", "baselines.json"))).toThrow(
      "exceeds governed maximum 0",
    )
  })

  it("rejects a weakened per-SPA coverage ceiling", () => {
    const root = createRoot()
    zeroBaseline(root)
    const baselinePath = path.join(root, "quality", "baselines.json")
    const baseline = JSON.parse(readFileSync(baselinePath, "utf8"))
    baseline.ceilings.coverageUncovered.apps.admin.branches = 98
    writeFileSync(baselinePath, JSON.stringify(baseline))

    expect(() => readGovernedBaselines(baselinePath)).toThrow(
      "exceeds governed maximum 97",
    )
  })

  it("does not scan generated dependency directories", () => {
    const root = createRoot()
    zeroBaseline(root)
    write(root, "node_modules/package/index.js", ["// eslint-", "disable\n"].join(""))
    write(root, ".next/server/page.js", ["// @ts-", "nocheck\n"].join(""))

    expect(scanRepository(root)).toEqual([])
  })
})
