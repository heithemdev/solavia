"use client";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  Banknote,
  TrendingUp,
  Users,
  Pencil,
  Package,
  X,
  AlertTriangle,
  ShoppingBag,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { saveProduct } from "@/app/admin/actions";
import { moneyDzd, type ProductInfo } from "@/lib/store-types";
import BottleStack from "@/components/shared/bottle-stack";
import Skeleton from "../skeleton";
type Daily = { day: string; orders: number; revenue: number; visits: number };
export default function Dashboard({
  data,
  product,
  days,
}: {
  data?: { daily: Daily[]; totalOrders: number; totalRevenue: number };
  product?: ProductInfo | null;
  days: number;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    router = useRouter();
  const [pending, start] = useTransition(),
    [error, setError] = useState("");
  const daily = data?.daily || [];
  const periodRevenue = daily.reduce((s, d) => s + d.revenue, 0),
    visits = daily.reduce((s, d) => s + d.visits, 0),
    orders = daily.reduce((s, d) => s + d.orders, 0),
    maxVisits = Math.max(1, ...daily.map((d) => d.visits));
  const low =
    product &&
    (product.stock === 0 ||
      (product.baselineStock > 0 &&
        product.stock / product.baselineStock < 0.05));
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Une vue d’ensemble, simplement</h1>
        </div>
        <div className="admin-segment" aria-label="Période">
          {[7, 30, 90].map((n) => (
            <Link
              key={n}
              href={`?days=${n}`}
              aria-current={days === n ? "true" : undefined}
            >
              {n} jours
            </Link>
          ))}
        </div>
      </div>
      <div className="metric-grid">
        <article className="metric">
          <Banknote />
          <span>Ventes totales</span>
          <strong>{data ? moneyDzd(data.totalRevenue) : <Skeleton />}</strong>
          <small>
            {data ? (
              <>
                {data.totalOrders} commande{data.totalOrders > 1 ? "s" : ""},
                reçues · ventes confirmées/livrées, hors livraison
              </>
            ) : (
              <Skeleton />
            )}
          </small>
        </article>
        <article className="metric">
          <TrendingUp />
          <span>Moyenne par jour</span>
          <strong>
            {data ? moneyDzd(Math.round(periodRevenue / days)) : <Skeleton />}
          </strong>
          <small>
            {data ? (
              <>
                {orders} commande{orders > 1 ? "s" : ""} sur {days} jours · hors
                livraison
              </>
            ) : (
              <Skeleton />
            )}
          </small>
        </article>
        <article className="metric">
          <Users />
          <span>Visites sur {days} jours</span>
          <strong>
            {data ? visits.toLocaleString("fr-DZ") : <Skeleton />}
          </strong>
        </article>
      </div>
      <div className="dashboard-lower">
        <section className="admin-panel visits-panel">
          <div className="panel-heading">
            <h2>Les visites, au fil des jours</h2>
            <span>
              {data ? (
                <>
                  <b>{visits.toLocaleString("fr-DZ")}</b> visites · {days} jours
                </>
              ) : (
                <Skeleton />
              )}
            </span>
          </div>
          <div
            className="visits-chart"
            role="img"
            aria-label={`${visits} visites pendant les ${days} derniers jours`}
          >
            {!data && <Skeleton className="skeleton-chart" />}
            {daily.map((d, i) => (
              <div
                key={d.day}
                className="chart-column"
                title={`${d.day} : ${d.visits} visites`}
              >
                {days <= 30 && <b className="chart-count">{d.visits}</b>}
                <span
                  style={{
                    height: `${Math.max(2, (d.visits / maxVisits) * 100)}%`,
                  }}
                />
                <small>
                  {i === 0 || i === daily.length - 1
                    ? new Date(d.day).toLocaleDateString("fr-DZ", {
                        day: "numeric",
                        month: "short",
                      })
                    : ""}
                </small>
              </div>
            ))}
          </div>
          <details className="daily-visits">
            <summary>Visites par jour</summary>
            <div>
              {data ? (
                daily
                  .slice()
                  .reverse()
                  .map((d) => (
                    <p key={d.day}>
                      <time dateTime={d.day}>
                        {new Date(d.day).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                        })}
                      </time>
                      <strong>
                        {d.visits} visite{d.visits > 1 ? "s" : ""}
                      </strong>
                    </p>
                  ))
              ) : (
                <Skeleton />
              )}
            </div>
          </details>
          {data && visits === 0 && (
            <p className="chart-empty">
              Les premières visites apparaîtront ici
            </p>
          )}
        </section>
        <section className="admin-panel product-panel">
          <div className="panel-heading">
            <h2>Votre produit</h2>
            <button
              className="admin-icon-button"
              onClick={() => {
                setError("");
                dialog.current?.showModal();
              }}
              aria-label="Modifier le stock et le prix"
              disabled={product === undefined}
            >
              <Pencil size={18} />
            </button>
          </div>
          <BottleStack quantity={1} />
          <h3>SHAYA BIO</h3>
          {product === undefined ? (
            <>
              <strong className="product-price">
                <Skeleton />
              </strong>
              <div className="stock-row">
                <span>
                  <Package size={18} />
                  Stock disponible
                </span>
                <Skeleton className="skeleton-short" />
              </div>
            </>
          ) : product ? (
            <>
              <strong className="product-price">
                {moneyDzd(product.priceCentimes)}
              </strong>
              <div className="stock-row">
                <span>
                  <Package size={18} />
                  Stock disponible
                </span>
                <b>{product.stock}</b>
              </div>
              {low && (
                <p className="stock-warning">
                  <AlertTriangle size={16} />
                  {product.stock === 0
                    ? "Rupture de stock"
                    : "Stock inférieur à 5 % du dernier réassort"}
                </p>
              )}
              <span
                className={`publication ${product.active ? "is-active" : ""}`}
              >
                {product.active ? "En vente" : "Vente suspendue"}
              </span>
            </>
          ) : (
            <>
              <button
                className="admin-primary"
                onClick={() => dialog.current?.showModal()}
              >
                Configurer le produit
              </button>
            </>
          )}
        </section>
      </div>
      <Link className="orders-shortcut" href="/admin/orders">
        <ShoppingBag size={19} />
        Gérer les commandes
      </Link>
      <dialog
        className="admin-dialog"
        ref={dialog}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <button
          className="dialog-close admin-icon-button"
          onClick={() => dialog.current?.close()}
          aria-label="Fermer"
        >
          <X />
        </button>
        <h2>{product ? "Ajuster votre produit" : "Configurer SHAYA BIO"}</h2>
        <p>
          Le stock saisi devient la nouvelle référence pour l’alerte de réassort
        </p>
        <form
          key={product?.version ?? "new"}
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            start(async () => {
              const result = await saveProduct({
                stock: Number(f.get("stock")),
                priceCentimes: Math.round(Number(f.get("price")) * 100),
                active: f.get("active") === "on",
                version: product?.version ?? null,
              });
              if (result.error) setError(result.error);
              else {
                try {
                  localStorage.setItem(
                    "solavia-catalog-updated",
                    String(Date.now()),
                  );
                } catch {}
                dialog.current?.close();
                router.refresh();
              }
            });
          }}
        >
          <label>
            Stock disponible
            <input
              type="number"
              name="stock"
              min="0"
              max="1000000"
              step="1"
              required
              defaultValue={product?.stock}
              placeholder="Stock réel"
            />
          </label>
          <label>
            Prix du flacon (DA)
            <input
              type="number"
              name="price"
              min="1"
              max="100000"
              step="0.01"
              required
              defaultValue={product ? product.priceCentimes / 100 : 2750}
            />
          </label>
          <label className="check-label">
            <input
              name="active"
              type="checkbox"
              defaultChecked={product?.active ?? true}
            />
            Accepter les commandes
          </label>
          {error && (
            <p className="admin-error" role="alert">
              {error}
            </p>
          )}
          <button className="admin-primary" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      </dialog>
    </>
  );
}
