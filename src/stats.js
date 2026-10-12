// Pillerivalintojen kirjaus ja tilastojen haku. Virheet eivät koskaan saa rikkoa sivua.
export const PILL_EVENT = 'pill-recorded';

export async function recordPill(pill) {
  try {
    const res = await fetch('/api/pill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pill }),
      keepalive: true,
    });
    if (res.ok) window.dispatchEvent(new Event(PILL_EVENT));
  } catch {
    /* tilastointi on lisäominaisuus: hiljainen epäonnistuminen on ok */
  }
}

/** Palauttaa { enabled, total, counts } tai false, jos tilastot eivät ole saatavilla. */
export async function fetchStats() {
  try {
    const res = await fetch('/api/stats', { cache: 'no-store' });
    if (!res.ok) return false;
    const data = await res.json();
    return data.enabled ? data : false;
  } catch {
    return false;
  }
}
