import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Login failed. Check your credentials.");
    } finally {
      setBusy(false);
    }
  }

  function fillDemo() {
    setEmail("demo@taskflow.app");
    setPassword("demo1234");
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="auth-brand">
          <span className="brand-logo">🗂️</span> TaskFlow
        </div>
        <p className="auth-tagline">Welcome back. Sign in to your boards.</p>

        {error && <div className="error-banner">{error}</div>}

        <div className="field">
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="field">
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <div className="auth-switch">
          No account? <Link to="/register">Create one</Link>
        </div>

        <div className="demo-hint">
          Try the demo —{" "}
          <a onClick={fillDemo} style={{ cursor: "pointer" }}>
            fill demo@taskflow.app / demo1234
          </a>
        </div>
      </form>
    </div>
  );
}
