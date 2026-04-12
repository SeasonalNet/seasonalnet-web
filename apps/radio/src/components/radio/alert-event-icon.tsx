// src/components/radio/alert-event-icon.tsx

import * as React from "react"
import { cn } from "@/lib/utils"
import * as Lucide from "lucide-react"

type Props = {
  event: string
  severity?: string | null
  className?: string
  mode?: "nws" | "eas"
}

function norm(s: string) {
  return (s || "").trim().toLowerCase()
}

/**
 * NWS help-map event color mapping (hex → Tailwind arbitrary value class).
 * Source: https://www.weather.gov/help-map (last updated March 10, 2025).
 *
 * Notes:
 * - Some events are "Transparent" on the map; for UI readability we treat those as muted.
 * - If an event isn't in this map, we fall back to product-type (warning/watch/advisory/statement)
 *   and then to CAP severity.
 */
const NWS_EVENT_TONE: Record<string, string> = {
  "911 telephone outage emergency": "text-[#C0C0C0]",
  "administrative message": "text-[#C0C0C0]",
  "air quality alert": "text-[#808080]",
  "air stagnation advisory": "text-[#808080]",
  "ashfall advisory": "text-[#696969]",
  "ashfall warning": "text-[#A9A9A9]",
  "avalanche advisory": "text-[#CD853F]",
  "avalanche warning": "text-[#1E90FF]",
  "beach hazards statement": "text-[#40E0D0]",
  "blizzard warning": "text-[#FF4500]",
  "blowing dust advisory": "text-[#BDB76B]",
  "blowing dust warning": "text-[#FFE4C4]",
  "brisk wind advisory": "text-[#D8BFD8]",
  "child abduction emergency": "text-muted-foreground", // Transparent
  "civil danger warning": "text-[#FFB6C1]",
  "civil emergency message": "text-[#FFB6C1]",
  "coastal flood advisory": "text-[#7CFC00]",
  "coastal flood statement": "text-[#6B8E23]",
  "coastal flood warning": "text-[#228B22]",
  "dense fog advisory": "text-[#708090]",
  "dense smoke advisory": "text-[#F0E68C]",
  "dust advisory": "text-[#BDB76B]",
  "earthquake warning": "text-[#8B4513]",
  "evacuation immediate": "text-[#7FFF00]",
  "excessive heat warning": "text-[#C71585]",
  "extreme cold warning": "text-[#0000FF]",
  "extreme fire danger": "text-[#E9967A]",
  "extreme wind warning": "text-[#FF8C00]",
  "fire warning": "text-[#A0522D]",
  "flash flood statement": "text-[#8B0000]",
  "flash flood warning": "text-[#8B0000]",
  "flash flood watch": "text-[#2E8B57]",
  "flood advisory": "text-[#00FF7F]",
  "flood statement": "text-[#00FF00]",
  "flood warning": "text-[#00FF00]",
  "flood watch": "text-[#2E8B57]",
  "freeze warning": "text-[#483D8B]",
  "freezing fog advisory": "text-[#008080]",
  "freezing spray advisory": "text-[#00BFFF]",
  "frost advisory": "text-[#6495ED]",
  "gale warning": "text-[#DDA0DD]",
  "hard freeze warning": "text-[#9400D3]",
  "hazardous materials warning": "text-[#4B0082]",
  "hazardous seas warning": "text-[#D8BFD8]",
  "hazardous weather outlook": "text-[#EEE8AA]",
  "heat advisory": "text-[#FF7F50]",
  "heavy freezing spray warning": "text-[#00BFFF]",
  "high surf advisory": "text-[#BA55D3]",
  "high surf warning": "text-[#228B22]",
  "high wind warning": "text-[#DAA520]",
  "hurricane force wind warning": "text-[#CD5C5C]",
  "hurricane local statement": "text-muted-foreground", // Transparent
  "hurricane warning": "text-[#FF00FF]",
  "hurricane watch": "text-[#FF69B4]",
  "hydrologic outlook": "text-[#90EE90]",
  "hydrologic statement": "text-[#00FF7F]",
  "ice storm warning": "text-[#8B008B]",
  "lake effect snow advisory": "text-[#7B68EE]",
  "lake effect snow warning": "text-[#008B8B]",
  "lake wind advisory": "text-[#D2B48C]",
  "lakeshore flood advisory": "text-[#7CFC00]",
  "lakeshore flood statement": "text-[#6B8E23]",
  "lakeshore flood warning": "text-[#228B22]",
  "law enforcement warning": "text-muted-foreground", // Transparent
  "local area emergency": "text-[#C0C0C0]",
  "low water advisory": "text-[#A52A2A]",
  "marine weather statement": "text-[#FFD700]",
  "red flag warning": "text-[#FF1493]",
  "rip current statement": "text-[#40E0D0]",
  "severe thunderstorm warning": "text-[#FFA500]",
  "severe thunderstorm watch": "text-[#DB7093]",
  "shelter in place warning": "text-[#FA8072]",
  "short term forecast": "text-muted-foreground", // Transparent
  "small craft advisory": "text-[#D8BFD8]",
  "small craft advisory for hazardous seas": "text-[#D8BFD8]",
  "small craft advisory for rough bar": "text-[#D8BFD8]",
  "small craft advisory for wind": "text-[#D8BFD8]",
  "smoke advisory": "text-[#F0E68C]",
  "snow squall warning": "text-[#C71585]",
  "special marine warning": "text-[#FFA500]",
  "special weather statement": "text-[#FFE4B5]",
  "storm surge warning": "text-[#B22222]",
  "storm surge watch": "text-[#DB7FF7]",
  "storm warning": "text-[#B8860B]",
  "test": "text-[#F0FFFF]",
  "tornado warning": "text-[#FF0000]",
  "tornado watch": "text-[#FFFF00]",
  "tropical depression local statement": "text-muted-foreground", // Transparent
  "tropical depression warning": "text-[#FF00FF]",
  "tropical depression watch": "text-[#FF69B4]",
  "tropical storm local statement": "text-muted-foreground", // Transparent
  "tropical storm warning": "text-[#B22222]",
  "tropical storm watch": "text-[#F08080]",
  "tsunami advisory": "text-[#D2691E]",
  "tsunami warning": "text-[#FD6347]",
  "tsunami watch": "text-[#FF00FF]",
  "typhoon local statement": "text-muted-foreground", // Transparent
  "typhoon warning": "text-[#FF00FF]",
  "typhoon watch": "text-[#FF69B4]",
  "volcanic ashfall advisory": "text-[#696969]",
  "volcanic ashfall warning": "text-[#A9A9A9]",
  "wind advisory": "text-[#D2B48C]",
  "wind chill advisory": "text-[#AFEEEE]",
  "wind chill warning": "text-[#B0C4DE]",
  "winter storm warning": "text-[#FF69B4]",
  "winter storm watch": "text-[#4682B4]",
  "winter weather advisory": "text-[#7B68EE]",
}

// 47 CFR §11.31(e) Event (EEE) codes (authorized list) + MEP (FCC order)
// Source list: CFR mirror; MEP per FCC/Federal Register.
export const EAS_EVENT_CODE_TO_NAME: Record<string, string> = {
  // National codes (required)
  EAN: "National Emergency Message",
  NPT: "Nationwide Test of the Emergency Alert System",
  RMT: "Required Monthly Test",
  RWT: "Required Weekly Test",

  // State and Local codes (optional)
  ADR: "Administrative Message",
  AVA: "Avalanche Watch",
  AVW: "Avalanche Warning",
  BLU: "Blue Alert",
  BZW: "Blizzard Warning",
  CAE: "Child Abduction Emergency",
  CDW: "Civil Danger Warning",
  CEM: "Civil Emergency Message",
  CFA: "Coastal Flood Watch",
  CFW: "Coastal Flood Warning",
  DMO: "Practice/Demo Warning",
  DSW: "Dust Storm Warning",
  EQW: "Earthquake Warning",
  EVI: "Evacuation Immediate",
  EWW: "Extreme Wind Warning",
  FFA: "Flash Flood Watch",
  FFW: "Flash Flood Warning",
  FFS: "Flash Flood Statement",
  FLA: "Flood Watch",
  FLW: "Flood Warning",
  FLS: "Flood Statement",
  FRW: "Fire Warning",
  HMW: "Hazardous Materials Warning",
  HWA: "High Wind Watch",
  HWW: "High Wind Warning",
  HUA: "Hurricane Watch",
  HUW: "Hurricane Warning",
  HLS: "Hurricane Statement",
  LAE: "Local Area Emergency",
  LEW: "Law Enforcement Warning",
  NMN: "Network Message Notification",
  NUW: "Nuclear Power Plant Warning",
  RHW: "Radiological Hazard Warning",
  SMW: "Special Marine Warning",
  SPW: "Shelter in Place Warning",
  SPS: "Special Weather Statement",
  SSA: "Storm Surge Watch",
  SSW: "Storm Surge Warning",
  SVA: "Severe Thunderstorm Watch",
  SVR: "Severe Thunderstorm Warning",
  SVS: "Severe Weather Statement",
  TOA: "Tornado Watch",
  TOE: "911 Telephone Outage Emergency",
  TOR: "Tornado Warning",
  TRA: "Tropical Storm Watch",
  TRW: "Tropical Storm Warning",
  TSA: "Tsunami Watch",
  TSW: "Tsunami Warning",
  VOW: "Volcano Warning",
  WSA: "Winter Storm Watch",
  WSW: "Winter Storm Warning",

  // Added by FCC order (Missing & Endangered Persons)
  MEP: "Missing and Endangered Persons",
}

const EAS_EVENT_NAME_SET = new Set(Object.values(EAS_EVENT_CODE_TO_NAME).map(norm))

// "Industry-ish" EAS palette (handled-alerts only)
const EAS_TONE = {
  warning: "text-[#FF0000]",       // Warning/Emergency
  flashFlood: "text-[#8B0000]",    // Flash Flood
  watch: "text-[#FFA500]",         // Watch
  info: "text-[#FFCC00]",          // Statement/Advisory/Message/Test/etc
  flood: "text-[#00FF00]",         // Flood
  default: "text-muted-foreground",
} as const

function canonEasEventName(event: string): string {
  const raw = (event || "").trim()
  const code = raw.toUpperCase()
  if (/^[A-Z0-9]{3}$/.test(code) && EAS_EVENT_CODE_TO_NAME[code]) return EAS_EVENT_CODE_TO_NAME[code]
  return raw
}

function isEasEvent(event: string): boolean {
  const raw = (event || "").trim()
  const code = raw.toUpperCase()
  if (/^[A-Z0-9]{3}$/.test(code) && EAS_EVENT_CODE_TO_NAME[code]) return true
  return EAS_EVENT_NAME_SET.has(norm(raw))
}

function easToneByName(name: string): string {
  const e = norm(name)

  // Non-alarming bucket first (so "Practice/Demo Warning" doesn't go blood-red)
  if (
    e.includes("test") ||
    e.includes("practice") ||
    e.includes("demo") ||
    e.includes("message") ||
    e.includes("notification") ||
    e.includes("statement") ||
    e.includes("advisory") ||
    e.includes("administrative")
  ) return EAS_TONE.info

  // Special-case: Flash Flood gets dark red no matter what flavor it is
  if (e.includes("flash flood")) return EAS_TONE.flashFlood

  // Flood (non-flash) is green, regardless of warning/watch/statement
  if (e.includes("flood")) return EAS_TONE.flood

  if (e.includes("warning") || e.includes("emergency") || e.includes("immediate") || e.includes("danger")) return EAS_TONE.warning
  if (e.includes("watch")) return EAS_TONE.watch

  return EAS_TONE.default
}

// Full mapping object (codes + full names) for convenience / future overrides
export const EAS_EVENT_TONE: Record<string, string> = (() => {
  const out: Record<string, string> = {}
  for (const [code, name] of Object.entries(EAS_EVENT_CODE_TO_NAME)) {
    const tone = easToneByName(name)
    out[norm(code)] = tone
    out[norm(name)] = tone
  }
  return out
})()

function toneFromEvent(event: string) {
  const key = norm(event)
  return NWS_EVENT_TONE[key] ?? null
}

function toneFallback(event: string, severity?: string | null) {
  const e = norm(event)
  const sev = norm(severity ?? "")

  // Product-type fallback (NWS convention)
  // Watch = Yellow, Advisory = Orange, Warning = Red :contentReference[oaicite:2]{index=2}
  if (e.includes("warning") || e.includes("emergency")) return "text-[#FF0000]"
  if (e.includes("watch")) return "text-[#FFFF00]"
  if (e.includes("advisory")) return "text-[#FFA500]"
  if (e.includes("statement") || e.includes("message") || e.includes("outlook")) return "text-[#C0C0C0]"

  // CAP severity fallback
  if (sev === "extreme" || sev === "severe") return "text-[#FF0000]"
  if (sev === "moderate") return "text-[#FFA500]"
  if (sev === "minor") return "text-[#FFFF00]"

  return "text-muted-foreground"
}

export function alertToneClass(event: string, severity?: string | null) {
  return toneFromEvent(event) ?? toneFallback(event, severity)
}

// Handled-alerts tone: if it's an EAS event (code or canonical name), use EAS palette.
// Otherwise fall back to normal NWS logic (just in case something non-EAS sneaks in).
export function alertToneClassEasHandled(event: string, severity?: string | null) {
  const canon = canonEasEventName(event)
  if (isEasEvent(event) || isEasEvent(canon)) {
    return EAS_EVENT_TONE[norm(event)] ?? EAS_EVENT_TONE[norm(canon)] ?? easToneByName(canon)
  }
  return alertToneClass(event, severity)
}

type IconName =
  | "Tornado"
  | "CloudLightning"
  | "Waves"
  | "Snowflake"
  | "Wind"
  | "Flame"
  | "ThermometerSun"
  | "ThermometerSnowflake"
  | "CloudFog"
  | "CloudHaze"
  | "ShieldAlert"
  | "Radiation"
  | "Biohazard"
  | "TriangleAlert"
  | "TestTube"
  | "Siren"
  | "UserSearch"
  | "Info"
  | "PhoneOff"

function pickIconName(event: string): IconName {
  const e = norm(event)

  // --- EAS / broadcast-y stuff (handled-alerts) ---
  if (
    e.includes("required weekly test") ||
    e.includes("required monthly test") ||
    e.includes("nationwide test") ||
    e.includes("practice/demo warning") ||
    e.includes("practice") ||
    e.includes("demo")
  ) return "TestTube"

  if (e.includes("child abduction") || e.includes("missing and endangered")) return "UserSearch"

  if (e.includes("blue alert") || e.includes("law enforcement warning")) return "Siren"

  if (e.includes("national emergency") || e.includes("emergency action")) return "Siren"

  if (e.includes("telephone outage")) return "PhoneOff"

  if (e.includes("administrative message") || e.includes("network message") || e.includes("civil emergency message")) return "Info"

  // Specific first
  if (e.includes("tornado")) return "Tornado"
  if (e.includes("severe thunderstorm") || e.includes("thunderstorm") || e.includes("lightning")) return "CloudLightning"

  // Water / marine / flooding
  if (
    e.includes("flood") ||
    e.includes("tsunami") ||
    e.includes("storm surge") ||
    e.includes("coastal") ||
    e.includes("lakeshore") ||
    e.includes("rip current") ||
    e.includes("high surf") ||
    e.includes("marine") ||
    e.includes("gale") ||
    e.includes("storm warning") ||
    e.includes("small craft")
  )
    return "Waves"

  // Winter / ice / cold
  if (
    e.includes("winter") ||
    e.includes("snow") ||
    e.includes("blizzard") ||
    e.includes("ice") ||
    e.includes("freezing") ||
    e.includes("frost") ||
    e.includes("wind chill")
  )
    return "Snowflake"

  // Wind
  if (e.includes("wind") || e.includes("gust")) return "Wind"

  // Fire
  if (e.includes("fire") || e.includes("red flag")) return "Flame"

  // Heat
  if (e.includes("heat")) return "ThermometerSun"

  // Extreme cold / freeze
  if (e.includes("freeze") || e.includes("cold")) return "ThermometerSnowflake"

  // Visibility / air
  if (e.includes("fog")) return "CloudFog"
  if (e.includes("smoke") || e.includes("haze") || e.includes("dust") || e.includes("air quality")) return "CloudHaze"

  // Hazmat / radiation / civil
  if (e.includes("hazardous materials")) return "Biohazard"
  if (e.includes("radiological") || e.includes("nuclear")) return "Radiation"
  if (e.includes("civil") || e.includes("law enforcement") || e.includes("shelter in place") || e.includes("evacuation"))
    return "ShieldAlert"

  return "TriangleAlert"
}


export function AlertEventIcon({ event, severity, className, mode = "nws" }: Props) {
  const tone = mode === "eas" ? alertToneClassEasHandled(event, severity) : alertToneClass(event, severity)
  const iconEvent = mode === "eas" ? canonEasEventName(event) : event
  const iconName = pickIconName(iconEvent)

  // Safe lookup: if an icon name ever doesn't exist in your lucide version,
  // this gracefully falls back to TriangleAlert.
  const Icon = ((Lucide as any)[iconName] ?? Lucide.TriangleAlert) as React.ComponentType<{
    className?: string
    "aria-hidden"?: boolean
  }>

  return <Icon className={cn("h-4 w-4 shrink-0", tone, className)} aria-hidden />
}
