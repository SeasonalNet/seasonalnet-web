import type { LucideIcon } from "lucide-react"

export type ModuleTone = "default" | "muted" | "success" | "warning" | "danger"

export type AdminStatusItem = {
  label: string
  value: string
  tone?: ModuleTone
}

export type AdminActionDialogType =
  | "heightened-mode"
  | "originate-test"
  | "originate-text"
  | "upload-audio"
  | "originate-audio"

export type AdminAction = {
  label: string
  summary: string
  icon: LucideIcon
  tone?: ModuleTone
  state?: "live" | "scaffolded"
  href?: string
  method?: "GET" | "POST" | "DELETE"
  confirm?: string
  dialogType?: AdminActionDialogType
}

export type AdminGroup = {
  key: "status" | "operations" | "administration"
  title: string
  summary: string
  statusItems?: AdminStatusItem[]
  actions?: AdminAction[]
}

export type AdminModule = {
  id: string
  title: string
  summary: string
  tags: string[]
  readiness: "live" | "scaffolded"
  groups: AdminGroup[]
}
