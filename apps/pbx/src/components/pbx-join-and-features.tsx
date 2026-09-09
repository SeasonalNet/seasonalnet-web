import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Bot, Code, KeyRound, Network, PhoneCall, LayoutPanelLeft, Shield, Users, Voicemail } from "lucide-react"
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
    body: "Randomized voice challenges with a DTMF fallback help keep actual humans as your callers.",
  },
  {
    title: "Discord onboarding",
    icon: Bot,
    body: "A Discord bot that lets you join the server, get an extension, and get set up quickly with little fuss.",
  },
  {
    title: "AstroCom routing",
    icon: Network,
    body: (
      <>
        A PBX that participates in AstroCom&apos;s inter-PBX routing network. You can dial straight into AstroCom and other PBXs on the network from your extension.
      </>
    ),
  },
  {
    title: "Voicemail included",
    icon: Voicemail,
    body: "Extensions that are provisioned with private voicemail, so you can receive messages from others.",
  },
  {
    title: "Paging + conferences",
    icon: Users,
    body: "A page group that lets you communicate with others, and the ability to host conferences with multiple participants.",
  },
  {
    title: "Credential lifecycle",
    icon: KeyRound,
    body: "SIP credential handling that is easy to deal with. Reveal when needed, rotate when needed, and redacted in other places.",
  },
  {
    title: "FreePBX-backed calls",
    icon: PhoneCall,
    body: "FreePBX and Asterisk under the hood, a reliable software duo.",
  },
  {
    title: "OpenAPI control plane",
    icon: Code,
    body: "An open-source pbx-controld daemon on the backend that helps provision and manage your extension throughout its lifecycle.",
  },
  {
    title: "Self-service dashboard",
    icon: LayoutPanelLeft,
    body: "Web self-service. You can manage your extension from the web.",
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
          description="All the tools a hobbyist PBX should have: managed extensions, voicemail, caller filtering, inter-PBX routing, and automated provisioning."
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
