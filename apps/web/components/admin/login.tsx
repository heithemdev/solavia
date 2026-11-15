"use client";
import { useActionState } from "react";
import SolaviaLogo from "@/components/shared/solavia-logo";
import { prepareNotificationSound } from "@/lib/notification-audio";
import { login } from "@/app/admin/actions";
export default function Login() {
  const [state, action, pending] = useActionState(login, { error: "" });
  return (
    <main className="admin-login">
      <a className="login-wordmark" href="/" aria-label="Solavia">
        <SolaviaLogo dark />
      </a>
      <form
        action={action}
        className="login-panel"
        onSubmit={prepareNotificationSound}
      >
        <label>
          <span className="sr-only">Identifiant</span>
          <input
            name="username"
            autoComplete="username"
            required
            placeholder="Identifiant"
            maxLength={100}
          />
        </label>
        <label>
          <span className="sr-only">Mot de passe</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Mot de passe"
            maxLength={256}
          />
        </label>
        {state.error && (
          <p className="admin-error" role="alert">
            {state.error}
          </p>
        )}
        <button className="admin-primary" disabled={pending}>
          {pending ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </main>
  );
}
