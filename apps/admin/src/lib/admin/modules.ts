import type { SeasonalWeatherOverview } from "../server/modules/seasonalweather"
import type { SeasonalProvisioningOverview } from "../server/modules/seasonalprovisioning"
import type { SeasonalApidOverview } from "../server/modules/seasonalapid"
import type { AdminModule } from "./types"

import { buildSeasonalWeatherModule } from "./modules/seasonalweather"
import { buildSeasonalPbxModule } from "./modules/seasonalpbx"
import { buildSeasonalProvModule } from "./modules/seasonalprov"
import { buildSeasonalRadioModule } from "./modules/seasonalradio"
import { buildSeasonalApidModule } from "./modules/seasonalapid"

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
