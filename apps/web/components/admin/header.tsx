"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  ChevronDown,
  LogOut,
  Leaf,
  Download,
} from "lucide-react";
import { logout, savePush, removePush } from "@/app/admin/actions";
import { adminLinks } from "./navbare";
import SolaviaLogo from "@/components/shared/solavia-logo";
import {
  prepareNotificationSound,
  playNotificationSound,
} from "@/lib/notification-audio";
let pushBinding: Promise<boolean> | undefined;
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

export default function Header() {
  const path = usePathname(),
    router = useRouter();
  const [open, setOpen] = useState(false),
    [enabled, setEnabled] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(
      null,
    ),
    [installed, setInstalled] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const routerRef = useRef(router),
    seen = useRef(new Set<string>());
  routerRef.current = router;
  useEffect(() => {
    setInstalled(matchMedia("(display-mode: standalone)").matches);
    const offer = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    const installedApp = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", offer);
    window.addEventListener("appinstalled", installedApp);
    const unlock = prepareNotificationSound;
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    if ("serviceWorker" in navigator) {
      pushBinding ??= navigator.serviceWorker
        .register("/admin-sw.js", { scope: "/admin" })
        .then((r) => r?.pushManager.getSubscription())
        .then(async (subscription) => {
          if (!subscription) return false;
          const data = subscription.toJSON();
          const result = await savePush({
            endpoint: subscription.endpoint,
            keys: { p256dh: data.keys!.p256dh!, auth: data.keys!.auth! },
          });
          return Boolean(result.ok);
        })
        .catch(() => false);
      pushBinding.then(setEnabled);
    }
    const receive = (event: MessageEvent) => {
      if (
        event.data?.type === "ORDER_SAVED" &&
        document.visibilityState === "visible"
      ) {
        if (seen.current.has(event.data.id)) {
          event.ports[0]?.postMessage({ played: true });
          return;
        }
        seen.current.add(event.data.id);
        if (seen.current.size > 60)
          seen.current.delete(seen.current.values().next().value!);
        void playNotificationSound().then((played) =>
          event.ports[0]?.postMessage({ played }),
        );
        routerRef.current.refresh();
      }
    };
    navigator.serviceWorker?.addEventListener("message", receive);
    const close = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => {
      window.removeEventListener("beforeinstallprompt", offer);
      window.removeEventListener("appinstalled", installedApp);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("pointerdown", close);
      navigator.serviceWorker?.removeEventListener("message", receive);
    };
  }, []);
  async function install() {
    if (installPrompt) {
      await installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome === "accepted") setInstalled(true);
      setInstallPrompt(null);
    } else
      setMessage(
        /iPhone|iPad|iPod/.test(navigator.userAgent)
          ? "Safari : Partager, puis « Sur l’écran d’accueil »"
          : "Dans le menu du navigateur, choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil »",
      );
  }
  async function toggle() {
    prepareNotificationSound();
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
        pushBinding = Promise.resolve(false);
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
      pushBinding = Promise.resolve(true);
      if (!(await playNotificationSound()))
        setMessage("Activez le son dans les r?glages du site");
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
        <a href="/admin" className="mobile-brand" aria-label="Solavia">
          <SolaviaLogo dark />
        </a>
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
            {!installed && (
              <button onClick={install}>
                <Download size={18} />
                <span>Installer l’application</span>
              </button>
            )}
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
            <form
              action={logout}
              onSubmit={() => {
                pushBinding = undefined;
              }}
            >
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
