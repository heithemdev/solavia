"use client";
import { useState, useTransition } from "react";
import {
  ScanLine,
  KeyRound,
  ExternalLink,
  ShieldCheck,
  Check,
} from "lucide-react";
import { savePixel } from "@/app/admin/actions";
export default function Pixel({
  pixelId,
  hasToken,
}: {
  pixelId: string;
  hasToken: boolean;
}) {
  const [pending, start] = useTransition(),
    [message, setMessage] = useState(""),
    [error, setError] = useState(false);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Votre connexion à Meta</h1>
          <p>Reliez la boutique à vos campagnes, en quelques étapes</p>
        </div>
      </div>
      <div className="pixel-layout">
        <form
          className="admin-panel pixel-form"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const form = e.currentTarget;
            start(async () => {
              try {
                const result = await savePixel({
                  pixelId: String(f.get("pixelId") || "").trim(),
                  token: String(f.get("token") || ""),
                  removeToken: f.get("remove") === "on",
                });
                setError(Boolean(result.error));
                setMessage(result.error || "Paramètres enregistrés");
                if (!result.error)
                  (form.elements.namedItem("token") as HTMLInputElement).value =
                    "";
              } catch {
                setError(true);
                setMessage("Impossible d’enregistrer les paramètres");
              }
            });
          }}
        >
          <h2>Configurer le suivi</h2>
          <label>
            <span>
              <ScanLine size={18} />
              Identifiant du Pixel
            </span>
            <input
              name="pixelId"
              inputMode="numeric"
              pattern="[0-9]{5,30}"
              placeholder="Ex. 123456789012345"
              defaultValue={pixelId}
              maxLength={30}
            />
          </label>
          <p>Gestionnaire d’évènements → Sources de données → Paramètres</p>
          <a
            href="https://www.facebook.com/events_manager2"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ouvrir le Gestionnaire d’évènements
            <ExternalLink size={14} />
          </a>
          <label>
            <span>
              <KeyRound size={18} />
              Clé API Conversions
            </span>
            <input
              name="token"
              type="password"
              autoComplete="new-password"
              placeholder={
                hasToken
                  ? "Clé déjà enregistrée · laisser vide pour la conserver"
                  : "Coller le jeton d’accès"
              }
              maxLength={10000}
            />
          </label>
          <p>
            Dans les paramètres de votre source de données, cherchez « API
            Conversions », puis générez un jeton d’accès
          </p>
          <a
            href="https://developers.facebook.com/docs/marketing-api/conversions-api/get-started/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Le guide officiel de Meta
            <ExternalLink size={14} />
          </a>
          {hasToken && (
            <label className="check-label">
              <input name="remove" type="checkbox" />
              Supprimer la clé enregistrée
            </label>
          )}
          {message && (
            <p
              className={error ? "admin-error" : "admin-success"}
              role="status"
            >
              {!error && <Check size={16} />} {message}
            </p>
          )}
          <button className="admin-primary" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer les paramètres"}
          </button>
        </form>
        <aside className="pixel-guide">
          <ShieldCheck size={30} />
          <h2>Vos accès restent privés</h2>
          <p>La clé API est chiffrée en base et reste sur le serveur</p>
          <h3>Ce qui est transmis</h3>
          <ul>
            <li>
              <b>PageView</b> : ouverture de la boutique, après accord du
              visiteur
            </li>
            <li>
              <b>OrderPlaced</b> : commande enregistrée
            </li>
            <li>
              <b>OrderCanceled</b> : commande annulée
            </li>
            <li>
              <b>Purchase</b> : commande marquée comme livrée
            </li>
          </ul>
          <p>
            Les évènements de commande sont envoyés uniquement avec le
            consentement du client
          </p>
        </aside>
      </div>
    </>
  );
}
