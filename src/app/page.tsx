"use client";

export default function Home() {
  return (
    <main className="home">
      <section className="hero">
        <h1>Bienvenido a tu dApp</h1>
        <p>
          Sube tu obra, obten un CID de IPFS, y notariza la evidencia con Chopin
          sobre Celestia.
        </p>

        <div className="cta">
          <a className="btn btn-primary" href="/musecure">
            Ir a MuSecure
          </a>
          <a className="btn btn-ghost" href="/auth-test">
            Probar autenticación
          </a>
        </div>
      </section>

      <section className="grid">
        <article className="card">
          <h3>MuSecure</h3>
          <p>Registro y verificación de obras (audio) con hash y CID.</p>
          <a className="btn btn-secondary" href="/musecure">
            Abrir
          </a>
        </article>

        <article className="card">
          <h3>Historial</h3>
          <p>Lista de registros notarizados y accesos rápidos a IPFS.</p>
          <a className="btn" href="/musecure/history">
            Ver historial
          </a>
        </article>

        <article className="card">
          <h3>Auth Test</h3>
          <p>Comprobación de sesión y wallet con Chopin.</p>
          <a className="btn" href="/auth-test">
            Probar
          </a>
        </article>
      </section>

      <style jsx>{`
        .home {
          padding: 32px 20px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .hero {
          background: linear-gradient(180deg, #0ea5e9, #22d3ee);
          color: white;
          padding: 28px;
          border-radius: 18px;
          box-shadow: 0 8px 24px rgba(2, 132, 199, 0.35);
          margin-bottom: 28px;
        }
        .hero h1 {
          margin: 0 0 8px 0;
          font-size: 28px;
          line-height: 1.15;
        }
        .hero p {
          margin: 0 0 16px 0;
          opacity: 0.95;
        }
        .cta {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }
        .card {
          background: #fff;
          border: 1px solid #eee;
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.05);
        }
        .card h3 {
          margin: 0 0 6px 0;
        }

        .btn {
          display: inline-flex;
          gap: 8px;
          align-items: center;
          justify-content: center;
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          background: #f8fafc;
          color: #111827;
          text-decoration: none;
          font-weight: 600;
          transition: transform 0.05s ease, box-shadow 0.2s ease,
            background 0.2s ease;
        }
        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
        }
        .btn:active {
          transform: translateY(0);
        }
        .btn-primary {
          background: #111827;
          color: #fff;
          border-color: #111827;
        }
        .btn-primary:hover {
          background: #0b1220;
        }
        .btn-secondary {
          background: #0ea5e9;
          color: white;
          border-color: #0ea5e9;
        }
        .btn-secondary:hover {
          background: #0284c7;
        }
        .btn-ghost {
          background: transparent;
          color: #fff;
          border-color: rgba(255, 255, 255, 0.6);
        }
        .btn-ghost:hover {
          background: rgba(255, 255, 255, 0.12);
        }

        @media (prefers-color-scheme: dark) {
          .card {
            background: #0b1220;
            border-color: #111827;
          }
          .home {
            color: #e5e7eb;
          }
          .btn {
            background: #0b1220;
            color: #e5e7eb;
            border-color: #1f2937;
          }
          .btn:hover {
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
          }
          .btn-primary {
            background: #e5e7eb;
            color: #0b1220;
            border-color: #e5e7eb;
          }
          .btn-primary:hover {
            background: #fff;
          }
          .btn-secondary {
            background: #22d3ee;
            color: #0b1220;
            border-color: #22d3ee;
          }
        }
      `}</style>
    </main>
  );
}
