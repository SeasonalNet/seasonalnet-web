import { auth, isAuthorizedSession, sessionDisplayName, signIn } from "@/auth"
import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { SiteFooter } from "@/components/site-footer"

type Props = {
  searchParams?: Promise<{ next?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {}
  const next = params.next && params.next.startsWith("/") ? params.next : "/"
  const error = params.error
  const session = await auth()

  if (isAuthorizedSession(session)) {
    redirect(next)
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-10">
      <section className="space-y-6 pt-10">
        <div className="rounded-3xl border bg-card/50 p-6 md:p-10">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">auth</Badge>
            <Badge variant="secondary">control-plane</Badge>
            <Badge variant="secondary">self-hosted</Badge>
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            SeasonalNet Admin
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Sign in through SeasonalNet Auth to continue.
          </p>

          {error === "forbidden" ? (
            <div className="mt-4 rounded-xl border px-4 py-3 text-sm text-muted-foreground">
              Signed in as {sessionDisplayName(session)}, but this account is not authorized for the SeasonalNet Admin surface.
            </div>
          ) : null}

          {error && error !== "forbidden" ? (
            <div className="mt-4 rounded-xl border px-4 py-3 text-sm text-muted-foreground">
              Sign-in hit an auth configuration error. Check the app logs, then try again.
            </div>
          ) : null}

          <form
            className="mt-6"
            action={async () => {
              "use server"
              await signIn("authentik", { redirectTo: next })
            }}
          >
            <button
              type="submit"
              className="inline-flex rounded-xl border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Sign in
            </button>
          </form>
        </div>
      </section>

      <div className="mt-10">
        <SiteFooter />
      </div>
    </main>
  )
}
