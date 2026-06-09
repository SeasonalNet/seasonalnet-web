import { auth, isAuthorizedSession, sessionDisplayName, signIn } from "@/auth"
import { redirect } from "next/navigation"
import { Badge } from "@seasonalnet/shell/src/components/ui/badge"
import { Button } from "@seasonalnet/shell/src/components/ui/button"
import { SiteFooter } from "@/components/site-footer"
import { MessagesSquare } from "lucide-react"

export const dynamic = "force-dynamic"

type Props = {
  searchParams?: Promise<{ next?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {}
  const next = params.next && params.next.startsWith("/") ? params.next : "/dashboard"
  const error = params.error
  const session = await auth()

  if (isAuthorizedSession(session)) {
    redirect(next)
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-10">
      <section className="space-y-6 pt-10">
        <div className="rounded-3xl border bg-card/50 p-6 text-center md:p-10">
          <div className="flex justify-center gap-2">
            <Badge variant="secondary">auth</Badge>
            <Badge variant="secondary">pbx</Badge>
            <Badge variant="secondary">self-service</Badge>
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            SeasonalPBX Dashboard
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Sign in through SeasonalNet Auth to manage your extension.
          </p>

          {error === "forbidden" ? (
            <div className="mx-auto mt-4 max-w-2xl rounded-xl border px-4 py-3 text-sm text-muted-foreground">
              Signed in as {sessionDisplayName(session)}, but this account is not authorized for the SeasonalPBX dashboard.
            </div>
          ) : null}

          {error && error !== "forbidden" ? (
            <div className="mx-auto mt-4 max-w-2xl rounded-xl border px-4 py-3 text-sm text-muted-foreground">
              Sign-in hit an auth configuration error. Check the app logs, then try again.
            </div>
          ) : null}

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <form
              action={async () => {
                "use server"
                await signIn("authentik", { redirectTo: next })
              }}
            >
              <Button type="submit" size="lg" className="min-w-40">
                Sign in
              </Button>
            </form>

            <Button variant="secondary" size="lg" asChild className="min-w-40">
              <a href="https://discord.gg/UDfrTwYTy2" target="_blank" rel="noreferrer noopener">
                <MessagesSquare className="h-4 w-4" />
                Join Discord
              </a>
            </Button>
          </div>
        </div>
      </section>

      <div className="mt-10">
        <SiteFooter />
      </div>
    </main>
  )
}
