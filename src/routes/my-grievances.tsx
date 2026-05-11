import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, ChevronDown, AlertTriangle, Share2, Download, Zap } from "lucide-react";
import { MY_GRIEVANCES, GRIEVANCES, TYPE_META, STATUS_COLOR, type Status } from "@/data/mock";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

export const Route = createFileRoute("/my-grievances")({
  head: () => ({ meta: [{ title: "My Grievances — AwaazAI" }, { name: "description", content: "Track every complaint you've raised." }] }),
  component: MyGrievances,
});

const filters: ("All" | Status)[] = ["All","Filed","In Progress","Resolved","Escalated","Overdue"];
const baseList = [...MY_GRIEVANCES, ...GRIEVANCES.slice(6, 12)];

function MyGrievances() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<typeof filters[number]>("All");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [mine, setMine] = useState<typeof baseList>([]);

  const downloadPDF = (g: any) => {
    try {
      const doc = new jsPDF();
      
      // Add header
      doc.setFillColor(26, 86, 196); // Awaaz Blue
      doc.rect(0, 0, 210, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text("AwaazAI - Grievance Summary", 15, 25);
      
      // Add content
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Reference ID: ${g.id || "N/A"}`, 15, 55);
      doc.text(`Date Filed: ${g.filed ? new Date(g.filed).toLocaleString() : "N/A"}`, 15, 62);
      doc.text(`Status: ${g.status || "Filed"}`, 15, 69);
      doc.text(`Category: ${g.type || "Other"}`, 15, 76);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Title:", 15, 90);
      doc.setFont("helvetica", "normal");
      doc.text(g.title || "Untitled Grievance", 30, 90);
      
      doc.setFont("helvetica", "bold");
      doc.text("Location:", 15, 100);
      doc.setFont("helvetica", "normal");
      doc.text(`${g.ward || "N/A"} · ${g.location || "N/A"}`, 40, 100);
      
      doc.setFont("helvetica", "bold");
      doc.text("Description:", 15, 110);
      doc.setFont("helvetica", "normal");
      const desc = g.description || "No description provided.";
      const splitText = doc.splitTextToSize(desc, 180);
      doc.text(splitText, 15, 117);
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("This is an electronically generated document by AwaazAI Platform.", 15, 280);
      
      // Use Blob for better compatibility
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Grievance_${g.id || "Report"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("PDF summary downloaded!");
    } catch (err) {
      console.error("PDF Generation Error:", err);
      toast.error("Failed to generate PDF. Try again.");
    }
  };

  const shareGrievance = async (g: any) => {
    const text = `Grievance ${g.id}: ${g.title} at ${g.location}. Status: ${g.status}. Track it on AwaazAI.`;
    if (navigator.share) {
      try { await navigator.share({ title: "Civic Grievance", text, url: window.location.href }); } catch (e) {}
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Details copied to clipboard!");
    }
  };

  useEffect(() => {
    if (!user) { setMine([]); return; }
    supabase.from("grievances").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      if (!data) return;
      const mapped = data.map((g: any) => {
        const days = Math.max(0, Math.floor((Date.now() - new Date(g.created_at).getTime()) / 86400000));
        return {
          id: g.ref_code,
          type: (g.type as any) ?? "Other",
          title: g.title,
          description: g.description ?? "",
          ward: g.ward ?? "—",
          location: g.location ?? "—",
          filed: g.created_at,
          status: (g.status as Status) ?? "Filed",
          daysOpen: days,
          slaDays: g.sla_days ?? 7,
          riskScore: g.risk_score ?? 5,
          lat: 0, lng: 0,
        };
      });
      setMine(mapped as any);
    });
  }, [user]);

  const list = useMemo(() => (user && mine.length ? [...mine, ...baseList] : baseList), [user, mine]);

  const items = useMemo(() => {
    return list.filter((g) => {
      if (filter !== "All" && g.status !== filter) return false;
      if (q && !`${g.id} ${g.type} ${g.location} ${g.title}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [filter, q, list]);

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <div>
        <h1 className="font-display font-extrabold text-3xl md:text-5xl">Your complaints</h1>
        <p className="mt-2 text-[var(--text-secondary)]">Track every issue you've raised — with full agent reasoning history.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <motion.button key={f} whileTap={{ scale: 0.96 }} onClick={() => setFilter(f)} className={`px-3 h-9 rounded-full text-xs font-medium transition-all ${filter === f ? "text-white" : "text-[var(--text-secondary)] glass"}`} style={filter === f ? { background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow-blue)" } : {}}>{f}</motion.button>
          ))}
        </div>
        <div className="md:ml-auto flex items-center gap-2 h-10 px-3 glass rounded-xl text-sm flex-1 md:max-w-sm">
          <Search className="h-4 w-4 text-[var(--text-secondary)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by ID, type, or location" className="bg-transparent outline-none flex-1 placeholder:text-[var(--text-muted)]" />
        </div>
      </div>

      <motion.div layout className="space-y-3">
        <AnimatePresence>
          {items.map((g) => {
            const overdue = g.daysOpen > g.slaDays;
            const remain = g.slaDays - g.daysOpen;
            const c = STATUS_COLOR[g.status];
            const tm = TYPE_META[g.type];
            const isOpen = open === g.id;
            return (
              <motion.div layout key={g.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="glass relative overflow-hidden cursor-pointer" onClick={() => setOpen(isOpen ? null : g.id)} whileHover={{ y: -2 }}>
                <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: c, boxShadow: `0 0 16px ${c}` }} />
                <div className="p-5 pl-6">
                  <div className="flex items-start gap-4">
                    <div className="text-2xl">{tm.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] text-[var(--color-blue-300)]">{g.id}</span>
                        <span className="text-xs text-[var(--text-secondary)]">·</span>
                        <span className="text-xs text-[var(--text-secondary)]">{g.type}</span>
                        <span className="text-xs text-[var(--text-secondary)]">·</span>
                        <span className="text-xs text-[var(--text-secondary)]">{new Date(g.filed).toLocaleDateString()}</span>
                      </div>
                      <div className="mt-1 font-display font-bold text-base">{g.title}</div>
                      <div className="mt-1 text-xs text-[var(--text-secondary)] flex items-center gap-1.5"><MapPin className="h-3 w-3" />{g.ward}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium" style={{ background: `${c}22`, color: c }}>{g.status}</span>
                      <span className={`text-[10px] ${overdue ? "text-[var(--color-crimson)]" : "text-[var(--text-secondary)]"}`}>{overdue ? `${Math.abs(remain)}d overdue` : `${remain}d remaining`}</span>
                      {overdue && <span className="text-[10px] flex items-center gap-1 text-amber-300"><AlertTriangle className="h-3 w-3" /> escalation due</span>}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-[var(--text-secondary)] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                        <div className="pt-5 mt-4 border-t border-[var(--glass-border)] space-y-4">
                          <p className="text-sm text-[var(--text-secondary)]">{g.description}</p>

                          <div className="glass p-3 border-l-2 border-emerald-500 bg-emerald-500/5">
                            <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">AI Reasoning Summary</div>
                            <div className="text-xs mt-1 font-mono text-emerald-300/90 leading-relaxed">
                              → Successfully routed to {g.type === "Water" ? "BWSSB" : g.type === "Electricity" ? "BESCOM" : "BBMP"} department.<br />
                              → Logic: Match ${g.type.toLowerCase()} + ${g.ward.split(" ")[0]} zone.<br />
                              → Risk Analysis: {g.riskScore}/10 priority · Detected similar reports in vicinity.
                            </div>
                          </div>

                          <div>
                            <div className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] mb-3 font-bold">Status timeline</div>
                            <div className="flex items-center gap-1">
                              {["Filed","Routed","Ack","In Progress","Resolved"].map((s, i) => {
                                const timelineStates = ["Filed","Filed","In Progress","In Progress","Resolved"];
                                const currentIdx = timelineStates.indexOf(g.status === "Overdue" ? "In Progress" : (g.status as string));
                                const reached = i <= currentIdx;
                                const isCurrent = i === currentIdx;
                                return (
                                  <div key={s} className="flex items-center gap-1 flex-1">
                                    <div className="relative">
                                      <span className={`block h-3 w-3 rounded-full flex-shrink-0 transition-all ${reached ? "shadow-[0_0_8px_currentColor]" : ""}`} style={{ backgroundColor: reached ? c : "rgba(255,255,255,0.12)", color: c }} />
                                      {isCurrent && <span className="absolute inset-0 rounded-full animate-ping opacity-50" style={{ background: c }} />}
                                    </div>
                                    <span className={`text-[10px] truncate ${reached ? "text-white font-bold" : "text-[var(--text-secondary)]"}`}>{s}</span>
                                    {i < 4 && <span className={`flex-1 h-[2px] rounded-full ${reached ? "opacity-100" : "opacity-20"}`} style={{ background: c }} />}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="grid sm:grid-cols-3 gap-2 text-xs">
                            <button onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/919845012345?text=Hello, tracking my grievance ${g.id} for ${g.type}.`, "_blank"); }} className="glass p-3 text-left hover:bg-white/10 group transition-all">
                              <div className="font-bold group-hover:text-emerald-400">WhatsApp</div>
                              <div className="text-[10px] text-[var(--text-secondary)]">Ping Area Officer</div>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`Formal Letter for ${g.id}...`); toast.success("Draft copied!"); }} className="glass p-3 text-left hover:bg-white/10 group transition-all">
                              <div className="font-bold group-hover:text-[var(--color-blue-300)]">Letter</div>
                              <div className="text-[10px] text-[var(--text-secondary)]">Copy Draft Copy</div>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`Email Subject: ${g.id} Grievance...`); toast.success("Email copy ready!"); }} className="glass p-3 text-left hover:bg-white/10 group transition-all">
                              <div className="font-bold group-hover:text-amber-300">Email</div>
                              <div className="text-[10px] text-[var(--text-secondary)]">Copy Professional Copy</div>
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-2">
                            {overdue && <button className="px-3 h-9 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 transition-transform hover:scale-105" style={{ background: "linear-gradient(135deg,#ef4444,#b91c1c)", boxShadow: "0 4px 12px rgba(239,68,68,0.3)" }}><Zap className="h-3.5 w-3.5" /> Escalate Now</button>}
                            <button onClick={(e) => { e.stopPropagation(); shareGrievance(g); }} className="px-3 h-9 rounded-lg text-xs font-medium glass flex items-center gap-1.5 hover:bg-white/10"><Share2 className="h-3.5 w-3.5" /> Share</button>
                            <button onClick={(e) => { e.stopPropagation(); downloadPDF(g); }} className="px-3 h-9 rounded-lg text-xs font-medium glass flex items-center gap-1.5 hover:bg-white/10 border-[var(--color-blue-400)]/30"><Download className="h-3.5 w-3.5 text-[var(--color-blue-300)]" /> Download PDF</button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {items.length === 0 && (
          <div className="glass p-10 text-center text-sm text-[var(--text-secondary)]">No grievances match these filters.</div>
        )}
      </motion.div>
    </div>
  );
}
