import "server-only";

// fkm-proxy is a separate Rust service. The "create tunnel" endpoint is part
// of the Phase 1 change in that repo — it doesn't exist yet. This module
// defines the contract we will call (so the rest of Phase 1 can be wired
// up) and ships a dev/stub implementation gated behind an env flag.

export type CreateTunnelInput = {
  wcaId: string;
  // Human-readable label sent to fkm-proxy for the tunnel.
  label: string;
};

export type CreateTunnelResult = {
  tunnelUrl: string;
  secret: string;
};

export interface FkmProxyClient {
  createTunnel(input: CreateTunnelInput): Promise<CreateTunnelResult>;
}

class HttpFkmProxyClient implements FkmProxyClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiToken: string,
  ) {}

  async createTunnel(input: CreateTunnelInput): Promise<CreateTunnelResult> {
    const res = await fetch(`${this.baseUrl}/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiToken}`,
      },
      body: JSON.stringify({ wca_id: input.wcaId, label: input.label }),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `fkm-proxy createTunnel failed: ${res.status} ${body}`,
      );
    }
    const data = (await res.json()) as { tunnel_url: string; secret: string };
    return { tunnelUrl: data.tunnel_url, secret: data.secret };
  }
}

class DevFakeFkmProxyClient implements FkmProxyClient {
  async createTunnel(input: CreateTunnelInput): Promise<CreateTunnelResult> {
    const slug = input.wcaId.toLowerCase();
    return {
      tunnelUrl: `https://${slug}.dev.fkmtime.local`,
      // Deterministic-ish dummy secret so dev flows can reason about it.
      secret: `dev-secret-${slug}-${Math.random().toString(36).slice(2, 10)}`,
    };
  }
}

export function getFkmProxyClient(): FkmProxyClient {
  if (process.env.FKM_PROXY_DEV_FAKE === "true") {
    return new DevFakeFkmProxyClient();
  }
  const baseUrl = process.env.FKM_PROXY_URL;
  const token = process.env.FKM_PROXY_API_TOKEN;
  if (!baseUrl || !token) {
    throw new Error(
      "fkm-proxy is not configured: set FKM_PROXY_URL + FKM_PROXY_API_TOKEN (or FKM_PROXY_DEV_FAKE=true for local dev)",
    );
  }
  return new HttpFkmProxyClient(baseUrl, token);
}
