import { auth, isAuthorizedSession } from "@/auth"
import { NextResponse } from "next/server"

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/brand/") ||
    pathname === "/favicon.ico" ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/favicon-192.png" ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".map") ||
    pathname.endsWith(".txt") ||
    pathname.endsWith(".xml")
  )
}

export default auth((req) => {
  const { nextUrl } = req
  const pathname = nextUrl.pathname

  const isPublic =
    pathname.startsWith("/api/auth") ||
    pathname === "/login" ||
    isStaticAsset(pathname)

  if (isPublic) return NextResponse.next()

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
  matcher: ["/((?!api/auth|_next/static|_next/image).*)"],
}
