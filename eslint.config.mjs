import js from "@eslint/js"
import globals from "globals"

export default [
  {
    ignores: ["**/.next/**", "**/.source/**", "**/coverage/**", "**/node_modules/**"],
  },
  {
    files: ["*.config.mjs", "tools/**/*.mjs"],
    ...js.configs.recommended,
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },
]
