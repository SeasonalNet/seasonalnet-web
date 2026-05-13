"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { AdminActionButton } from "@/components/admin/admin-action-button"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import type { AdminActionDialogType } from "@/lib/admin/types"

const LAST_UPLOADED_AUDIO_ASSET_KEY = "seasonalweather:lastUploadedAudioAssetId"

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm " +
  "ring-offset-background focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-ring focus-visible:ring-offset-2"

type AdminActionControlProps = {
  href?: string
  method?: "GET" | "POST" | "DELETE"
  confirm?: string
  dialogType?: AdminActionDialogType
  label: string
  summary: string
}

type VoiceMode = "voice_only" | "full_eas"
type InterruptPolicy = "interrupt_then_refill" | "queue_after_current_alert"

type OriginationFormState = {
  eventCode: "ADR" | "DMO" | "RWT" | "RMT" | "SPS"
  headline: string
  voiceMode: VoiceMode
  sameCodesText: string
  sender: string
  expiresInMinutes: number
  interruptPolicy: InterruptPolicy
  heightened: boolean | null
  text: string
  audioAssetId: string
}

function defaultOriginationForm(): OriginationFormState {
  return {
    eventCode: "SPS",
    headline: "",
    voiceMode: "voice_only",
    sameCodesText: "",
    sender: "",
    expiresInMinutes: 30,
    interruptPolicy: "interrupt_then_refill",
    heightened: null,
    text: "",
    audioAssetId: "",
  }
}

function parseSameCodes(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\s,]+/)
        .map((part) => part.trim())
        .filter(Boolean)
    )
  )
}

async function getErrorMessage(res: Response) {
  try {
    const data = await res.json()
    if (typeof data?.error === "string") return data.error
    if (typeof data?.error?.message === "string") return data.error.message
    return JSON.stringify(data?.error ?? data)
  } catch {
    return `Request failed: ${res.status}`
  }
}

const TriggerButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button> & { label?: string }
>(function TriggerButton({ className, children, label = "Run", ...props }, ref) {
  return (
    <Button
      ref={ref}
      type="button"
      variant="outline"
      size="sm"
      className={`shrink-0 rounded-full ${className ?? ""}`}
      {...props}
    >
      {children ?? label}
    </Button>
  )
})

async function postJsonAction(args: {
  href: string
  method?: "POST" | "DELETE"
  payload: unknown
  loadingMessage: string
  successMessage: string
}) {
  const toastId = toast.loading(args.loadingMessage)

  try {
    const res = await fetch(args.href, {
      method: args.method || "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args.payload),
      cache: "no-store",
    })

    if (!res.ok) {
      toast.error(await getErrorMessage(res), { id: toastId })
      return false
    }

    toast.success(args.successMessage, { id: toastId })
    return true
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected request failure"
    toast.error(message, { id: toastId })
    return false
  }
}

function HeightenedModeDialog({ action }: { action: AdminActionControlProps }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [minutes, setMinutes] = useState(15)
  const [reason, setReason] = useState("Admin UI heightened mode")

  async function onSubmit() {
    if (!action.href || pending) return

    setPending(true)
    const ok = await postJsonAction({
      href: action.href,
      method: "POST",
      payload: { minutes, reason },
      loadingMessage: "Enabling heightened mode...",
      successMessage: `Heightened mode enabled for ${minutes} minutes.`,
    })
    setPending(false)

    if (ok) {
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <TriggerButton />
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{action.label}</DialogTitle>
          <DialogDescription>{action.summary}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="heightened-minutes">Duration in minutes</Label>
            <Input
              id="heightened-minutes"
              type="number"
              min={1}
              max={240}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value || 15))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="heightened-reason">Reason</Label>
            <Input
              id="heightened-reason"
              value={reason}
              maxLength={160}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={pending}>
            {pending ? "Working..." : "Enable"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function OriginateTestDialog({ action }: { action: AdminActionControlProps }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [eventCode, setEventCode] = useState<"RWT" | "RMT">("RWT")

  async function onSubmit() {
    if (!action.href || pending) return

    setPending(true)
    const ok = await postJsonAction({
      href: action.href,
      method: "POST",
      payload: { event_code: eventCode },
      loadingMessage: "Originating test...",
      successMessage: `${eventCode} accepted.`,
    })
    setPending(false)

    if (ok) {
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <TriggerButton />
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{action.label}</DialogTitle>
          <DialogDescription>{action.summary}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="originate-test-event">Test type</Label>
          <select
            id="originate-test-event"
            className={selectClassName}
            value={eventCode}
            onChange={(e) => setEventCode(e.target.value as "RWT" | "RMT")}
          >
            <option value="RWT">RWT</option>
            <option value="RMT">RMT</option>
          </select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={pending}>
            {pending ? "Working..." : "Originate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function OriginationFields({
  form,
  setForm,
  includeText,
  includeAudioAssetId,
}: {
  form: OriginationFormState
  setForm: React.Dispatch<React.SetStateAction<OriginationFormState>>
  includeText?: boolean
  includeAudioAssetId?: boolean
}) {
  function setField<K extends keyof OriginationFormState>(
    key: K,
    value: OriginationFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="event-code">Event code</Label>
          <select
            id="event-code"
            className={selectClassName}
            value={form.eventCode}
            onChange={(e) =>
              setField("eventCode", e.target.value as OriginationFormState["eventCode"])
            }
          >
            <option value="ADR">ADR</option>
            <option value="DMO">DMO</option>
            <option value="RWT">RWT</option>
            <option value="RMT">RMT</option>
            <option value="SPS">SPS</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="voice-mode">Voice mode</Label>
          <select
            id="voice-mode"
            className={selectClassName}
            value={form.voiceMode}
            onChange={(e) => setField("voiceMode", e.target.value as VoiceMode)}
          >
            <option value="voice_only">Voice only</option>
            <option value="full_eas">Full EAS</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="headline">Headline</Label>
        <Input
          id="headline"
          value={form.headline}
          maxLength={160}
          onChange={(e) => setField("headline", e.target.value)}
        />
      </div>

      {includeText ? (
        <div className="space-y-2">
          <Label htmlFor="manual-text">Text</Label>
          <Textarea
            id="manual-text"
            value={form.text}
            rows={7}
            maxLength={4000}
            onChange={(e) => setField("text", e.target.value)}
          />
        </div>
      ) : null}

      {includeAudioAssetId ? (
        <div className="space-y-2">
          <Label htmlFor="audio-asset-id">Audio asset ID</Label>
          <Input
            id="audio-asset-id"
            value={form.audioAssetId}
            onChange={(e) => setField("audioAssetId", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Tip: Upload audio first and this field will prefill from the last staged asset.
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="same-codes">SAME codes</Label>
        <Textarea
          id="same-codes"
          value={form.sameCodesText}
          rows={3}
          placeholder="006001, 024031, 051013"
          onChange={(e) => setField("sameCodesText", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Use comma or newline separated 6-digit SAME/FIPS codes. Required only for full EAS.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="sender">Sender</Label>
          <Input
            id="sender"
            value={form.sender}
            maxLength={16}
            onChange={(e) => setField("sender", e.target.value.toUpperCase())}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expires">Expires in minutes</Label>
          <Input
            id="expires"
            type="number"
            min={1}
            max={360}
            value={form.expiresInMinutes}
            onChange={(e) => setField("expiresInMinutes", Number(e.target.value || 30))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="interrupt-policy">Interrupt policy</Label>
          <select
            id="interrupt-policy"
            className={selectClassName}
            value={form.interruptPolicy}
            onChange={(e) =>
              setField("interruptPolicy", e.target.value as InterruptPolicy)
            }
          >
            <option value="interrupt_then_refill">Interrupt + refill</option>
            <option value="queue_after_current_alert">Queue after alert</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="heightened-override">Heightened mode</Label>
          <select
            id="heightened-override"
            className={selectClassName}
            value={form.heightened === null ? "default" : String(form.heightened)}
            onChange={(e) => {
              const v = e.target.value
              setField("heightened", v === "default" ? null : v === "true")
            }}
          >
            <option value="default">Default (config)</option>
            <option value="true">Force on</option>
            <option value="false">Force off</option>
          </select>
        </div>
      </div>
    </div>
  )
}

function validateOriginationForm(form: OriginationFormState) {
  const sameCodes = parseSameCodes(form.sameCodesText)

  if (form.voiceMode === "full_eas" && sameCodes.length === 0) {
    toast.error("Full EAS origination requires at least one SAME code.")
    return null
  }

  if (form.voiceMode === "voice_only" && sameCodes.length > 0) {
    toast.error("SAME codes are only valid for full EAS origination.")
    return null
  }

  return {
    event_code: form.eventCode,
    headline: form.headline,
    voice_mode: form.voiceMode,
    same_codes: sameCodes,
    sender: form.sender.trim() || undefined,
    expires_in_minutes: form.expiresInMinutes,
    interrupt_policy: form.interruptPolicy,
    ...(form.heightened !== null ? { heightened: form.heightened } : {}),
  }
}

function OriginateTextDialog({ action }: { action: AdminActionControlProps }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [form, setForm] = useState<OriginationFormState>(defaultOriginationForm())

  async function onSubmit() {
    if (!action.href || pending) return

    const base = validateOriginationForm(form)
    if (!base) return

    setPending(true)
    const ok = await postJsonAction({
      href: action.href,
      method: "POST",
      payload: {
        ...base,
        text: form.text,
      },
      loadingMessage: "Submitting text origination...",
      successMessage: "Text origination accepted.",
    })
    setPending(false)

    if (ok) {
      setOpen(false)
      setForm(defaultOriginationForm())
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <TriggerButton />
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{action.label}</DialogTitle>
          <DialogDescription>{action.summary}</DialogDescription>
        </DialogHeader>

        <OriginationFields form={form} setForm={setForm} includeText />

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={pending}>
            {pending ? "Working..." : "Originate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function UploadAudioDialog({ action }: { action: AdminActionControlProps }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [progress, setProgress] = useState(0)
  const [file, setFile] = useState<File | null>(null)

  async function onSubmit() {
    if (!action.href || !file || pending) return

    if (!/\.wav$/i.test(file.name)) {
      toast.error("Only .wav uploads are supported.")
      return
    }

    const href = action.href
    const method = action.method || "POST"

    setPending(true)
    setProgress(0)

    const toastId = toast.loading("Uploading WAV...")

    try {
      const normalizedFile = new File(
        [file],
        file.name,
        {
          type: "audio/wav",
          lastModified: file.lastModified,
        }
      )

      const formData = new FormData()
      formData.append("file", normalizedFile, normalizedFile.name)

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.open(method, href)

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100))
          }
        }

        xhr.onerror = () => reject(new Error("Upload failed."))
        xhr.onabort = () => reject(new Error("Upload aborted."))

        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText || "{}")

            if (xhr.status >= 200 && xhr.status < 300) {
              if (data?.asset_id && typeof window !== "undefined") {
                window.localStorage.setItem(
                  LAST_UPLOADED_AUDIO_ASSET_KEY,
                  data.asset_id
                )
              }

              toast.success("Audio staged.", {
                id: toastId,
                description: data?.asset_id
                  ? `Asset ID: ${data.asset_id}`
                  : "Upload accepted.",
              })
              resolve()
              return
            }

            const message =
              typeof data?.error === "string"
                ? data.error
                : data?.error?.message || `Upload failed: ${xhr.status}`
            reject(new Error(message))
          } catch {
            reject(new Error(`Upload failed: ${xhr.status}`))
          }
        }

        xhr.send(formData)
      })

      setOpen(false)
      setFile(null)
      setProgress(0)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected upload failure"
      toast.error(message, { id: toastId })
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <TriggerButton />
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{action.label}</DialogTitle>
          <DialogDescription>{action.summary}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wav-file">WAV file</Label>
            <Input
              id="wav-file"
              type="file"
              accept=".wav,audio/wav"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Upload progress</div>
            <Progress value={progress} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!file || pending}>
            {pending ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function OriginateAudioDialog({ action }: { action: AdminActionControlProps }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [form, setForm] = useState<OriginationFormState>(defaultOriginationForm())

  function onOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)

    if (!nextOpen || typeof window === "undefined") return

    const assetId = window.localStorage.getItem(LAST_UPLOADED_AUDIO_ASSET_KEY)
    if (assetId) {
      setForm((prev) => ({ ...prev, audioAssetId: prev.audioAssetId || assetId }))
    }
  }

  async function onSubmit() {
    if (!action.href || pending) return

    const base = validateOriginationForm(form)
    if (!base) return

    setPending(true)
    const ok = await postJsonAction({
      href: action.href,
      method: "POST",
      payload: {
        ...base,
        audio_asset_id: form.audioAssetId,
      },
      loadingMessage: "Submitting audio origination...",
      successMessage: "Audio origination accepted.",
    })
    setPending(false)

    if (ok) {
      setOpen(false)
      setForm(defaultOriginationForm())
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <TriggerButton />
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{action.label}</DialogTitle>
          <DialogDescription>{action.summary}</DialogDescription>
        </DialogHeader>

        <OriginationFields form={form} setForm={setForm} includeAudioAssetId />

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={pending}>
            {pending ? "Working..." : "Originate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AdminActionControl(action: AdminActionControlProps) {
  switch (action.dialogType) {
    case "heightened-mode":
      return <HeightenedModeDialog action={action} />
    case "originate-test":
      return <OriginateTestDialog action={action} />
    case "originate-text":
      return <OriginateTextDialog action={action} />
    case "upload-audio":
      return <UploadAudioDialog action={action} />
    case "originate-audio":
      return <OriginateAudioDialog action={action} />
    default:
      return (
        <AdminActionButton
          href={action.href}
          method={action.method}
          confirm={action.confirm}
          label="Run"
        />
      )
  }
}
