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
import {
  CheckCircle2,
  Clipboard,
  Eye,
  IdCard,
  KeyRound,
  Loader2,
  PhoneCall,
  RefreshCw,
  RotateCw,
  Save,
  Server,
  ShieldAlert,
  Sparkles,
  UserRound,
  Voicemail,
  type LucideIcon,
} from "lucide-react"

import { classifyExtension, formatExtensionClassification, type ClassifiedExtension } from "@/lib/pbx-classification"
import { cn } from "@seasonalnet/shell/src/lib/utils"

type ExtensionOwner = {
  id: number
  discordId: string
  extension: string
  state: string
  displayName: string | null
  voicemailEmailMarker: string | null
  classification?: ClassifiedExtension
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

async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json")

  const response = await fetch(url, {
    ...init,
    headers,
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

function formatDateTime(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString()
}

function ownerClassification(owner: ExtensionOwner): ClassifiedExtension {
  return owner.classification ?? classifyExtension(owner.extension)
}

function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-background/80 text-foreground transition-colors group-hover:bg-accent/60">
      {children}
    </div>
  )
}

function ControlSection({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
  contentClassName,
}: {
  title: string
  description?: React.ReactNode
  icon: LucideIcon
  action?: React.ReactNode
  children?: React.ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <Card className={cn("bg-card/60", className)}>
      <CardHeader className={cn(children ? "pb-4" : "pb-0")}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <IconBox>
              <Icon className="h-5 w-5" />
            </IconBox>
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
              {description ? <div className="mt-1 text-sm leading-5 text-muted-foreground">{description}</div> : null}
            </div>
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </div>
      </CardHeader>
      {children ? <CardContent className={cn("pt-0", contentClassName)}>{children}</CardContent> : null}
    </Card>
  )
}

function SummaryItem({ label, value, icon: Icon, detail }: { label: string; value: string; icon: LucideIcon; detail?: string }) {
  return (
    <div className="group flex min-w-0 items-start gap-3 rounded-2xl border bg-background/60 p-4 transition-all hover:-translate-y-0.5 hover:bg-card/80 hover:shadow-sm">
      <IconBox>
        <Icon className="h-5 w-5" />
      </IconBox>
      <div className="min-w-0">
        <div className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
        <div className="mt-1 truncate text-xl font-semibold tracking-tight text-foreground">{value}</div>
        {detail ? <div className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</div> : null}
      </div>
    </div>
  )
}

function TipItem({ title, description }: { title: string; description: React.ReactNode }) {
  return (
    <div className="group rounded-2xl border bg-background/60 p-4 text-sm transition-all hover:-translate-y-0.5 hover:bg-card/80 hover:shadow-sm">
      <div className="font-medium text-foreground">{title}</div>
      <div className="mt-1 leading-6 text-muted-foreground">{description}</div>
    </div>
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
    <ControlSection
      title="Claim your SeasonalPBX extension"
      description="The dashboard will claim a managed extension from the public pool and provision it through pbx-controld."
      icon={Sparkles}
      contentClassName="space-y-4"
    >
      <div className="rounded-2xl border bg-background/60 p-4 text-sm text-muted-foreground">
        Available pool entries: <span className="font-medium text-foreground">{available ?? "—"}</span>
      </div>
      <Button onClick={onClaim} disabled={loading || available === 0} size="lg" className="min-w-40">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />}
        Claim extension
      </Button>
    </ControlSection>
  )
}

function ExtensionSummary({ owner }: { owner: ExtensionOwner }) {
  const classification = ownerClassification(owner)
  const classificationLabel = formatExtensionClassification(classification.classification)

  return (
    <ControlSection
      title="Summary"
      description={classification.reason}
      icon={PhoneCall}
      action={<Badge variant="outline" className="whitespace-nowrap">{classificationLabel}</Badge>}
      contentClassName="pb-5"
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryItem label="Extension" value={owner.extension} icon={PhoneCall} />
        <SummaryItem label="State" value={owner.state} icon={CheckCircle2} />
        <SummaryItem label="Registrar" value="sip.seasonalnet.org" icon={Server} />
        <SummaryItem label="Voicemail" value={owner.voicemailEmailMarker ? "Enabled" : "Provisioned"} icon={Voicemail} />
      </div>
    </ControlSection>
  )
}

function ProfileSection({
  owner,
  fallbackDisplayName,
  loading,
  onSave,
}: {
  owner: ExtensionOwner
  fallbackDisplayName: string
  loading: boolean
  onSave: (displayName: string) => void
}) {
  const [displayName, setDisplayName] = useState(owner.displayName ?? fallbackDisplayName)
  const trimmedDisplayName = displayName.trim()
  const currentDisplayName = owner.displayName ?? ""
  const unchanged = trimmedDisplayName === currentDisplayName

  return (
    <ControlSection
      title="Profile"
      description="Update the display name attached to this extension owner record."
      icon={IdCard}
      contentClassName="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="pbx-display-name">Display name</Label>
        <Input
          id="pbx-display-name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          maxLength={80}
          placeholder="Optional display name"
        />
        <p className="text-xs text-muted-foreground">
          Current stored value: <span className="font-medium text-foreground">{owner.displayName || "none"}</span>
        </p>
      </div>
      <Button onClick={() => onSave(trimmedDisplayName)} disabled={loading || unchanged} className="min-w-36">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save profile
      </Button>
    </ControlSection>
  )
}

function CredentialPanel({
  owner,
  credentials,
  loading,
  onReveal,
  onRotate,
}: {
  owner: ExtensionOwner
  credentials: ExtensionCredentials | null
  loading: boolean
  onReveal: () => void
  onRotate: (resetVoicemailPin: boolean) => void
}) {
  const [resetVoicemailPin, setResetVoicemailPin] = useState(false)
  const classification = ownerClassification(owner)
  const stateAllowsCredentials = owner.state === "active" || owner.state === "suspended"
  const credentialsAvailable = classification.managedByControlPlane && stateAllowsCredentials

  const disabledReason = !classification.managedByControlPlane
    ? `Extension ${owner.extension} is ${formatExtensionClassification(classification.classification).toLowerCase()}: ${classification.reason}. Self-service credential reveal and rotation are limited to managed-pool extensions.`
    : `Credentials are unavailable while extension ${owner.extension} is ${owner.state}.`

  return (
    <ControlSection
      title="SIP credentials"
      description={
        credentialsAvailable
          ? "Reveal your current secret to provision a phone. Rotate only when the secret leaked or you intentionally want a new one."
          : "Credential tools are shown only when this extension class and state support self-service custody."
      }
      icon={KeyRound}
      contentClassName="space-y-4"
    >
      {credentialsAvailable && credentials ? (
        <div className="space-y-4 rounded-2xl border bg-background/60 p-4">
          <SecretField label="SIP secret" value={credentials.sipSecret} />
          <SecretField label="Voicemail PIN" value={credentials.voicemailPin} />
        </div>
      ) : (
        <div className="rounded-2xl border bg-background/60 p-4 text-sm leading-6 text-muted-foreground">
          {credentialsAvailable
            ? "The secret is hidden from normal reads. Use reveal when configuring a trusted device."
            : disabledReason}
        </div>
      )}

      {credentialsAvailable ? (
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
                <span>Reset voicemail PIN to the extension number too.</span>
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
      ) : null}
    </ControlSection>
  )
}

function OperationsCard({ operations }: { operations: Operation[] }) {
  return (
    <ControlSection
      title="Recent activity"
      description="Recent pbx-controld operations for your Discord identity."
      icon={Server}
    >
      {operations.length === 0 ? (
        <div className="rounded-2xl border bg-background/60 p-4 text-sm text-muted-foreground">No recent operations.</div>
      ) : (
        <div className="space-y-2">
          {operations.slice(0, 6).map((operation) => (
            <div key={operation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-background/60 px-4 py-3 text-sm">
              <div className="min-w-0">
                <div className="font-medium">{formatOperationName(operation.operation)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDateTime(operation.createdAt)}{operation.extension ? ` · ${operation.extension}` : ""}
                </div>
                {operation.error ? <div className="mt-1 max-w-xl text-xs text-destructive">{operation.error}</div> : null}
              </div>
              <Badge variant="outline" className={cn("capitalize", statusClass(operation.status))}>{operation.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </ControlSection>
  )
}

function TipsSection({ credentialLifecycleEnabled }: { credentialLifecycleEnabled: boolean }) {
  return (
    <ControlSection
      title="Tips"
      description="Practical notes for provisioning and account changes."
      icon={ShieldAlert}
      contentClassName="pb-5"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <TipItem title="Transport" description="Use TCP unless your client requires otherwise." />
        <TipItem
          title="Credential model"
          description={
            credentialLifecycleEnabled
              ? "Reveal for provisioning. Rotate only after a leak or intentional refresh."
              : "Credential lifecycle actions are hidden for reserved and non-managed extension classes."
          }
        />
        <TipItem title="Downstream writes" description="Supported changes queue through pbx-controld and apply to FreePBX safely." />
      </div>
    </ControlSection>
  )
}

export function PBXDashboard() {
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [credentials, setCredentials] = useState<ExtensionCredentials | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null)

  const owner = data?.owner ?? null
  const available = data?.poolSummary?.available
  const classification = owner ? ownerClassification(owner) : null
  const credentialLifecycleEnabled = Boolean(classification?.managedByControlPlane && (owner?.state === "active" || owner?.state === "suspended"))

  const stateLabel = useMemo(() => owner?.state ?? "unclaimed", [owner])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const payload = await requestJson<DashboardPayload>("/api/pbx/self", { cache: "no-store" })
      setData(payload)
      setLastLoadedAt(new Date().toISOString())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initialId = window.setTimeout(() => void load(), 0)

    return () => {
      window.clearTimeout(initialId)
    }
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

  async function updateProfile(displayName: string) {
    await mutate(() => requestJson<MutationPayload>("/api/pbx/self/profile", {
      method: "PATCH",
      body: JSON.stringify({ displayName }),
    }))
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
    <div className="mx-auto w-full max-w-6xl space-y-4 md:space-y-5">
      <ControlSection
        title="Dashboard status"
        description={
          <>
            Signed in as {data?.user.displayName ?? "—"}. Discord ID: {data?.user.discordId ?? "—"}
            <span className="mt-1 block text-xs">Last refreshed: {formatDateTime(lastLoadedAt)}</span>
          </>
        }
        icon={UserRound}
        action={
          <>
            <Badge variant="outline" className={cn("capitalize", statusClass(stateLabel))}>{stateLabel}</Badge>
            <Button
              onClick={load}
              disabled={loading}
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full border bg-background/60"
              aria-label="Refresh dashboard"
              title="Refresh dashboard"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </>
        }
      >
        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border bg-background/60 p-4 text-sm text-muted-foreground">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
      </ControlSection>

      {owner ? (
        <>
          <ExtensionSummary owner={owner} />

          <ProfileSection
            key={`${owner.id}:${owner.displayName ?? ""}:${data?.user.displayName ?? ""}`}
            owner={owner}
            fallbackDisplayName={data?.user.displayName ?? ""}
            loading={loading}
            onSave={updateProfile}
          />
          <CredentialPanel owner={owner} credentials={credentials} loading={loading} onReveal={reveal} onRotate={rotate} />

          <OperationsCard operations={data?.operations ?? []} />
          <TipsSection credentialLifecycleEnabled={credentialLifecycleEnabled} />
        </>
      ) : (
        <>
          <EmptyExtensionCard loading={loading} onClaim={claim} available={available} />
          <OperationsCard operations={data?.operations ?? []} />
        </>
      )}
    </div>
  )
}
