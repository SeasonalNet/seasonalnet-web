import type { SeasonalWeatherOverview } from "@/lib/server/modules/seasonalweather"
import type { SeasonalProvisioningOverview } from "@/lib/server/modules/seasonalprovisioning"
import type { SeasonalApidOverview } from "@/lib/server/modules/seasonalapid"
import type { AdminModule } from "@/lib/admin/types"

import { buildSeasonalWeatherModule } from "@/lib/admin/modules/seasonalweather"
import { buildSeasonalPbxModule } from "@/lib/admin/modules/seasonalpbx"
import { buildSeasonalProvModule } from "@/lib/admin/modules/seasonalprov"
import { buildSeasonalRadioModule } from "@/lib/admin/modules/seasonalradio"
import { buildSeasonalApidModule } from "@/lib/admin/modules/seasonalapid"

export function buildAdminModules(
  seasonalWeatherOverview: SeasonalWeatherOverview,
  seasonalProvisioningOverview: SeasonalProvisioningOverview,
  seasonalApidOverview: SeasonalApidOverview,
): AdminModule[] {
  return [
    buildSeasonalWeatherModule(seasonalWeatherOverview),
    buildSeasonalProvModule(seasonalProvisioningOverview),
    buildSeasonalApidModule(seasonalApidOverview),
    buildSeasonalPbxModule(),
    buildSeasonalRadioModule(),
  ]
}
