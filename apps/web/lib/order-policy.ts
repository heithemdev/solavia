import type { OrderStatus } from "./store-types";
export const PRODUCT_ID = "shaya-bio";
export function algeriaDay(date = new Date()) {
  return new Date(
    `${new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Algiers", year: "numeric", month: "2-digit", day: "2-digit" }).format(date)}T00:00:00Z`,
  );
}

export function stockChange(
  previous: OrderStatus,
  next: OrderStatus,
  quantity: number,
) {
  const reserved = (status: OrderStatus) =>
    status === "CONFIRMED" || status === "DELIVERED";
  return (Number(reserved(previous)) - Number(reserved(next))) * quantity;
}
export function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
