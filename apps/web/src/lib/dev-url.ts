const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

/**
 * Di `next dev`, URL API/socket yang menunjuk localhost diganti host halaman bila halaman dibuka dari
 * perangkat lain (mis. HP lewat hotspot `192.168.137.1`), karena "localhost" di HP = HP itu sendiri.
 * Produksi dan server-side tidak terpengaruh. Pasangannya: CORS LAN dev di apps/api/src/common/cors.ts.
 */
export function resolveDevUrl(
  url: string,
  pageHost: string | undefined = typeof window === 'undefined' ? undefined : window.location.hostname,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): string {
  if (nodeEnv === 'production' || !pageHost || LOCAL_HOSTS.has(pageHost)) return url;
  const parsed = new URL(url);
  if (!LOCAL_HOSTS.has(parsed.hostname)) return url;
  parsed.hostname = pageHost;
  return parsed.toString().replace(/\/$/, url.endsWith('/') ? '/' : '');
}
