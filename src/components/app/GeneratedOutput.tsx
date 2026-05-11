import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Mail, FileText, Phone, Download, Send } from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

const tabs = [
  { id: "wa", label: "WhatsApp", icon: Phone },
  { id: "letter", label: "Formal Letter", icon: FileText },
  { id: "email", label: "Email", icon: Mail },
];

export function GeneratedOutput({ 
  text = "", 
  ward = "Ward 68", 
  category = "Other",
  refCode = "GRV-KA-2024-X7R9",
  drafts,
  routing,
  intent
}: { 
  text?: string; 
  ward?: string; 
  category?: string;
  refCode?: string;
  drafts?: any;
  routing?: any;
  intent?: any;
}) {
  const [tab, setTab] = useState("wa");
  const [copied, setCopied] = useState(false);

  const dynamicContent: Record<string, string> = {
    wa: drafts?.whatsapp || `Namaste, reporting an issue at ${intent?.location || ward}.`,
    letter: drafts?.letter || `To,\nThe Commissioner,\n\nSubject: Formal Petition regarding civic issues.\n\nRespected Sir,\nI am reporting a problem at ${intent?.location || ward}. It has been occurring for ${intent?.duration || "some time"} and is affecting the community by ${intent?.impact || "causing safety concerns"}.\n\nRegards,\nCitizen`,
    email: drafts?.email || `Subject: Urgent Grievance - ${intent?.location || ward}\n\nDear Sir,\n\nI am formally reporting a civic issue. Details are attached.\n\nRegards,\nAwaazAI`,
  };

  const contact = routing?.contact || "+91 98456 77821";
  const dept = routing?.department || "Municipal Corporation";
  const officer = routing?.officer || "Ward Engineer";
  const sla = routing?.sla || "72 hours";

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22); doc.text("Official Grievance Petition", 20, 20);
    doc.setFontSize(12);
    doc.text(`Reference ID: ${refCode}`, 20, 35);
    doc.text(`To: The Commissioner, ${dept}`, 20, 45);
    doc.text(`Location: ${ward}`, 20, 55);
    doc.text(`Duration: ${intent?.duration || "N/A"}`, 20, 65);
    doc.text(`Impact: ${intent?.impact || "N/A"}`, 20, 75);
    doc.text("--------------------------------------------------", 20, 85);
    doc.text(doc.splitTextToSize(dynamicContent.letter, 170), 20, 95);
    doc.save(`Grievance_${refCode}.pdf`);
    toast.success("Professional PDF petition generated!");
  };

  const sendEmail = () => {
    const emailTo = routing?.email || "support@bbmp.gov.in";
    const subject = encodeURIComponent(`URGENT: ${category} - ${ward} (${refCode})`);
    const body = encodeURIComponent(dynamicContent.email);
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${emailTo}&su=${subject}&body=${body}`, "_blank");
  };

  const copy = () => { navigator.clipboard?.writeText(dynamicContent[tab]); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <div className="glass p-5 h-full flex flex-col">
      <div className="grid grid-cols-3 gap-2 mb-4 glass p-1.5 rounded-xl">
        <div className="text-center p-2 rounded-lg bg-white/5">
          <div className="text-[10px] uppercase text-[var(--text-secondary)]">Location</div>
          <div className="text-xs font-bold truncate">{intent?.location || ward}</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/5">
          <div className="text-[10px] uppercase text-[var(--text-secondary)]">Duration</div>
          <div className="text-xs font-bold truncate">{intent?.duration || "N/A"}</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/5">
          <div className="text-[10px] uppercase text-[var(--text-secondary)]">Impact</div>
          <div className="text-xs font-bold truncate">{intent?.impact || "N/A"}</div>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-4 glass p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 h-9 rounded-lg text-xs font-medium transition-all ${tab === t.id ? "text-white" : "text-[var(--text-secondary)] hover:text-white"}`} style={tab === t.id ? { background: "var(--gradient-primary)", boxShadow: "0 4px 12px rgba(59,125,232,0.3)" } : {}}>
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-[280px] mb-4 relative group">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="h-full">
            {tab === "wa" ? (
              <div className="h-full grid place-items-center">
                <div className="w-full max-w-xs glass rounded-3xl p-3 border-2" style={{ borderColor: "var(--glass-border)" }}>
                  <div className="text-[10px] text-[var(--text-secondary)] mb-2 flex items-center gap-1.5"><Phone className="h-3 w-3" /> {contact} · {dept}</div>
                  <div className="rounded-2xl rounded-tl-sm bg-emerald-500/15 border border-emerald-500/30 p-3 text-xs whitespace-pre-wrap text-[var(--text-primary)]">{dynamicContent.wa}</div>
                  <a href={`https://wa.me/${contact.replace(/\D/g,'')}?text=${encodeURIComponent(dynamicContent.wa)}`} target="_blank" rel="noreferrer" className="mt-3 block text-center text-xs text-emerald-400 hover:underline">Open in WhatsApp →</a>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <pre className="flex-1 overflow-auto whitespace-pre-wrap text-xs leading-relaxed glass p-4 font-body border border-white/5">{dynamicContent[tab]}</pre>
                <div className="mt-2 flex gap-2">
                  {tab === "letter" && (
                    <button onClick={downloadPDF} className="flex-1 h-10 rounded-xl glass border border-blue-500/30 text-blue-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-500/10 transition-all">
                      <Download className="h-3.5 w-3.5" /> Download PDF
                    </button>
                  )}
                  {tab === "email" && (
                    <button onClick={sendEmail} className="flex-1 h-10 rounded-xl glass border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-500/10 transition-all">
                      <Send className="h-3.5 w-3.5" /> Open in Gmail →
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
 
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/5 pt-4">
        <div className="flex items-center gap-3 glass p-3 flex-1">
          <div className="h-9 w-9 rounded-lg grid place-items-center text-sm" style={{ background: "var(--gradient-primary)" }}>📜</div>
          <div className="text-xs flex-1 min-w-0">
            <div className="font-medium">{dept} · {officer}</div>
            <div className="text-[var(--text-secondary)]">Resolution Goal: {sla}</div>
          </div>
        </div>
        <button onClick={copy} className="h-10 px-4 rounded-xl text-xs font-medium glass hover:bg-white/10 flex items-center gap-2">
          {copied ? <><Check className="h-3.5 w-3.5 text-emerald-400" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
        </button>
      </div>
    </div>
  );
}
