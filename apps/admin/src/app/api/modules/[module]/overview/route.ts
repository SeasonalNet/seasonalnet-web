import { NextResponse } from "next/server"
import { problemJson } from "@seasonalnet/shell/src/lib/server/problem"
import { getSeasonalWeatherOverview } from "@/lib/server/modules/seasonalweather"
import { getSeasonalProvisioningOverview } from "@/lib/server/modules/seasonalprovisioning"
import { getSeasonalApidOverview } from "@/lib/server/modules/seasonalapid"

export const runtime = "nodejs"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ module: string }> },
) {
  const { module } = await params

  switch (module) {
    case "seasonalweather": {
      const overview = await getSeasonalWeatherOverview()
      return NextResponse.json(overview, {
        headers: {
          "Cache-Control": "no-store",
        },
      })
    }

    case "seasonalprovisioning": {
      const overview = await getSeasonalProvisioningOverview()
      return NextResponse.json(overview, {
        headers: {
          "Cache-Control": "no-store",
        },
      })
    }

    case "seasonalapid": {
      const overview = await getSeasonalApidOverview()
      return NextResponse.json(overview, {
        headers: {
          "Cache-Control": "no-store",
        },
      })
    }

    case "seasonalpbx":
    case "seasonalradio":
      return NextResponse.json(
        {
          configured: false,
          reachable: false,
          error: "Module scaffold exists but backend is not wired yet.",
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      )

    default:
      return problemJson({
        type: "/problems/unknown-module",
        title: "Unknown module",
        status: 404,
        detail: "Unknown module.",
      })
  }
}
