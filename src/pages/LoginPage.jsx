import { useState } from "react";
import styles from "./LoginPage.module.css";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function LoginPage({ onLogin, onRegister, onGuest }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed. Please check your credentials.");
        return;
      }
      onLogin(data);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Sign In</h1>
        <p className={styles.subtitle}>Access your account</p>

        {error && <p className={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className={styles.input}
            />
          </div>

          <button type="submit" className={styles.submit} disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </button>

          <div className={styles.divider}>
            <span>OR</span>
          </div>

          <button type="button" className={styles.guest} onClick={onGuest}>
            Continue as Guest
          </button>
        </form>

        <p className={styles.footer}>
          New user?{" "}
          <button onClick={onRegister} className={styles.register}>
            Create an account
          </button>
        </p>
      </div>
    </div>
  );
}
