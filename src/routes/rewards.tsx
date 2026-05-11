import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, Trophy, Gift, Clock, CheckCircle2, XCircle, ShieldAlert,
  Zap, TrendingUp, Lock, ChevronDown, ExternalLink, Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/rewards")({
  head: () => ({
    meta: [
      { title: "My Rewards — AwaazAI" },
      { name: "description", content: "Earn XP for verified civic complaints and redeem for rewards." },
    ],
  }),
  component: RewardsPage,
});

/* ─── Constants ──────────────────────────────────────────── */
const LEVELS = [
  { name: "Naya Nagarik",  min: 0,    color: "#6b7280", emoji: "🌱" },
  { name: "Sewak",         min: 200,  color: "#3b82f6", emoji: "🛡️" },
  { name: "Prahari",       min: 500,  color: "#8b5cf6", emoji: "⚔️" },
  { name: "Sudharak",      min: 1000, color: "#f59e0b", emoji: "🔥" },
  { name: "Jan Nayak",     min: 2000, color: "#10b981", emoji: "👑" },
];

const CATALOG = [
  { id: "amazon_50",  label: "₹50 Amazon Voucher",   cost: 200,  icon: "🛒", type: "amazon_voucher" },
  { id: "paytm_100", label: "₹100 Paytm Cash",       cost: 400,  icon: "💸", type: "paytm_cash"    },
  { id: "amazon_200",label: "₹200 Amazon Voucher",   cost: 750,  icon: "🛒", type: "amazon_voucher" },
  { id: "donate",    label: "Plant a tree 🌳 (NGO)",  cost: 100,  icon: "🌳", type: "donation"       },
  { id: "paytm_500", label: "₹500 Paytm Cash",       cost: 1800, icon: "💸", type: "paytm_cash"    },
];

const VER_CONFIG = {
  verified: { label: "Verified",           color: "#10b981", bg: "#10b98122", icon: CheckCircle2 },
  pending:  { label: "Under Verification", color: "#f59e0b", bg: "#f59e0b22", icon: Clock        },
  rejected: { label: "Rejected",           color: "#ef4444", bg: "#ef444422", icon: XCircle      },
};

type Grievance = {
  id: string;
  ref_code: string;
  title: string;
  type: string;
  verification_status: "pending" | "verified" | "rejected";
  xp_awarded: number;
  risk_score: number;
  created_at: string;
  image_url?: string | null;
};

type Profile = {
  xp_total: number;
  xp_pending: number;
  xp_redeemed: number;
  level: string;
};

/* ─── Helpers ─────────────────────────────────────────────── */
function getLevelInfo(xp: number) {
  let current = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.min) current = l;
  const idx = LEVELS.indexOf(current);
  const next = LEVELS[idx + 1] ?? null;
  const progress = next ? Math.round(((xp - current.min) / (next.min - current.min)) * 100) : 100;
  return { current, next, progress };
}

function xpForGrievance(g: Grievance) {
  const base = 50;
  const bonus = g.risk_score >= 8 ? 50 : g.risk_score >= 5 ? 25 : 0;
  return base + bonus;
}

/* ─── Page ────────────────────────────────────────────────── */
function RewardsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile>({ xp_total: 0, xp_pending: 0, xp_redeemed: 0, level: "Naya Nagarik" });
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    Promise.all([
      supabase.from("profiles").select("xp_total, xp_pending, xp_redeemed, level").eq("id", user.id).single(),
      supabase.from("grievances")
        .select("id, ref_code, title, type, verification_status, xp_awarded, risk_score, created_at, image_url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]).then(([{ data: p }, { data: g }]) => {
      if (p) setProfile(p as Profile);
      if (g) setGrievances(g as Grievance[]);
      setLoading(false);
    });
  }, [user]);

  const { current: lvl, next: nextLvl, progress } = getLevelInfo(profile.xp_total);

  const handleRedeem = async (item: typeof CATALOG[number]) => {
    if (!user) { toast.error("Sign in to redeem rewards."); return; }
    if (profile.xp_total < item.cost) { toast.error("Not enough XP!"); return; }
    setRedeeming(item.id);
    const { error } = await supabase.from("reward_redemptions").insert({
      user_id: user.id,
      xp_spent: item.cost,
      reward_type: item.type,
      reward_label: item.label,
    });
    if (!error) {
      await supabase.from("profiles").update({
        xp_total:   profile.xp_total - item.cost,
        xp_redeemed: profile.xp_redeemed + item.cost,
      }).eq("id", user.id);
      setProfile(p => ({ ...p, xp_total: p.xp_total - item.cost, xp_redeemed: p.xp_redeemed + item.cost }));
      toast.success(`🎉 ${item.label} redeemed! You'll receive it within 24 hours.`);
    } else {
      toast.error("Redemption failed. Please try again.");
    }
    setRedeeming(null);
  };

  return (
    <div className="max-w-[1100px] mx-auto space-y-8">

      {/* ── Page heading ── */}
      <div>
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[var(--color-saffron)] mb-2">
          <Trophy className="h-3 w-3" /> Citizen Rewards
        </div>
        <h1 className="font-display font-extrabold text-3xl md:text-5xl">Your Rewards</h1>
        <p className="mt-2 text-[var(--text-secondary)] text-sm">
          File genuine civic complaints, get them verified, and earn XP you can convert into real rewards.
        </p>
      </div>

      {/* ── XP Hero card ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-6 md:p-8 relative overflow-hidden"
        style={{ borderTop: `3px solid ${lvl.color}` }}
      >
        {/* Glowing orb bg */}
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: lvl.color }} />

        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Level badge */}
          <div className="flex-shrink-0 h-20 w-20 rounded-2xl grid place-items-center text-4xl"
            style={{ background: `${lvl.color}22`, border: `1px solid ${lvl.color}44` }}>
            {lvl.emoji}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] mb-1">Current Level</div>
            <div className="font-display font-extrabold text-2xl" style={{ color: lvl.color }}>{lvl.name}</div>

            {/* XP bar */}
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>{profile.xp_total} XP earned</span>
                {nextLvl && <span>{nextLvl.min - profile.xp_total} XP to {nextLvl.name}</span>}
              </div>
              <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${lvl.color}, ${nextLvl?.color ?? lvl.color})` }}
                />
              </div>
            </div>
          </div>

          {/* XP stat pills */}
          <div className="flex flex-wrap md:flex-col gap-3 md:items-end">
            <div className="glass px-4 py-2 rounded-xl text-center">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Available</div>
              <div className="font-display font-extrabold text-2xl text-emerald-400">{profile.xp_total}</div>
              <div className="text-[10px] text-[var(--text-secondary)]">XP</div>
            </div>
            <div className="glass px-4 py-2 rounded-xl text-center">
              <div className="text-[10px] uppercase tracking-wider text-amber-400">On Hold</div>
              <div className="font-display font-bold text-xl text-amber-400">{profile.xp_pending}</div>
              <div className="text-[10px] text-[var(--text-secondary)]">XP pending</div>
            </div>
            <div className="glass px-4 py-2 rounded-xl text-center">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Redeemed</div>
              <div className="font-display font-bold text-xl text-[var(--text-secondary)]">{profile.xp_redeemed}</div>
              <div className="text-[10px] text-[var(--text-secondary)]">XP spent</div>
            </div>
          </div>
        </div>

        {/* Level progression ladder */}
        <div className="mt-6 pt-5 border-t border-white/5">
          <div className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] mb-3">Level Ladder</div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {LEVELS.map((l, i) => {
              const reached = profile.xp_total >= l.min;
              const isCurrent = l.name === lvl.name;
              return (
                <div key={l.name} className="flex items-center gap-1.5">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${isCurrent ? "ring-1" : ""}`}
                    style={{
                      background: reached ? `${l.color}22` : "rgba(255,255,255,0.05)",
                      color: reached ? l.color : "var(--text-muted)",
                      ringColor: isCurrent ? l.color : "transparent",
                    }}>
                    <span>{l.emoji}</span>
                    <span>{l.name}</span>
                    {isCurrent && <Sparkles className="h-3 w-3" />}
                  </div>
                  {i < LEVELS.length - 1 && (
                    <div className="h-px w-4 rounded-full" style={{ background: reached ? l.color : "rgba(255,255,255,0.1)" }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ── Two-column layout: complaints + redeem ── */}
      <div className="grid lg:grid-cols-[1fr_340px] gap-6">

        {/* ── Complaint XP ledger ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[var(--color-blue-300)]" />
            <h2 className="font-display font-bold text-lg">Complaint XP Ledger</h2>
          </div>

          {!user && (
            <div className="glass p-8 text-center space-y-3">
              <Lock className="h-10 w-10 mx-auto text-[var(--text-secondary)]" />
              <p className="text-[var(--text-secondary)] text-sm">Sign in to see your XP history</p>
              <Link to="/auth" className="inline-flex items-center gap-2 px-5 h-10 rounded-xl text-sm font-bold text-white"
                style={{ background: "var(--gradient-primary)" }}>
                Sign in →
              </Link>
            </div>
          )}

          {user && loading && (
            <div className="glass p-8 text-center text-sm text-[var(--text-secondary)] animate-pulse">
              Loading your complaints…
            </div>
          )}

          {user && !loading && grievances.length === 0 && (
            <div className="glass p-8 text-center space-y-3">
              <ShieldAlert className="h-10 w-10 mx-auto text-[var(--text-secondary)]" />
              <p className="text-[var(--text-secondary)] text-sm">No complaints yet. File your first one to start earning XP!</p>
              <Link to="/file-complaint" className="inline-flex items-center gap-2 px-5 h-10 rounded-xl text-sm font-bold text-white"
                style={{ background: "var(--gradient-primary)" }}>
                File a Complaint →
              </Link>
            </div>
          )}

          <AnimatePresence>
            {grievances.map((g, i) => {
              const vc = VER_CONFIG[g.verification_status] ?? VER_CONFIG.pending;
              const Icon = vc.icon;
              const potentialXp = xpForGrievance(g);
              const isOpen = expandedId === g.id;

              return (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass overflow-hidden cursor-pointer"
                  style={{ borderLeft: `3px solid ${vc.color}` }}
                  onClick={() => setExpandedId(isOpen ? null : g.id)}
                >
                  <div className="p-4 flex items-center gap-4">
                    {/* Status icon */}
                    <div className="h-10 w-10 rounded-xl flex-shrink-0 grid place-items-center"
                      style={{ background: vc.bg }}>
                      <Icon className="h-5 w-5" style={{ color: vc.color }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] text-[var(--color-blue-300)]">{g.ref_code}</span>
                        <span className="text-[10px] text-[var(--text-secondary)]">·</span>
                        <span className="text-[10px] text-[var(--text-secondary)]">{g.type}</span>
                        <span className="text-[10px] text-[var(--text-secondary)]">·</span>
                        <span className="text-[10px] text-[var(--text-secondary)]">{new Date(g.created_at).toLocaleDateString("en-IN")}</span>
                      </div>
                      <div className="mt-0.5 font-medium text-sm truncate">{g.title}</div>
                      {/* Verification badge */}
                      <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ background: vc.bg, color: vc.color }}>
                        <Icon className="h-2.5 w-2.5" />
                        {vc.label}
                      </div>
                    </div>

                    {/* XP pill */}
                    <div className="flex-shrink-0 text-right">
                      {g.verification_status === "verified" && (
                        <div className="text-emerald-400 font-display font-bold text-lg">+{g.xp_awarded || potentialXp}</div>
                      )}
                      {g.verification_status === "pending" && (
                        <div className="text-amber-400 font-display font-bold text-lg">+{potentialXp}</div>
                      )}
                      {g.verification_status === "rejected" && (
                        <div className="text-red-400 font-display font-bold text-lg">{g.xp_awarded || "−10"}</div>
                      )}
                      <div className="text-[10px] text-[var(--text-secondary)]">
                        {g.verification_status === "pending" ? "on hold" :
                         g.verification_status === "rejected" ? "penalty" : "XP earned"}
                      </div>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-[var(--text-secondary)] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-3 border-t border-white/5 space-y-3">
                          {/* Image if attached */}
                          {g.image_url && (
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-2">Reference Photo</div>
                              <img src={g.image_url} alt="Complaint photo"
                                className="w-full max-h-40 object-cover rounded-xl border border-white/10" />
                            </div>
                          )}

                          {/* What happens next */}
                          <div className="glass p-3 rounded-xl text-xs space-y-1"
                            style={{ borderLeft: `2px solid ${vc.color}` }}>
                            {g.verification_status === "pending" && (
                              <>
                                <div className="font-bold text-amber-400">⏳ Verification in progress</div>
                                <div className="text-[var(--text-secondary)]">
                                  Our team + AI are reviewing your complaint. Points will be credited within 24–48 hours once verified.
                                </div>
                              </>
                            )}
                            {g.verification_status === "verified" && (
                              <>
                                <div className="font-bold text-emerald-400">✅ Complaint verified!</div>
                                <div className="text-[var(--text-secondary)]">
                                  {g.xp_awarded || potentialXp} XP has been added to your balance. Keep filing genuine complaints to level up!
                                </div>
                              </>
                            )}
                            {g.verification_status === "rejected" && (
                              <>
                                <div className="font-bold text-red-400">❌ Complaint rejected</div>
                                <div className="text-[var(--text-secondary)]">
                                  This complaint was marked as invalid or duplicate. 10 XP deducted. Please ensure you submit genuine civic issues.
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* ── Redeem sidebar ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-[var(--color-saffron)]" />
            <h2 className="font-display font-bold text-lg">Redeem XP</h2>
          </div>

          {/* How XP works info card */}
          <div className="glass p-4 rounded-xl space-y-2 text-xs">
            <div className="font-bold text-[var(--color-blue-300)] mb-1 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" /> How XP works
            </div>
            {[
              ["📋 File a complaint", "+50–100 XP (pending)"],
              ["✅ Complaint verified", "XP moves to balance"],
              ["❌ Complaint rejected", "−10 XP penalty"],
              ["🏆 High-risk issue", "+50 bonus XP"],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between text-[var(--text-secondary)]">
                <span>{label}</span>
                <span className="font-mono text-emerald-400">{val}</span>
              </div>
            ))}
          </div>

          {/* Catalog */}
          <div className="space-y-3">
            {CATALOG.map((item) => {
              const canAfford = profile.xp_total >= item.cost;
              const isRedeeming = redeeming === item.id;
              return (
                <motion.div
                  key={item.id}
                  whileHover={canAfford ? { scale: 1.015 } : {}}
                  className={`glass p-4 rounded-xl flex items-center gap-3 transition-all ${canAfford ? "cursor-pointer hover:border-amber-500/30" : "opacity-50 cursor-not-allowed"}`}
                >
                  <div className="h-10 w-10 rounded-xl bg-white/5 grid place-items-center text-xl flex-shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-[10px] text-[var(--text-secondary)]">{item.cost} XP required</div>
                  </div>
                  <button
                    disabled={!canAfford || isRedeeming || !user}
                    onClick={(e) => { e.stopPropagation(); handleRedeem(item); }}
                    className="flex-shrink-0 h-8 px-3 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-50"
                    style={{ background: canAfford ? "var(--gradient-saffron)" : "rgba(255,255,255,0.1)" }}
                  >
                    {isRedeeming ? "…" : canAfford ? "Redeem" : <Lock className="h-3.5 w-3.5" />}
                  </button>
                </motion.div>
              );
            })}
          </div>

          {/* CTA to file more */}
          <Link to="/file-complaint"
            className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-sm font-bold text-white mt-2"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow-blue)" }}>
            <Sparkles className="h-4 w-4" />
            File a new complaint to earn XP
          </Link>

          {/* Verification transparency note */}
          <p className="text-[10px] text-[var(--text-secondary)] text-center leading-relaxed px-2">
            All complaints go through AI + human verification within 24–48 hours. Genuine civic issues earn XP; duplicate or false complaints result in a penalty.
          </p>
        </div>
      </div>
    </div>
  );
}
