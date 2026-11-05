"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api, ApiError } from "@/lib/sync";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      // Only follow same-site relative paths, so ?next= can't be used as an open redirect.
      const next = params.get("next");
      router.replace(next && /^\/(?![/\\])/.test(next) ? next : "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? String(err.body.error ?? "Sign-in failed") : "Can’t reach the server. You need a connection to sign in.");
      setBusy(false);
    }
  }

  return (
    <form className="card login" onSubmit={submit}>
      <div className="logo big">GS IT</div>
      <h1>ELV Site Survey</h1>
      <p className="muted small">Sign in with the account your administrator created for you.</p>
      <label className="field">
        <span className="field-label">Email</span>
        <input className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
      </label>
      <label className="field">
        <span className="field-label">Password</span>
        <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <button className="btn primary block" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="center-screen">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
