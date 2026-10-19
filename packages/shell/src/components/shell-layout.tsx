import type { ReactNode } from "react"

type ShellLayoutProps = {
  header: ReactNode
  announcements: ReactNode
  footer: ReactNode
  children: ReactNode
}

export function ShellLayout({ header, announcements, footer, children }: ShellLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      {header}
      <div className="mx-auto w-full max-w-6xl px-4">{announcements}</div>
      <div className="flex-1">{children}</div>
      {footer}
    </div>
  )
}
