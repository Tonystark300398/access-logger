/**
 * Approximate IP geolocation for the access-logger dashboard.
 *
 * IMPORTANT: this returns only a COARSE, approximate location (country /
 * region / city and the ISP's registered coordinates). It is NOT a street
 * address and does NOT identify a person. Accuracy is city-level at best and
 * is often far off for mobile / CGNAT / VPN addresses. Use it for analytics,
 * not to locate individuals.
 *
 * Uses ipwho.is (free, HTTPS, no API key). Private / loopback IPs are skipped.
 */

export interface GeoInfo {
  country?: string;
  region?: string;
  city?: string;
  lat?: number;
  lon?: number;
  isp?: string;
}

function isPrivateIp(ip: string): boolean {
  if (!ip || ip === "unknown") return true;
  if (ip === "::1" || ip.startsWith("::ffff:")) {
    // strip IPv4-mapped prefix for the range check below
    ip = ip.replace("::ffff:", "");
  }
  if (ip === "127.0.0.1" || ip.startsWith("127.")) return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (/^169\.254\./.test(ip)) return true; // link-local
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true; // IPv6 ULA
  if (ip.startsWith("fe80")) return true; // IPv6 link-local
  if (ip === "::") return true;
  return false;
}

/**
 * Look up approximate geo for an IP. Returns null on private IPs, timeouts, or
 * any error — geolocation is best-effort and never blocks or breaks logging.
 */
export async function lookupGeo(
  ip: string,
  timeoutMs = 2500
): Promise<GeoInfo | null> {
  if (isPrivateIp(ip)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(
      `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country,region,city,latitude,longitude,connection`,
      { signal: controller.signal }
    );
    if (!res.ok) return null;
    const data: any = await res.json();
    if (!data || data.success === false) return null;

    return {
      country: data.country ?? undefined,
      region: data.region ?? undefined,
      city: data.city ?? undefined,
      lat: typeof data.latitude === "number" ? data.latitude : undefined,
      lon: typeof data.longitude === "number" ? data.longitude : undefined,
      isp: data.connection?.isp ?? undefined,
    };
  } catch {
    return null; // timeout / network / parse error
  } finally {
    clearTimeout(timer);
  }
}
