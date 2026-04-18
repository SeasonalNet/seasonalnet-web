export type AccessTier = "status" | "operations" | "administration"

export type AccessPolicy = {
  statusGroups: string[]
  operationsGroups: string[]
  administrationGroups: string[]
  hasRestrictions: boolean
}

function unique(values: string[]) {
  return [...new Set(values)]
}

export function parseGroupList(value?: string | null): string[] {
  if (!value) return []
  return unique(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  )
}

export function buildAccessPolicy(groups: {
  status?: string[]
  operations?: string[]
  administration?: string[]
}): AccessPolicy {
  const statusGroups = unique(groups.status ?? [])
  const operationsGroups = unique(groups.operations ?? [])
  const administrationGroups = unique(groups.administration ?? [])

  return {
    statusGroups,
    operationsGroups,
    administrationGroups,
    hasRestrictions:
      statusGroups.length > 0 ||
      operationsGroups.length > 0 ||
      administrationGroups.length > 0,
  }
}

export function buildAccessPolicyFromEnv(prefix: string): AccessPolicy {
  return buildAccessPolicy({
    status: parseGroupList(process.env[`${prefix}_STATUS_GROUPS`]),
    operations: parseGroupList(process.env[`${prefix}_OPERATIONS_GROUPS`]),
    administration: parseGroupList(process.env[`${prefix}_ADMINISTRATION_GROUPS`]),
  })
}

export function resolveAccessTier(groups: string[], policy: AccessPolicy): AccessTier | null {
  const normalized = new Set(groups.map((group) => group.trim()).filter(Boolean))

  if (
    policy.administrationGroups.some((group) => normalized.has(group))
  ) {
    return "administration"
  }

  if (policy.operationsGroups.some((group) => normalized.has(group))) {
    return "operations"
  }

  if (policy.statusGroups.some((group) => normalized.has(group))) {
    return "status"
  }

  return null
}

export function isAuthorizedGroups(groups: string[], policy: AccessPolicy): boolean {
  if (!policy.hasRestrictions) return true
  return resolveAccessTier(groups, policy) !== null
}

export function accessTierLabel(tier: AccessTier | null | undefined): string | null {
  switch (tier) {
    case "administration":
      return "Administration"
    case "operations":
      return "Operations"
    case "status":
      return "Status"
    default:
      return null
  }
}
