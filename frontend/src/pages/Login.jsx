import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("demo1@ivy.homes");
  const [password, setPassword] = useState("1926030057");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Determine where to send the user after login
  const from = location.state?.from?.pathname || "/";

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      await login(email, password);

      // Send them back to where they were trying to go (or home)
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDF1EA] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-[#1E2022]/10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1E2022]">
            Ivy<span className="text-[#D97051]">Homes</span>
          </h1>
          <p className="mt-2 text-[#1E2022]/60">
            Find your next home in Pune
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="mb-2 block text-sm font-semibold text-[#1E2022]">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-[#1E2022]/10 bg-white px-4 py-3 text-sm text-[#1E2022] outline-none transition focus:border-[#D97051]"
            />
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-sm font-semibold text-[#1E2022]">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-[#1E2022]/10 bg-white px-4 py-3 text-sm text-[#1E2022] outline-none transition focus:border-[#D97051]"
            />
          </div>

          {error && (
            <div className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-600 text-center">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full rounded-xl bg-[#D97051] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-[#1E2022]/50">
          Demo access is pre-filled for evaluation.
        </div>
      </div>
    </div>
  );
}

export default Login;