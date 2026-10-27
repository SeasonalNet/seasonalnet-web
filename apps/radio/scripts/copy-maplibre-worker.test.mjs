import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { copyMapLibreWorkerFiles } from "./copy-maplibre-worker.mjs"

const temporaryRoots = []

function createFixture() {
  const root = mkdtempSync(path.join(tmpdir(), "seasonalnet-maplibre-"))
  temporaryRoots.push(root)
  const source = path.join(root, "dist")
  const destination = path.join(root, "public", "maplibre")
  mkdirSync(source)
  return { source, destination }
}

function writeFiles(directory, files) {
  for (const file of files) writeFileSync(path.join(directory, file), file)
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe("MapLibre worker asset copy", () => {
  it("copies runtime modules and the source maps supplied by MapLibre", () => {
    const { source, destination } = createFixture()
    const files = [
      "maplibre-gl-worker.mjs",
      "maplibre-gl-worker.mjs.map",
      "maplibre-gl-shared.mjs",
      "maplibre-gl-shared.mjs.map",
    ]
    writeFiles(source, files)

    copyMapLibreWorkerFiles(source, destination)

    for (const file of files) {
      expect(readFileSync(path.join(destination, file), "utf8")).toBe(file)
    }
  })

  it("allows omitted source maps while still requiring both runtime modules", () => {
    const { source, destination } = createFixture()
    writeFiles(source, ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"])
    mkdirSync(destination, { recursive: true })
    writeFileSync(path.join(destination, "maplibre-gl-shared.mjs.map"), "stale")

    copyMapLibreWorkerFiles(source, destination)

    expect(existsSync(path.join(destination, "maplibre-gl-shared.mjs.map"))).toBe(false)
    rmSync(path.join(source, "maplibre-gl-shared.mjs"))
    expect(() => copyMapLibreWorkerFiles(source, destination)).toThrow(/maplibre-gl-shared\.mjs/)
  })
})
