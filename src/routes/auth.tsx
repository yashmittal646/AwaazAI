import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Lock, User as UserIcon, Phone, MapPin, Building2, Hash,
  Loader2, ArrowRight, Sparkles, ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { tryAdminLogin, isAdminSession } from "@/lib/adminAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — AwaazAI" }, { name: "description", content: "Sign in or create your citizen account." }] }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "admin";

function AuthPage() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile]   = useState("");
  const [address, setAddress] = useState("");
  const [ward, setWard]       = useState("");
  const [city, setCity]       = useState("Bengaluru");
  const [pincode, setPincode] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState<string | null>(null);

  /* redirect if already authed */
  useEffect(() => { if (!loading && user) nav({ to: "/" }); }, [user, loading, nav]);
  /* redirect if already admin-authed */
  useEffect(() => { if (isAdminSession()) nav({ to: "/admin" }); }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      if (mode === "admin") {
        if (!tryAdminLogin(adminPass)) throw new Error("Incorrect admin password.");
        nav({ to: "/admin" });
        return;
      }
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (password.length < 8) throw new Error("Password must be at least 8 characters.");
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName, mobile, address, ward, city, pincode },
          },
        });
        if (error) throw error;
      }
      nav({ to: "/" });
    } catch (e: any) {
      setErr(e.message ?? "Something went wrong.");
    } finally { setBusy(false); }
  };

  const changeMode = (m: Mode) => { setMode(m); setErr(null); setPassword(""); setAdminPass(""); };

  const googleSignIn = async () => {
    setErr(null); setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) { setErr(error.message); setBusy(false); }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-2 gap-0">
      {/* ── Animated Rewards Showcase Panel ── */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(145deg, #0C0E14 0%, #1a1040 50%, #0C0E14 100%)" }} />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute -top-20 -left-20 h-96 w-96 rounded-full" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)", animation: "orb-drift-1 12s ease-in-out infinite alternate" }} />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%)", animation: "orb-drift-2 15s ease-in-out infinite alternate" }} />

        {/* Floating XP tokens */}
        {[{top:"15%",left:"8%",xp:"+50 XP",delay:"0s"},{top:"55%",left:"5%",xp:"+100 XP",delay:"1.2s"},{top:"30%",right:"6%",xp:"+75 XP",delay:"0.6s"},{top:"70%",right:"10%",xp:"+150 XP",delay:"1.8s"},{top:"80%",left:"20%",xp:"+25 XP",delay:"2.4s"}].map((t, i) => (
          <div key={i} className="absolute pointer-events-none" style={{ top: t.top, left: (t as any).left, right: (t as any).right, animationDelay: t.delay, animation: `float-xp 4s ease-in-out infinite alternate` }}>
            <div className="flex items-center gap-1.5 glass px-3 py-1.5 rounded-full text-xs font-bold" style={{ borderColor: "rgba(245,158,11,0.4)", color: "#FCD34D", fontSize: "11px" }}>
              <span style={{ fontSize: "14px" }}>⚡</span>{t.xp}
            </div>
          </div>
        ))}

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <img src="/awaaz-logo.png" alt="Awaaz AI" className="h-9 w-9 rounded-xl object-cover" />
            <div className="font-display font-extrabold text-xl">Awaaz<span className="text-[var(--color-saffron)]">AI</span></div>
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-10 max-w-md space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-amber-400 mb-4">
              <Sparkles className="h-3 w-3" /> Earn While You Help India
            </div>
            <h2 className="font-display font-extrabold text-4xl leading-tight">
              File a complaint.<br />
              <span style={{ background: "linear-gradient(135deg, #FCD34D, #F59E0B)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Earn real rewards.</span>
            </h2>
            <p className="mt-3 text-[var(--text-secondary)] text-sm leading-relaxed">
              Every verified civic complaint earns you XP. Level up, unlock vouchers, and become a Jan Nayak — a true champion of your community.
            </p>
          </div>

          {/* Reward tier cards */}
          <div className="space-y-2">
            {[
              { icon: "🌱", level: "Naya Nagarik", xp: "0–199 XP", perk: "Welcome badge + 1 free complaint", color: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.4)", text: "#10b981" },
              { icon: "🏅", level: "Nagarik", xp: "200–499 XP", perk: "Priority routing on complaints", color: "rgba(99,102,241,0.15)", border: "rgba(99,102,241,0.4)", text: "#818CF8" },
              { icon: "⚡", level: "Seva Veer", xp: "500–999 XP", perk: "₹100 cashback voucher", color: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.4)", text: "#F59E0B" },
              { icon: "👑", level: "Jan Nayak", xp: "1000+ XP", perk: "₹500 voucher + City Hero badge", color: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.35)", text: "#ef4444" },
            ].map((tier, i) => (
              <motion.div key={tier.level}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                className="flex items-center gap-3 rounded-xl px-4 py-2.5"
                style={{ background: tier.color, border: `1px solid ${tier.border}` }}>
                <span className="text-xl">{tier.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold" style={{ color: tier.text }}>{tier.level}</div>
                  <div className="text-[11px] text-[var(--text-secondary)]">{tier.perk}</div>
                </div>
                <div className="text-[10px] font-mono" style={{ color: tier.text }}>{tier.xp}</div>
              </motion.div>
            ))}
          </div>

          {/* Live XP counter */}
          <div className="glass rounded-2xl p-4 flex items-center gap-4" style={{ borderColor: "rgba(245,158,11,0.3)" }}>
            <div className="h-12 w-12 rounded-xl grid place-items-center text-2xl flex-shrink-0" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.3), rgba(253,211,77,0.15))" }}>⚡</div>
            <div className="flex-1">
              <div className="text-xs text-amber-400 uppercase tracking-widest mb-0.5">XP earned by citizens today</div>
              <div className="font-display font-extrabold text-2xl text-white" style={{ fontVariantNumeric: "tabular-nums" }}>48,291 XP</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-[var(--text-secondary)]">{Math.floor(Math.random() * 500 + 200)} active</div>
              <div className="text-[10px] text-emerald-400">↑ filing now</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Powered by Bharat Civic Stack · Rewards verified by admin
        </div>
      </div>

      {/* ── Form ── */}
      <div className="flex items-center justify-center p-6 lg:p-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">

          {/* Tab switcher */}
          <div className="flex items-center gap-1 p-1 glass rounded-full w-fit mx-auto mb-6">
            {(["signin", "signup", "admin"] as Mode[]).map((m) => {
              const isAdmin = m === "admin";
              const label   = m === "signin" ? "Sign in" : m === "signup" ? "Create account" : "Admin";
              return (
                <button
                  key={m}
                  id={`auth-tab-${m}`}
                  onClick={() => changeMode(m)}
                  className="px-4 h-9 rounded-full text-xs font-medium transition-all flex items-center gap-1.5"
                  style={mode === m
                    ? { background: isAdmin ? "linear-gradient(135deg,#f59e0b,#d97706)" : "var(--gradient-primary)", boxShadow: "var(--shadow-glow-blue)", color: "#fff" }
                    : { color: "var(--text-secondary)" }
                  }
                >
                  {isAdmin && <ShieldCheck className="h-3 w-3" />}
                  {label}
                </button>
              );
            })}
          </div>

          <div className="text-center mb-6">
            <h1 className="font-display font-extrabold text-3xl">
              {mode === "signin" ? "Welcome back" : mode === "signup" ? "Join AwaazAI" : "Admin Portal"}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {mode === "signin"  ? "Access your grievances and track resolutions."
               : mode === "signup" ? "Tell us about you so we route smarter."
               : "Authorised personnel only."}
            </p>
          </div>

          {/* ── Google OAuth button (signin/signup only) ── */}
          {mode !== "admin" && (
            <>
              <button type="button" onClick={googleSignIn} disabled={busy}
                className="w-full h-12 flex items-center justify-center gap-3 glass rounded-xl font-medium text-sm hover:bg-white/10 transition-all mb-4 border border-[var(--glass-border)] hover:border-white/20 disabled:opacity-50">
                {/* Google G logo SVG */}
                <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-[var(--glass-border)]" />
                <span className="text-[11px] uppercase tracking-widest text-[var(--text-secondary)]">or continue with email</span>
                <div className="flex-1 h-px bg-[var(--glass-border)]" />
              </div>
            </>
          )}

          <form onSubmit={submit} className="space-y-3">
            <AnimatePresence mode="popLayout">

              {/* Signup extra fields */}
              {mode === "signup" && (
                <motion.div key="signup-fields" initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 overflow-hidden">
                  <Field icon={UserIcon} placeholder="Full name" value={fullName} onChange={setFullName} required />
                  <Field icon={Phone} placeholder="Mobile number (10 digits)" value={mobile} onChange={setMobile} pattern="\d{10}" required type="tel" />
                  <Field icon={MapPin} placeholder="Address" value={address} onChange={setAddress} required />
                  <div className="grid grid-cols-3 gap-3">
                    <Field icon={Hash} placeholder="Ward" value={ward} onChange={setWard} />
                    <Field icon={Building2} placeholder="City" value={city} onChange={setCity} required />
                    <Field icon={Hash} placeholder="Pincode" value={pincode} onChange={setPincode} pattern="\d{6}" required />
                  </div>
                </motion.div>
              )}

              {/* Admin login — only password field */}
              {mode === "admin" && (
                <motion.div key="admin-field" initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden">
                  <div className="glass p-4 rounded-xl mb-3 flex items-start gap-3"
                    style={{ borderColor: "rgba(245,158,11,0.3)" }}>
                    <ShieldCheck className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      This portal is for <span className="text-amber-400 font-medium">Awaaz AI administrators</span> only.
                      Enter your admin password to access the intelligence dashboard and complaint verification queue.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email + password for citizen modes */}
            {mode !== "admin" && (
              <>
                <Field icon={Mail} placeholder="you@example.com" value={email} onChange={setEmail} type="email" required />
                <Field icon={Lock} placeholder={mode === "signup" ? "Password (min 8 characters)" : "Password"} value={password} onChange={setPassword} type="password" required />
              </>
            )}

            {/* Admin password */}
            {mode === "admin" && (
              <Field icon={Lock} placeholder="Admin password" value={adminPass} onChange={setAdminPass} type="password" required />
            )}

            {err && <div className="text-xs text-[var(--color-crimson)] glass p-3" style={{ borderColor: "rgba(239,68,68,0.4)" }}>{err}</div>}

            <motion.button
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              type="submit" disabled={busy}
              className="w-full h-12 rounded-xl text-white font-display font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              style={{
                background: mode === "admin"
                  ? "linear-gradient(135deg,#f59e0b,#d97706)"
                  : "var(--gradient-primary)",
                boxShadow: "var(--shadow-glow-blue)",
              }}
            >
              {busy
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <>{mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Enter Admin Portal"} <ArrowRight className="h-4 w-4" /></>
              }
            </motion.button>

            {mode !== "admin" && (
              <p className="text-center text-xs text-[var(--text-secondary)] pt-2">
                {mode === "signin" ? "New here? " : "Already have an account? "}
                <button type="button" onClick={() => changeMode(mode === "signin" ? "signup" : "signin")}
                  className="text-[var(--color-blue-300)] hover:underline font-medium">
                  {mode === "signin" ? "Create an account" : "Sign in"}
                </button>
              </p>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  );
}

type FieldProps = { icon: any; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">;
function Field({ icon: Icon, value, onChange, ...rest }: FieldProps) {
  return (
    <div className="flex items-center gap-2 h-11 px-3 glass rounded-xl focus-within:border-[var(--color-blue-400)] focus-within:shadow-[0_0_0_3px_rgba(59,125,232,0.15)] transition">
      <Icon className="h-4 w-4 text-[var(--text-secondary)]" />
      <input {...rest} value={value} onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent outline-none text-sm placeholder:text-[var(--text-muted)]" />
    </div>
  );
}