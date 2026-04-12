import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, Code, Bot, MessagesSquare } from "lucide-react"

function FeatureCard({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: any
  children: React.ReactNode
}) {
  return (
    <Card className="bg-card/60">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  )
}

export function JoinPBXCard() {
  return (
    <Card className="bg-card/60">
      {/* Header row: title left, button right */}
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
        <CardTitle className="text-base">Join the PBX</CardTitle>

        <Button asChild size="sm">
          <a href="https://discord.gg/UDfrTwYTy2" target="_blank" rel="noreferrer noopener">
            <MessagesSquare className="mr-2 h-4 w-4" />
            Join Discord
          </a>
        </Button>
      </CardHeader>

      {/* Body: instructions */}
      <CardContent className="space-y-3 text-sm">
        <div className="text-muted-foreground">
          Join the SeasonalNet Discord, then head to{" "}
          <span className="font-medium text-foreground">#join-the-pbx</span>. The bot provisions your extension and DMs
          your SIP details.
        </div>

        <ul className="list-disc pl-5 text-muted-foreground space-y-1">
          <li>
            Registrar: <span className="font-medium text-foreground">sip.seasonalnet.org</span>
          </li>
          <li>
            Transport: <span className="font-medium text-foreground">TCP</span>
          </li>
          <li>Keep your password secret (screenshots are forever).</li>
        </ul>
      </CardContent>
    </Card>
  )
}

export function PBXFeaturesGrid() {
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-muted-foreground">Features</div>

      <div className="grid gap-4 md:grid-cols-3">
        <FeatureCard title="Voice + DTMF captcha" icon={Shield}>
          Callers solve a short randomized digits challenge. Voice recognition (Vosk) with DTMF fallback keeps spam and
          bots busy elsewhere.
        </FeatureCard>

        <FeatureCard title="Discord onboarding" icon={Bot}>
          The bot handles extension creation + credential delivery with guardrails.
        </FeatureCard>

        <FeatureCard title="Open API" icon={Code}>
          Provisioning is done through FreePBX APIs with sanity checks, rate limits, and “don’t let chaos win” rules.
        </FeatureCard>
      </div>
    </div>
  )
}
