import type { SeasonalWeatherOverview } from "@/lib/server/modules/seasonalweather"
import type { AdminModule } from "@/lib/admin/types"

import { buildSeasonalWeatherModule } from "@/lib/admin/modules/seasonalweather"
import { buildSeasonalPbxModule } from "@/lib/admin/modules/seasonalpbx"
import { buildSeasonalProvModule } from "@/lib/admin/modules/seasonalprov"
import { buildSeasonalRadioModule } from "@/lib/admin/modules/seasonalradio"

export function buildAdminModules(
  overview: SeasonalWeatherOverview,
): AdminModule[] {
  return [
    buildSeasonalWeatherModule(overview),
    buildSeasonalPbxModule(),
    buildSeasonalProvModule(),
    buildSeasonalRadioModule(),
  ]
}
