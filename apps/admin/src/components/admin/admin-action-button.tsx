"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
} from "@/components/ui/alert-dialog"

type AdminActionButtonProps = {
  href?: string
  method?: "GET" | "POST" | "DELETE"
  confirm?: string
  label: string
}

export function AdminActionButton({
  href,
  method = "POST",
  confirm,
  label,
}: AdminActionButtonProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [open, setOpen] = useState(false)

  async function runAction() {
    if (!href || pending) return

    setPending(true)
    const toastId = toast.loading(`${label} in progress...`)

    try {
      const res = await fetch(href, {
        method,
        cache: "no-store",
      })

      if (!res.ok) {
        let message = `Request failed: ${res.status}`

        try {
          const data = await res.json()
          if (data?.detail) message = data.detail
          else if (data?.error) message = data.error
          else if (data?.title) message = data.title
        } catch {
          // ignore parse failure
        }

        toast.error(message, { id: toastId })
        return
      }

      toast.success(`${label} completed.`, { id: toastId })
      router.refresh()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected request failure"
      toast.error(message, { id: toastId })
    } finally {
      setPending(false)
      setOpen(false)
    }
  }

  if (!confirm) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={runAction}
        disabled={!href || pending}
        className="shrink-0 rounded-full"
      >
        {pending ? "Working..." : label}
      </Button>
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!href || pending}
          className="shrink-0 rounded-full"
        >
          {pending ? "Working..." : label}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{label}</AlertDialogTitle>
          <AlertDialogDescription>{confirm}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={runAction}>
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
