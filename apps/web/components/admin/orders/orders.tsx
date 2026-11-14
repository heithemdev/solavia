"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Phone,
  Check,
  Truck,
  Trash2,
  RotateCcw,
  X,
  Package,
  MapPin,
  Building2,
  Home,
  ChevronDown,
  ArrowRight,
  AlertTriangle,
  SlidersHorizontal,
} from "lucide-react";
import { updateOrder } from "@/app/admin/actions";
import {
  moneyDzd,
  ORDER_STATUSES,
  type OrderRow,
  type OrderStatus,
} from "@/lib/store-types";
import BottleStack from "@/components/shared/bottle-stack";
const statuses: Record<OrderStatus, string> = {
  NEW: "Nouvelle",
  CONFIRMED: "Confirmée",
  DELIVERED: "Livrée",
  CANCELED: "Annulée",
};
export default function Orders({
  orders,
  next,
  stock,
  baseline,
}: {
  orders: OrderRow[];
  next: string | null;
  stock: number;
  baseline: number;
}) {
  const router = useRouter(),
    params = useSearchParams(),
    [pending, start] = useTransition(),
    [error, setError] = useState(""),
    [query, setQuery] = useState(params.get("q") || ""),
    [busy, setBusy] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null),
    [deleting, setDeleting] = useState<OrderRow | null>(null);
  const trash = params.get("tab") === "trash";
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterCount = ["status", "mode", "days"].filter((key) =>
    params.get(key),
  ).length;
  function filter(key: string, value: string) {
    const p = new URLSearchParams(params.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    if (key !== "cursor") p.delete("cursor");
    start(() => router.replace(`/admin/orders?${p}`, { scroll: false }));
  }
  useEffect(() => {
    if (query === (params.get("q") || "")) return;
    const timer = setTimeout(() => filter("q", query), 350);
    return () => clearTimeout(timer);
  }, [query]);
  async function change(
    order: OrderRow,
    operation: OrderStatus | "DELETE" | "RESTORE",
  ) {
    setBusy(order.id);
    setError("");
    try {
      const result = await updateOrder(order.id, order.version, operation);
      if (result.error) setError(result.error);
      router.refresh();
    } catch {
      setError("La modification n’a pas été enregistrée. Réessayez");
    } finally {
      setBusy(null);
    }
  }
  const low = stock === 0 || (baseline > 0 && stock / baseline < 0.05);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Les commandes</h1>
          <p>Chaque commande, au bon endroit</p>
        </div>
        <span className={`stock-chip ${low ? "is-low" : ""}`}>
          <Package size={17} />
          {stock} flacons disponibles
        </span>
      </div>
      {low && (
        <div className="stock-alert">
          <AlertTriangle size={19} />
          {stock === 0
            ? "Le stock est épuisé. Mettez-le à jour dans le tableau de bord"
            : "Le stock est inférieur à 5 % du dernier stock saisi"}
        </div>
      )}
      <section className="order-filters" data-expanded={filtersOpen}>
        <div className="filter-top">
          <label className="search-field">
            <Search size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nom, téléphone ou référence"
              aria-label="Rechercher une commande"
              maxLength={80}
            />
          </label>
          <div className="filter-tools">
            <div className="admin-segment">
              <button aria-pressed={!trash} onClick={() => filter("tab", "")}>
                Actives
              </button>
              <button
                aria-pressed={trash}
                onClick={() => filter("tab", "trash")}
              >
                Corbeille
              </button>
            </div>
            <button
              className="filter-toggle"
              aria-expanded={filtersOpen}
              aria-controls="order-filter-details"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <SlidersHorizontal size={16} />
              Filtres{filterCount > 0 ? ` (${filterCount})` : ""}
            </button>
          </div>
        </div>
        <div className="filter-bottom" id="order-filter-details">
          <label>
            Statut
            <select
              value={params.get("status") || ""}
              onChange={(e) => filter("status", e.target.value)}
            >
              <option value="">Tous les statuts</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statuses[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Livraison
            <span className="admin-segment">
              <button
                aria-pressed={!params.get("mode")}
                onClick={() => filter("mode", "")}
              >
                Toutes
              </button>
              <button
                aria-pressed={params.get("mode") === "HOME"}
                onClick={() => filter("mode", "HOME")}
              >
                <Home size={15} />
                Maison
              </button>
              <button
                aria-pressed={params.get("mode") === "DESK"}
                onClick={() => filter("mode", "DESK")}
              >
                <Building2 size={15} />
                Bureau
              </button>
            </span>
          </label>
          <label>
            Période
            <select
              value={params.get("days") || ""}
              onChange={(e) => filter("days", e.target.value)}
            >
              <option value="">Toutes les dates</option>
              <option value="7">7 derniers jours</option>
              <option value="30">30 derniers jours</option>
              <option value="90">90 derniers jours</option>
            </select>
          </label>
          <label>
            Ordre
            <select
              value={params.get("sort") || "priority"}
              onChange={(e) => filter("sort", e.target.value)}
            >
              <option value="priority">Nouvelles en priorité</option>
              <option value="recent">Plus récentes</option>
              <option value="oldest">Plus anciennes</option>
            </select>
          </label>
        </div>
      </section>
      {trash && (
        <p className="trash-note">
          Les commandes supprimées restent récupérables pendant 30 jours
        </p>
      )}
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      <div
        className={`order-list ${pending ? "is-pending" : ""}`}
        aria-busy={pending}
      >
        {orders.length === 0 ? (
          <div className="admin-empty">
            <Package size={35} />
            <h2>
              {trash
                ? "La corbeille est vide"
                : "Aucune commande pour le moment"}
            </h2>
            <p>
              {query || params.get("status")
                ? "Essayez un autre filtre"
                : "Les nouvelles commandes apparaîtront ici"}
            </p>
          </div>
        ) : (
          orders.map((order) => (
            <article
              className="order-item"
              key={order.id}
              aria-busy={busy === order.id}
            >
              <div className="order-row">
                <BottleStack quantity={order.quantity} small />
                <div className="order-customer">
                  <div>
                    <span className="order-ref">{order.reference}</span>
                    <time dateTime={order.createdAt}>
                      {new Date(order.createdAt).toLocaleString("fr-DZ", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                        timeZone: "Africa/Algiers",
                      })}
                    </time>
                  </div>
                  <h2 dir="auto">{order.fullName}</h2>
                  <a href={`tel:${order.phone}`} className="order-phone">
                    <Phone size={14} />
                    {order.phone}
                  </a>
                </div>
                <div className="order-detail">
                  <strong>{moneyDzd(order.totalCentimes)}</strong>
                  <span>
                    {order.quantity} flacon{order.quantity > 1 ? "s" : ""} ·
                    livraison incluse
                  </span>
                </div>
                <div className="order-location">
                  <span>
                    {order.deliveryMode === "HOME" ? (
                      <Home size={17} />
                    ) : (
                      <Building2 size={17} />
                    )}{" "}
                    {order.deliveryMode === "HOME" ? "À domicile" : "Stop desk"}
                  </span>
                  <span dir="auto">
                    <MapPin size={14} />
                    {order.wilayaName} · {order.communeName}
                  </span>
                </div>
              </div>
              <div className="order-actions">
                <label
                  className={`status-select status-${order.status.toLowerCase()}`}
                >
                  <span className="sr-only">Statut de {order.reference}</span>
                  <select
                    value={order.status}
                    disabled={trash || busy === order.id}
                    onChange={(e) =>
                      change(order, e.target.value as OrderStatus)
                    }
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {statuses[s]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} />
                </label>
                <div>
                  {trash ? (
                    <button
                      className="action-text"
                      onClick={() => change(order, "RESTORE")}
                      disabled={busy === order.id}
                    >
                      <RotateCcw size={17} />
                      Restaurer
                    </button>
                  ) : (
                    <>
                      {order.status !== "CONFIRMED" &&
                        order.status !== "DELIVERED" && (
                          <button
                            className="action-text"
                            onClick={() => change(order, "CONFIRMED")}
                            disabled={busy === order.id}
                          >
                            <Check size={17} />
                            Confirmer
                          </button>
                        )}
                      {order.status === "CONFIRMED" && (
                        <button
                          className="action-text"
                          onClick={() => change(order, "DELIVERED")}
                          disabled={busy === order.id}
                        >
                          <Truck size={17} />
                          Livrée
                        </button>
                      )}
                      <a
                        className="action-text call-action"
                        href={`tel:${order.phone}`}
                      >
                        <Phone size={17} />
                        <span>Appeler</span>
                      </a>
                      <button
                        className="admin-icon-button delete-action"
                        aria-label={`Supprimer ${order.reference}`}
                        onClick={() => {
                          setDeleting(order);
                          dialog.current?.showModal();
                        }}
                        disabled={busy === order.id}
                      >
                        <Trash2 size={17} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
      <div className="pagination">
        {params.get("cursor") && (
          <button
            className="admin-secondary"
            onClick={() => filter("cursor", "")}
          >
            Revenir au début
          </button>
        )}
        {next && (
          <button
            className="admin-secondary"
            onClick={() => filter("cursor", next)}
          >
            Commandes suivantes
            <ArrowRight size={17} />
          </button>
        )}
      </div>
      <dialog ref={dialog} className="admin-dialog">
        <button
          className="dialog-close admin-icon-button"
          aria-label="Fermer"
          onClick={() => dialog.current?.close()}
        >
          <X />
        </button>
        <h2>Déplacer dans la corbeille ?</h2>
        <p>
          {deleting?.status === "DELIVERED"
            ? "Cette commande livrée sera archivée sans modifier le stock"
            : "Cette commande sera annulée et son stock sera rendu disponible"}
        </p>
        <p>Vous pourrez la restaurer pendant 30 jours</p>
        <div className="dialog-actions">
          <button
            className="admin-secondary"
            onClick={() => dialog.current?.close()}
          >
            Garder
          </button>
          <button
            className="admin-primary"
            onClick={() => {
              if (deleting) change(deleting, "DELETE");
              dialog.current?.close();
            }}
          >
            Supprimer
          </button>
        </div>
      </dialog>
    </>
  );
}
