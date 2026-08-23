import { describe, expect, it } from "vitest"

import { classifyExtension, formatExtensionClassification } from "./pbx-classification"

describe("classifyExtension", () => {
  it.each([
    ["4100", "managed-pool", true, false],
    ["4999", "managed-pool", true, false],
    ["1000", "founder", false, true],
    ["1099", "founder", false, true],
    ["1300", "operator", false, true],
    ["1399", "operator", false, true],
    ["1113", "special-retained", false, true],
    ["1500", "special-retained", false, true],
    ["2200", "manual-or-unknown", false, false],
    ["12", "invalid", false, true],
    ["not-an-extension", "invalid", false, true],
  ] as const)("classifies %s as %s", (extension, expected, managed, reserved) => {
    expect(classifyExtension(extension)).toMatchObject({
      extension,
      classification: expected,
      managedByControlPlane: managed,
      reserved,
    })
  })
})

describe("formatExtensionClassification", () => {
  it.each([
    ["managed-pool", "Managed pool"],
    ["founder", "Founder"],
    ["operator", "Operator"],
    ["special-retained", "Special retained"],
    ["manual-or-unknown", "Manual/unknown"],
    ["invalid", "Invalid"],
  ] as const)("formats %s", (classification, label) => {
    expect(formatExtensionClassification(classification)).toBe(label)
  })
})
