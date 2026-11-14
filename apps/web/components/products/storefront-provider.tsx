"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { recordVisit } from "@/app/actions/visits";
import type { ProductInfo } from "@/lib/store-types";
type Store = {
  product: ProductInfo | null;
  loaded: boolean;
  error: boolean;
  pixelId: string | null;
  consent: boolean;
  setProduct: (p: ProductInfo | null) => void;
};
const StoreContext = createContext<Store>({
  product: null,
  loaded: false,
  error: false,
  pixelId: null,
  consent: false,
  setProduct: () => {},
});
export const useStorefront = () => useContext(StoreContext);
declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[][];
      push?: unknown;
      loaded?: boolean;
      version?: string;
    };
  }
}
export function trackOrder(eventId: string, value: number, quantity: number) {
  window.fbq?.(
    "trackCustom",
    "OrderPlaced",
    {
      currency: "DZD",
      value,
      content_ids: ["shaya-bio"],
      content_type: "product",
      num_items: quantity,
    },
    { eventID: eventId },
  );
}
export function marketingCookie(name: string) {
  return document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}
export default function StorefrontProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [product, setProduct] = useState<ProductInfo | null>(null),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(false),
    [pixelId, setPixelId] = useState<string | null>(null),
    [choice, setChoice] = useState<string | null>(null),
    [ready, setReady] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/storefront", { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setProduct(data.product);
        setPixelId(data.pixelId);
        setLoaded(true);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(true);
          setLoaded(true);
        }
      });
    try {
      setChoice(localStorage.getItem("solavia-marketing"));
      const now = Date.now(),
        day = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Africa/Algiers",
        }).format(new Date());
      let session = JSON.parse(
        sessionStorage.getItem("solavia-visit") || "null",
      );
      if (!session || now - session.last > 1800000)
        session = { id: crypto.randomUUID(), last: now, day: "" };
      if (session.day !== day) {
        recordVisit(session.id);
        session.day = day;
      }
      session.last = now;
      sessionStorage.setItem("solavia-visit", JSON.stringify(session));
    } catch {}
    setReady(true);
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!pixelId || choice !== "yes") return;
    const eventId = `page:${crypto.randomUUID()}`;
    if (!window.fbq) {
      const fbq = ((...args: unknown[]) => {
        if (fbq.callMethod) fbq.callMethod(...args);
        else fbq.queue!.push(args);
      }) as NonNullable<Window["fbq"]>;
      fbq.queue = [];
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = "2.0";
      window.fbq = fbq;
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(script);
    }
    window.fbq("init", pixelId);
    window.fbq("track", "PageView", {}, { eventID: eventId });
    import("@/app/actions/marketing")
      .then((m) =>
        m.pageView(eventId, marketingCookie("_fbp"), marketingCookie("_fbc")),
      )
      .catch(() => {});
  }, [pixelId, choice]);
  function choose(value: string) {
    setChoice(value);
    try {
      localStorage.setItem("solavia-marketing", value);
    } catch {}
  }
  return (
    <StoreContext.Provider
      value={{
        product,
        loaded,
        error,
        pixelId,
        consent: choice === "yes",
        setProduct,
      }}
    >
      {children}
      {ready && pixelId && choice === null && (
        <aside
          className="marketing-consent"
          aria-label="تفضيلات الخصوصية"
          dir="rtl"
        >
          <p>
            هل تسمح باستخدام أدوات Meta لقياس الإعلانات وتحسينها؟ يمكنك متابعة
            طلبك دون الموافقة
          </p>
          <div>
            <button onClick={() => choose("yes")}>أوافق</button>
            <button onClick={() => choose("no")}>لا، شكرًا</button>
          </div>
        </aside>
      )}
      <style jsx>{`
        .marketing-consent {
          position: fixed;
          bottom: 18px;
          left: 18px;
          right: 18px;
          z-index: 70;
          max-width: 470px;
          margin-right: auto;
          background: #faf8ed;
          color: #173b2b;
          border: 1px solid #cfd8bf;
          border-radius: 13px;
          padding: 18px;
          box-shadow: 0 8px 35px #102a2630;
          font:
            500 14px/1.7 var(--font-body),
            sans-serif;
        }
        .marketing-consent p {
          margin: 0 0 12px;
        }
        .marketing-consent > div {
          display: flex;
          gap: 10px;
        }
        .marketing-consent button {
          padding: 7px 20px;
          border: 1px solid #173b2b;
          border-radius: 7px;
          background: #173b2b;
          color: #fff7dd;
          cursor: pointer;
        }
        .marketing-consent button + button {
          background: transparent;
          color: #173b2b;
        }
      `}</style>
    </StoreContext.Provider>
  );
}
