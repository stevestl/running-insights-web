import { useState } from "react";

type Props = {
  busy: boolean;
  error: string;
  onSignIn: (email: string, password: string) => void;
  onSignUp: (email: string, password: string) => void;
};

export function AuthGate({ busy, error, onSignIn, onSignUp }: Props): JSX.Element {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="card auth-card">
      <h1>Running Insights</h1>
      <p>Sign in with email/password to sync across devices.</p>

      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />

      <div className="row">
        <button disabled={busy} onClick={() => onSignIn(email, password)}>Sign In</button>
        <button className="secondary" disabled={busy} onClick={() => onSignUp(email, password)}>Create Account</button>
      </div>

      {busy && <div className="muted">Working...</div>}
      {!!error && <div className="error">{error}</div>}
    </div>
  );
}
