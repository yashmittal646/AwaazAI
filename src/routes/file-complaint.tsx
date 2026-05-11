import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Sparkles, Camera, UploadCloud, X, Copy, Check, Share2, Loader2 } from "lucide-react";
import { Stepper } from "@/components/app/Stepper";
import { VoiceWidget } from "@/components/app/VoiceWidget";
import { AgentTrace } from "@/components/app/AgentTrace";
import { GeneratedOutput } from "@/components/app/GeneratedOutput";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { analyseGrievance, type AnalysisResult } from "@/lib/gemini";
import { sendComplaintRegisteredSms } from "@/lib/sms";
import { GeminiChatBox } from "@/components/app/GeminiChatBox";
import { toast } from "sonner";


export const Route = createFileRoute("/file-complaint")({
  head: () => ({ meta: [{ title: "File a Complaint — AwaazAI" }, { name: "description", content: "Speak in any Indian language. AI files your grievance in seconds." }] }),
  component: FileComplaint,
});

const types = ["Road","Water","Electricity","Housing","Pension","Jobs","Sanitation","Corruption","Other"] as const;

const CATEGORIES_MAP: Record<string, (typeof types)[number]> = {
  "water": "Water", "leak": "Water", "tanker": "Water", "drain": "Water", "sewage": "Water", "pipeline": "Water", "ನೀರು": "Water", "पानी": "Water",
  "road": "Road", "pothole": "Road", "street": "Road", "asphalt": "Road", "flyover": "Road", "traffic": "Road", "ರಸ್ತೆ": "Road", "सड़क": "Road",
  "light": "Electricity", "power": "Electricity", "electricity": "Electricity", "transformer": "Electricity", "voltage": "Electricity", "bill": "Electricity", "ವಿದ್ಯುತ್": "Electricity", "बिजली": "Electricity",
  "garbage": "Sanitation", "trash": "Sanitation", "waste": "Sanitation", "clean": "Sanitation", "sweep": "Sanitation", "litter": "Sanitation", "ಕಸ": "Sanitation", "कचरा": "Sanitation",
  "house": "Housing", "building": "Housing", "illegal": "Housing", "encroach": "Housing", "property": "Housing", "site": "Housing", "ಮನೆ": "Housing", "घर": "Housing",
  "pension": "Pension", "allowance": "Pension", "senior": "Pension", "widow": "Pension", "ವೃದ್ಧಾಪ್ಯ": "Pension", "पेंशन": "Pension",
  "job": "Jobs", "work": "Jobs", "mnrega": "Jobs", "wage": "Jobs", "employment": "Jobs", "ಕೆಲಸ": "Jobs", "नौकरी": "Jobs",
  "bribe": "Corruption", "money": "Corruption", "corrupt": "Corruption", "officer": "Corruption", "scam": "Corruption", "ಲಂಚ": "Corruption", "रिश्वत": "Corruption",
};

function FileComplaint() {
  const [step, setStep] = useState(0);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null); // dataURL from either agent
  const [detected, setDetected] = useState<string | null>(null);
  const [showChips, setShowChips] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refCode, setRefCode] = useState<string>("GRV-KA-2024-X7R9");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dynamic extraction of ward/location from text
  const wards = ["Koramangala", "Whitefield", "Jayanagar", "HSR Layout", "Indiranagar", "Malleshwaram", "Yelahanka", "BTM Layout", "Marathahalli", "Hebbal", "Banashankari", "Rajajinagar"];
  const lowerText = text.toLowerCase();
  const detectedWard = wards.find(w => lowerText.includes(w.toLowerCase()));

  useEffect(() => {
    if (!text.trim()) { setShowChips(false); setDetected(null); return; }
    const t = setTimeout(() => {
      setShowChips(true);
      const lower = text.toLowerCase();
      // Match against CATEGORIES_MAP
      let foundType: (typeof types)[number] = "Other";
      for (const [kw, type] of Object.entries(CATEGORIES_MAP)) {
        if (lower.includes(kw)) {
          foundType = type;
          break;
        }
      }
      // Fallback to direct type name matching
      if (foundType === "Other") {
        const direct = types.find((tp) => lower.includes(tp.toLowerCase()));
        if (direct) foundType = direct;
      }
      setDetected(foundType);
      
      // Proactively request location if not already known
      if (typeof window !== "undefined" && !detectedWard && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 1000 });
      }
    }, 800);
    return () => clearTimeout(t);
  }, [text]);

  useEffect(() => {
    if (step === 2) {
      confetti({ particleCount: 120, spread: 100, origin: { y: 0.4 }, colors: ["#1a56c4","#f97316","#ffffff","#10b981","#6fa3f7"] });
    }
  }, [step]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => setPhoto(String(r.result)); r.readAsDataURL(f);
  };

  const submitToDb = async () => {
    if (!user || isSubmitting) { 
      if (!user) setStep(2);
      return; 
    }
    
    setIsSubmitting(true);
    
    let finalWard = detectedWard ? `${detectedWard} Ward` : ((user.user_metadata?.ward as string) ?? null);
    let finalLocation = detectedWard || ((user.user_metadata?.address as string) ?? null);
    let lat = null;
    let lng = null;

    if (!detectedWard && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        if (!finalLocation) finalLocation = `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      } catch (e) {
        console.warn("Geolocation fallback failed:", e);
      }
    }

    // ── Upload photo to Supabase Storage if present ──────────
    let imageUrl: string | null = null;
    if (photo) {
      try {
        // Convert dataURL to Blob
        const res = await fetch(photo);
        const blob = await res.blob();
        const ext = blob.type.split("/")[1] || "jpg";
        const filePath = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("grievance-photos")
          .upload(filePath, blob, { contentType: blob.type, upsert: false });
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("grievance-photos")
            .getPublicUrl(filePath);
          imageUrl = urlData?.publicUrl ?? null;
        } else {
          console.warn("Image upload failed:", uploadError.message);
        }
      } catch (e) {
        console.warn("Image upload error:", e);
      }
    }

    const title = text.trim().slice(0, 80) || `${detected ?? "Other"} grievance`;
    const { data, error } = await supabase.from("grievances").insert({
      user_id: user.id,
      title,
      description: text,
      type: detected ?? "Other",
      ward: finalWard,
      location: finalLocation,
      status: "Filed",
      risk_score: 6,
      sla_days: 7,
      image_url: imageUrl,
    }).select("ref_code").single();
    
    if (error) {
      console.error("Supabase Submission Error:", error);
    }

    if (!error && data?.ref_code) {
      const finalRefCode = data.ref_code;
      setRefCode(finalRefCode);

      // Send SMS — fire and show toast based on result
      const mobile = user.user_metadata?.mobile as string | undefined;
      console.log("[Complaint] User mobile from metadata:", mobile ?? "NOT FOUND");

      sendComplaintRegisteredSms(mobile, finalRefCode).then((result) => {
        if (result.success) {
          toast.success(`📱 SMS sent to ${mobile?.slice(0, 5)}*****`);
        } else if (result.error === "No mobile number") {
          toast.warning("No mobile number found in your profile — SMS not sent.");
        } else if (result.error !== "SMS key not configured") {
          toast.error(`SMS failed: ${result.error}`);
        }
      });
    }

    setIsSubmitting(false);
    setStep(2);
  };

  const getNearestWard = (lat: number, lng: number) => {
    // Simple Euclidean distance for Bangalore area
    const wardsData = [
      { name: "Koramangala", lat: 12.9352, lng: 77.6245 },
      { name: "Whitefield", lat: 12.9698, lng: 77.7500 },
      { name: "Jayanagar", lat: 12.9250, lng: 77.5938 },
      { name: "HSR Layout", lat: 12.9116, lng: 77.6473 },
      { name: "Indiranagar", lat: 12.9719, lng: 77.6412 },
      { name: "Malleshwaram", lat: 13.0035, lng: 77.5650 },
      { name: "Yelahanka", lat: 13.1007, lng: 77.5963 },
      { name: "BTM Layout", lat: 12.9166, lng: 77.6101 },
      { name: "Marathahalli", lat: 12.9591, lng: 77.6974 },
      { name: "Hebbal", lat: 13.0359, lng: 77.5970 },
      { name: "Banashankari", lat: 12.9250, lng: 77.5460 },
      { name: "Rajajinagar", lat: 12.9982, lng: 77.5527 },
    ];
    let nearest = wardsData[0];
    let minDist = Infinity;
    for (const w of wardsData) {
      const d = Math.sqrt(Math.pow(w.lat - lat, 2) + Math.pow(w.lng - lng, 2));
      if (d < minDist) { minDist = d; nearest = w; }
    }
    return nearest.name;
  };

  const handleAnalyse = async (transcriptOverride?: string) => {
    setStep(1);
    const finalTranscript = transcriptOverride || text;
    
    let activeLocation = "Bangalore (GPS not shared)";
    
    // Attempt to get live location for analysis context
    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { 
            timeout: 5000, 
            enableHighAccuracy: true 
          });
        });
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const nearestWard = getNearestWard(lat, lng);
        activeLocation = `${nearestWard} Ward (GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      } catch (e) {
        console.warn("Analysis geo fetch failed:", e);
      }
    }

    const result = await analyseGrievance(finalTranscript, activeLocation);
    setAnalysis(result);
  };

  const handleChatReady = (fullTranscript: string, chatPhoto?: string | null) => {
    setText(fullTranscript);
    if (chatPhoto) setPhoto(chatPhoto);
    handleAnalyse(fullTranscript);
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="mb-2 text-center">
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[var(--color-saffron)] mb-2"><Sparkles className="h-3 w-3" /> Citizen Voice Engine</div>
        <h1 className="font-display font-extrabold text-3xl md:text-5xl">File your complaint</h1>
        <p className="mt-2 text-[var(--text-secondary)] text-sm">Speak, type or photograph — our AI handles the paperwork.</p>
      </div>

      <div className="mt-8"><Stepper active={step} /></div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="s0" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6 max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="glass p-6 h-full flex flex-col justify-center text-center">
                  <div className="mb-4">
                    <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[var(--color-saffron)] mb-2"><Sparkles className="h-3 w-3" /> Voice Assistant</div>
                    <h3 className="text-xl font-bold font-display">Speak to AI Agent</h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">Raise your voice for your ward.</p>
                  </div>
                  <VoiceWidget 
                    onTranscript={setText} 
                    onCallEnd={handleAnalyse}
                    onPhotoChange={setPhoto}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <GeminiChatBox onReady={handleChatReady} />
              </div>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="grid lg:grid-cols-2 gap-5">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)] mb-2">Reasoning trace</div>
              <h2 className="font-display font-bold text-2xl mb-4">Agent pipeline</h2>
              <AgentTrace data={analysis} />
            </div>
            <div>
              <GeneratedOutput 
                text={text} 
                ward={analysis?.intent.location || detectedWard || "Unknown Ward"}
                category={analysis?.intent.type || detected || "Other"}
                refCode={refCode}
                drafts={analysis?.drafts}
                routing={analysis?.routing}
                intent={analysis?.intent}
              />
              <motion.button 
                whileTap={{ scale: 0.97 }} 
                whileHover={{ scale: 1.01 }} 
                onClick={submitToDb} 
                disabled={isSubmitting}
                className="mt-4 w-full h-12 rounded-xl text-white font-display font-bold flex items-center justify-center gap-2" 
                style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow-blue)" }}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & file →"}
              </motion.button>
              {!user && <p className="mt-2 text-center text-[10px] text-[var(--text-muted)]">Sign in to save this grievance to your account.</p>}
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto text-center">
            <div className="glass p-10">
              <svg viewBox="0 0 80 80" className="mx-auto h-24 w-24">
                <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(16,185,129,0.25)" strokeWidth="3" />
                <motion.path d="M24 42 L36 54 L58 30" fill="none" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, ease: "easeOut" }} />
              </svg>
              <h2 className="mt-6 font-display font-extrabold text-3xl">Filed successfully!</h2>
              <p className="mt-2 text-[var(--text-secondary)]">Your voice has reached the right desk.</p>

              <div className="mt-6 inline-flex items-center gap-3 glass px-5 py-3">
                <span className="text-xs uppercase text-[var(--text-secondary)] tracking-widest">Grievance ID</span>
                <span className="font-mono text-xl text-gradient-blue font-bold">{refCode}</span>
                <button onClick={() => { navigator.clipboard?.writeText(refCode); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="h-7 w-7 grid place-items-center rounded-md hover:bg-white/10">{copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}</button>
              </div>

              <div className="mt-8 flex items-center justify-center gap-2">
                {["Filed","Routed","Acknowledged","In Progress","Resolved"].map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className="flex flex-col items-center gap-1">
                      <span className="h-3 w-3 rounded-full" style={{ background: i === 0 ? "var(--color-emerald)" : "rgba(255,255,255,0.15)" }} />
                      <span className="text-[10px] text-[var(--text-secondary)]">{s}</span>
                    </div>
                    {i < 4 && <span className="w-8 h-px bg-white/10 -mt-3" />}
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <a href="https://wa.me/919845677821" target="_blank" rel="noreferrer" className="px-5 h-11 rounded-xl text-sm font-medium text-white flex items-center gap-2" style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}><Share2 className="h-4 w-4" /> Share on WhatsApp</a>
                <Link to="/my-grievances" className="px-5 h-11 rounded-xl text-sm font-medium glass border border-[var(--color-blue-400)]/40 text-[var(--color-blue-300)] flex items-center">Track this complaint →</Link>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mt-6">
              {[
                { t: "AI sends drafts", d: "WhatsApp + email dispatched to BWSSB AEE within 60s." },
                { t: "Department acks", d: "Officer acknowledgement expected in 24 hours." },
                { t: "Auto-escalation", d: "If unresolved by SLA, escalates to Ward Councillor." },
              ].map((c) => (
                <div key={c.t} className="glass p-4 text-left">
                  <div className="font-display font-bold text-sm text-[var(--color-blue-300)]">{c.t}</div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">{c.d}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
