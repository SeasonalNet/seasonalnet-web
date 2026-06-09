"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@seasonalnet/shell/src/components/ui/alert-dialog"
import { Badge } from "@seasonalnet/shell/src/components/ui/badge"
import { Button } from "@seasonalnet/shell/src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@seasonalnet/shell/src/components/ui/card"
import { Input } from "@seasonalnet/shell/src/components/ui/input"
import { Label } from "@seasonalnet/shell/src/components/ui/label"
import { Separator } from "@seasonalnet/shell/src/components/ui/separator"
import {
  CheckCircle2,
  Clipboard,
  Eye,
  KeyRound,
  Loader2,
  PhoneCall,
  RotateCw,
  Server,
  ShieldAlert,
  Sparkles,
  UserRound,
  Voicemail,
} from "lucide-react"

import { cn } from "@seasonalnet/shell/src/lib/utils"

type ExtensionOwner = {
  id: number
  discordId: string
  extension: string
  state: string
  displayName: string | null
  voicemailEmailMarker: string | null
  createdAt: string
  updatedAt: string
}

type ExtensionCredentials = {
  sipSecret: string
  voicemailPin: string
}

type Operation = {
  id: string
  operation: string
  status: string
  extension: string | null
  discordId: string | null
  reason: string | null
  error: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

type PoolSummary = {
  total: number
  enabled: number
  available: number
  byState: Record<string, number>
}

type DashboardPayload = {
  user: {
    displayName: string
    email: string | null
    discordId: string
  }
  owner: ExtensionOwner | null
  poolSummary: PoolSummary | null
  operations: Operation[]
}

type MutationPayload = {
  owner: ExtensionOwner | null
  credentials?: ExtensionCredentials | null
}

type ProblemPayload = {
  title?: string
  detail?: string
  status?: number
  type?: string
}

function isProblemPayload(value: unknown): value is ProblemPayload {
  return Boolean(value && typeof value === "object" && ("title" in value || "detail" in value))
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  })
  const json = await readJson(response)

  if (!response.ok) {
    if (isProblemPayload(json)) throw new Error(json.detail || json.title || `Request failed with ${response.status}`)
    throw new Error(`Request failed with ${response.status}`)
  }

  return json as T
}

function statusClass(status: string) {
  switch (status) {
    case "succeeded":
    case "active":
      return "border-foreground/20 bg-foreground/5 text-foreground"
    case "failed":
    case "cancelled":
      return "border-destructive/30 bg-destructive/10 text-destructive"
    case "running":
    case "pending":
    case "releasing":
      return "border-muted-foreground/30 bg-muted/60 text-muted-foreground"
    default:
      return "border-border bg-muted/40 text-muted-foreground"
  }
}

function formatOperationName(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ")
}

function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-background/80 text-foreground transition-colors group-hover:bg-accent/60">
      {children}
    </div>
  )
}

function InfoTile({ label, value, icon: Icon }: { label: string; value: string; icon: typeof PhoneCall }) {
  return (
    <Card className="bg-card/60 transition-all hover:-translate-y-1 hover:bg-card/80 hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <IconBox>
            <Icon className="h-5 w-5" />
          </IconBox>
          <CardTitle className="text-base">{label}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="text-2xl font-semibold tracking-tight">{value}</CardContent>
    </Card>
  )
}

function SecretField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={value} className="font-mono text-xs" />
        <Button variant="secondary" onClick={copy} className="shrink-0">
          {copied ? <CheckCircle2 className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  )
}

function EmptyExtensionCard({ loading, onClaim, available }: { loading: boolean; onClaim: () => void; available?: number }) {
  return (
    <Card className="bg-card/60">
      <CardHeader>
        <div className="flex items-center gap-3">
          <IconBox>
            <Sparkles className="h-5 w-5" />
          </IconBox>
          <div>
            <CardTitle>Claim your SeasonalPBX extension</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              The dashboard will claim a managed extension from the public pool and provision it through pbx-controld.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border bg-background/60 p-4 text-sm text-muted-foreground">
          Available pool entries: <span className="font-medium text-foreground">{available ?? "—"}</span>
        </div>
        <Button onClick={onClaim} disabled={loading} size="lg" className="min-w-40">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />}
          Claim extension
        </Button>
      </CardContent>
    </Card>
  )
}

function CredentialPanel({
  credentials,
  loading,
  onReveal,
  onRotate,
}: {
  credentials: ExtensionCredentials | null
  loading: boolean
  onReveal: () => void
  onRotate: (resetVoicemailPin: boolean) => void
}) {
  const [resetVoicemailPin, setResetVoicemailPin] = useState(false)

  return (
    <Card className="bg-card/60">
      <CardHeader>
        <div className="flex items-center gap-3">
          <IconBox>
            <KeyRound className="h-5 w-5" />
          </IconBox>
          <div>
            <CardTitle>SIP credentials</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Reveal your current secret to provision a phone. Rotate only when the secret leaked or you intentionally want a new one.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {credentials ? (
          <div className="space-y-4 rounded-2xl border bg-background/60 p-4">
            <SecretField label="SIP secret" value={credentials.sipSecret} />
            <SecretField label="Voicemail PIN" value={credentials.voicemailPin} />
          </div>
        ) : (
          <div className="rounded-2xl border bg-background/60 p-4 text-sm text-muted-foreground">
            The secret is hidden from normal reads. Use reveal when configuring a trusted device.
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={onReveal} disabled={loading} variant="secondary" className="min-w-36">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            Reveal
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={loading} variant="outline" className="min-w-36">
                <RotateCw className="h-4 w-4" />
                Rotate
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Rotate SIP credentials?</AlertDialogTitle>
                <AlertDialogDescription>
                  Rotation generates a new SIP secret and queues a FreePBX update. Existing phones will need the new secret after the change is applied.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <label className="flex items-start gap-3 rounded-xl border bg-background/60 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={resetVoicemailPin}
                  onChange={(event) => setResetVoicemailPin(event.target.checked)}
                  className="mt-1"
                />
                <span>
                  Reset voicemail PIN to the extension number too.
                </span>
              </label>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onRotate(resetVoicemailPin)}>
                  Rotate credentials
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}

function OperationsCard({ operations }: { operations: Operation[] }) {
  return (
    <Card className="bg-card/60">
      <CardHeader>
        <div className="flex items-center gap-3">
          <IconBox>
            <Server className="h-5 w-5" />
          </IconBox>
          <div>
            <CardTitle>Recent activity</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Recent pbx-controld operations for your Discord identity.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {operations.length === 0 ? (
          <div className="rounded-2xl border bg-background/60 p-4 text-sm text-muted-foreground">No recent operations.</div>
        ) : (
          <div className="space-y-2">
            {operations.slice(0, 6).map((operation) => (
              <div key={operation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-background/60 px-4 py-3 text-sm">
                <div>
                  <div className="font-medium">{formatOperationName(operation.operation)}</div>
                  <div className="text-xs text-muted-foreground">{new Date(operation.createdAt).toLocaleString()}</div>
                </div>
                <Badge variant="outline" className={cn("capitalize", statusClass(operation.status))}>{operation.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function PBXDashboard() {
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [credentials, setCredentials] = useState<ExtensionCredentials | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const owner = data?.owner ?? null
  const available = data?.poolSummary?.available

  const stateLabel = useMemo(() => owner?.state ?? "unclaimed", [owner])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const payload = await requestJson<DashboardPayload>("/api/pbx/self", { cache: "no-store" })
      setData(payload)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function mutate<T>(fn: () => Promise<T>, after?: (payload: T) => void) {
    setLoading(true)
    setError(null)
    try {
      const payload = await fn()
      after?.(payload)
      await load()
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : String(mutationError))
    } finally {
      setLoading(false)
    }
  }

  async function claim() {
    await mutate(
      () => requestJson<MutationPayload>("/api/pbx/self/claim", { method: "POST", body: JSON.stringify({}) }),
      (payload) => setCredentials(payload.credentials ?? null),
    )
  }

  async function reveal() {
    await mutate(
      () => requestJson<MutationPayload>("/api/pbx/self/credentials/reveal", { method: "POST", body: JSON.stringify({}) }),
      (payload) => setCredentials(payload.credentials ?? null),
    )
  }

  async function rotate(resetVoicemailPin: boolean) {
    await mutate(
      () => requestJson<MutationPayload>("/api/pbx/self/credentials/rotate", {
        method: "POST",
        body: JSON.stringify({ resetVoicemailPin }),
      }),
      (payload) => setCredentials(payload.credentials ?? null),
    )
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card/60">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <IconBox>
                <UserRound className="h-5 w-5" />
              </IconBox>
              <div>
                <CardTitle>Dashboard status</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Signed in as {data?.user.displayName ?? "—"}. Discord ID: {data?.user.discordId ?? "—"}
                </p>
              </div>
            </div>
            <Badge variant="outline" className={cn("capitalize", statusClass(stateLabel))}>{stateLabel}</Badge>
          </div>
        </CardHeader>
        {error ? (
          <CardContent>
            <div className="flex items-start gap-3 rounded-2xl border bg-background/60 p-4 text-sm text-muted-foreground">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </CardContent>
        ) : null}
      </Card>

      {owner ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <InfoTile label="Extension" value={owner.extension} icon={PhoneCall} />
            <InfoTile label="State" value={owner.state} icon={CheckCircle2} />
            <InfoTile label="Registrar" value="sip.seasonalnet.org" icon={Server} />
            <InfoTile label="Voicemail" value={owner.voicemailEmailMarker ? "Enabled" : "Provisioned"} icon={Voicemail} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <CredentialPanel credentials={credentials} loading={loading} onReveal={reveal} onRotate={rotate} />
            <OperationsCard operations={data?.operations ?? []} />
          </div>
        </>
      ) : (
        <EmptyExtensionCard loading={loading} onClaim={claim} available={available} />
      )}

      <Separator />

      <div className="grid gap-4 text-sm text-muted-foreground md:grid-cols-3">
        <div className="rounded-2xl border bg-card/40 p-4">
          <div className="font-medium text-foreground">Transport</div>
          <div className="mt-1">Use TCP unless your client requires otherwise.</div>
        </div>
        <div className="rounded-2xl border bg-card/40 p-4">
          <div className="font-medium text-foreground">Credential model</div>
          <div className="mt-1">Reveal for provisioning. Rotate only after a leak or intentional refresh.</div>
        </div>
        <div className="rounded-2xl border bg-card/40 p-4">
          <div className="font-medium text-foreground">Downstream writes</div>
          <div className="mt-1">Changes queue through pbx-controld and apply to FreePBX safely.</div>
        </div>
      </div>
    </div>
  )
}
