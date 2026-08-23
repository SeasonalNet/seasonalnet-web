export function formatDateTime(value: string | number | Date, timeZone?: string): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }

  try {
    return new Intl.DateTimeFormat("en-US", { ...options, ...(timeZone ? { timeZone } : {}) }).format(date)
  } catch (error) {
    if (!(error instanceof RangeError)) throw error
    return new Intl.DateTimeFormat("en-US", options).format(date)
  }
}

export function safeNavigationHref(value: string | null | undefined): string | null {
  const candidate = value?.trim()
  if (!candidate) return null
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return candidate

  try {
    const url = new URL(candidate)
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null
  } catch {
    return null
  }
}
