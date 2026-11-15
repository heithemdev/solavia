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
  Building2,
  Home,
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
import AdminSelect from "../select";
import Skeleton from "../skeleton";
const statuses: Record<OrderStatus, string> = {
  NEW: "Nouvelle",
  CONFIRMED: "Confirmée",
  DELIVERED: "Livrée",
  CANCELED: "Annulée",
};
const statusOptions = ORDER_STATUSES.map((value) => ({
  value,
  label: statuses[value],
}));
export default function Orders({
  orders,
  next = null,
  stock,
  baseline = 0,
}: {
  orders?: OrderRow[];
  next?: string | null;
  stock?: number;
  baseline?: number;
}) {
  const router = useRouter(),
    params = useSearchParams();
  const [pending, start] = useTransition(),
    [error, setError] = useState(""),
    [query, setQuery] = useState(params.get("q") || ""),
    [busy, setBusy] = useState<string | null>(null),
    [filtersOpen, setFiltersOpen] = useState(false),
    [deleting, setDeleting] = useState<OrderRow | null>(null);
  const dialog = useRef<HTMLDialogElement>(null),
    lastQuery = useRef(params.get("q") || "");
  const trash = params.get("tab") === "trash",
    filterCount = ["status", "mode", "days"].filter((key) =>
      params.get(key),
    ).length;
  function filter(key: string, value: string) {
    const p = new URLSearchParams(params.toString());
    value ? p.set(key, value) : p.delete(key);
    if (key !== "cursor") p.delete("cursor");
    start(() => router.replace(`/admin/orders?${p}`, { scroll: false }));
  }
  useEffect(() => {
    if (query === lastQuery.current) return;
    const timer = setTimeout(() => {
      lastQuery.current = query;
      filter("q", query);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);
  async function change(
    order: OrderRow,
    operation: OrderStatus | "DELETE" | "RESTORE" | "PURGE",
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
  const low =
      stock !== undefined &&
      (stock === 0 || (baseline > 0 && stock / baseline < 0.05)),
    loading = orders === undefined || pending;
  return (
    <>
      <div className="page-heading">
        <h1>Les commandes</h1>
        <span className={`stock-chip ${low ? "is-low" : ""}`}>
          <Package size={17} />
          {stock === undefined ? (
            <Skeleton />
          ) : (
            <>{stock} flacons disponibles</>
          )}
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
              Filtres{filterCount ? ` (${filterCount})` : ""}
            </button>
          </div>
        </div>
        <div className="filter-bottom" id="order-filter-details">
          <label>
            <span>Statut</span>
            <AdminSelect
              label="Filtrer par statut"
              value={params.get("status") || ""}
              options={[
                { value: "", label: "Tous les statuts" },
                ...statusOptions,
              ]}
              onChange={(v) => filter("status", v)}
            />
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
            <span>Période</span>
            <AdminSelect
              label="Filtrer par période"
              value={params.get("days") || ""}
              options={[
                { value: "", label: "Toutes les dates" },
                ...[7, 30, 90].map((n) => ({
                  value: String(n),
                  label: `${n} derniers jours`,
                })),
              ]}
              onChange={(v) => filter("days", v)}
            />
          </label>
          <label>
            <span>Ordre</span>
            <AdminSelect
              label="Trier les commandes"
              value={params.get("sort") || "priority"}
              options={[
                { value: "priority", label: "Nouvelles en priorité" },
                { value: "recent", label: "Plus récentes" },
                { value: "oldest", label: "Plus anciennes" },
              ]}
              onChange={(v) => filter("sort", v)}
            />
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
        className="orders-table"
        role="table"
        aria-label="Commandes"
        aria-busy={loading}
      >
        <div className="orders-table-head" role="row">
          {[
            "Produit",
            "Client",
            "Téléphone",
            "Destination",
            "Qté",
            "Total",
          ].map((label) => (
            <span key={label} role="columnheader">
              {label}
            </span>
          ))}
        </div>
        {loading ? (
          Array.from({ length: 3 }, (_, i) => (
            <div className="order-item" key={i} aria-hidden="true">
              <div className="order-data-row">
                {[
                  "product",
                  "client",
                  "phone",
                  "destination",
                  "quantity",
                  "total",
                ].map((cell) => (
                  <div
                    className={`order-data-cell order-cell-${cell}`}
                    key={cell}
                  >
                    {cell === "product" ? (
                      <BottleStack quantity={1} small />
                    ) : (
                      <>
                        <Skeleton />
                        <Skeleton className="skeleton-short" />
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="order-actions">
                <Skeleton className="skeleton-status" />
                <Skeleton className="skeleton-status" />
              </div>
            </div>
          ))
        ) : orders!.length === 0 ? (
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
          orders!.map((order) => (
            <article
              className="order-item"
              role="rowgroup"
              key={order.id}
              aria-busy={busy === order.id}
            >
              <div className="order-data-row" role="row">
                <div className="order-data-cell order-cell-product" role="cell">
                  <BottleStack quantity={order.quantity} small />
                </div>
                <div
                  className="order-data-cell order-cell-client"
                  role="cell"
                  data-label="Client"
                >
                  <strong dir="auto">{order.fullName}</strong>
                  <span className="order-ref">{order.reference}</span>
                  <time dateTime={order.createdAt}>
                    {new Date(order.createdAt).toLocaleString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                      timeZone: "Africa/Algiers",
                    })}
                  </time>
                </div>
                <div
                  className="order-data-cell order-cell-phone"
                  role="cell"
                  data-label="Téléphone"
                >
                  <a href={`tel:${order.phone}`}>
                    <Phone size={15} />
                    <bdi>{order.phone}</bdi>
                  </a>
                </div>
                <div
                  className="order-data-cell order-cell-destination"
                  role="cell"
                  data-label="Destination"
                >
                  <strong>{order.wilayaName}</strong>
                  <span>{order.communeName}</span>
                  <small>
                    {order.deliveryMode === "HOME" ? (
                      <Home size={14} />
                    ) : (
                      <Building2 size={14} />
                    )}{" "}
                    {order.deliveryMode === "HOME" ? "À domicile" : "Stop desk"}
                  </small>
                </div>
                <div
                  className="order-data-cell order-cell-quantity"
                  role="cell"
                  data-label="Quantité"
                >
                  <strong>× {order.quantity}</strong>
                </div>
                <div
                  className="order-data-cell order-cell-total"
                  role="cell"
                  data-label="Total livré"
                >
                  <strong>{moneyDzd(order.totalCentimes)}</strong>
                </div>
              </div>
              <div className="order-actions">
                <AdminSelect
                  className={`status-${order.status.toLowerCase()}`}
                  label={`Statut de ${order.reference}`}
                  value={order.status}
                  options={statusOptions}
                  disabled={trash || busy === order.id}
                  onChange={(v) => change(order, v as OrderStatus)}
                />
                <div>
                  {trash ? (
                    <>
                      <button
                        className="action-text"
                        disabled={busy === order.id}
                        onClick={() => change(order, "RESTORE")}
                      >
                        <RotateCcw size={17} />
                        Restaurer
                      </button>
                      <button
                        className="admin-icon-button delete-action"
                        aria-label={`Supprimer définitivement ${order.reference}`}
                        disabled={busy === order.id}
                        onClick={() => {
                          setDeleting(order);
                          dialog.current?.showModal();
                        }}
                      >
                        <Trash2 size={17} />
                      </button>
                    </>
                  ) : (
                    <>
                      {order.status !== "CONFIRMED" &&
                        order.status !== "DELIVERED" && (
                          <button
                            className="action-text"
                            disabled={busy === order.id}
                            onClick={() => change(order, "CONFIRMED")}
                          >
                            <Check size={17} />
                            Confirmer
                          </button>
                        )}
                      {order.status === "CONFIRMED" && (
                        <button
                          className="action-text"
                          disabled={busy === order.id}
                          onClick={() => change(order, "DELIVERED")}
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
                        disabled={busy === order.id}
                        onClick={() => {
                          setDeleting(order);
                          dialog.current?.showModal();
                        }}
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
        <h2>
          {trash
            ? "Supprimer définitivement ?"
            : "Déplacer dans la corbeille ?"}
        </h2>
        <p>
          {trash
            ? "Cette commande et ses données seront effacées définitivement, sans modifier le stock"
            : deleting?.status === "DELIVERED"
              ? "Cette commande livrée sera archivée sans modifier le stock"
              : "Cette commande sera annulée et son stock sera rendu disponible"}
        </p>
        <p>
          {trash
            ? "Cette action est irréversible"
            : "Vous pourrez la restaurer pendant 30 jours"}
        </p>
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
              if (deleting) change(deleting, trash ? "PURGE" : "DELETE");
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
