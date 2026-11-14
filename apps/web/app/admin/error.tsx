"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="admin-empty">
      <h1>Connexion momentanément indisponible</h1>
      <p>Vos données sont conservées. Réessayez dans un instant</p>
      <button className="admin-primary" onClick={reset}>
        Réessayer
      </button>
    </div>
  );
}
