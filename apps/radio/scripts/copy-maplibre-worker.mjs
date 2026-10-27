#!/usr/bin/env node

import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { pathToFileURL } from "node:url"

const runtimeFiles = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]
const optionalSourceMaps = runtimeFiles.map((file) => `${file}.map`)

export function copyMapLibreWorkerFiles(maplibreDist, destination) {
  mkdirSync(destination, { recursive: true })

  for (const file of runtimeFiles) {
    copyFileSync(path.join(maplibreDist, file), path.join(destination, file))
  }

  for (const file of optionalSourceMaps) {
    const source = path.join(maplibreDist, file)
    const target = path.join(destination, file)
    if (existsSync(source)) copyFileSync(source, target)
    else rmSync(target, { force: true })
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const require = createRequire(import.meta.url)
  const maplibreDist = path.join(path.dirname(require.resolve("maplibre-gl/package.json")), "dist")
  copyMapLibreWorkerFiles(maplibreDist, path.resolve("public", "maplibre"))
}
