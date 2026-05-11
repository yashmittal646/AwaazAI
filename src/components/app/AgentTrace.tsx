import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

const agents = [
  {
    name: "Language & Intent Agent",
    confidence: 0,
    lines: ["> Initializing NLP engine...", "> Awaiting transcript..."],
  },
  {
    name: "Department Routing Agent",
    confidence: 0,
    lines: ["> Preparing department routing graph..."],
  },
  {
    name: "Drafting Agent (Gemini 2.0)",
    confidence: 0,
    lines: ["> Loading administrative templates..."],
  },
  {
    name: "Verification & SLA Agent",
    confidence: 0,
    lines: ["> Ready for case validation..."],
  },
];

function StreamLines({ lines }: { lines: string[] }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    const all = lines.join("\n");
    let i = 0;
    const t = setInterval(() => {
      i += 3;
      setShown(all.slice(0, i));
      if (i >= all.length) clearInterval(t);
    }, 18);
    return () => clearInterval(t);
  }, [lines]);
  return (
    <pre className="font-mono text-[11px] leading-relaxed text-emerald-400 whitespace-pre-wrap">{shown}<span className="text-emerald-300">▍</span></pre>
  );
}

export function AgentTrace({ data, onDone }: { data: any; onDone?: () => void }) {
  const [active, setActive] = useState(0);

  const dynamicAgents = data ? [
    {
      name: "Language & Intent Agent",
      confidence: 98,
      lines: [
        `> Detected language: ${data.intent.language}`,
        `> Intent: ${data.intent.type}`,
        `> Urgency: ${data.intent.urgency}`,
        `> Contextual location: ${data.intent.location}`,
      ],
    },
    {
      name: "Department Routing Agent",
      confidence: 96,
      lines: [
        `> Target: ${data.routing.department}`,
        `> Contact: ${data.routing.contact}`,
        `> Assigned Officer: ${data.routing.officer}`,
        `> Expected SLA: ${data.routing.sla}`,
      ],
    },
    {
      name: "Drafting Agent (Gemini 2.0)",
      confidence: 99,
      lines: [
        `> WhatsApp: ${data.drafts.whatsapp.length} chars`,
        `> Formal Letter: generated`,
        `> Email: CC'd to ward councillor`,
      ],
    },
    {
      name: "Verification & SLA Agent",
      confidence: 94,
      lines: [
        `> Analysis: ${data.verification.summary}`,
        `> Cluster: verified via ward proximity graph`,
        `> Escalation: auto-triggered at T+72h if unresolved`,
      ],
    },
  ] : agents;

  useEffect(() => {
    if (active >= dynamicAgents.length) { onDone?.(); return; }
    const t = setTimeout(() => setActive((a) => a + 1), 1200);
    return () => clearTimeout(t);
  }, [active, onDone, dynamicAgents.length]);

  return (
    <div className="space-y-3">
      {dynamicAgents.map((a, i) => {
        const state: "done" | "active" | "pending" = i < active ? "done" : i === active ? "active" : "pending";
        return (
          <motion.div
            key={a.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: state === "pending" ? 0.4 : 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="relative glass p-4 pl-5 overflow-hidden"
          >
            <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: state === "done" ? "var(--color-emerald)" : state === "active" ? "var(--color-saffron)" : "var(--glass-border)" }} />
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full grid place-items-center text-xs font-display font-bold text-white" style={{ background: state === "done" ? "var(--color-emerald)" : state === "active" ? "var(--gradient-saffron)" : "transparent", border: state === "pending" ? "1px solid var(--glass-border)" : "none" }}>{i + 1}</div>
              <div className="font-display font-bold text-sm flex-1">{a.name}</div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${a.confidence > 95 ? "text-emerald-400 bg-emerald-400/10" : "text-amber-300 bg-amber-300/10"}`}>{a.confidence}% conf</span>
              {state === "done" ? <Check className="h-4 w-4 text-[var(--color-emerald)]" /> : state === "active" ? <Loader2 className="h-4 w-4 animate-spin text-[var(--color-saffron)]" /> : <span className="h-4 w-4 rounded-full border border-[var(--glass-border)]" />}
            </div>
            {state !== "pending" && (
              <div className="mt-3 rounded-lg bg-black/40 border border-[var(--glass-border)] p-3">
                <StreamLines lines={a.lines} />
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
