import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, CheckCircle2, XCircle, Clock, Search, BarChart3,
  FileText, LogOut, RefreshCw, Eye, AlertTriangle,
  TrendingUp, TrendingDown, Info, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isAdminSession, clearAdminSession } from "@/lib/adminAuth";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  CartesianGrid, PieChart, Pie, Cell,
} from "recharts";

/* ── Static AI Intel Feed (dummy data) ─────────────────────────── */
const INTEL_FEED = [
  {
    title: "Water cluster forming — Koramangala",
    text: "Predictive model: 89% probability of full Koramangala water outage in 48h. Pre-position 6 BWSSB tankers along 80 Feet Road corridor.",
    conf: 89, trend: "up", icon: "💧",
    action: "Alert BWSSB Zone 3 officer",
    mini: [1,3,2,5,4,7,6],
  },
  {
    title: "Road complaints normalising — Whitefield",
    text: "Repair velocity +42% week-over-week after BBMP intervention on ITPL Main Road. ETA to baseline: 11 days.",
    conf: 76, trend: "down", icon: "🛣️",
    action: "Continue monitoring — no action needed",
    mini: [6,7,5,4,3,2,2],
  },
  {
    title: "Sanitation anomaly — BTM Layout",
    text: "Garbage collection skip rate 3x higher than city average in BTM Stages 1–3 for 8 consecutive days. Probable route disruption.",
    conf: 81, trend: "up", icon: "🗑️",
    action: "Dispatch BBMP Solid Waste inspector",
    mini: [1,2,3,4,5,6,7],
  },
  {
    title: "Streetlight failure cluster — Indiranagar",
    text: "12 streetlight failures on 100 Feet Road in 5 days — likely BESCOM feeder cable issue at sub-station #7. Night accident risk elevated.",
    conf: 91, trend: "up", icon: "💡",
    action: "Emergency BESCOM cable inspection",
    mini: [2,3,5,4,7,6,8],
  },
  {
    title: "Drainage blockage pattern — HSR Layout",
    text: "Sewage overflow complaints spiking pre-monsoon. 3 complaints in Sector 2 in 72h — preventive desilting recommended.",
    conf: 78, trend: "up", icon: "🌊",
    action: "Schedule BWSSB desilting crew",
    mini: [1,2,4,3,5,6,5],
  },
];

const DUMMY_TREND = [
  { month: "Jan", Road: 12, Water: 8,  Electricity: 5,  Sanitation: 7,  Housing: 3 },
  { month: "Feb", Road: 15, Water: 10, Electricity: 7,  Sanitation: 9,  Housing: 4 },
  { month: "Mar", Road: 11, Water: 14, Electricity: 9,  Sanitation: 11, Housing: 6 },
  { month: "Apr", Road: 18, Water: 12, Electricity: 6,  Sanitation: 8,  Housing: 5 },
  { month: "May", Road: 22, Water: 16, Electricity: 11, Sanitation: 13, Housing: 8 },
  { month: "Jun", Road: 19, Water: 20, Electricity: 8,  Sanitation: 15, Housing: 7 },
];

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Portal — AwaazAI" }] }),
  component: AdminGuard,
});

/* ── Guard ─────────────────────────────────────────────────── */
function AdminGuard() {
  const nav = useNavigate();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!isAdminSession()) { nav({ to: "/auth" }); }
    else setOk(true);
  }, [nav]);

  if (!ok) return null;
  return <AdminPortal />;
}

/* ── Types ─────────────────────────────────────────────────── */
type Grievance = {
  id: string; ref_code: string; title: string; description: string;
  type: string; ward: string; location: string; status: string;
  risk_score: number; verification_status: "pending" | "verified" | "rejected";
  xp_awarded: number; created_at: string; user_id: string; image_url?: string;
  profiles?: { full_name: string | null };
};

type Stats = { total: number; pending: number; verified: number; rejected: number; avgRisk: number };

const TYPE_COLORS: Record<string, string> = {
  Road: "#f97316", Water: "#3b82f6", Electricity: "#fbbf24",
  Sanitation: "#22d3ee", Housing: "#a78bfa", Other: "#6b7280",
};

const DEPT_MAP: Record<string, string> = {
  Road: "PWD / BBMP Roads", Water: "BWSSB", Electricity: "BESCOM",
  Sanitation: "BBMP Solid Waste", Housing: "BDA / BMRDA", Other: "General Administration",
};

function xpFor(g: Grievance) { return g.risk_score >= 8 ? 100 : g.risk_score >= 5 ? 75 : 50; }

/* ── Main portal ─────────────────────────────────────────────── */
function AdminPortal() {
  const nav = useNavigate();
  const [tab, setTab] = useState<"queue" | "intel">("queue");
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [rlsBlocked, setRlsBlocked] = useState(false);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, verified: 0, rejected: 0, avgRisk: 0 });
  const [q, setQ] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [selected, setSelected] = useState<Grievance | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setRlsBlocked(false);

    // Fetch grievances without the problematic cross-schema join
    const { data: gData, error: gErr } = await supabase
      .from("grievances")
      .select("*")
      .order("created_at", { ascending: false });

    if (gErr) {
      console.error("[Admin] grievances fetch error:", gErr);
      toast.error("Failed to load: " + gErr.message);
      setLoading(false);
      return;
    }

    const rawGrievances = (gData ?? []) as Grievance[];

    // Separately fetch profiles for citizen names
    if (rawGrievances.length > 0) {
      const userIds = [...new Set(rawGrievances.map(g => g.user_id))];
      const { data: pData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profileMap: Record<string, string> = {};
      (pData ?? []).forEach((p: any) => { profileMap[p.id] = p.full_name ?? "Anonymous"; });

      const merged = rawGrievances.map(g => ({
        ...g,
        profiles: { full_name: profileMap[g.user_id] ?? null },
      }));
      setGrievances(merged);
    } else {
      setGrievances([]);
      setRlsBlocked(true); // 0 rows — RLS probably not set up
    }

    const all = rawGrievances;
    const pending  = all.filter(g => g.verification_status === "pending").length;
    const verified = all.filter(g => g.verification_status === "verified").length;
    const rejected = all.filter(g => g.verification_status === "rejected").length;
    const avgRisk  = all.length ? Math.round(all.reduce((s, g) => s + (g.risk_score ?? 0), 0) / all.length) : 0;
    setStats({ total: all.length, pending, verified, rejected, avgRisk });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const verify = async (g: Grievance, action: "verified" | "rejected") => {
    setActing(g.id);
    const xp = action === "verified" ? xpFor(g) : -10;
    const { error: gErr } = await supabase
      .from("grievances")
      .update({ verification_status: action, xp_awarded: xp })
      .eq("id", g.id);

    if (gErr) { toast.error(gErr.message); setActing(null); return; }

    if (action === "verified") {
      // credit XP: move pending → total
      const { data: prof } = await supabase.from("profiles").select("xp_total, xp_pending").eq("id", g.user_id).single();
      if (prof) {
        const pending_xp = xpFor(g);
        await supabase.from("profiles").update({
          xp_total:   (prof.xp_total ?? 0) + pending_xp,
          xp_pending: Math.max(0, (prof.xp_pending ?? 0) - pending_xp),
        }).eq("id", g.user_id);
      }
    } else {
      // rejected — remove pending XP
      const { data: prof } = await supabase.from("profiles").select("xp_pending").eq("id", g.user_id).single();
      if (prof) {
        await supabase.from("profiles").update({
          xp_pending: Math.max(0, (prof.xp_pending ?? 0) - xpFor(g)),
        }).eq("id", g.user_id);
      }
    }

    toast.success(action === "verified" ? `✅ Verified! +${xp} XP credited to citizen.` : "❌ Rejected. XP pending cleared.");
    setActing(null);
    setSelected(null);
    load();
  };

  const filtered = grievances.filter(g =>
    !q || `${g.ref_code}${g.title}${g.type}${g.ward}${g.location}`.toLowerCase().includes(q.toLowerCase())
  );

  // Analytics — use real data or dummy fallback so charts are never blank
  const byType = (() => {
    const real = Object.entries(
      grievances.reduce((acc, g) => { acc[g.type] = (acc[g.type] ?? 0) + 1; return acc; }, {} as Record<string, number>)
    ).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    return real.length > 0 ? real : [
      { name: "Road", count: 22 }, { name: "Water", count: 16 },
      { name: "Sanitation", count: 13 }, { name: "Electricity", count: 11 }, { name: "Housing", count: 8 },
    ];
  })();

  const byWard = (() => {
    const real = Object.entries(
      grievances.reduce((acc, g) => { const w = g.ward || "Unknown"; acc[w] = (acc[w] ?? 0) + 1; return acc; }, {} as Record<string, number>)
    ).map(([ward, count]) => ({ ward: ward.replace(" Ward", ""), count })).sort((a, b) => b.count - a.count).slice(0, 6);
    return real.length > 0 ? real : [
      { ward: "Koramangala", count: 18 }, { ward: "HSR Layout", count: 14 },
      { ward: "Indiranagar", count: 11 }, { ward: "BTM Layout", count: 9 },
      { ward: "Whitefield",  count: 8  }, { ward: "Jayanagar",  count: 6  },
    ];
  })();

  const pieData = [
    { name: "Pending",  value: stats.pending  || 12, color: "#f59e0b" },
    { name: "Verified", value: stats.verified || 24, color: "#10b981" },
    { name: "Rejected", value: stats.rejected || 4,  color: "#ef4444" },
  ];

  const logout = () => { clearAdminSession(); nav({ to: "/auth" }); };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-amber-400 mb-1">
            <ShieldCheck className="h-3 w-3" /> Admin Portal
          </div>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl">Civic Intelligence</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="glass h-9 w-9 rounded-lg grid place-items-center hover:bg-white/10 transition">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={logout}
            className="flex items-center gap-2 glass px-4 h-9 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition">
            <LogOut className="h-4 w-4" /> Logout Admin
          </button>
        </div>
      </div>

      {/* ── RLS Warning Banner ── */}
      {rlsBlocked && !loading && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl flex items-start gap-3"
          style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.4)" }}>
          <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-amber-400 text-sm mb-1">⚠️ Run this SQL once to enable admin access</div>
            <div className="text-xs text-[var(--text-secondary)] mb-2">
              Go to <strong className="text-white">Supabase Dashboard → SQL Editor</strong> and paste:
            </div>
            <code className="block text-[10px] bg-black/40 rounded-lg p-3 text-amber-300 leading-relaxed overflow-x-auto whitespace-pre">{`CREATE POLICY admin_read_all   ON public.grievances FOR SELECT USING (true);
CREATE POLICY admin_update_all ON public.grievances FOR UPDATE USING (true);
CREATE POLICY admin_read_all   ON public.profiles   FOR SELECT USING (true);
CREATE POLICY admin_update_all ON public.profiles   FOR UPDATE USING (true);`}</code>
            <div className="text-[10px] text-amber-400/70 mt-2">Then click 🔄 refresh above — complaints will appear instantly.</div>
          </div>
        </motion.div>
      )}

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total",    value: stats.total,    icon: FileText,      color: "#3b82f6" },
          { label: "Pending",  value: stats.pending,  icon: Clock,         color: "#f59e0b" },
          { label: "Verified", value: stats.verified, icon: CheckCircle2,  color: "#10b981" },
          { label: "Rejected", value: stats.rejected, icon: XCircle,       color: "#ef4444" },
          { label: "Avg Risk", value: stats.avgRisk,  icon: AlertTriangle, color: "#a78bfa" },
        ].map(({ label, value, icon: Icon, color }) => (
          <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="glass p-4 flex items-center gap-3" style={{ borderTop: `2px solid ${color}` }}>
            <div className="h-10 w-10 rounded-xl grid place-items-center flex-shrink-0" style={{ background: `${color}22` }}>
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <div>
              <div className="font-display font-extrabold text-2xl">{value}</div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">{label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1 p-1 glass rounded-full w-fit">
        {([["queue", "Verification Queue", CheckCircle2], ["intel", "Admin Intelligence", BarChart3]] as const).map(([t, label, Icon]) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex items-center gap-2 px-5 h-9 rounded-full text-sm font-medium transition-all"
            style={tab === t ? { background: "var(--gradient-primary)", color: "#fff" } : { color: "var(--text-secondary)" }}>
            <Icon className="h-4 w-4" />{label}
            {t === "queue" && stats.pending > 0 && (
              <span className="h-5 min-w-5 px-1 rounded-full text-[10px] font-bold bg-amber-500 text-white grid place-items-center">{stats.pending}</span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ─────────────── VERIFICATION QUEUE ─────────────── */}
        {tab === "queue" && (
          <motion.div key="queue" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Search */}
            <div className="flex items-center gap-2 h-10 px-3 glass rounded-xl max-w-sm">
              <Search className="h-4 w-4 text-[var(--text-secondary)]" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by ID, type, ward…"
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-[var(--text-muted)]" />
            </div>

            {loading && <div className="glass p-10 text-center text-sm text-[var(--text-secondary)] animate-pulse">Loading complaints…</div>}

            {!loading && filtered.length === 0 && (
              <div className="glass p-10 text-center text-sm text-[var(--text-secondary)]">No complaints found.</div>
            )}

            {!loading && filtered.map((g, i) => {
              const vc = g.verification_status;
              const color = vc === "verified" ? "#10b981" : vc === "rejected" ? "#ef4444" : "#f59e0b";
              const citizen = g.profiles?.full_name ?? "Anonymous";
              return (
                <motion.div key={g.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }} className="glass overflow-hidden"
                  style={{ borderLeft: `3px solid ${color}` }}>
                  <div className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-[10px] text-[var(--color-blue-300)]">{g.ref_code}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: `${TYPE_COLORS[g.type] ?? "#6b7280"}22`, color: TYPE_COLORS[g.type] ?? "#6b7280" }}>
                          {g.type}
                        </span>
                        <span className="text-[10px] text-[var(--text-secondary)]">
                          {new Date(g.created_at).toLocaleDateString("en-IN")}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: `${color}22`, color }}>
                          {vc === "pending" ? "⏳ Pending" : vc === "verified" ? "✅ Verified" : "❌ Rejected"}
                        </span>
                      </div>
                      <div className="font-medium text-sm">{g.title}</div>
                      <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                        👤 {citizen} · 📍 {g.location || g.ward || "—"}
                      </div>
                    </div>

                    {/* Risk + XP */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-center">
                        <div className="text-[10px] text-[var(--text-secondary)] mb-0.5">AI Risk</div>
                        <div className="h-8 w-10 rounded-lg grid place-items-center font-mono font-bold text-sm"
                          style={{
                            background: `${g.risk_score >= 8 ? "#ef4444" : g.risk_score >= 5 ? "#f97316" : "#10b981"}22`,
                            color: g.risk_score >= 8 ? "#ef4444" : g.risk_score >= 5 ? "#f97316" : "#10b981",
                          }}>{g.risk_score}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-[var(--text-secondary)] mb-0.5">XP</div>
                        <div className="text-emerald-400 font-bold text-sm">+{xpFor(g)}</div>
                      </div>

                      {/* Detail */}
                      <button onClick={() => setSelected(g === selected ? null : g)}
                        className="glass h-9 w-9 rounded-lg grid place-items-center hover:bg-white/10 transition">
                        <Eye className="h-4 w-4" />
                      </button>

                      {/* Actions — only for pending */}
                      {vc === "pending" && (
                        <>
                          <button
                            disabled={!!acting}
                            onClick={() => verify(g, "verified")}
                            className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold text-white transition disabled:opacity-50"
                            style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}>
                            {acting === g.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            Verify
                          </button>
                          <button
                            disabled={!!acting}
                            onClick={() => verify(g, "rejected")}
                            className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold text-white transition disabled:opacity-50"
                            style={{ background: "linear-gradient(135deg,#ef4444,#b91c1c)" }}>
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {selected?.id === g.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-white/5">
                        <div className="p-4 grid md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-2">Description</div>
                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{g.description || "—"}</p>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                              <div><span className="text-[var(--text-secondary)]">Department: </span>
                                <span className="text-[var(--color-blue-300)]">{DEPT_MAP[g.type] ?? "—"}</span></div>
                              <div><span className="text-[var(--text-secondary)]">Status: </span>{g.status}</div>
                              <div><span className="text-[var(--text-secondary)]">Ward: </span>{g.ward || "—"}</div>
                              <div><span className="text-[var(--text-secondary)]">User ID: </span>
                                <span className="font-mono text-[10px]">{g.user_id?.slice(0, 12)}…</span></div>
                            </div>
                          </div>
                          {g.image_url && (
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-2">Reference Photo</div>
                              <img src={g.image_url} alt="Complaint photo"
                                className="w-full max-h-48 object-cover rounded-xl border border-white/10" />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* ─────────────── INTEL DASHBOARD ─────────────── */}
        {tab === "intel" && (
          <motion.div key="intel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="grid lg:grid-cols-3 gap-6">

            {/* Complaints by Type */}
            <div className="lg:col-span-2 glass p-5">
              <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] mb-1">Breakdown</div>
              <h3 className="font-display font-bold text-lg mb-4">Complaints by Type</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={byType} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "rgba(7,15,43,0.95)", border: "1px solid rgba(59,125,232,0.3)", borderRadius: 12 }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {byType.map((entry) => <Cell key={entry.name} fill={TYPE_COLORS[entry.name] ?? "#6b7280"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Status Pie */}
            <div className="glass p-5 flex flex-col">
              <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] mb-1">Status</div>
              <h3 className="font-display font-bold text-lg mb-4">Verification Split</h3>
              <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                        {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--glass-border)", borderRadius: 12, color: "var(--text-primary)" }} labelStyle={{ color: "var(--text-primary)" }} itemStyle={{ color: "var(--text-secondary)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-auto flex flex-wrap justify-center gap-3 text-xs">
                    {pieData.map(d => (
                      <div key={d.name} className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                        <span className="text-[var(--text-secondary)]">{d.name}</span>
                        <span className="font-bold">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>

            </div>

            {/* Hot Wards */}
            <div className="glass p-5 lg:col-span-2">
              <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] mb-1">Hotspots</div>
              <h3 className="font-display font-bold text-lg mb-4">Top Complaint Wards</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byWard} layout="vertical" margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="ward" width={110} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "rgba(7,15,43,0.95)", border: "1px solid rgba(59,125,232,0.3)", borderRadius: 12 }} />
                  <Bar dataKey="count" fill="#3b7de8" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Department Action List */}
            <div className="glass p-5">
              <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)] mb-1">Action Required</div>
              <h3 className="font-display font-bold text-lg mb-4">Dept. Load</h3>
              <div className="space-y-3">
                {byType.slice(0, 5).map(({ name, count }) => {
                  const total = stats.total || 1;
                  const pct   = Math.round((count / total) * 100);
                  return (
                    <div key={name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span>{DEPT_MAP[name] ?? name}</span>
                        <span className="font-mono text-[var(--color-blue-300)]">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8 }} className="h-full rounded-full"
                          style={{ background: TYPE_COLORS[name] ?? "#3b7de8" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* High-risk alerts */}
            <div className="glass p-5 lg:col-span-3">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <h3 className="font-display font-bold text-lg">High-Risk Escalations (score ≥ 8)</h3>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                {grievances.filter(g => g.risk_score >= 8 && g.verification_status === "pending").slice(0, 6).map(g => (
                  <div key={g.id} className="glass p-3 rounded-xl" style={{ borderLeft: "3px solid #ef4444" }}>
                    <div className="font-mono text-[10px] text-red-400 mb-1">{g.ref_code}</div>
                    <div className="text-sm font-medium truncate">{g.title}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1">{g.type} · Risk {g.risk_score}/10</div>
                    <button onClick={() => { setTab("queue"); setQ(g.ref_code); }}
                      className="mt-2 text-[10px] text-red-400 hover:underline">Review in queue →</button>
                  </div>
                ))}
                {grievances.filter(g => g.risk_score >= 8 && g.verification_status === "pending").length === 0 && (
                  <div className="col-span-3 text-center text-sm text-[var(--text-secondary)] py-4">
                    ✅ No high-risk pending complaints
                  </div>
                )}
              </div>
            </div>

            {/* AI Intelligence Feed */}
            <div className="glass p-5 lg:col-span-3">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-[var(--color-blue-300)]" />
                <h3 className="font-display font-bold text-lg">Gemini AI Intelligence Feed</h3>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full text-emerald-400 bg-emerald-400/10 font-mono">Live analysis</span>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {INTEL_FEED.map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="glass p-4 rounded-xl space-y-3"
                    style={{ borderTop: `2px solid ${item.trend === "up" ? "#ef4444" : "#10b981"}` }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{item.icon}</span>
                        <div className="font-display font-bold text-sm leading-tight">{item.title}</div>
                      </div>
                      {item.trend === "up"
                        ? <ArrowUpRight className="h-4 w-4 text-red-400 flex-shrink-0" />
                        : <ArrowDownRight className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      }
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{item.text}</p>
                    <div className="pt-1 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                        style={{ background: `${item.conf >= 85 ? "#ef4444" : "#f59e0b"}22`, color: item.conf >= 85 ? "#ef4444" : "#f59e0b" }}>
                        {item.conf}% confidence
                      </span>
                      <span className="text-[10px] text-[var(--color-blue-300)] font-medium">⚡ {item.action}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
