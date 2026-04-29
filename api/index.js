export const config = { runtime: "edge" };

const BASE = (process.env.TARGET_DOMAIN ?? "").replace(/\/+$/, "");

const BLOCKED_HEADERS = [
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-authenticate",
  "proxy-authorization",
];

export default async function handler(request) {
  if (!BASE) {
    return new Response("Server misconfigured: missing TARGET_DOMAIN", {
      status: 500,
    });
  }

  try {
    const url = new URL(request.url);
    const target = BASE + url.pathname + url.search;

    const headers = new Headers();
    let ip = "";

    request.headers.forEach((value, key) => {
      const lower = key.toLowerCase();

      if (BLOCKED_HEADERS.includes(lower)) return;
      if (lower.startsWith("x-vercel-")) return;

      if (lower === "x-forwarded-for" || lower === "x-real-ip") {
        if (!ip) ip = value;
        return;
      }

      headers.set(key, value);
    });

    if (ip) {
      headers.set("x-forwarded-for", ip);
    }

    const init = {
      method: request.method,
      headers,
      redirect: "manual",
    };

    if (!["GET", "HEAD"].includes(request.method)) {
      init.body = request.body;
    }

    return await fetch(target, init);
  } catch (e) {
    console.error("Proxy error:", e);
    return new Response("Upstream request failed", { status: 502 });
  }
}
