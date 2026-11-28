// Small helpers for calling Google with a lecturer's access token.
export async function tokenEmail(token: string) {
  const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`).then((x) => (x.ok ? x.json() : null)).catch(() => null);
  return r?.email ? String(r.email).toLowerCase() : "";
}

export async function gget(url: string, token: string) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`Google said ${r.status}: ${(await r.text()).slice(0, 160)}`);
  return r.json();
}
