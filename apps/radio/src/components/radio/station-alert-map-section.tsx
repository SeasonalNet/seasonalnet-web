"use client";
// src/components/radio/station-alert-map-section.tsx
//
// Renders the service-area Leaflet map wired to both alert feeds.

import * as React from "react";
import { Button } from "@seasonalnet/shell/src/components/ui/button";
import { RefreshCw } from "lucide-react";
import StationMap from "@/components/station-map";
import { STATION_ALERTS } from "@/lib/station-alert-config";
import type { NwsAlertFeature, StationHandledAlert } from "@/lib/alert-map-utils";

// ---------------------------------------------------------------------------
// Real API shapes (from station-alerts.tsx / station-handled-alerts.tsx)
// ---------------------------------------------------------------------------

type ApiAlert = {
  id: string;
  event: string;
  headline: string;
  severity: string;
  urgency: string;
  certainty: string;
  area: string;
  effective: string | null;
  ends: string | null;
  expires: string | null;
  sent: string | null;
  sameCodes: string[];
  geometry: GeoJSON.Geometry | null;
  links: { nws: string };
};

type AlertsPayload = {
  stationId: string;
  serviceAreaName: string;
  generatedAt: string;
  source: "nws";
  alerts: ApiAlert[];
};

type FeedSender = { name: string; kind?: "relay" | "origin" | "unknown" };

type StationFeedAlert = {
  id: string;
  event: string;
  headline: string;
  severity: string;
  urgency: string;
  certainty: string;
  area: string;
  effective?: string | null;
  ends: string | null;
  expires: string | null;
  sent?: string | null;
  sameCodes?: string[];
  from: FeedSender | null;
  links?: { primary?: string; nws?: string };
};

type HandledPayload =
  | { ok: true;  enabled: true;  stationId: string; generatedAt: string; source: string; alerts: StationFeedAlert[] }
  | { ok: false; enabled: true;  stationId: string; generatedAt: string; source: string; error?: string; alerts: StationFeedAlert[] }
  | { ok: true;  enabled: false; stationId: string; generatedAt: string; source: string; alerts: StationFeedAlert[] };

// ---------------------------------------------------------------------------
// Normalise to the shapes station-map-client.tsx expects
// ---------------------------------------------------------------------------

function normaliseCapAlerts(alerts: ApiAlert[]): NwsAlertFeature[] {
  return alerts.map(a => ({
    id: a.id,
    type: "Feature" as const,
    geometry: a.geometry ?? null,
    properties: {
      id: a.id,
      event: a.event,
      severity: a.severity as NwsAlertFeature["properties"]["severity"],
      urgency: a.urgency as NwsAlertFeature["properties"]["urgency"],
      certainty: a.certainty,
      headline: a.headline,
      description: null,
      areaDesc: a.area,
      effective: a.effective ?? "",
      expires: a.expires ?? a.ends ?? "",
      senderName: "",
      status: "Actual",
      messageType: "Alert",
      parameters: { SAME: a.sameCodes ?? [] },
    },
  }));
}

function normaliseHandledAlerts(alerts: StationFeedAlert[]): StationHandledAlert[] {
  return alerts.map(a => ({
    id: a.id,
    eventType: a.event,
    severity: a.severity,
    source: a.from?.name,
    areaDesc: a.area,
    sameCodes: a.sameCodes ?? [],
    fipsCodes: [],
    effective: a.effective ?? undefined,
    expires: a.ends ?? a.expires ?? undefined,
  }));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StationAlertMapSection({
  stationId,
}: {
  stationId: string;
}) {
  const config = STATION_ALERTS[stationId];

  const [capAlerts,     setCapAlerts]     = React.useState<NwsAlertFeature[]>([]);
  const [handledAlerts, setHandledAlerts] = React.useState<StationHandledAlert[]>([]);
  const [loading,       setLoading]       = React.useState(true);
  const [updatedAt,     setUpdatedAt]     = React.useState<Date | null>(null);
  const [error,         setError]         = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [alertsRes, handledRes] = await Promise.all([
        fetch(`/api/stations/${encodeURIComponent(stationId)}/alerts`,         { cache: "no-store" }),
        fetch(`/api/stations/${encodeURIComponent(stationId)}/handled-alerts`, { cache: "no-store" }),
      ]);

      if (alertsRes.ok) {
        const json = (await alertsRes.json()) as AlertsPayload;
        setCapAlerts(normaliseCapAlerts(json.alerts ?? []));
      }

      if (handledRes.ok) {
        const json = (await handledRes.json()) as HandledPayload;
        setHandledAlerts(normaliseHandledAlerts(json.alerts ?? []));
      }

      setUpdatedAt(new Date());
    } catch (e: any) {
      setError(e?.message ?? "Failed to load alert data.");
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  React.useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  if (!config) return null;

  return (
    <div className="mt-6 space-y-3">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="text-sm font-medium">Service Area Map</div>
          <div className="text-xs text-muted-foreground">
            {config.serviceAreaName}
            {updatedAt && ` · Updated: ${updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          className="gap-2 self-start sm:self-auto shrink-0"
        >
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <StationMap
        config={config}
        capAlerts={capAlerts}
        handledAlerts={handledAlerts}
      />
    </div>
  );
}
