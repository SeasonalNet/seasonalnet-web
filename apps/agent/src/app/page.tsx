import { AgentConsole } from "@/components/agent/agent-console"
import { SiteFooter } from "@/components/site-footer"

export default function Page() {
  return (
    <>
      <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 px-3 py-3 sm:px-4 sm:py-4 lg:overflow-hidden lg:px-4">
        <AgentConsole />
      </main>
      <SiteFooter />
    </>
  )
}
