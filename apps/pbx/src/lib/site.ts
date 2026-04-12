import { Home, Phone, Radio, Activity, GitBranch, KeyRound } from "lucide-react"

export const site = {
  name: "SeasonalNet",
  subtitle: "pbx front door",
  description: "Telecom landing page + links for the SeasonalPBX ecosystem.",
  footerNote: "Built to be fast, boring, and resilient.",
  portals: [
    { key: "home", title: "Home", href: "https://www.seasonalnet.org", icon: Home },
    { key: "pbx", title: "PBX", href: "https://pbx.seasonalnet.org", icon: Phone },
    { key: "radio", title: "Radio", href: "https://radio.seasonalnet.org", icon: Radio },
    { key: "status", title: "Status", href: "https://status.seasonalnet.org", icon: Activity },
    { key: "git", title: "Git", href: "https://git.seasonalnet.org", icon: GitBranch },
    { key: "provision", title: "Provision", href: "https://prov.seasonalnet.org", icon: KeyRound },
  ],
}
