import { useState, FormEvent } from "react";
import { X, LogIn, Mail, Lock, UserPlus, Zap } from "lucide-react";
import { api } from "../api";

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (user: any) => void;
  initialMode: "login" | "register";
}

export default function AuthModal({ onClose, onSuccess, initialMode }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">(initialMode as any);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === "register") {
        if (!username.trim()) {
          throw new Error("Please specify a display username");
        }
        if (password.length < 5) {
          throw new Error("Password must be at least 5 characters long");
        }
        const res = await api.register(username, email, password);
        onSuccess(res.user);
        onClose();
      } else if (mode === "login") {
        const res = await api.login(email, password);
        onSuccess(res.user);
        onClose();
      } else if (mode === "forgot") {
        if (!username.trim()) {
          throw new Error("Please specify your registered username");
        }
        if (password.length < 4) {
          throw new Error("New password must be at least 4 characters long");
        }
        const res = await api.resetPassword(email, username, password);
        setSuccess(res.message);
        setMode("login");
        setPassword(""); // Clear input password
      }
    } catch (err: any) {
      setError(err?.message || "An authentication fault occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div 
        className="relative w-full max-w-md bg-[#090f23] border border-blue-950 rounded-2xl shadow-2xl p-6 md:p-8 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full pointer-events-none" />

        {/* Header control */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-yellow-400 fill-current" />
            <h3 className="text-xl font-bold text-white uppercase tracking-wide">
              {mode === "login" ? "Sign In" : mode === "register" ? "Register" : "Reset Password"}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Inner forms message alerts */}
        {error && (
          <div className="bg-red-950/40 border border-red-900 text-red-300 text-xs px-4 py-3 rounded-xl mb-5 leading-relaxed">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-950/40 border border-emerald-900 text-emerald-300 text-xs px-4 py-3 rounded-xl mb-5 leading-relaxed">
            {success}
          </div>
        )}

        {/* Tab triggers */}
        {mode !== "forgot" && (
          <div className="flex border-b border-blue-950 mb-6">
            <button
              onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
              className={`flex-1 pb-3 text-sm font-semibold transition ${mode === "login" ? "border-b-2 border-blue-500 text-blue-400" : "text-slate-400"}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode("register"); setError(null); setSuccess(null); }}
              className={`flex-1 pb-3 text-sm font-semibold transition ${mode === "register" ? "border-b-2 border-blue-500 text-blue-400" : "text-slate-400"}`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Forms layout */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {(mode === "register" || mode === "forgot") && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {mode === "forgot" ? "Registered Username" : "Username"}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <UserPlus className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder={mode === "forgot" ? "Enter registered username" : "e.g. ThunderCoder"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#050814] border border-blue-950 focus:border-blue-500 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                required
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#050814] border border-blue-950 focus:border-blue-500 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {mode === "forgot" ? "New Password" : "Password"}
              </label>
              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => { setMode("forgot"); setError(null); setSuccess(null); }}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#050814] border border-blue-950 focus:border-blue-500 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Form submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition duration-200 mt-6 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="text-sm">Processing...</span>
            ) : (
              <>
                {mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                <span>{mode === "login" ? "Sign In" : mode === "register" ? "Register Now" : "Reset Password"}</span>
              </>
            )}
          </button>
        </form>

        {mode === "forgot" && (
          <div className="text-center mt-5">
            <button
              onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
              className="text-xs text-slate-400 hover:text-white font-medium transition"
            >
              ← Back to Sign In
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
