import { NextResponse } from "next/server"
import { gql } from "@/lib/freepbx-gql"

export const runtime = "nodejs"

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
  const data = await gql<any>(qCdrRows(startDate, endDate, cap))
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

export async function GET() {
  const enabled = process.env.FREEPBX_METRICS_ENABLED === "1"
  if (!enabled) {
    return NextResponse.json({ enabled: false, generatedAt: new Date().toISOString() })
  }

  const today = ymdLocal()
  const monthStart = `${today.slice(0, 8)}01`
  const allTimeStart = "1970-01-01"

  const out: any = {
    enabled: true,
    generatedAt: new Date().toISOString(),
  }

  // Extensions
  try {
    const ext = await gql<any>(qExt())
    out.extensionCount = ext?.fetchAllExtensions?.totalCount ?? null
    out._ext = {
      status: ext?.fetchAllExtensions?.status,
      message: ext?.fetchAllExtensions?.message,
    }
  } catch (e: any) {
    out.error = `Extensions query failed: ${e?.message ?? String(e)}`
    return NextResponse.json(out)
  }

  // CDR counts by counting returned rows
  try {
    const todayRes = await fetchCdrCount(today, today)
    out.callsToday = todayRes.count
    out._cdrToday = todayRes
  } catch (e: any) {
    out.callsToday = null
    out._cdrToday = { status: false, message: e?.message ?? String(e) }
  }

  try {
    const monthRes = await fetchCdrCount(monthStart, today)
    out.callsThisMonth = monthRes.count
    out._cdrMonth = monthRes
  } catch (e: any) {
    out.callsThisMonth = null
    out._cdrMonth = { status: false, message: e?.message ?? String(e) }
  }

  try {
    const totalRes = await fetchCdrCount(allTimeStart, today)
    out.totalCalls = totalRes.count
    out._cdrTotal = totalRes
  } catch (e: any) {
    out.totalCalls = null
    out._cdrTotal = { status: false, message: e?.message ?? String(e) }
  }

  // If we ever hit cap, surface a warning (so you know to paginate later)
  const anyTrunc =
    out._cdrToday?.truncated || out._cdrMonth?.truncated || out._cdrTotal?.truncated
  if (anyTrunc) {
    out.warning =
      "CDR results hit the safety cap; counts may be truncated. Increase cap or implement pagination."
  }

  return NextResponse.json(out, {
    headers: { "Cache-Control": "public, max-age=30, s-maxage=30" },
  })
}
