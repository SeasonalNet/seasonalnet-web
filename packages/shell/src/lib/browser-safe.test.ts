import { describe, expect, it } from "vitest"

import { formatDateTime, safeNavigationHref } from "./browser-safe"

describe("formatDateTime", () => {
  it("does not throw for an invalid configured time zone", () => {
    expect(formatDateTime("2026-08-23T12:00:00Z", "Not/A-Timezone")).not.toBe("—")
  })

  it("rejects invalid dates", () => {
    expect(formatDateTime("not-a-date", "UTC")).toBe("—")
  })
})

describe("safeNavigationHref", () => {
  it.each(["javascript:alert(1)", "data:text/html,boom", "//evil.example/path", "not a url"])(
    "rejects unsafe navigation target %s",
    (value) => expect(safeNavigationHref(value)).toBeNull(),
  )

  it.each(["/status", "https://status.example/path", "http://localhost:3000/"])(
    "allows web navigation target %s",
    (value) => expect(safeNavigationHref(value)).not.toBeNull(),
  )
})
