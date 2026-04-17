import { AgentConsole } from "@/components/agent/agent-console"
import { SiteFooter } from "@/components/site-footer"

export default function Page() {
  return (
    <>
      <main className="flex min-h-0 flex-1 overflow-hidden">
        <AgentConsole />
      </main>
      <SiteFooter />
    </>
  )
}
