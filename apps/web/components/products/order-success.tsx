"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, Download, Share2, Copy, X, ExternalLink } from "lucide-react";
import type { Receipt } from "@/lib/store-types";
import "./order-success.css";
import SolaviaLogo from "@/components/shared/solavia-logo";
const format = (n: number) =>
  new Intl.NumberFormat("en-DZ").format(n / 100) + " دج";
function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function card(receipt?: Receipt) {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1000;
  canvas.height = receipt ? 1250 : 1200;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f6f3e5";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#173b2b";
  ctx.textAlign = "center";
  ctx.font = "76px Georgia";
  ctx.fillText("Solavia", 500, 115);
  ctx.font = "500 40px 'IBM Plex Sans Arabic', sans-serif";
  ctx.fillText(receipt ? "شكرًا لطلبك" : "هدوء أكثر وسط ضغط اليوم", 500, 210);
  if (receipt) {
    ctx.font = "34px Georgia";
    ctx.fillText(receipt.fullName, 500, 285, 850);
    ctx.font = "500 25px sans-serif";
    ctx.fillText(receipt.reference, 500, 345);
    ctx.font = "24px Georgia";
    ctx.fillText(
      `SHAYA BIO · ${format(receipt.unitPriceCentimes)} / flacon`,
      500,
      390,
    );
    const rows = [
      ["عدد العبوات", String(receipt.quantity)],
      ["سعر العبوات", format(receipt.subtotalCentimes)],
      ["سعر التوصيل", format(receipt.deliveryPriceCentimes)],
      ["الإجمالي", format(receipt.totalCentimes)],
      ["رقم الهاتف", receipt.phone],
      ["الولاية والبلدية", `${receipt.wilayaName} · ${receipt.communeName}`],
      ["الاستلام", receipt.deliveryMode === "HOME" ? "المنزل" : "المكتب"],
    ];
    ctx.textAlign = "right";
    rows.forEach(([label, value], i) => {
      const y = 440 + i * 80;
      ctx.fillStyle = "#718068";
      ctx.font = "26px sans-serif";
      ctx.fillText(label!, 880, y);
      ctx.fillStyle = "#173b2b";
      ctx.textAlign = "left";
      ctx.font = "500 27px sans-serif";
      ctx.fillText(value!, 110, y, 540);
      ctx.textAlign = "right";
    });
    ctx.textAlign = "center";
    ctx.font = "22px sans-serif";
    ctx.fillText(
      new Date(receipt.createdAt).toLocaleString("fr-DZ", {
        timeZone: "Africa/Algiers",
      }),
      500,
      1020,
    );
    ctx.fillText("سيتم الاتصال بك لتأكيد الطلب", 500, 1080);
    ctx.fillText("+213 792 72 93 91", 500, 1140);
  } else {
    const image = new Image();
    image.src = "/images/solavia/purchase/product.webp";
    await image.decode();
    ctx.drawImage(image, 325, 290, 350, 686);
    ctx.font = "30px Georgia";
    ctx.fillText("SHAYA BIO", 500, 1050);
    ctx.font = "23px sans-serif";
    ctx.fillText(new URL("/", location.href).host, 500, 1110);
  }
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error())),
      "image/png",
    ),
  );
}
export default function OrderSuccess({
  receipt,
  onClose,
}: {
  receipt: Receipt;
  onClose: () => void;
}) {
  const [sharing, setSharing] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    ref = useRef<HTMLDivElement>(null);
  const shareDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (sharing) shareDialog.current?.showModal();
    else shareDialog.current?.close();
  }, [sharing]);
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);
  const url =
    typeof location !== "undefined" ? new URL("/", location.href).href : "";
  async function download() {
    setBusy(true);
    try {
      saveBlob(await card(receipt), `${receipt.reference}.png`);
    } catch {
      setMessage("تعذر تحميل الوصل، حاول مجددًا");
    } finally {
      setBusy(false);
    }
  }
  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "SHAYA BIO من Solavia",
          text: "اكتشف SHAYA BIO من Solavia",
          url,
        });
      } else setSharing(true);
    } catch (error) {
      if ((error as Error).name !== "AbortError") setSharing(true);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("تم نسخ رابط المنتج");
    } catch {
      setMessage(url);
    }
  }
  return (
    <div
      className="order-success"
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-title"
      dir="rtl"
      ref={ref}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          if (sharing) setSharing(false);
          else onClose();
        }
        if (e.key === "Tab") {
          const nodes = (
            sharing ? shareDialog.current : ref.current
          )?.querySelectorAll<HTMLElement>("button:not(:disabled),a[href]");
          if (!nodes?.length) return;
          const first = nodes[0]!,
            last = nodes[nodes.length - 1]!;
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }}
    >
      <button className="success-close" onClick={onClose} aria-label="إغلاق">
        <X size={22} />
      </button>
      <div className="success-inner">
        <SolaviaLogo className="success-brand" dark />
        <div className="success-check">
          <img
            src="/images/solavia/thank-you/smile.webp"
            alt="ابتسامة سعيدة"
            width={82}
            height={82}
          />
          <span className="success-check-badge">
            <Check size={18} />
          </span>
          <span className="success-sparkles" aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => (
              <i key={i} style={{ "--i": i } as CSSProperties} />
            ))}
          </span>
        </div>
        <h2 id="success-title">
          <img
            src="/images/solavia/thank-you/thanks.webp"
            alt="شكرًا لطلبك"
            width={700}
            height={198}
          />
        </h2>
        <p className="success-name" lang="fr" dir="auto">
          {receipt.fullName}
        </p>
        <p className="success-customer">
          أنت عميلنا رقم <bdi>{receipt.customerNumber}</bdi> الذي اختار{" "}
          <bdi lang="en">SHAYA BIO</bdi>
        </p>
        <p className="success-next">
          سنتصل بك على{" "}
          <a href={`tel:${receipt.phone}`}>
            <bdi>{receipt.phone}</bdi>
          </a>
        </p>
        <div className="success-actions">
          <button onClick={download} disabled={busy}>
            <Download size={19} />
            {busy ? "جارٍ تجهيز الوصل" : "تحميل الوصل"}
          </button>
          <button onClick={share}>
            <Share2 size={19} />
            شارك المنتج
          </button>
        </div>
        <dialog
          ref={shareDialog}
          className="share-options"
          aria-label="خيارات مشاركة المنتج"
          onCancel={() => setSharing(false)}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSharing(false);
          }}
        >
          <button
            className="share-close"
            aria-label="إغلاق خيارات المشاركة"
            onClick={() => setSharing(false)}
          >
            <X size={19} />
          </button>
          <button onClick={share}>
            <Share2 size={16} />
            تطبيقات الهاتف
          </button>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
          >
            Facebook
            <ExternalLink size={14} />
          </a>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=SHAYA%20BIO`}
          >
            Reddit
            <ExternalLink size={14} />
          </a>
          <button onClick={copy}>
            <Copy size={16} />
            نسخ الرابط
          </button>
          <button
            onClick={async () => {
              try {
                saveBlob(await card(), "solavia-share.png");
                setMessage(
                  "اختر الصورة من Instagram أو Story أو TikTok، وأضف الرابط المنسوخ",
                );
                await navigator.clipboard.writeText(url);
              } catch {
                setMessage("تعذر تجهيز صورة المشاركة");
              }
            }}
          >
            صورة لـ Instagram وStory وTikTok
          </button>
          <p>
            لـ Messenger والتطبيقات الأخرى، اخترها من قائمة مشاركة الهاتف أو
            انسخ الرابط
          </p>
        </dialog>
        {message && (
          <p className="success-message" role="status">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
