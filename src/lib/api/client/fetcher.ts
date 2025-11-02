// src/lib/fetchJSON.ts
export async function fetchJSON<T>(
  url: string,
  init: RequestInit = {},
  // tambahkan bust=true untuk mencegah cache antar-proxy
  bust = true
): Promise<T> {
  const finalUrl = bust ? `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}` : url;
  const res = await fetch(finalUrl, {
    cache: "no-store",
    headers: { "content-type": "application/json", ...(init.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try {
      const j = await res.json();
      msg = j?.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}
