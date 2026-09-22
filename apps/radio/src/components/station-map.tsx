"use client";
// src/components/station-map.tsx
//
// SSR-safe dynamic import wrapper for the Leaflet map.
// Use this component everywhere in your app.
//
// Usage:
//   import StationMap from "@/components/station-map";
//   <StationMap config={config} capAlerts={alerts} handledAlerts={handled} />

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { Skeleton } from "@seasonalnet/shell/src/components/ui/skeleton";
import type StationMapClient from "./station-map-client";

// Skeleton shown while the map JS loads (Leaflet plus the vector basemap renderer)
function MapSkeleton() {
  return (
    <div
      className="w-full rounded-md border border-border bg-muted/30"
      style={{ height: 340 }}
      role="status"
      aria-label="Loading map…"
    >
      <Skeleton className="h-full w-full rounded-md" />
    </div>
  );
}

const StationMapDynamic = dynamic(() => import("./station-map-client"), {
  ssr: false,
  loading: MapSkeleton,
});

export type StationMapProps = ComponentProps<typeof StationMapClient>;

export default function StationMap(props: StationMapProps) {
  return <StationMapDynamic {...props} />;
}
