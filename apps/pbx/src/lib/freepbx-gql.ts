type TokenCache = { accessToken: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function baseUrl(): string {
  return mustEnv("FREEPBX_BASE_URL").replace(/\/+$/, "");
}

async function getToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt - now > 30_000) return tokenCache.accessToken;

  const url = `${baseUrl()}/admin/api/api/token`;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: mustEnv("FREEPBX_CLIENT_ID"),
    client_secret: mustEnv("FREEPBX_CLIENT_SECRET"),
  });

  const scope = process.env.FREEPBX_SCOPE;
  if (scope) body.set("scope", scope);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Token fetch failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in?: number };
  const expiresMs = (json.expires_in ?? 3600) * 1000;

  tokenCache = { accessToken: json.access_token, expiresAt: Date.now() + expiresMs };
  return tokenCache.accessToken;
}

export async function gql<TData>(
  query: string,
  variables: Record<string, any> = {}
): Promise<TData> {
  const url = `${baseUrl()}/admin/api/api/gql`;
  const token = await getToken();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = (await res.json().catch(() => null)) as any;

  if (!res.ok) {
    throw new Error(`GQL HTTP ${res.status}: ${JSON.stringify(payload)?.slice(0, 300)}`);
  }
  if (payload?.errors?.length) {
    throw new Error(`GQL error: ${payload.errors[0]?.message ?? "unknown"}`);
  }

  return payload.data as TData;
}
