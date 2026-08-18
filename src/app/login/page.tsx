"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const supabase = supabaseBrowser();
    const { error } = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F1F1EE" }}>
      <form onSubmit={submit} style={{ width: 360, background: "#fff", border: "1px solid #E4E3DD", borderRadius: 12, padding: 28 }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20 }}>IMMANENT</div>
        <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#6C7079", marginBottom: 20 }}>LEAD ENGINE · V1</div>
        <label style={{ display: "block", marginBottom: 12 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: "#6C7079", marginBottom: 5, textTransform: "uppercase" }}>Email</div>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            style={{ width: "100%", padding: "9px 11px", borderRadius: 7, border: "1px solid #E4E3DD", fontSize: 13 }} />
        </label>
        <label style={{ display: "block", marginBottom: 16 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: "#6C7079", marginBottom: 5, textTransform: "uppercase" }}>Password</div>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
            style={{ width: "100%", padding: "9px 11px", borderRadius: 7, border: "1px solid #E4E3DD", fontSize: 13 }} />
        </label>
        {error && <div style={{ color: "#B4483A", fontSize: 12, marginBottom: 12 }}>{error}</div>}
        <button type="submit" disabled={loading}
          style={{ width: "100%", background: "#14171F", color: "#fff", border: "none", borderRadius: 7, padding: "10px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          {loading && <Loader2 size={14} className="animate-spin" />} {mode === "signin" ? "Sign In" : "Create Founder Account"}
        </button>
        <div onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          style={{ textAlign: "center", fontSize: 12, color: "#6C7079", marginTop: 14, cursor: "pointer" }}>
          {mode === "signin" ? "First time? Create the founder account" : "Already have an account? Sign in"}
        </div>
      </form>
    </div>
  );
}
