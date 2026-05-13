import type { LucideIcon } from "lucide-react"
import {
  Activity,
  BookText,
  GitBranch,
  Home,
  KeyRound,
  Phone,
  Radio,
  Shield,
} from "lucide-react"

export type Portal = {
  key: string
  title: string
  href: string
  icon: LucideIcon
}

export const site = {
  name: "SeasonalNet",
  subtitle: "admin front door",
  description: "Centralized control plane for SeasonalNet systems.",
  footerNote: "Built to be fast, boring, and resilient.",
  portals: [
    { key: "home", title: "Home", href: "https://www.seasonalnet.org", icon: Home },
    { key: "docs", title: "Docs", href: "https://docs.seasonalnet.org", icon: BookText },
    { key: "pbx", title: "PBX", href: "https://pbx.seasonalnet.org", icon: Phone },
    { key: "radio", title: "Radio", href: "https://radio.seasonalnet.org", icon: Radio },
    { key: "grafana", title: "Grafana", href: "https://grafana.seasonalnet.org", icon: Activity },
    { key: "git", title: "Git", href: "https://git.seasonalnet.org", icon: GitBranch },
    { key: "provision", title: "Provision", href: "https://prov.seasonalnet.org", icon: KeyRound },
    { key: "admin", title: "Admin", href: "https://admin.seasonalnet.org", icon: Shield },
  ] satisfies Portal[],
} as const
