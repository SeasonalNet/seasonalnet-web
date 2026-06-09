export type ExtensionClassification = "managed-pool" | "founder" | "operator" | "special-retained" | "manual-or-unknown" | "invalid"

export type ClassifiedExtension = {
  extension: string
  classification: ExtensionClassification
  managedByControlPlane: boolean
  reserved: boolean
  reason: string
}

const FOUNDER_MIN = 1000
const FOUNDER_MAX = 1099
const OPERATOR_MIN = 1300
const OPERATOR_MAX = 1399
const MANAGED_POOL_MIN = 4100
const MANAGED_POOL_MAX = 4999
const SPECIAL_RETAINED = new Set(["1113", "1500"])

function parseExtension(extension: string): number | null {
  if (!/^\d{3,10}$/.test(extension)) return null

  const numeric = Number(extension)
  return Number.isSafeInteger(numeric) ? numeric : null
}

export function classifyExtension(extension: string): ClassifiedExtension {
  const numeric = parseExtension(extension)
  if (numeric === null) {
    return {
      extension,
      classification: "invalid",
      managedByControlPlane: false,
      reserved: true,
      reason: "invalid extension format",
    }
  }

  if (numeric >= MANAGED_POOL_MIN && numeric <= MANAGED_POOL_MAX) {
    return {
      extension,
      classification: "managed-pool",
      managedByControlPlane: true,
      reserved: false,
      reason: "bot/control-plane managed public extension pool",
    }
  }

  if (numeric >= FOUNDER_MIN && numeric <= FOUNDER_MAX) {
    return {
      extension,
      classification: "founder",
      managedByControlPlane: false,
      reserved: true,
      reason: "founder extension range",
    }
  }

  if (numeric >= OPERATOR_MIN && numeric <= OPERATOR_MAX) {
    return {
      extension,
      classification: "operator",
      managedByControlPlane: false,
      reserved: true,
      reason: "operator extension range",
    }
  }

  if (SPECIAL_RETAINED.has(extension)) {
    return {
      extension,
      classification: "special-retained",
      managedByControlPlane: false,
      reserved: true,
      reason: "special retained extension outside the managed pool",
    }
  }

  return {
    extension,
    classification: "manual-or-unknown",
    managedByControlPlane: false,
    reserved: false,
    reason: "outside the managed pool and reserved ranges",
  }
}

export function formatExtensionClassification(classification: ExtensionClassification) {
  switch (classification) {
    case "managed-pool":
      return "Managed pool"
    case "founder":
      return "Founder"
    case "operator":
      return "Operator"
    case "special-retained":
      return "Special retained"
    case "manual-or-unknown":
      return "Manual/unknown"
    case "invalid":
      return "Invalid"
  }
}
