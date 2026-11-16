type Session = { id: string; last: number; day: string };
let current: Session | undefined;

// A new day or 30 minutes without checkout activity starts a new session.
export function checkoutSession(now = Date.now()) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Algiers",
  }).format(new Date(now));
  try {
    current = JSON.parse(sessionStorage.getItem("solavia-checkout-session") || "null") ?? current;
  } catch { /* Keep the in-memory session when browser storage is unavailable. */ }
  if (!current || !/^[a-f0-9-]{36}$/i.test(current.id) ||
      current.day !== day || now - current.last >= 30 * 60 * 1000)
    current = { id: crypto.randomUUID(), last: now, day };
  current.last = now;
  try {
    sessionStorage.setItem("solavia-checkout-session", JSON.stringify(current));
  } catch { /* The current tab can still reuse the in-memory session. */ }
  return current.id;
}
