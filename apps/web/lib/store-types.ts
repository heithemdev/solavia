export const ORDER_STATUSES = [
  "NEW",
  "CONFIRMED",
  "DELIVERED",
  "CANCELED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type ProductInfo = {
  id: string;
  name: string;
  stock: number;
  baselineStock: number;
  priceCentimes: number;
  active: boolean;
  version: number;
};
export type Receipt = {
  customerNumber: number;
  reference: string;
  number: number;
  fullName: string;
  phone: string;
  quantity: number;
  unitPriceCentimes: number;
  subtotalCentimes: number;
  deliveryPriceCentimes: number;
  totalCentimes: number;
  deliveryMode: "HOME" | "DESK";
  wilayaName: string;
  communeName: string;
  createdAt: string;
};
export type OrderRow = Receipt & {
  id: string;
  status: OrderStatus;
  version: number;
  deletedAt: string | null;
};
export type CheckoutInput = {
  idempotencyKey: string;
  firstName: string;
  lastName: string;
  phone: string;
  quantity: number;
  wilayaCode: string;
  communeId: string;
  deliveryMode: "HOME" | "DESK";
  expectedUnitPriceCentimes: number;
  address?: string;
  trackingConsent?: boolean;
  fbp?: string;
  fbc?: string;
};
export type CheckoutResult =
  | { ok: true; receipt: Receipt; product: ProductInfo | null; eventId: string }
  | { ok: false; code: string; message: string; product?: ProductInfo | null };
export const moneyDzd = (centimes: number) =>
  new Intl.NumberFormat("fr-DZ", {
    style: "currency",
    currency: "DZD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(centimes / 100);
