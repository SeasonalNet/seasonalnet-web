import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Bot, Code, KeyRound, Network, PhoneCall, RadioTower, Shield, Users, Voicemail } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@seasonalnet/shell/src/components/ui/card"
import { BlurFade } from "@/components/magic/blur-fade"
import { SectionHeader } from "@/components/pbx-section"
import { cn } from "@seasonalnet/shell/src/lib/utils"

type Feature = {
  title: string
  icon: LucideIcon
  body: ReactNode
}

const featureCards: Feature[] = [
  {
    title: "Voice + DTMF captcha",
    icon: Shield,
    body: "Randomized voice challenges with DTMF fallback keep spam and bot calls away from sensitive call paths.",
  },
  {
    title: "Discord onboarding",
    icon: Bot,
    body: "The bot creates extensions, binds ownership, and delivers initial SIP details without exposing FreePBX admin controls.",
  },
  {
    title: "AstroCom routing",
    icon: Network,
    body: (
      <>
        SeasonalPBX participates in AstroCom IAX2 routing, including <span className="font-medium text-foreground">404-0000</span> for SeasonalPBX and <span className="font-medium text-foreground">548-0000</span> for LiteNet.
      </>
    ),
  },
  {
    title: "Voicemail included",
    icon: Voicemail,
    body: "User extensions are provisioned with voicemail so missed calls have a normal place to land.",
  },
  {
    title: "Paging + conference",
    icon: Users,
    body: "Shared calling features are available today, including a one-page group and a public conference room.",
  },
  {
    title: "Credential lifecycle",
    icon: KeyRound,
    body: "Long SIP secrets are treated as provisioning credentials: reveal for setup, rotate when leaked, and redact elsewhere.",
  },
  {
    title: "FreePBX-backed calls",
    icon: PhoneCall,
    body: "Extension, trunk, voicemail, and routing behavior stays on the FreePBX/Asterisk side where calls are enforced.",
  },
  {
    title: "OpenAPI control plane",
    icon: Code,
    body: "pbx-controld adds API contracts, sanity checks, idempotency, audit trails, and downstream job guardrails.",
  },
  {
    title: "Lab interconnect ready",
    icon: RadioTower,
    body: "Built for hobbyist telecom experiments without pushing normal workflows into admin-only surfaces.",
  },
]

function FeatureCard({ title, icon: Icon, body, className }: Feature & { className?: string }) {
  return (
    <Card
      className={cn(
        "group h-full bg-card/60 transition-all duration-200 hover:-translate-y-1 hover:bg-card/80 hover:shadow-md",
        className
      )}
    >
      <CardHeader className="p-5 pb-2">
        <CardTitle className="flex items-center gap-3 text-base font-semibold tracking-tight">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border/80 bg-background/80 text-muted-foreground transition-colors group-hover:border-border group-hover:bg-background">
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 text-[15px] leading-7 text-muted-foreground">{body}</CardContent>
    </Card>
  )
}

export function PBXFeaturesGrid() {
  return (
    <section className="space-y-6">
      <BlurFade>
        <SectionHeader
          eyebrow="Features"
          title="What SeasonalPBX gives you"
          description="All the tools a hobbyist homelab-run PBX should have: managed extensions, voicemail, caller filtering, inter-PBX routing, and API-backed provisioning guardrails."
        />
      </BlurFade>

      <div className="grid gap-3 md:grid-cols-3 md:gap-4">
        {featureCards.map((feature, index) => (
          <BlurFade key={feature.title} delay={0.04 * index}>
            <FeatureCard {...feature} />
          </BlurFade>
        ))}
      </div>
    </section>
  )
}
