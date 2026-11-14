"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, BellOff, ChevronDown, LogOut, Leaf } from "lucide-react";
import { logout, savePush, removePush } from "@/app/admin/actions";
import { adminLinks } from "./navbare";

export default function Header() {
  const path = usePathname(),
    router = useRouter();
  const [open, setOpen] = useState(false),
    [enabled, setEnabled] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const audio = useRef<HTMLAudioElement | null>(null),
    menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    audio.current = new Audio("/notification.ogg");
    const unlock = () => {
      const sound = audio.current;
      if (sound) {
        sound.volume = 0;
        sound
          .play()
          .then(() => {
            sound.pause();
            sound.currentTime = 0;
            sound.volume = 0.8;
          })
          .catch(() => {});
      }
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistration("/admin")
        .then((r) => r?.pushManager.getSubscription())
        .then(async (subscription) => {
          if (!subscription) return;
          const data = subscription.toJSON();
          const result = await savePush({
            endpoint: subscription.endpoint,
            keys: { p256dh: data.keys!.p256dh!, auth: data.keys!.auth! },
          });
          setEnabled(Boolean(result.ok));
        })
        .catch(() => {});
    }
    const receive = (event: MessageEvent) => {
      if (
        event.data?.type === "ORDER_SAVED" &&
        document.visibilityState === "visible"
      ) {
        audio.current?.play().catch(() => {});
        router.refresh();
      }
    };
    navigator.serviceWorker?.addEventListener("message", receive);
    const close = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("pointerdown", close);
      navigator.serviceWorker?.removeEventListener("message", receive);
      audio.current?.pause();
    };
  }, [router]);
  async function toggle() {
    setBusy(true);
    setMessage("");
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window))
        throw new Error(
          "Installez l’application sur l’écran d’accueil pour recevoir les notifications",
        );
      const registration = await navigator.serviceWorker.register(
        "/admin-sw.js",
        { scope: "/admin" },
      );
      await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (enabled && subscription) {
        await removePush(subscription.endpoint);
        await subscription.unsubscribe();
        setEnabled(false);
        return;
      }
      if ((await Notification.requestPermission()) !== "granted")
        throw new Error(
          "Autorisez les notifications dans les réglages du navigateur",
        );
      if (!subscription) {
        const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
        const base64 = key.replace(/-/g, "+").replace(/_/g, "/");
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: Uint8Array.from(atob(base64), (c) =>
            c.charCodeAt(0),
          ),
        });
      }
      const data = subscription.toJSON();
      const result = await savePush({
        endpoint: subscription.endpoint,
        keys: { p256dh: data.keys!.p256dh!, auth: data.keys!.auth! },
      });
      if (result.error) throw new Error(result.error);
      setEnabled(true);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Notifications indisponibles",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <header className="admin-header">
      <div>
        <span className="mobile-brand">Solavia</span>
        <p>
          {adminLinks.find((l) => l.href === path)?.label || "Administration"}
        </p>
      </div>
      <div className="admin-account" ref={menu}>
        <button
          className="account-trigger"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span className="admin-avatar">
            <Leaf size={18} />
          </span>
          <span>
            Solavia<small>Administratrice</small>
          </span>
          <ChevronDown size={15} />
        </button>
        {open && (
          <div className="account-menu">
            <button onClick={toggle} disabled={busy}>
              {enabled ? <Bell size={18} /> : <BellOff size={18} />}
              <span>
                {busy
                  ? "Un instant…"
                  : enabled
                    ? "Désactiver les notifications"
                    : "Activer les notifications"}
              </span>
            </button>
            {message && <p role="status">{message}</p>}
            <form action={logout}>
              <button>
                <LogOut size={18} />
                Se déconnecter
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
