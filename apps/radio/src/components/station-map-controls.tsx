"use client"

import { Check, Eye, EyeOff, Map, Radar, SlidersHorizontal } from "lucide-react"
import { Button } from "@seasonalnet/shell/src/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@seasonalnet/shell/src/components/ui/dropdown-menu"
import type {
  RadarProductId,
  RadarSourceId,
  StationRadarConfig,
} from "@/lib/station-alert-config"

type Props = {
  inline?: boolean
  radarConfig: StationRadarConfig
  radarSource: RadarSourceId
  radarProduct: RadarProductId
  radarVisible: boolean
  radarOpacity: number
  freshnessCues: boolean
  reducedMotion: boolean
  onRadarSourceChange: (source: RadarSourceId) => void
  onRadarProductChange: (product: RadarProductId) => void
  onRadarVisibleChange: (visible: boolean) => void
  onRadarOpacityChange: (opacity: number) => void
  onFreshnessCuesChange: (enabled: boolean) => void
  onReducedMotionChange: (enabled: boolean) => void
}

function SelectMark({ selected }: { selected: boolean }) {
  return selected ? <Check className="ml-auto h-4 w-4" aria-hidden="true" /> : null
}

export function StationMapControls({
  inline = false,
  radarConfig,
  radarSource,
  radarProduct,
  radarVisible,
  radarOpacity,
  freshnessCues,
  reducedMotion,
  onRadarSourceChange,
  onRadarProductChange,
  onRadarVisibleChange,
  onRadarOpacityChange,
  onFreshnessCuesChange,
  onReducedMotionChange,
}: Props) {
  const sourceConfig = radarConfig.sources[radarSource]
  const sourceEntries = Object.entries(radarConfig.sources) as [RadarSourceId, typeof sourceConfig][]
  const products = Object.entries(sourceConfig.products) as [RadarProductId, NonNullable<typeof sourceConfig.products[RadarProductId]>][]
  const hasMultipleSources = sourceEntries.length > 1

  return (
    <div
      className={inline ? "w-full" : "absolute right-3 top-3 z-[1001]"}
      onClick={(event) => event.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={inline ? "ghost" : "outline"}
            size={inline ? "sm" : "icon-sm"}
            className={inline
              ? "h-7 w-full justify-start gap-1.5 px-1.5 text-xs"
              : "border-border bg-background/90 shadow-sm backdrop-blur-sm"}
            aria-label="Map options"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            {inline ? <span>Options</span> : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Radar</div>
          <DropdownMenuItem
            onSelect={() => onRadarVisibleChange(!radarVisible)}
            role="menuitemcheckbox"
            aria-checked={radarVisible}
          >
            {radarVisible ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
            {radarVisible ? "Hide radar" : "Show latest radar"}
          </DropdownMenuItem>

          {hasMultipleSources ? (
            <>
              <div className="px-2 pb-1 pt-2 text-xs text-muted-foreground">Source</div>
              {sourceEntries.map(([sourceId, source]) => (
                <DropdownMenuItem
                  key={sourceId}
                  onSelect={() => onRadarSourceChange(sourceId)}
                  aria-checked={radarSource === sourceId}
                  title={source.description}
                >
                  <Radar className="h-4 w-4" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{source.label}</span>
                  <SelectMark selected={radarSource === sourceId} />
                </DropdownMenuItem>
              ))}
            </>
          ) : null}

          <div className="px-2 pb-1 pt-2 text-xs text-muted-foreground">Product</div>
          {products.map(([productId, product]) => (
            <DropdownMenuItem
              key={productId}
              onSelect={() => onRadarProductChange(productId)}
              aria-checked={radarProduct === productId}
            >
              <Map className="h-4 w-4" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{product.shortLabel}</span>
              <SelectMark selected={radarProduct === productId} />
            </DropdownMenuItem>
          ))}
          {!sourceConfig.products.velocity ? (
            <DropdownMenuItem disabled title="MRMS provides reflectivity here; velocity is available from the local CloudGIS radar source.">
              <Map className="h-4 w-4" aria-hidden="true" />
              <span className="min-w-0 flex-1">Velocity unavailable for this source</span>
            </DropdownMenuItem>
          ) : null}

          {radarVisible ? (
            <>
              <div className="px-2 pb-1 pt-2 text-xs text-muted-foreground">Opacity</div>
              {[0.3, 0.45, 0.6].map((opacity) => (
                <DropdownMenuItem
                  key={opacity}
                  onSelect={() => onRadarOpacityChange(opacity)}
                  aria-checked={radarOpacity === opacity}
                >
                  <span className="w-5 text-center text-xs tabular-nums">{Math.round(opacity * 100)}%</span>
                  <span>{opacity <= 0.3 ? "Muted" : opacity >= 0.6 ? "Strong" : "Normal"}</span>
                  <SelectMark selected={radarOpacity === opacity} />
                </DropdownMenuItem>
              ))}
            </>
          ) : null}

          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Interaction</div>
          <DropdownMenuItem
            onSelect={() => onFreshnessCuesChange(!freshnessCues)}
            role="menuitemcheckbox"
            aria-checked={freshnessCues}
          >
            <Radar className="h-4 w-4" aria-hidden="true" />
            <span className="flex-1">Freshness cues</span>
            <SelectMark selected={freshnessCues} />
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => onReducedMotionChange(!reducedMotion)}
            role="menuitemcheckbox"
            aria-checked={reducedMotion}
          >
            <Radar className="h-4 w-4" aria-hidden="true" />
            <span className="flex-1">Reduced motion</span>
            <SelectMark selected={reducedMotion} />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
