import { useState } from "react";
import { ApiRequestError, login } from "../api/client";
import type { User } from "../api/client";

interface Props {
  onLogin: (user: User) => void;
}

export function Login({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await login(email.trim(), password);
      onLogin(user);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Khong ket noi duoc may chu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <form onSubmit={handleSubmit} className="glass-panel w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center font-extrabold text-slate-950 mb-3"
               style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-2))", boxShadow: "0 0 22px rgba(34,211,238,0.35)" }}>
            AI
          </div>
          <div className="text-sm font-bold tracking-widest text-text">SKU INSPECTION SYSTEM</div>
          <div className="text-xs text-text-faint mt-1">Đăng nhập để tiếp tục</div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-text-dim mb-1">Tài khoản (email)</label>
            <input
              autoFocus
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent transition-colors"
              placeholder="ten@congty.com"
            />
          </div>
          <div>
            <label className="block text-xs text-text-dim mb-1">Mật khẩu</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-bad text-sm bg-bad/10 border border-bad/30 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading || !email || !password} className="btn btn-primary w-full">
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </div>
      </form>
    </div>
  );
}
