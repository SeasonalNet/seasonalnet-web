#!/usr/bin/env node

import { copyFileSync, mkdirSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"

const require = createRequire(import.meta.url)
const maplibreDist = path.join(path.dirname(require.resolve("maplibre-gl/package.json")), "dist")
const destination = path.resolve("public", "maplibre")

mkdirSync(destination, { recursive: true })

for (const file of [
  "maplibre-gl-worker.mjs",
  "maplibre-gl-worker.mjs.map",
  "maplibre-gl-shared.mjs",
  "maplibre-gl-shared.mjs.map",
]) {
  copyFileSync(path.join(maplibreDist, file), path.join(destination, file))
}
