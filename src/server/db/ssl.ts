/**
 * Render's internal database URL stays on the private network and does not use
 * TLS, while the external URL (used from a laptop or CI) requires it. Detect
 * which one we were handed instead of forcing a single mode.
 */
export function shouldUseSsl(url: string): boolean {
  if (/sslmode=(disable|off)/.test(url)) {
    return false;
  }

  if (/sslmode=/.test(url)) {
    return true;
  }

  const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])/.test(url);
  const isRenderInternal = /@[^/]*\.internal[:/]/.test(url) || !url.includes('.');

  return !isLocal && !isRenderInternal;
}

/**
 * Render's managed certificate is not in Node's default trust store, so
 * verification is relaxed while the connection itself stays encrypted.
 */
export function sslConfig(url: string): { rejectUnauthorized: boolean } | false {
  return shouldUseSsl(url) ? { rejectUnauthorized: false } : false;
}
