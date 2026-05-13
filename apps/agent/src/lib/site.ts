import type { LucideIcon } from "lucide-react"
import {
  Activity,
  BookText,
  GitBranch,
  Home,
  KeyRound,
  Phone,
  Radio,
} from "lucide-react"

export type Portal = {
  key: string
  title: string
  href: string
  icon: LucideIcon
}

export const site = {
  name: "SeasonalNet",
  subtitle: "agent front door",
  description: "Seasonal Agent operator chat over the local runtime API.",
  footerNote: "Built to be fast, boring, and resilient.",
  portals: [
    { key: "home", title: "Home", href: "https://www.seasonalnet.org", icon: Home },
    { key: "docs", title: "Docs", href: "https://docs.seasonalnet.org", icon: BookText },
    { key: "pbx", title: "PBX", href: "https://pbx.seasonalnet.org", icon: Phone },
    { key: "radio", title: "Radio", href: "https://radio.seasonalnet.org", icon: Radio },
    { key: "grafana", title: "Grafana", href: "https://grafana.seasonalnet.org", icon: Activity },
    { key: "git", title: "Git", href: "https://git.seasonalnet.org", icon: GitBranch },
    { key: "provision", title: "Provision", href: "https://prov.seasonalnet.org", icon: KeyRound },
  ] satisfies Portal[],
} as const
