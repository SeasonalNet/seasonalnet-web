import type { SeasonalWeatherOverview } from "@/lib/server/modules/seasonalweather"
import type { SeasonalProvisioningOverview } from "@/lib/server/modules/seasonalprovisioning"
import type { AdminModule } from "@/lib/admin/types"

import { buildSeasonalWeatherModule } from "@/lib/admin/modules/seasonalweather"
import { buildSeasonalPbxModule } from "@/lib/admin/modules/seasonalpbx"
import { buildSeasonalProvModule } from "@/lib/admin/modules/seasonalprov"
import { buildSeasonalRadioModule } from "@/lib/admin/modules/seasonalradio"

export function buildAdminModules(
  seasonalWeatherOverview: SeasonalWeatherOverview,
  seasonalProvisioningOverview: SeasonalProvisioningOverview,
): AdminModule[] {
  return [
    buildSeasonalWeatherModule(seasonalWeatherOverview),
    buildSeasonalProvModule(seasonalProvisioningOverview),
    buildSeasonalPbxModule(),
    buildSeasonalRadioModule(),
  ]
}
