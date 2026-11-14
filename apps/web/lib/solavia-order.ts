export const PRODUCT_PRICE = 2750;
export const MAX_QUANTITY = 99;

export function getOrderAmounts(quantity: number, delivery: number | null) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) throw new RangeError("Invalid quantity");
  if (delivery !== null && (!Number.isInteger(delivery) || delivery < 0)) throw new RangeError("Invalid delivery price");
  const subtotal = PRODUCT_PRICE * quantity;
  return { subtotal, delivery, total: delivery === null ? null : subtotal + delivery };
}

export function normalizePhone(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => String(digit.charCodeAt(0) - (digit <= "٩" ? 0x660 : 0x6f0))).replace(/[\s()-]/g, "");
}

export function isAlgerianMobile(value: string) {
  return /^0[567][0-9]{8}$/.test(normalizePhone(value));
}
