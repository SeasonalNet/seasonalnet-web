export function noStoreInit(init: ResponseInit = {}): ResponseInit {
  const headers = new Headers(init.headers)
  headers.set("Cache-Control", "no-store")
  return { ...init, headers }
}

export function pbxJsonResponse(data: unknown, init: ResponseInit = {}) {
  return Response.json(data, noStoreInit(init))
}
