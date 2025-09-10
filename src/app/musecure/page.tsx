"use client";

import { useRef, useState } from "react";
import { useAddress } from "@chopinframework/react";
import { sha256File } from "../lib/hashing";
import { fileToAcoustIdFingerprint } from "../lib/fingerprint";

const API_DIRECT = process.env.NEXT_PUBLIC_API_DIRECT_BASE || ""; // p.ej. http://localhost:3000
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB por defecto

type VerifyResult =
  | { verified: false }
  | { verified: true; notarized?: boolean; payload: any };

async function readJsonOrText(res: Response) {
  const text = await res.text();
  try {
    return { ok: res.ok, data: JSON.parse(text) as any };
  } catch {
    return { ok: res.ok, data: { message: text || res.statusText } };
  }
}

export default function MusecurePage() {
  const { address, login, logout } = useAddress();

  const refRegistrar = useRef<HTMLDivElement | null>(null);
  const refVerificar = useRef<HTMLDivElement | null>(null);

  // Registro
  const [file, setFile] = useState<File | null>(null);
  const [sha, setSha] = useState("");
  const [cid, setCid] = useState<string>("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  // Fingerprint / AcoustID
  const [fp, setFp] = useState<string>("");
  const [fpDur, setFpDur] = useState<number | null>(null);
  const [acoustIdResp, setAcoustIdResp] = useState<any>(null);

  // Verificación
  const [verifyValue, setVerifyValue] = useState("");
  const [verifyRes, setVerifyRes] = useState<VerifyResult | null>(null);
  const [verifyErr, setVerifyErr] = useState("");
  const [verifyBusy, setVerifyBusy] = useState(false);

  function scrollTo(el: HTMLElement | null) {
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleHash() {
    if (!file) {
      setStatus("Selecciona un archivo");
      return;
    }
    setBusy(true);
    setStatus("Calculando hash…");
    try {
      const h = await sha256File(file);
      setSha(h);
      setStatus("Hash listo");
    } catch (e: any) {
      setStatus("Error al calcular hash: " + (e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function handleFingerprint() {
    if (!file) {
      setStatus("Selecciona un archivo");
      return;
    }
    setBusy(true);
    setStatus("Calculando fingerprint (Chromaprint)...");
    try {
      const { fingerprint, duration } = await fileToAcoustIdFingerprint(file);
      setFp(fingerprint);
      setFpDur(duration);
      setStatus(`Fingerprint listo (dur: ${duration}s)`);
    } catch (e: any) {
      setStatus("Error fingerprint: " + (e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function handleAcoustIdLookup() {
    if (!fp || !fpDur) {
      setStatus("Primero calcula el fingerprint");
      return;
    }
    setBusy(true);
    setStatus("Consultando AcoustID...");
    try {
      const r = await fetch("/api/acoustid/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint: fp, duration: fpDur }),
      });
      const { ok, data } = await readJsonOrText(r);
      if (!ok) throw new Error(data?.message || "Error en lookup AcoustID");
      setAcoustIdResp(data);
      setStatus("Consulta AcoustID completa");
    } catch (e: any) {
      setStatus("Error AcoustID: " + (e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function handleUploadToIPFS() {
    if (!file) {
      setStatus("Selecciona un archivo");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setStatus(
        `El archivo supera el límite (${
          (MAX_FILE_BYTES / 1024 / 1024) | 0
        } MB).`
      );
      return;
    }
    setBusy(true);
    setStatus("Subiendo a IPFS…");
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch(`${API_DIRECT}/api/upload-ipfs`, {
        method: "POST",
        body: form,
      });
      const { ok, data } = await readJsonOrText(r);
      if (!ok) throw new Error(data?.message || "Error al subir (IPFS)");
      if (!data?.cid) throw new Error("Respuesta sin CID");
      setCid(data.cid);
      setStatus("Archivo subido ✅  CID: " + data.cid);
    } catch (e: any) {
      setStatus("Error al subir: " + (e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister() {
    try {
      if (!address) {
        await login();
        return;
      }
      if (!file) {
        setStatus("Selecciona un archivo");
        return;
      }

      setBusy(true);
      setStatus("Preparando…");

      const theSha = sha || (await sha256File(file));
      setSha(theSha);

      let theCid = cid;
      if (!theCid) {
        if (file.size > MAX_FILE_BYTES) {
          throw new Error(
            `El archivo supera el límite (${
              (MAX_FILE_BYTES / 1024 / 1024) | 0
            } MB).`
          );
        }
        setStatus("Subiendo a IPFS…");
        const form = new FormData();
        form.append("file", file);
        const r = await fetch(`${API_DIRECT}/api/upload-ipfs`, {
          method: "POST",
          body: form,
        });
        const { ok, data } = await readJsonOrText(r);
        if (!ok) throw new Error(data?.message || "Error al subir (IPFS)");
        if (!data?.cid) throw new Error("Respuesta sin CID");
        theCid = data.cid;
        setCid(theCid);
      }

      setStatus("Notarizando en Chopin y guardando…");
      const r = await fetch("/api/register-work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: file.name,
          artist: null,
          cid_audio: theCid,
          sha256_audio: theSha,
          fingerprint: fp || null, // 👈 guarda fingerprint si ya lo calculaste
          metadata: {
            size: file.size,
            type: file.type,
            duration: fpDur ?? undefined,
          },
        }),
      });
      const { ok, data } = await readJsonOrText(r);
      if (!ok) throw new Error(data?.message || "Error al registrar");
      setStatus(
        "✅ Registro completo" +
          (data?.payload?.timestamp
            ? ` (ts: ${new Date(data.payload.timestamp).toLocaleString()})`
            : "")
      );
    } catch (e: any) {
      setStatus("Error: " + (e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function doVerify(kind: "sha256" | "cid") {
    try {
      setVerifyErr("");
      setVerifyRes(null);
      const v = verifyValue.trim();
      if (!v) {
        setVerifyErr("Ingresa un valor");
        return;
      }
      setVerifyBusy(true);
      const r = await fetch(`/api/verify?${kind}=${encodeURIComponent(v)}`);
      const { ok, data } = await readJsonOrText(r);
      if (!ok) throw new Error(data?.message || "Error al verificar");
      setVerifyRes(data as VerifyResult);
    } catch (e: any) {
      setVerifyErr(e?.message ?? "Error");
    } finally {
      setVerifyBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="topbar glass">
        <div className="brand">
          <a href="/" className="brand-link">
            MuSecure
          </a>
          <span className="badge">Chopin + Celestia</span>
        </div>

        <nav className="nav">
          <button
            className="btn"
            onClick={() => scrollTo(refRegistrar.current)}
          >
            Registrar
          </button>
          <button
            className="btn"
            onClick={() => scrollTo(refVerificar.current)}
          >
            Verificar
          </button>
          <a className="btn" href="/musecure/history">
            Historial
          </a>
          <a className="btn" href="/auth-test">
            Auth Test
          </a>
        </nav>

        <div className="session">
          {address ? (
            <>
              <code className="addr">{address}</code>
              <button className="btn btn-danger" onClick={() => logout()}>
                Salir
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => login()}>
              Conectar Wallet
            </button>
          )}
        </div>
      </header>

      <section className="hero card">
        <h1>Registrar & Verificar</h1>
        <p>
          Sube un archivo de audio, obtén el hash (SHA-256), el fingerprint
          Chromaprint y el CID de IPFS, y notariza su existencia con Chopin.
        </p>
      </section>

      <section ref={refRegistrar} className="card">
        <h2>Registrar Obra</h2>
        <p className="muted">
          1) Selecciona archivo → 2) SHA-256 → 1b) Fingerprint → 3) IPFS → 4)
          Notariza
        </p>

        <div className="stack">
          <input
            className="input"
            type="file"
            accept="audio/*"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (f && f.size > MAX_FILE_BYTES) {
                setStatus(
                  `El archivo supera el límite (${
                    (MAX_FILE_BYTES / 1024 / 1024) | 0
                  } MB).`
                );
                e.currentTarget.value = "";
                return;
              }
              setFile(f);
              setSha("");
              setCid("");
              setFp("");
              setFpDur(null);
              setAcoustIdResp(null);
              setStatus("");
            }}
          />

          <div className="row">
            <button
              className="btn"
              onClick={handleHash}
              disabled={busy || !file}
            >
              1) Calcular SHA-256
            </button>
            <button
              className="btn"
              onClick={handleFingerprint}
              disabled={busy || !file}
            >
              1b) Fingerprint (WASM)
            </button>
            <button
              className="btn"
              onClick={handleUploadToIPFS}
              disabled={busy || !file}
            >
              2) Subir a IPFS
            </button>
            <button
              className="btn btn-primary"
              onClick={handleRegister}
              disabled={busy || !file}
            >
              3) Notarizar y Guardar
            </button>
          </div>

          {!!sha && (
            <div className="kv">
              <b>SHA-256</b>
              <code className="mono">{sha}</code>
            </div>
          )}
          {!!fp && (
            <div className="kv">
              <b>Fingerprint</b>
              <code
                className="mono"
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "block",
                }}
              >
                {fp}
              </code>
            </div>
          )}
          {fpDur != null && (
            <div className="kv">
              <b>Duración</b>
              <span>{fpDur}s</span>
            </div>
          )}
          {!!cid && (
            <div className="kv">
              <b>CID</b>
              <span>
                <code className="mono">{cid}</code>{" "}
                <a
                  className="link"
                  href={`https://ipfs.io/ipfs/${cid}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver en IPFS
                </a>
              </span>
            </div>
          )}

          <div className="row">
            <button
              className="btn"
              onClick={handleAcoustIdLookup}
              disabled={busy || !fp || !fpDur}
            >
              Buscar en AcoustID
            </button>
          </div>

          {acoustIdResp && (
            <pre className="result">
              {JSON.stringify(acoustIdResp, null, 2)}
            </pre>
          )}

          {status && (
            <div className={`status ${busy ? "busy" : ""}`}>
              {busy ? "⏳ " : "✅ "}
              {status}
            </div>
          )}
        </div>
      </section>

      <section ref={refVerificar} className="card">
        <h2>Verificar</h2>
        <p className="muted">
          Ingresa un SHA-256 o un CID para comprobar si fue notarizado.
        </p>

        <div className="stack">
          <input
            className="input"
            value={verifyValue}
            onChange={(e) => setVerifyValue(e.target.value)}
            placeholder="Pega un SHA-256 o un CID"
          />

          <div className="row">
            <button
              className="btn"
              onClick={() => doVerify("sha256")}
              disabled={verifyBusy || !verifyValue.trim()}
            >
              Verificar por SHA-256
            </button>
            <button
              className="btn"
              onClick={() => doVerify("cid")}
              disabled={verifyBusy || !verifyValue.trim()}
            >
              Verificar por CID
            </button>
          </div>

          {verifyErr && <p className="error">{verifyErr}</p>}
          {verifyRes && (
            <pre className="result">{JSON.stringify(verifyRes, null, 2)}</pre>
          )}
        </div>
      </section>

      <footer className="foot">
        <span className="muted">
          © {new Date().getFullYear()} MuSecure — construida con Chopin +
          Next.js
        </span>
      </footer>

      <style jsx>{`
        .page {
          padding: 20px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .glass {
          backdrop-filter: blur(6px);
          background: rgba(255, 255, 255, 0.7);
        }
        .topbar {
          position: sticky;
          top: 0;
          z-index: 10;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          margin-bottom: 14px;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .brand-link {
          font-weight: 800;
          color: #111827;
          text-decoration: none;
        }
        .badge {
          background: #e0f2fe;
          color: #075985;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 12px;
        }
        .nav {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .session {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          align-items: center;
        }
        .addr {
          font-size: 12px;
          max-width: 280px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          background: #0b1220;
          color: #e5e7eb;
          padding: 6px 8px;
          border-radius: 10px;
        }
        .hero.card {
          background: linear-gradient(180deg, #0ea5e9, #06b6d4);
          color: white;
          box-shadow: 0 10px 30px rgba(2, 132, 199, 0.35);
        }
        .hero h1 {
          margin: 0 0 6px 0;
        }
        .card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
        }
        .stack {
          display: grid;
          gap: 12px;
        }
        .row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .kv {
          display: grid;
          grid-template-columns: 120px 1fr;
          align-items: center;
          gap: 8px;
        }
        .input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
        }
        .btn {
          display: inline-flex;
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
        .btn-danger {
          background: #ef4444;
          color: white;
          border-color: #ef4444;
        }
        .btn-danger:hover {
          background: #dc2626;
        }
        .link {
          color: #0284c7;
          text-decoration: none;
        }
        .link:hover {
          text-decoration: underline;
        }
        .mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            "Liberation Mono", "Courier New", monospace;
        }
        .status {
          padding: 10px 12px;
          border-radius: 12px;
          background: #ecfeff;
          color: #0e7490;
          border: 1px solid #a5f3fc;
        }
        .status.busy {
          background: #fff7ed;
          color: #9a3412;
          border-color: #fed7aa;
        }
        .muted {
          color: #6b7280;
        }
        .error {
          color: #dc2626;
        }
        .result {
          background: #0b1220;
          color: #e5e7eb;
          padding: 12px;
          border-radius: 12px;
          overflow-x: auto;
        }
        .foot {
          text-align: center;
          padding: 8px;
          color: #6b7280;
        }
        @media (prefers-color-scheme: dark) {
          .page {
            color: #e5e7eb;
          }
          .glass {
            background: rgba(17, 24, 39, 0.5);
            border-color: #1f2937;
          }
          .brand-link {
            color: #e5e7eb;
          }
          .card {
            background: #0b1220;
            border-color: #111827;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
          }
          .input {
            background: #0b1220;
            color: #e5e7eb;
            border-color: #1f2937;
          }
          .btn {
            background: #0b1220;
            color: #e5e7eb;
            border-color: #1f2937;
          }
          .btn:hover {
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
          }
          .status {
            background: #082f49;
            color: #e0f2fe;
            border-color: #0ea5e9;
          }
          .status.busy {
            background: #3f1d0f;
            color: #fed7aa;
            border-color: #ea580c;
          }
          .badge {
            background: #083344;
            color: #7dd3fc;
          }
        }
      `}</style>
    </div>
  );
}
