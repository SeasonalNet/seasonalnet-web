import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const script = fileURLToPath(new URL("./version.sh", import.meta.url))

function fromGit(option) {
  return execFileSync("sh", [script, option], { encoding: "utf8" }).trim()
}

export function versionConfig(environment = process.env) {
  const version = environment.APP_VERSION || fromGit("--version")
  const revision = environment.APP_REVISION || fromGit("--revision")
  return {
    env: {
      NEXT_PUBLIC_APP_VERSION: version,
      NEXT_PUBLIC_APP_REVISION: revision,
    },
    async generateBuildId() {
      return `${version}-${revision}`
    },
    async headers() {
      return [{
        source: "/:path*",
        headers: [
          { key: "X-Software-Version", value: version },
          { key: "X-Software-Revision", value: revision },
        ],
      }]
    },
  }
}
