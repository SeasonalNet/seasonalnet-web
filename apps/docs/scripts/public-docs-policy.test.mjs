import { describe, expect, it } from "vitest"

import {
  PUBLIC_DOCS_ALLOWLIST,
  PUBLIC_DOCS_DENY_PREFIXES,
  PUBLIC_DOCS_MANAGED_OUTPUTS,
} from "./public-docs-policy.mjs"

describe("public docs policy", () => {
  it("maps unique source and output paths", () => {
    const sourcePaths = PUBLIC_DOCS_ALLOWLIST.map(({ sourcePath }) => sourcePath)
    const outputPaths = PUBLIC_DOCS_ALLOWLIST.map(({ outputPath }) => outputPath)

    expect(new Set(sourcePaths).size).toBe(sourcePaths.length)
    expect(new Set(outputPaths).size).toBe(outputPaths.length)
  })

  it("limits copied documents to declared managed outputs", () => {
    const managedOutputs = new Set(PUBLIC_DOCS_MANAGED_OUTPUTS)

    for (const entry of PUBLIC_DOCS_ALLOWLIST) {
      expect(managedOutputs.has(entry.outputPath), entry.outputPath).toBe(true)
    }
  })

  it("keeps denied source trees out of the allowlist", () => {
    for (const entry of PUBLIC_DOCS_ALLOWLIST) {
      expect(
        PUBLIC_DOCS_DENY_PREFIXES.some((prefix) => entry.sourcePath.startsWith(prefix)),
        entry.sourcePath,
      ).toBe(false)
    }
  })
})
