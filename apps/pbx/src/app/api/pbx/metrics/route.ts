import { NextResponse } from "next/server"
import { cacheControlHeader, getCachedValue } from "@seasonalnet/shell/src/lib/server/cache"
import { gql } from "@/lib/freepbx-gql"

export const runtime = "nodejs"

type FetchAllExtensionsResult = {
  fetchAllExtensions?: {
    totalCount?: number | null
    status?: unknown
    message?: unknown
  }
}

type FetchAllCdrsResult = {
  fetchAllCdrs?: {
    status?: unknown
    message?: unknown
    totalCount?: number | null
    cdrs?: Array<{ calldate?: string | null }>
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function ymdLocal(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function qExt() {
  return `
    query {
      fetchAllExtensions(first: 1) {
        totalCount
        status
        message
      }
    }
  `
}

function qCdrRows(startDate: string, endDate: string, first: number) {
  // We intentionally DO NOT trust totalCount (it's unfiltered on your PBX).
  // Instead we count returned rows.
  return `
    query {
      fetchAllCdrs(
        first: ${first},
        orderby: date,
        startDate: "${startDate}",
        endDate: "${endDate}"
      ) {
        status
        message
        totalCount
        cdrs {
          calldate
        }
      }
    }
  `
}

async function fetchCdrCount(startDate: string, endDate: string, cap = 20000) {
  const data = await gql<FetchAllCdrsResult>(qCdrRows(startDate, endDate, cap))
  const node = data?.fetchAllCdrs

  const rows = Array.isArray(node?.cdrs) ? node.cdrs.length : 0
  const truncated = rows >= cap

  return {
    count: rows,
    status: node?.status ?? null,
    message: node?.message ?? null,
    // keep this for debugging so you can SEE the PBX lies:
    reportedTotalCount: node?.totalCount ?? null,
    truncated,
  }
}

async function buildMetrics() {
  const enabled = process.env.FREEPBX_METRICS_ENABLED === "1"
  if (!enabled) {
    return { enabled: false, generatedAt: new Date().toISOString() }
  }

  const today = ymdLocal()
  const monthStart = `${today.slice(0, 8)}01`
  const allTimeStart = "1970-01-01"

  const out: Record<string, unknown> = {
    enabled: true,
    generatedAt: new Date().toISOString(),
  }
  const truncations: boolean[] = []

  // Extensions
  try {
    const ext = await gql<FetchAllExtensionsResult>(qExt())
    out.extensionCount = ext?.fetchAllExtensions?.totalCount ?? null
    out._ext = {
      status: ext?.fetchAllExtensions?.status,
      message: ext?.fetchAllExtensions?.message,
    }
  } catch (error: unknown) {
    out.error = `Extensions query failed: ${errorMessage(error)}`
    return out
  }

  // CDR counts by counting returned rows
  try {
    const todayRes = await fetchCdrCount(today, today)
    out.callsToday = todayRes.count
    out._cdrToday = todayRes
    truncations.push(todayRes.truncated)
  } catch (error: unknown) {
    out.callsToday = null
    out._cdrToday = { status: false, message: errorMessage(error) }
  }

  try {
    const monthRes = await fetchCdrCount(monthStart, today)
    out.callsThisMonth = monthRes.count
    out._cdrMonth = monthRes
    truncations.push(monthRes.truncated)
  } catch (error: unknown) {
    out.callsThisMonth = null
    out._cdrMonth = { status: false, message: errorMessage(error) }
  }

  try {
    const totalRes = await fetchCdrCount(allTimeStart, today)
    out.totalCalls = totalRes.count
    out._cdrTotal = totalRes
    truncations.push(totalRes.truncated)
  } catch (error: unknown) {
    out.totalCalls = null
    out._cdrTotal = { status: false, message: errorMessage(error) }
  }

  // If we ever hit cap, surface a warning (so you know to paginate later)
  if (truncations.some(Boolean)) {
    out.warning =
      "CDR results hit the safety cap; counts may be truncated. Increase cap or implement pagination."
  }

  return out
}

export async function GET() {
  const cached = await getCachedValue(
    {
      key: "pbx:metrics",
      ttlMs: 30_000,
      staleTtlMs: 2 * 60_000,
    },
    buildMetrics,
  )

  return NextResponse.json(cached.value, {
    headers: {
      "Cache-Control": cacheControlHeader(30, 120),
      "X-SeasonalNet-Cache": cached.status,
    },
  })
}
