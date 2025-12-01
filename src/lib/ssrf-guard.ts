import { lookup } from "node:dns/promises";
import net from "node:net";
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
]);
const IPV4_BLOCKED_RANGES: Array<[number, number]> = [
  [0x00000000, 0x00ffffff],
  [0x0a000000, 0x0affffff],
  [0x64400000, 0x647fffff],
  [0x7f000000, 0x7fffffff],
  [0xa9fe0000, 0xa9feffff],
  [0xac100000, 0xac1fffff],
  [0xc0000000, 0xc00000ff],
  [0xc0a80000, 0xc0a8ffff],
  [0xc6120000, 0xc613ffff],
  [0xe0000000, 0xefffffff],
  [0xf0000000, 0xffffffff],
];
function ipToInt(ip: string): number {
  const parts = ip.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return -1;
  }
  return ((parts[0]! << 24) >>> 0) +
         ((parts[1]! << 16) >>> 0) +
         ((parts[2]! << 8) >>> 0) +
         (parts[3]! >>> 0);
}
function isBlockedIPv4(ip: string): boolean {
  const n = ipToInt(ip);
  if (n < 0) return false;
  for (const [lo, hi] of IPV4_BLOCKED_RANGES) {
    if (n >= lo && n <= hi) return true;
  }
  return false;
}
function isBlockedIPv6(ip: string): boolean {

  const lower = ip.toLowerCase().split("%")[0]!;
  if (lower === "::" || lower === "::1" || lower === "0:0:0:0:0:0:0:1" || lower === "0:0:0:0:0:0:0:0") return true;

  if (
    lower.startsWith("fe8") || lower.startsWith("fe9") ||
    lower.startsWith("fea") || lower.startsWith("feb")
  ) return true;

  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;

  if (lower.startsWith("::ffff:") || lower.startsWith("0:0:0:0:0:ffff:")) {
    const rest = lower.replace(/^::ffff:|^0:0:0:0:0:ffff:/, "");
    if (/^[0-9.]+$/.test(rest)) {
      return isBlockedIPv4(rest);
    }
    const hexParts = rest.split(":");
    if (hexParts.length === 2) {
      const p1 = Number.parseInt(hexParts[0]!, 16);
      const p2 = Number.parseInt(hexParts[1]!, 16);
      if (!Number.isNaN(p1) && !Number.isNaN(p2)) {
        const ipInt = ((p1 << 16) >>> 0) + (p2 >>> 0);
        for (const [lo, hi] of IPV4_BLOCKED_RANGES) {
          if (ipInt >= lo && ipInt <= hi) return true;
        }
      }
    }
  }
  return false;
}
export class SSRFBlockedError extends Error {
  constructor(reason: string) {
    super(`SSRF blocked: ${reason}`);
    this.name = "SSRFBlockedError";
  }
}
export async function assertSafeUrl(url: string): Promise<URL> {
  return validateUrl(url);
}
async function validateUrl(url: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new SSRFBlockedError("invalid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new SSRFBlockedError(`scheme ${parsed.protocol} not allowed`);
  }

  let host = parsed.hostname.toLowerCase();
  if (host.startsWith("[") && host.endsWith("]")) {
    host = host.slice(1, -1);
  }
  if (!host) throw new SSRFBlockedError("missing hostname");
  if (BLOCKED_HOSTNAMES.has(host)) {
    throw new SSRFBlockedError(`hostname ${host} is blocked`);
  }

  if (net.isIP(host)) {
    if (net.isIPv4(host) && isBlockedIPv4(host)) {
      throw new SSRFBlockedError(`IPv4 ${host} is in a blocked range`);
    }
    if (net.isIPv6(host) && isBlockedIPv6(host)) {
      throw new SSRFBlockedError(`IPv6 ${host} is in a blocked range`);
    }
    return parsed;
  }

  const addrs = await lookup(host, { all: true });
  if (addrs.length === 0) {
    throw new SSRFBlockedError("hostname did not resolve");
  }
  for (const a of addrs) {
    if (net.isIPv4(a.address) && isBlockedIPv4(a.address)) {
      throw new SSRFBlockedError(`resolved IPv4 ${a.address} is in a blocked range`);
    }
    if (net.isIPv6(a.address) && isBlockedIPv6(a.address)) {
      throw new SSRFBlockedError(`resolved IPv6 ${a.address} is in a blocked range`);
    }
  }
  return parsed;
}
export async function safeFetch(
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: BodyInit; signal?: AbortSignal; redirect?: RequestRedirect }
): Promise<Response> {
  const parsed = await validateUrl(url);

  let host = parsed.hostname.toLowerCase();
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  if (net.isIP(host)) {
    return fetch(url, init as RequestInit);
  }

  const addrs = await lookup(host, { all: true });
  const pick = addrs.find((a) =>
    net.isIPv4(a.address)
      ? !isBlockedIPv4(a.address)
      : !isBlockedIPv6(a.address)
  );
  if (!pick) {
    throw new SSRFBlockedError("no usable resolved address");
  }

  const ipLiteral = net.isIPv6(pick.address) ? `[${pick.address}]` : pick.address;
  const port = parsed.port || (parsed.protocol === "https:" ? "443" : "80");
  const pinnedUrl = `${parsed.protocol}//${ipLiteral}:${port}${parsed.pathname}${parsed.search}`;
  const headers: Record<string, string> = {
    ...(init?.headers ?? {}),
    Host: parsed.host,
  };
  return fetch(pinnedUrl, {
    ...init,
    headers,
  } as RequestInit);
}
