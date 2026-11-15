"use client";

import Image from "next/image";
import {
  Building2,
  Home,
  Minus,
  Plus,
  Package,
  Truck,
  ReceiptText,
} from "lucide-react";
import { useRef, useState, type CSSProperties, type FormEvent } from "react";
import LocationPicker from "./location-picker";
import dynamic from "next/dynamic";
import { checkout } from "@/app/actions/checkout";
import {
  useStorefront,
  marketingCookie,
  trackOrder,
} from "./storefront-provider";
import type { Receipt } from "@/lib/store-types";
import {
  prepareNotificationSound,
  playNotificationSound,
} from "@/lib/notification-audio";
const OrderSuccess = dynamic(() => import("./order-success"));
import wilayas from "@/lib/data/algeria-58.json";
import {
  DELIVERY_PRICES,
  getDeliveryPrice,
  type DeliveryMode,
} from "@/lib/delivery-prices";
import {
  isAlgerianMobile,
  MAX_QUANTITY,
  normalizePhone,
} from "@/lib/solavia-order";
import { WILAYA_FRENCH_NAMES } from "@/lib/location-search";
import "./solavia-purchase.css";

const money = new Intl.NumberFormat("en-DZ");
const images = "/images/solavia/purchase/";
const pillPositions = [
  [5, 45, -24],
  [12, 25, 18],
  [19, 65, -12],
  [26, 35, 35],
  [33, 70, -42],
  [40, 28, -15],
  [47, 55, 20],
  [54, 25, -28],
  [61, 68, 35],
  [68, 34, -5],
  [75, 65, -42],
  [82, 27, 26],
  [89, 60, -16],
  [96, 42, 38],
];

function Amount({ value }: { value: number | null }) {
  return (
    <span className="amount">
      <bdi>{value === null ? "—" : money.format(value)}</bdi>
      {value !== null && <span> دج</span>}
    </span>
  );
}

function BottleStack({
  quantity,
  mini = false,
}: {
  quantity: number;
  mini?: boolean;
}) {
  const positions = [
    [0, 0, 1],
    [-1, -8, 0.89],
    [1, 8, 0.89],
    [-1.65, -12, 0.78],
    [1.65, 12, 0.78],
  ];
  return (
    <div
      className={`bottle-stack${mini ? " bottle-stack--mini" : ""}`}
      aria-hidden="true"
    >
      {positions.map(([x, turn, scale], index) => (
        <div
          className="stack-bottle"
          key={index}
          data-visible={index < Math.min(quantity, 5)}
          style={
            {
              "--x": x,
              "--turn": `${turn}deg`,
              "--scale": scale,
              zIndex: 5 - index,
            } as CSSProperties
          }
        >
          <Image
            src={`${images}${mini ? "product-small" : "product"}.webp`}
            loading={index===0?"eager":"lazy"}
            alt=""
            width={449}
            height={880}
            unoptimized
            sizes={mini ? "36px" : "200px"}
          />
        </div>
      ))}
      {quantity > 5 && <span className="stack-extra">+{quantity - 5}</span>}
    </div>
  );
}

const wilayaOptions = wilayas.map((wilaya) => ({
  value: wilaya.code,
  label: `${wilaya.code} — ${wilaya.name}`,
  searchText: WILAYA_FRENCH_NAMES[Number(wilaya.code) - 1],
}));

export default function SolaviaPurchase() {
  const {
    product,
    loaded,
    error: storeError,
    consent,
    setProduct,
  } = useStorefront();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");
  const attempt = useRef({ fingerprint: "", key: "" });
  const [wilayaCode, setWilayaCode] = useState("");
  const [communeId, setCommuneId] = useState("");
  const [mode, setMode] = useState<DeliveryMode>("home");
  const [quantity, setQuantity] = useState(1);
  const [preparing, setPreparing] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const selectedWilaya = wilayas.find((wilaya) => wilaya.code === wilayaCode);
  const delivery = getDeliveryPrice(wilayaCode, mode);
  const subtotal = product ? (product.priceCentimes * quantity) / 100 : null;
  const amounts = {
    subtotal,
    total: subtotal !== null && delivery !== null ? subtotal + delivery : null,
  };
  const unavailable = Boolean(wilayaCode) && delivery === null;
  const deliveryMessage = !wilayaCode
    ? ""
    : !DELIVERY_PRICES[wilayaCode]
      ? "تعرفة هذه الولاية غير متوفرة حاليًا"
      : unavailable
        ? "التوصيل إلى المكتب غير متاح هنا، اختر المنزل"
        : "";

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preparing) return;
    const form = event.currentTarget;
    const phoneInput = form.elements.namedItem("phone") as HTMLInputElement;
    phoneInput.setCustomValidity(
      isAlgerianMobile(phoneInput.value)
        ? ""
        : "أدخل 10 أرقام تبدأ بـ 05 أو 06 أو 07",
    );
    if (!form.reportValidity()) return;
    if (
      !selectedWilaya ||
      !selectedWilaya.communes.some((commune) => commune.id === communeId)
    ) {
      setLocationError(true);
      document
        .getElementById(!selectedWilaya ? "order-wilaya" : "order-commune")
        ?.focus();
      return;
    }
    if (delivery === null) return;
    if (!product?.active || product.stock < quantity) {
      setError("الكمية غير متوفرة حاليًا");
      return;
    }
    const fields = new FormData(form);
    const details = {
      firstName: String(fields.get("firstName") || ""),
      lastName: String(fields.get("lastName") || ""),
      phone: String(fields.get("phone") || ""),
      quantity,
      wilayaCode,
      communeId,
      deliveryMode: mode === "home" ? ("HOME" as const) : ("DESK" as const),
      expectedUnitPriceCentimes: product.priceCentimes,
    };
    const fingerprint = JSON.stringify(details);
    if (attempt.current.fingerprint !== fingerprint)
      attempt.current = { fingerprint, key: crypto.randomUUID() };
    prepareNotificationSound();
    setPreparing(true);
    void import("./order-success");
    for (const asset of ["thanks", "smile"]) {
      const image = new window.Image();
      image.src = `/images/solavia/thank-you/${asset}.webp`;
    }
    setError("");
    try {
      const result = await checkout({
        ...details,
        idempotencyKey: attempt.current.key,
        trackingConsent: consent,
        fbp: consent ? marketingCookie("_fbp") : undefined,
        fbc: consent ? marketingCookie("_fbc") : undefined,
      });
      if ("product" in result) setProduct(result.product ?? null);
      if (result.ok) {
        setReceipt(result.receipt);
        if (consent)
          trackOrder(
            result.eventId,
            result.receipt.subtotalCentimes / 100,
            quantity,
          );
        void playNotificationSound();
      } else setError(result.message);
    } catch {
      setError("تعذر تأكيد حفظ الطلب، أعد المحاولة بنفس البيانات");
    } finally {
      setPreparing(false);
    }
  }

  return (
    <>
      <section
        className="purchase"
        id="purchase"
        aria-labelledby="purchase-title"
      >
        <div className="purchase-layout">
          <div>
            <div className="purchase-intro">
              <h2 id="purchase-title">اطلب منتجنا</h2>
            </div>
            <form className="purchase-form" onSubmit={submitOrder}>
              <div className="product-mobile" aria-hidden="true">
                <Image
                  src={`${images}product-small.webp`}
                  loading="eager"
                  alt=""
                  width={102}
                  height={200}
                  unoptimized
                />
                <div className="mobile-pack">
                  <bdi lang="en">SHAYA BIO</bdi>
                  <span>60 كبسولة في العبوة</span>
                </div>
              </div>
              <fieldset className="purchase-fields" disabled={preparing}>
                <div className="field-row">
                  <label htmlFor="order-last-name">
                    اللقب
                    <input
                      id="order-last-name"
                      name="lastName"
                      autoComplete="family-name"
                      placeholder="بن أحمد"
                      required
                      minLength={2}
                      maxLength={60}
                      pattern={".*\\S.*"}
                      onBlur={(event) => {
                        event.currentTarget.value =
                          event.currentTarget.value.trim();
                      }}
                    />
                  </label>
                  <label htmlFor="order-first-name">
                    الاسم
                    <input
                      id="order-first-name"
                      name="firstName"
                      autoComplete="given-name"
                      placeholder="محمد"
                      required
                      minLength={2}
                      maxLength={60}
                      pattern={".*\\S.*"}
                      onBlur={(event) => {
                        event.currentTarget.value =
                          event.currentTarget.value.trim();
                      }}
                    />
                  </label>
                </div>
                <label htmlFor="order-phone">
                  رقم الهاتف
                  <input
                    id="order-phone"
                    name="phone"
                    type="tel"
                    dir="ltr"
                    autoComplete="tel-national"
                    inputMode="numeric"
                    placeholder="0512345678"
                    required
                    maxLength={10}
                    pattern="0[567][0-9]{8}"
                    title="10 أرقام تبدأ بـ 05 أو 06 أو 07"
                    onChange={(event) => {
                      event.currentTarget.value = normalizePhone(
                        event.currentTarget.value,
                      )
                        .replace(/\D/g, "")
                        .slice(0, 10);
                      event.currentTarget.setCustomValidity("");
                    }}
                  />
                </label>
                <div className="field-row">
                  <LocationPicker
                    id="order-wilaya"
                    label="الولاية"
                    placeholder="اختر الولاية"
                    value={wilayaCode}
                    options={wilayaOptions}
                    invalid={locationError && !wilayaCode}
                    onChange={(value) => {
                      setWilayaCode(value);
                      setCommuneId("");
                      setLocationError(false);
                    }}
                  />
                  <LocationPicker
                    id="order-commune"
                    label="البلدية"
                    placeholder="اختر البلدية"
                    value={communeId}
                    options={(selectedWilaya?.communes ?? []).map(
                      (commune) => ({ value: commune.id, label: commune.name }),
                    )}
                    disabled={!selectedWilaya}
                    invalid={locationError && !communeId}
                    onChange={(value) => {
                      setCommuneId(value);
                      setLocationError(false);
                    }}
                  />
                </div>
                {locationError && (
                  <p className="location-error" role="alert">
                    اختر الولاية والبلدية لإكمال البيانات
                  </p>
                )}
                <fieldset className="delivery-choice">
                  <legend>طريقة الاستلام</legend>
                  <div className="delivery-options" data-mode={mode}>
                    <label>
                      <input
                        type="radio"
                        name="deliveryMode"
                        value="home"
                        checked={mode === "home"}
                        onChange={() => setMode("home")}
                      />
                      <Home size={18} strokeWidth={1.7} aria-hidden="true" />
                      المنزل
                      <Amount value={getDeliveryPrice(wilayaCode, "home")} />
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="deliveryMode"
                        value="desk"
                        checked={mode === "desk"}
                        onChange={() => setMode("desk")}
                      />
                      <Building2
                        size={18}
                        strokeWidth={1.7}
                        aria-hidden="true"
                      />
                      المكتب
                      <Amount value={getDeliveryPrice(wilayaCode, "desk")} />
                    </label>
                  </div>
                </fieldset>
                <div className="quantity-row">
                  <div className="quantity-control">
                    <span id="quantity-label">الكمية</span>
                    <div
                      className="quantity-buttons"
                      aria-labelledby="quantity-label"
                    >
                      <button
                        type="button"
                        aria-label="تقليل الكمية"
                        disabled={quantity === 1}
                        onClick={() =>
                          setQuantity((value) => Math.max(1, value - 1))
                        }
                      >
                        <Minus size={17} />
                      </button>
                      <output aria-live="polite" aria-label="عدد العبوات">
                        {quantity}
                      </output>
                      <button
                        type="button"
                        aria-label="زيادة الكمية"
                        disabled={
                          quantity >=
                          Math.min(MAX_QUANTITY, product?.stock ?? MAX_QUANTITY)
                        }
                        onClick={() =>
                          setQuantity((value) =>
                            Math.min(MAX_QUANTITY, value + 1),
                          )
                        }
                      >
                        <Plus size={17} />
                      </button>
                    </div>
                  </div>
                  <div className="quantity-bottles">
                    <BottleStack quantity={quantity} mini />
                  </div>
                </div>
                <div
                  className="price-breakdown"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <div className="price-line">
                    <span className="price-label">
                      <Package size={19} strokeWidth={1.6} aria-hidden="true" />
                      <span>سعر العبوات</span>
                    </span>
                    <Amount value={amounts.subtotal} />
                  </div>
                  <div className="price-line">
                    <span className="price-label">
                      <Truck size={19} strokeWidth={1.6} aria-hidden="true" />
                      <span>سعر التوصيل</span>
                    </span>
                    <Amount value={delivery} />
                  </div>
                  <div className="price-total">
                    <span className="price-label">
                      <ReceiptText
                        size={19}
                        strokeWidth={1.6}
                        aria-hidden="true"
                      />
                      <span>الإجمالي مع التوصيل</span>
                    </span>
                    <Amount value={amounts.total} />
                  </div>
                </div>
                {deliveryMessage && (
                  <p className="delivery-message" role="status">
                    {deliveryMessage}
                  </p>
                )}
                {error && (
                  <p className="location-error" role="alert">
                    {error}
                  </p>
                )}
                {loaded && !product && (
                  <p className="delivery-message">
                    {storeError
                      ? "تعذر تحميل السعر والمخزون، أعد تحميل الصفحة"
                      : "الطلب غير متاح حتى يتم تحديث المخزون"}
                  </p>
                )}
                {product && !product.stock && (
                  <p className="delivery-message">
                    نفدت الكمية المتوفرة حاليًا
                  </p>
                )}
                <button
                  className="preview-order"
                  type="submit"
                  disabled={
                    unavailable ||
                    preparing ||
                    !product?.active ||
                    !product.stock ||
                    quantity > product.stock
                  }
                  aria-busy={preparing}
                  aria-label={preparing ? "جارٍ تجهيز الطلب" : "اطلب"}
                >
                  <span className="order-label">اطلب</span>
                  <Image
                    className="pour-bottle"
                    src={`${images}bottle-open.webp`}
                    alt=""
                    width={300}
                    height={140}
                    unoptimized
                  />
                  <span className="order-pills" aria-hidden="true">
                    {pillPositions.map(([x, y, turn], index) => (
                      <span
                        className="order-pill"
                        key={index}
                        style={
                          {
                            "--pill-x": `${x}%`,
                            "--pill-y": `${y}%`,
                            "--pill-turn": `${turn}deg`,
                            "--i": index,
                          } as CSSProperties
                        }
                      >
                        <Image
                          src={`${images}pill.webp`}
                          alt=""
                          width={80}
                          height={26}
                          unoptimized
                        />
                      </span>
                    ))}
                  </span>
                </button>
              </fieldset>
            </form>
          </div>
          <aside className="purchase-product" aria-label="عبوات SHAYA BIO">
            <BottleStack quantity={quantity} />
            <p>60 كبسولة في كل عبوة</p>
          </aside>
        </div>
      </section>
      {receipt && (
        <OrderSuccess
          receipt={receipt}
          onClose={() => {
            setReceipt(null);
            setQuantity(1);
            attempt.current = { fingerprint: "", key: "" };
          }}
        />
      )}
    </>
  );
}
