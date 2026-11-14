"use client";
import { useActionState } from "react";
import { LockKeyhole, ArrowRight } from "lucide-react";
import { login } from "@/app/admin/actions";
export default function Login() {
  const [state, action, pending] = useActionState(login, { error: "" });
  return (
    <main className="admin-login">
      <div className="login-wordmark">
        Solavia<span>Un peu de calme, au quotidien</span>
      </div>
      <form action={action} className="login-panel">
        <span className="login-icon">
          <LockKeyhole size={24} />
        </span>
        <h1>Heureuse de vous retrouver</h1>
        <p>Connectez-vous à votre espace de gestion</p>
        <label>
          Identifiant
          <input
            name="username"
            autoComplete="username"
            required
            placeholder="Votre identifiant"
            maxLength={100}
          />
        </label>
        <label>
          Mot de passe
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Votre mot de passe"
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
          <ArrowRight size={18} />
        </button>
        <a href="/">Retour à la boutique</a>
      </form>
    </main>
  );
}
