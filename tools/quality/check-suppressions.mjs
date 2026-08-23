#!/usr/bin/env node

import {
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const GOVERNED_MAXIMUMS = Object.freeze({
  eslintErrors: 0,
  eslintWarnings: 0,
  knipFindings: 0,
  typecheckDiagnostics: 0,
  suppressions: Object.freeze({
    typescript: 0,
    eslint: 0,
    coverage: 0,
    tests: 0,
    configuration: 0,
    ci: 0,
  }),
})

const GOVERNED_COVERAGE_MAXIMUMS = Object.freeze({
  global: Object.freeze({ statements: 83, branches: 196, functions: 9, lines: 43 }),
  apps: Object.freeze({
    admin: Object.freeze({ statements: 29, branches: 97, functions: 4, lines: 13 }),
    agent: Object.freeze({ statements: 3, branches: 12, functions: 0, lines: 0 }),
    docs: Object.freeze({ statements: 1, branches: 6, functions: 0, lines: 1 }),
    pbx: Object.freeze({ statements: 10, branches: 21, functions: 2, lines: 3 }),
    prov: Object.freeze({ statements: 0, branches: 6, functions: 0, lines: 0 }),
    radio: Object.freeze({ statements: 7, branches: 20, functions: 0, lines: 1 }),
    www: Object.freeze({ statements: 0, branches: 6, functions: 0, lines: 0 }),
  }),
})

const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".source",
  "coverage",
  "node_modules",
  "out",
])

const SCANNED_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".js",
  ".json",
  ".jsonc",
  ".jsx",
  ".mjs",
  ".scss",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
])

function joined(...parts) {
  return parts.join("")
}

const SOURCE_RULES = Object.freeze([
  {
    category: "typescript",
    label: "TypeScript diagnostic suppression",
    pattern: new RegExp(joined("@ts-", "(?:ignore|nocheck|expect-error)"), "g"),
  },
  {
    category: "eslint",
    label: "ESLint diagnostic suppression",
    pattern: new RegExp(joined("eslint-", "disable(?:-next-line|-line)?"), "g"),
  },
  {
    category: "coverage",
    label: "Coverage exclusion",
    pattern: new RegExp(joined("(?:istanbul|c8|v8)", "\\s+ignore"), "gi"),
  },
  {
    category: "configuration",
    label: "Tool ignore directive",
    pattern: new RegExp(joined("(?:prettier|biome|knip)", "-ignore"), "gi"),
  },
])

const TEST_RULES = Object.freeze([
  {
    category: "tests",
    label: "Disabled or focused test",
    pattern: /\b(?:describe|it|test)\.(?:fails|only|runIf|skip|skipIf|todo)\b|\b(?:fdescribe|fit|xdescribe|xit)\s*\(/g,
  },
])

const TSCONFIG_RULES = Object.freeze([
  {
    category: "configuration",
    label: "Weakened TypeScript strictness",
    pattern: new RegExp(
      joined(
        '"(?:strict|alwaysStrict|noImplicitAny|strictNullChecks|strictFunctionTypes|',
        'strictBindCallApply|strictPropertyInitialization|noImplicitThis|noUnusedLocals|',
        'noUnusedParameters|',
        'useUnknownInCatchVariables|noUncheckedIndexedAccess|exactOptionalPropertyTypes)"',
        "\\s*:\\s*false",
      ),
      "g",
    ),
  },
  {
    category: "configuration",
    label: "TypeScript checking disabled",
    pattern: new RegExp(joined('"no', 'Check"\\s*:\\s*true'), "g"),
  },
])

const ESLINT_CONFIG_RULES = Object.freeze([
  {
    category: "configuration",
    label: "ESLint rule disabled in configuration",
    pattern: /:\s*(?:\[\s*)?(?:["']off["']|0)\s*[,}\]]/g,
  },
])

const CI_RULES = Object.freeze([
  {
    category: "ci",
    label: "CI failure ignored",
    pattern: new RegExp(joined("continue-on-", "error\\s*:\\s*true"), "gi"),
  },
  {
    category: "ci",
    label: "Shell failure ignored",
    pattern: /\|\|\s*true\b/g,
  },
])

function isTestFile(relativePath) {
  return /(?:^|\/)(?:__tests__\/|[^/]+\.(?:spec|test)\.[cm]?[jt]sx?$)/.test(relativePath)
}

function isTsConfig(relativePath) {
  return /(?:^|\/)tsconfig(?:\.[^/]+)?\.json$/.test(relativePath)
}

function isEslintConfig(relativePath) {
  return /(?:^|\/)eslint\.config\.[cm]?js$/.test(relativePath)
}

function isCiConfig(relativePath) {
  return /^(?:\.forgejo|\.gitea|\.github)\/workflows\/.*\.ya?ml$/.test(relativePath)
}

function listScannableFiles(root) {
  const files = []
  const pending = [root]

  while (pending.length > 0) {
    const directory = pending.pop()
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue

      const absolutePath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        pending.push(absolutePath)
      } else if (entry.isFile() && SCANNED_EXTENSIONS.has(path.extname(entry.name))) {
        files.push(absolutePath)
      }
    }
  }

  return files.sort()
}

function lineFindings(relativePath, source, rules) {
  const findings = []
  const lines = source.split(/\r?\n/)

  for (const [index, line] of lines.entries()) {
    for (const rule of rules) {
      rule.pattern.lastIndex = 0
      for (const match of line.matchAll(rule.pattern)) {
        findings.push({
          category: rule.category,
          label: rule.label,
          path: relativePath,
          line: index + 1,
          column: (match.index ?? 0) + 1,
        })
      }
    }
  }

  return findings
}

function tsConfigIntegrityFindings(absolutePath, relativePath, configCache, pending = new Set()) {
  if (pending.has(absolutePath)) {
    return [{ category: "configuration", label: "Circular TypeScript config inheritance", path: relativePath, line: 1, column: 1 }]
  }
  if (configCache.has(absolutePath)) return configCache.get(absolutePath)

  pending.add(absolutePath)
  const config = JSON.parse(readFileSync(absolutePath, "utf8"))
  let compilerOptions = {}

  if (typeof config.extends === "string" && config.extends.startsWith(".")) {
    let parentPath = path.resolve(path.dirname(absolutePath), config.extends)
    if (!path.extname(parentPath)) parentPath += ".json"
    const parent = tsConfigIntegrityFindings(parentPath, relativePath, configCache, pending)
    if (Array.isArray(parent)) return parent
    compilerOptions = parent
  }

  pending.delete(absolutePath)
  const effectiveOptions = { ...compilerOptions, ...config.compilerOptions }
  configCache.set(absolutePath, effectiveOptions)
  return effectiveOptions
}

function requiredIntegrityFindings(absolutePath, relativePath, source, configCache) {
  const findings = []

  if (isTsConfig(relativePath)) {
    const compilerOptions = tsConfigIntegrityFindings(absolutePath, relativePath, configCache)
    if (Array.isArray(compilerOptions)) return compilerOptions

    for (const option of ["strict", "noUnusedLocals", "noUnusedParameters"]) {
      if (compilerOptions[option] !== true) {
        findings.push({
          category: "configuration",
          label: `Required TypeScript option ${option} is not enabled`,
          path: relativePath,
          line: 1,
          column: 1,
        })
      }
    }
  }

  if (relativePath === ".forgejo/workflows/ci.yml") {
    for (const target of ["quality", "build"]) {
      if (!new RegExp(`run:\\s*make\\s+${target}\\b`).test(source)) {
        findings.push({
          category: "ci",
          label: `Forgejo CI does not run make ${target}`,
          path: relativePath,
          line: 1,
          column: 1,
        })
      }
    }
  }

  return findings
}

export function scanRepository(root) {
  const findings = []
  const configCache = new Map()

  for (const absolutePath of listScannableFiles(root)) {
    const relativePath = path.relative(root, absolutePath).split(path.sep).join("/")
    const source = readFileSync(absolutePath, "utf8")
    const rules = [...SOURCE_RULES]

    if (isTestFile(relativePath)) rules.push(...TEST_RULES)
    if (isTsConfig(relativePath)) rules.push(...TSCONFIG_RULES)
    if (isEslintConfig(relativePath)) rules.push(...ESLINT_CONFIG_RULES)
    if (isCiConfig(relativePath)) rules.push(...CI_RULES)

    findings.push(...lineFindings(relativePath, source, rules))
    findings.push(...requiredIntegrityFindings(absolutePath, relativePath, source, configCache))
  }

  return findings
}

function assertGovernedCeiling(name, configured, maximum) {
  if (!Number.isSafeInteger(configured) || configured < 0) {
    throw new Error(`quality ceiling ${name} must be a non-negative integer`)
  }
  if (configured > maximum) {
    throw new Error(`quality ceiling ${name}=${configured} exceeds governed maximum ${maximum}`)
  }
}

export function readGovernedBaselines(baselinePath) {
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8"))
  const ceilings = baseline?.ceilings

  if (baseline?.schemaVersion !== 1 || !ceilings?.suppressions || !ceilings?.coverageUncovered) {
    throw new Error("quality baseline schema is missing or unsupported")
  }

  for (const name of [
    "eslintErrors",
    "eslintWarnings",
    "knipFindings",
    "typecheckDiagnostics",
  ]) {
    assertGovernedCeiling(name, ceilings[name], GOVERNED_MAXIMUMS[name])
  }

  for (const [category, maximum] of Object.entries(GOVERNED_MAXIMUMS.suppressions)) {
    assertGovernedCeiling(
      `suppressions.${category}`,
      ceilings.suppressions[category],
      maximum,
    )
  }

  for (const [metric, maximum] of Object.entries(GOVERNED_COVERAGE_MAXIMUMS.global)) {
    assertGovernedCeiling(
      `coverageUncovered.global.${metric}`,
      ceilings.coverageUncovered.global?.[metric],
      maximum,
    )
  }

  for (const [app, maximums] of Object.entries(GOVERNED_COVERAGE_MAXIMUMS.apps)) {
    for (const [metric, maximum] of Object.entries(maximums)) {
      assertGovernedCeiling(
        `coverageUncovered.apps.${app}.${metric}`,
        ceilings.coverageUncovered.apps?.[app]?.[metric],
        maximum,
      )
    }
  }

  return ceilings
}

export function checkSuppressions(root, baselinePath = path.join(root, "quality", "baselines.json")) {
  const ceilings = readGovernedBaselines(baselinePath)
  const findings = scanRepository(root)
  const counts = Object.fromEntries(
    Object.keys(GOVERNED_MAXIMUMS.suppressions).map((category) => [category, 0]),
  )

  for (const finding of findings) counts[finding.category] += 1

  const exceeded = Object.entries(counts).filter(
    ([category, count]) => count > ceilings.suppressions[category],
  )

  return { counts, exceeded, findings }
}

export function main(root = process.cwd()) {
  const startedAt = performance.now()
  const { counts, exceeded, findings } = checkSuppressions(root)

  for (const finding of findings) {
    console.error(
      `${finding.path}:${finding.line}:${finding.column}: ${finding.label} [${finding.category}]`,
    )
  }

  const summary = Object.entries(counts)
    .map(([category, count]) => `${category}=${count}`)
    .join(", ")

  if (exceeded.length > 0) {
    console.error(`anti-suppression check failed: ${summary}`)
    process.exitCode = 1
    return
  }

  console.log(`anti-suppression check passed in ${Math.ceil(performance.now() - startedAt)}ms: ${summary}`)
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : ""
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath && statSync(invokedPath).isFile()) {
  main()
}
