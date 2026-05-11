import { motion } from "framer-motion";
const steps = ["Describe", "AI Analysis", "Confirm"];
export function Stepper({ active }: { active: number }) {
  return (
    <div className="flex items-center justify-center mb-10">
      <div className="flex items-center gap-3 sm:gap-6">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-full grid place-items-center font-display font-bold text-sm transition-all ${i <= active ? "text-white" : "text-[var(--text-muted)] border border-[var(--glass-border)]"}`} style={i <= active ? { background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow-blue)" } : {}}>
                {i + 1}
              </div>
              <span className={`text-sm font-medium ${i <= active ? "text-white" : "text-[var(--text-secondary)]"}`}>{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="relative h-0.5 w-12 sm:w-24 bg-white/10 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: i < active ? "100%" : "0%" }} transition={{ duration: 0.6, ease: "easeOut" }} className="h-full" style={{ background: "var(--gradient-primary)" }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
