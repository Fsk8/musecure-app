"use client";
import { useAddress } from "@chopinframework/react";

export default function AuthTestPage() {
  const { address, isLoading, isLoginError, login, logout } = useAddress();

  const isAuthenticated = !!address; // <- en lugar de isAuthenticated del hook

  if (isLoading) {
    return <div style={{ padding: 16 }}>Cargando sesión…</div>;
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Auth Test (Chopin)</h1>

      {isLoginError && (
        <p style={{ color: "crimson" }}>
          Hubo un problema al iniciar sesión. Intenta nuevamente.
        </p>
      )}

      {isAuthenticated ? (
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <b>Address:</b> <code>{address}</code>
          </div>
          <button onClick={() => logout()}>Salir</button>
        </div>
      ) : (
        <button onClick={() => login()}>Conectar Wallet</button>
      )}
    </div>
  );
}
