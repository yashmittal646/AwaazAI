import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Brain, ArrowRight } from "lucide-react";
import { AI_INSIGHTS, GRIEVANCES } from "@/data/mock";
import { CityMap } from "@/components/app/CityMap";

export const Route = createFileRoute("/heatmap")({
  head: () => ({ meta: [{ title: "City Heatmap — AwaazAI" }, { name: "description", content: "Live citywide grievance intelligence." }] }),
  component: Heatmap,
});

const filters = ["All","Water","Road","Electricity","Housing","Pending","Overdue"];
const toneMap: Record<string, string> = { crimson: "#ef4444", saffron: "#f97316", emerald: "#10b981", blue: "#3b7de8" };

function Heatmap() {
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState("All");
  useEffect(() => setMounted(true), []);

  const overdue = GRIEVANCES.filter((g) => g.daysOpen > g.slaDays).length;
  const avgRes = (GRIEVANCES.reduce((a, g) => a + g.daysOpen, 0) / GRIEVANCES.length).toFixed(1);

  return (
    <div className="max-w-[1500px] mx-auto space-y-4">
      <div className="flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl">City heatmap</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Bengaluru · {GRIEVANCES.length} live grievances mapped</p>
        </div>
        <div className="flex flex-wrap gap-1.5 glass p-1 rounded-full">
          {filters.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`text-xs px-3 h-8 rounded-full font-medium transition-all ${filter === f ? "text-white" : "text-[var(--text-secondary)]"}`} style={filter === f ? { background: "var(--gradient-primary)" } : {}}>{f}</button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-10 gap-4">
        <div className="lg:col-span-7 relative h-[60vh] min-h-[480px] glass overflow-hidden p-0">
          {mounted && <CityMap filterType={filter} />}
          {!mounted && <div className="absolute inset-0 grid place-items-center text-[var(--text-secondary)] text-sm">Loading map…</div>}
          
          <button 
            onClick={() => window.location.reload()} // Quick hack to re-trigger CityMap's geolocation logic
            className="absolute bottom-6 right-6 h-10 w-10 glass grid place-items-center text-[var(--color-blue-300)] z-20 hover:text-white"
            title="Recenter to my location"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </button>
        </div>

        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Brain className="h-4 w-4 text-[var(--color-saffron)] animate-pulse" />
            <h3 className="font-display font-bold text-base">AI City Intelligence</h3>
          </div>
          {AI_INSIGHTS.map((ins, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="glass p-4 relative">
              <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r" style={{ background: toneMap[ins.tone] }} />
              <div className="text-xs leading-relaxed text-[var(--text-primary)] pl-2">{ins.text}</div>
              <button className="mt-3 ml-2 text-[10px] flex items-center gap-1 text-[var(--color-blue-300)] hover:underline">Take action <ArrowRight className="h-2.5 w-2.5" /></button>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: "Total mapped", v: GRIEVANCES.length, c: "var(--color-blue-400)" },
          { l: "Avg resolution", v: `${avgRes}d`, c: "var(--color-saffron)" },
          { l: "Overdue", v: overdue, c: "var(--color-crimson)" },
          { l: "Fastest ward", v: "HSR", c: "var(--color-emerald)" },
        ].map((s) => (
          <div key={s.l} className="glass p-4">
            <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">{s.l}</div>
            <div className="font-display font-extrabold text-2xl mt-1" style={{ color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
