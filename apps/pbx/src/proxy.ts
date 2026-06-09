import { auth, isAuthorizedSession } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl } = req
  const pathname = nextUrl.pathname

  if (!req.auth) {
    const loginUrl = new URL("/login", nextUrl)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (!isAuthorizedSession(req.auth as never)) {
    const loginUrl = new URL("/login", nextUrl)
    loginUrl.searchParams.set("next", pathname)
    loginUrl.searchParams.set("error", "forbidden")
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/dashboard/:path*", "/api/pbx/self/:path*"],
}
