export type Status = "Filed" | "In Progress" | "Resolved" | "Escalated" | "Overdue";
export type ProblemType = "Road" | "Water" | "Electricity" | "Housing" | "Pension" | "Jobs" | "Sanitation" | "Corruption" | "Other";

export const TYPE_META: Record<ProblemType, { icon: string; color: string }> = {
  Road: { icon: "🛣️", color: "#f97316" },
  Water: { icon: "💧", color: "#3b7de8" },
  Electricity: { icon: "⚡", color: "#fbbf24" },
  Housing: { icon: "🏠", color: "#a78bfa" },
  Pension: { icon: "👵", color: "#10b981" },
  Jobs: { icon: "💼", color: "#6fa3f7" },
  Sanitation: { icon: "🧹", color: "#22d3ee" },
  Corruption: { icon: "⚖️", color: "#ef4444" },
  Other: { icon: "📌", color: "#94a3b8" },
};

export const STATUS_COLOR: Record<Status, string> = {
  Filed: "#3b7de8",
  "In Progress": "#f97316",
  Resolved: "#10b981",
  Escalated: "#ef4444",
  Overdue: "#ef4444",
};

export interface Grievance {
  id: string;
  type: ProblemType;
  title: string;
  description: string;
  ward: string;
  location: string;
  filed: string;
  status: Status;
  daysOpen: number;
  slaDays: number;
  riskScore: number;
  lat: number;
  lng: number;
}

const wards = [
  ["Koramangala", 12.9352, 77.6245],
  ["Whitefield", 12.9698, 77.7500],
  ["Jayanagar", 12.9250, 77.5938],
  ["HSR Layout", 12.9116, 77.6473],
  ["Indiranagar", 12.9719, 77.6412],
  ["Malleshwaram", 13.0035, 77.5650],
  ["Yelahanka", 13.1007, 77.5963],
  ["BTM Layout", 12.9166, 77.6101],
  ["Marathahalli", 12.9591, 77.6974],
  ["Hebbal", 13.0359, 77.5970],
  ["Banashankari", 12.9250, 77.5460],
  ["Rajajinagar", 12.9982, 77.5527],
] as const;

const types: ProblemType[] = ["Road","Water","Electricity","Housing","Pension","Jobs","Sanitation","Corruption","Other"];
const statuses: Status[] = ["Filed","In Progress","Resolved","Escalated","Overdue"];

const titles: Record<ProblemType, string[]> = {
  Water: ["No water supply for 5 days", "Contaminated tap water", "Burst water main flooding street"],
  Road: ["Massive pothole near junction", "Streetlights out for weeks", "Broken footpath, accident risk"],
  Electricity: ["Daily 6-hour power cuts", "Transformer sparking dangerously", "Voltage fluctuation damaging appliances"],
  Housing: ["Slum redevelopment delay", "Patta document pending 90 days", "Illegal construction next door"],
  Pension: ["Senior pension not credited 3 months", "Widow pension stuck in verification", "Pension office unresponsive"],
  Jobs: ["MNREGA wages unpaid 60 days", "Skill training certificate missing", "Job card application rejected"],
  Sanitation: ["Garbage uncleared 10 days", "Public toilet broken", "Open drain overflowing"],
  Corruption: ["Bribe demanded for ration card", "Officer absent during work hours", "Tender irregularity reported"],
  Other: ["Public park encroached", "Stray dog menace", "Noise pollution from construction"],
};

function rand<T>(arr: readonly T[], i: number) { return arr[i % arr.length]; }

export const GRIEVANCES: Grievance[] = Array.from({ length: 50 }, (_, i) => {
  const t = rand(types, i * 3 + 1);
  const w = rand(wards, i * 7 + 2);
  const s = rand(statuses, i * 11 + 3);
  const days = (i * 13) % 18;
  const sla = 7 + (i % 8);
  const titleArr = titles[t];
  return {
    id: `GRV-KA-2024-${(1000 + i).toString(36).toUpperCase()}`,
    type: t,
    title: rand(titleArr, i),
    description: `${rand(titleArr, i)} affecting residents in ${w[0]} ward. Multiple households impacted, urgent action requested from concerned department.`,
    ward: `${w[0]} Ward ${68 + (i % 30)}`,
    location: w[0] as string,
    filed: new Date(Date.now() - days * 86400000).toISOString(),
    status: days > sla ? "Overdue" : s,
    daysOpen: days,
    slaDays: sla,
    riskScore: Math.min(10, Math.max(1, Math.round((days / sla) * 7 + (t === "Water" || t === "Corruption" ? 2 : 0)))),
    lat: (w[1] as number) + (Math.sin(i) * 0.01),
    lng: (w[2] as number) + (Math.cos(i) * 0.01),
  };
});

export const MY_GRIEVANCES = GRIEVANCES.slice(0, 6);

export const FEED_EVENTS = GRIEVANCES.slice(0, 8).map((g, i) => ({
  ...g,
  ago: ["just now","2m ago","8m ago","17m ago","31m ago","1h ago","2h ago","3h ago"][i],
}));

export const KPIS = [
  { label: "Total Filed", value: 2847, accent: "blue", trend: "+12%" },
  { label: "Resolved", value: 1923, accent: "emerald", trend: "+8%" },
  { label: "In Progress", value: 641, accent: "saffron", trend: "+3%" },
  { label: "Escalated", value: 283, accent: "crimson", trend: "-5%" },
] as const;

export const COMPLAINTS_BY_TYPE = types.map((t) => ({
  type: t,
  count: 80 + ((t.charCodeAt(0) * 7) % 280),
}));

export const MONTHLY_TREND = ["Jan","Feb","Mar","Apr","May","Jun"].map((m, i) => ({
  month: m,
  Water: 120 + i * 18 + (i % 2) * 30,
  Road: 90 + i * 22,
  Electricity: 70 + i * 14,
  Housing: 50 + i * 9,
  Sanitation: 60 + i * 11,
}));

export const SPARK = (seed: number) => Array.from({ length: 6 }, (_, i) => ({ x: i, y: 20 + ((seed * (i + 1) * 7) % 60) }));

export const AI_INSIGHTS = [
  { tone: "crimson", icon: "🔴", text: "Water crisis cluster detected in Koramangala — 12 complaints in 72hrs. Likely main pipe failure." },
  { tone: "saffron", icon: "🟡", text: "Road damage complaints spike 340% in Whitefield post-monsoon." },
  { tone: "emerald", icon: "🟢", text: "HSR Layout sanitation issues resolved — BBMP response time: 4.2 days avg." },
  { tone: "blue", icon: "🔵", text: "3 pending housing complaints in Jayanagar exceed 30-day SLA. Escalation recommended." },
];
