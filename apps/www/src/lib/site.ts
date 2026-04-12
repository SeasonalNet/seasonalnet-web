import type { LucideIcon } from "lucide-react"
import {
  Home,
  Phone,
  Radio,
  Activity,
  GitBranch,
  Wrench,
  ExternalLink,
} from "lucide-react"

export type Portal = {
  key: string
  title: string
  description: string
  href: string
  icon: LucideIcon
  external?: boolean
}

export const site = {
  name: "SeasonalNet",
  subtitle: "unified front doors",
  description: "Network stuff, weather stuff, telecom stuff. One umbrella.",
  footerNote: "Built to be fast, boring, and resilient.",
  primary: [
    { title: "Go to Radio", href: "https://radio.seasonalnet.org/", icon: Radio },
    { title: "System Status", href: "https://status.seasonalnet.org/", icon: Activity },
  ],
  portals: [
    {
      key: "home",
      title: "Home",
      description: "SeasonalNet homepage / directory view.",
      href: "https://www.seasonalnet.org/",
      icon: Home,
      external: true,
    },
    {
      key: "pbx",
      title: "PBX",
      description: "Landing + quick links.",
      href: "https://pbx.seasonalnet.org/",
      icon: Phone,
      external: true,
    },
    {
      key: "radio",
      title: "Radio",
      description: "Stream front page + players + mounts.",
      href: "https://radio.seasonalnet.org/",
      icon: Radio,
      external: true,
    },
    {
      key: "status",
      title: "Status",
      description: "Uptime Kuma dashboards and health checks.",
      href: "https://status.seasonalnet.org/",
      icon: Activity,
      external: true,
    },
    {
      key: "git",
      title: "Git",
      description: "Repos and the dev nerve center.",
      href: "https://git.seasonalnet.org/",
      icon: GitBranch,
      external: true,
    },
    {
      key: "provision",
      title: "Provision",
      description: "Phone assets & token provisioning portal.",
      href: "https://prov.seasonalnet.org/",
      icon: Wrench,
      external: true,
    },
  ] satisfies Portal[],
  iconExternal: ExternalLink,
} as const
