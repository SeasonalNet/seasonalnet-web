import type { LucideIcon } from "lucide-react"
import {
  Home,
  BookText,
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
}

const homePortal = {
  key: "home",
  title: "Home",
  description: "SeasonalNet homepage.",
  href: "https://www.seasonalnet.org/",
  icon: Home,
} satisfies Portal

const docsPortal = {
  key: "docs",
  title: "Docs",
  description: "Our public knowledge base.",
  href: "https://docs.seasonalnet.org/",
  icon: BookText,
} satisfies Portal

const pbxPortal = {
  key: "pbx",
  title: "PBX",
  description: "Our hobbyist telephony platform.",
  href: "https://pbx.seasonalnet.org/",
  icon: Phone,
} satisfies Portal

const radioPortal = {
  key: "radio",
  title: "Radio",
  description: "Our IP radio platform.",
  href: "https://radio.seasonalnet.org/",
  icon: Radio,
} satisfies Portal

const grafanaPortal = {
  key: "grafana",
  title: "Grafana",
  description: "SeasonalNet monitoring dashboards.",
  href: "https://grafana.seasonalnet.org/",
  icon: Activity,
} satisfies Portal

const gitPortal = {
  key: "git",
  title: "Git",
  description: "Our public Git server.",
  href: "https://git.seasonalnet.org/",
  icon: GitBranch,
} satisfies Portal

const provisionPortal = {
  key: "provision",
  title: "Provision",
  description: "Our telephony provisioning service.",
  href: "https://prov.seasonalnet.org/",
  icon: Wrench,
} satisfies Portal

export const site = {
  name: "SeasonalNet",
  subtitle: "unified front doors",
  description: "A personal platform for everything Seasonal.",
  about:
    "SeasonalNet is a personal, self-hosted homelab platform. It hosts and implements networking, hobbyist telephony, IP radio, and other services for enthusiast purposes.",
  footerNote: "Built to be fast, boring, and resilient.",
  navigation: [
    homePortal,
    docsPortal,
    pbxPortal,
    radioPortal,
    grafanaPortal,
    gitPortal,
    provisionPortal,
  ] satisfies Portal[],
  portals: [docsPortal, pbxPortal, radioPortal, gitPortal, provisionPortal] satisfies Portal[],
  iconExternal: ExternalLink,
} as const
