export interface PublicEndpoint {
  name: string;
  description?: string;
  namespace?: string;
  endpoints: {
    mcp: string;
    sse: string;
    api: string;
  };
}

export interface Namespace {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
}

export class MetaMCPClient {
  private baseUrl: string;
  private apiKey?: string;
  private sessionCookie?: string;
  private proxyHeaders?: Record<string, string>;

  constructor(
    baseUrl: string,
    apiKey?: string,
    sessionCookie?: string,
    proxyHeaders?: Record<string, string>,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
    this.sessionCookie = sessionCookie;
    this.proxyHeaders = proxyHeaders;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.proxyHeaders,
    };
    if (this.apiKey) {
      h["Authorization"] = `Bearer ${this.apiKey}`;
    }
    if (this.sessionCookie) {
      h["Cookie"] = this.sessionCookie;
    }
    return h;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        headers: this.headers(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listPublicEndpoints(): Promise<PublicEndpoint[]> {
    const res = await fetch(`${this.baseUrl}/metamcp`, {
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new Error(
        `Failed to list endpoints: ${res.status} ${res.statusText}`,
      );
    }
    const data = (await res.json()) as { endpoints?: PublicEndpoint[] };
    return data.endpoints ?? [];
  }

  async signIn(email: string, password: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      redirect: "manual",
    });

    if (!res.ok && res.status !== 302) {
      throw new Error(`Sign-in failed: ${res.status} ${res.statusText}`);
    }

    const cookies = res.headers.getSetCookie?.() ?? [];
    if (cookies.length === 0) {
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) return setCookie;
      throw new Error("Sign-in succeeded but no session cookie was returned.");
    }
    return cookies.join("; ");
  }

  async listNamespaces(): Promise<Namespace[]> {
    if (!this.sessionCookie) {
      throw new Error(
        "Namespace listing requires session auth. Run `metamcp-cli init` with email/password.",
      );
    }
    const res = await fetch(`${this.baseUrl}/trpc/frontend/namespaces.list`, {
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new Error(
        `Failed to list namespaces: ${res.status} ${res.statusText}`,
      );
    }
    const data = (await res.json()) as { result?: { data?: Namespace[] } };
    return data.result?.data ?? [];
  }
}
