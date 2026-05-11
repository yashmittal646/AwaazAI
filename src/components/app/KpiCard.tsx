import { GlassCard } from "./GlassCard";
import { useCountUp } from "@/lib/useCountUp";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { SPARK } from "@/data/mock";

const accentMap: Record<string, { color: string; glow: string; grad: string }> = {
  blue: { color: "var(--color-blue-400)", glow: "rgba(59,125,232,0.45)", grad: "g-blue" },
  emerald: { color: "var(--color-emerald)", glow: "rgba(16,185,129,0.45)", grad: "g-emerald" },
  saffron: { color: "var(--color-saffron)", glow: "rgba(249,115,22,0.45)", grad: "g-saffron" },
  crimson: { color: "var(--color-crimson)", glow: "rgba(239,68,68,0.45)", grad: "g-crimson" },
};

export function KpiCard({ label, value, accent, trend, seed = 1 }: { label: string; value: number; accent: string; trend?: string; seed?: number; }) {
  const v = useCountUp(value);
  const a = accentMap[accent] ?? accentMap.blue;
  const data = SPARK(seed);
  const id = `${a.grad}-${seed}`;
  return (
    <GlassCard className="relative overflow-hidden">
      <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full opacity-30 blur-2xl" style={{ background: a.glow }} />
      <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">{label}</div>
      <div className="mt-2 flex items-end justify-between">
        <div>
          <div className="font-display font-extrabold text-4xl tracking-tight" style={{ color: a.color }}>{v.toLocaleString()}</div>
          {trend && <div className="text-xs mt-1 text-[var(--text-secondary)]">{trend} <span className="opacity-60">vs last month</span></div>}
        </div>
        <div className="h-12 w-24 -mb-2 -mr-2">
          <ResponsiveContainer>
            <AreaChart data={data}>
              <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={a.color} stopOpacity={0.6} />
                  <stop offset="100%" stopColor={a.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="y" stroke={a.color} strokeWidth={2} fill={`url(#${id})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </GlassCard>
  );
}
