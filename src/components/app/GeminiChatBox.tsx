import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Loader2, MapPin, Camera, X, Image, AlertTriangle, CheckCircle2 } from "lucide-react";
import { chatWithAI, analyseImageWithGemini } from "@/lib/gemini";

interface GeminiChatBoxProps {
  onReady: (fullTranscript: string, photo?: string | null) => void;
}

type Message = {
  role: "user" | "model";
  parts: string;
  image?: string;
  /** Set on the AI message that followed an image upload */
  imageStatus?: "valid" | "invalid" | "analysing";
};

export function GeminiChatBox({ onReady }: GeminiChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", parts: "Namaste! I am AwaazAI. How can I help you today with your civic concerns? You can type, share your location, or attach a photo of the problem." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  /** The validated civic photo (only set after Gemini confirms it's civic-related) */
  const [confirmedPhoto, setConfirmedPhoto] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  /* ── Image upload & auto-analysis ─────────────────────── */
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result);
      setPendingPhoto(dataUrl);

      // 1. Add user message bubble with the image
      const userMsg: Message = {
        role: "user",
        parts: "I've uploaded a photo of the problem.",
        image: dataUrl,
      };

      // 2. Add a temporary "analysing" AI bubble
      const analysingMsg: Message = {
        role: "model",
        parts: "Analysing your photo…",
        imageStatus: "analysing",
      };

      setMessages(prev => [...prev, userMsg, analysingMsg]);
      setLoading(true);

      // 3. Call Gemini Vision
      const result = await analyseImageWithGemini(dataUrl);
      setLoading(false);

      // 4. Replace the analysing bubble with the real response
      if (result.isCivicProblem) {
        setConfirmedPhoto(dataUrl);
        setMessages(prev => [
          ...prev.slice(0, -1), // remove "Analysing…" bubble
          {
            role: "model",
            parts: result.message,
            imageStatus: "valid",
          },
        ]);
      } else {
        // Invalid — remove the pending photo and show rejection
        setPendingPhoto(null);
        setMessages(prev => [
          ...prev.slice(0, -1),
          {
            role: "model",
            parts: result.message,
            imageStatus: "invalid",
          },
        ]);
      }
    };
    reader.readAsDataURL(file);
  };

  /* ── Regular text send ─────────────────────────────────── */
  const handleSend = async () => {
    if ((!input.trim() && !pendingPhoto) || loading) return;

    const userText = input.trim() || (pendingPhoto && !confirmedPhoto ? "I've attached a photo of the problem." : "");
    if (!userText) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", parts: userText }]);
    setLoading(true);

    const response = await chatWithAI(userText, messages);
    setLoading(false);

    if (response.includes("[READY_TO_FILE]")) {
      const cleanResp = response.replace("[READY_TO_FILE]", "").trim();
      setMessages(prev => [...prev, { role: "model", parts: cleanResp }]);
      setIsReady(true);
    } else {
      setMessages(prev => [...prev, { role: "model", parts: response }]);
    }
  };

  /* ── Confirm & hand off to analysis pipeline ───────────── */
  const handleFinalConfirm = () => {
    const transcript = messages
      .filter(m => m.role === "user")
      .map(m => m.parts)
      .join(". ");
    onReady(transcript, confirmedPhoto ?? null);
  };

  /* ── Location share ─────────────────────────────────────── */
  const handleShareLocation = () => {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const locMsg = `My current GPS location is: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}.`;
      setMessages(prev => [...prev, { role: "user", parts: locMsg }]);
      const response = await chatWithAI(locMsg, messages);
      setLoading(false);
      if (response.includes("[READY_TO_FILE]")) {
        const cleanResp = response.replace("[READY_TO_FILE]", "").trim();
        setMessages(prev => [...prev, { role: "model", parts: cleanResp }]);
        setIsReady(true);
      } else {
        setMessages(prev => [...prev, { role: "model", parts: response }]);
      }
    }, () => {
      setLoading(false);
      setMessages(prev => [...prev, { role: "model", parts: "Couldn't access your location. Please type your landmark manually." }]);
    });
  };

  return (
    <div className="flex flex-col h-[520px] glass overflow-hidden rounded-2xl border-2 border-white/10 shadow-2xl">

      {/* ── Header ── */}
      <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-500/20 grid place-items-center">
            <Sparkles className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <div className="text-sm font-display font-bold">Awaaz AI Assistant</div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Case Analysis
            </div>
          </div>
        </div>
        {/* Confirmed photo indicator */}
        {confirmedPhoto && (
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" />
            Photo verified
          </div>
        )}
      </div>

      {/* ── Message list ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "model" && m.imageStatus === "analysing" ? (
                /* Pulsing scan animation while Gemini reads the image */
                <div className="glass border border-blue-500/20 p-3 rounded-2xl rounded-tl-sm flex items-center gap-3 max-w-[80%]">
                  <div className="relative h-8 w-8 flex-shrink-0">
                    <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
                    <div className="relative h-8 w-8 rounded-full bg-blue-500/10 grid place-items-center">
                      <Camera className="h-4 w-4 text-blue-400" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-blue-300">Analysing photo with Gemini Vision…</div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Checking if this is a civic issue</div>
                  </div>
                </div>
              ) : m.role === "model" && m.imageStatus === "invalid" ? (
                /* Rejection / error card */
                <div className="max-w-[80%] rounded-2xl rounded-tl-sm overflow-hidden border border-red-500/30">
                  <div className="bg-red-500/10 px-4 py-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                    <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Not a civic problem</span>
                  </div>
                  <div className="glass px-4 py-3 text-sm text-[var(--text-primary)]">{m.parts}</div>
                </div>
              ) : m.role === "model" && m.imageStatus === "valid" ? (
                /* Success / follow-up card */
                <div className="max-w-[80%] rounded-2xl rounded-tl-sm overflow-hidden border border-emerald-500/30">
                  <div className="bg-emerald-500/10 px-4 py-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Civic problem detected</span>
                  </div>
                  <div className="glass px-4 py-3 text-sm text-[var(--text-primary)]">{m.parts}</div>
                </div>
              ) : (
                /* Regular message bubble */
                <div className={`max-w-[80%] rounded-2xl text-sm overflow-hidden ${
                  m.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-sm shadow-lg"
                    : "glass text-[var(--text-primary)] rounded-tl-sm border border-white/5"
                }`}>
                  {/* Inline image if attached to a user message */}
                  {m.image && (
                    <div className="relative">
                      <img src={m.image} alt="Attached complaint photo" className="w-full max-h-40 object-cover" />
                      <div className="absolute bottom-1.5 right-2 bg-black/60 text-[9px] text-white px-1.5 py-0.5 rounded-full flex items-center gap-1">
                        <Image className="h-2.5 w-2.5" /> Reference photo
                      </div>
                    </div>
                  )}
                  <div className="p-3">{m.parts}</div>
                </div>
              )}
            </motion.div>
          ))}

          {/* Typing indicator for normal chat (not image analysis) */}
          {loading && messages[messages.length - 1]?.imageStatus !== "analysing" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="glass p-3 rounded-2xl rounded-tl-sm flex items-center gap-2 border border-white/5">
                <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                <span className="text-xs text-[var(--text-secondary)] font-medium">AI is thinking…</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Input area ── */}
      <div className="p-4 bg-white/5 border-t border-white/10 flex flex-col gap-3 flex-shrink-0">
        {isReady ? (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleFinalConfirm}
            className="w-full h-12 rounded-xl text-white font-display font-bold flex items-center justify-center gap-2"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow-blue)" }}
          >
            <Sparkles className="h-4 w-4" /> Confirm & Start AI Analysis →
          </motion.button>
        ) : (
          <div className="flex gap-2 items-center">
            {/* Location */}
            <button
              onClick={handleShareLocation}
              title="Share Location"
              disabled={loading}
              className="h-10 w-10 rounded-xl glass border border-white/10 grid place-items-center text-blue-400 hover:bg-white/10 transition-colors flex-shrink-0 disabled:opacity-40"
            >
              <MapPin className="h-4 w-4" />
            </button>

            {/* Camera — disabled while loading */}
            <button
              onClick={() => !loading && photoInputRef.current?.click()}
              title={confirmedPhoto ? "Change photo" : "Attach a photo"}
              disabled={loading}
              className={`h-10 w-10 rounded-xl glass border transition-colors grid place-items-center flex-shrink-0 disabled:opacity-40 ${
                confirmedPhoto
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                  : "border-white/10 text-[var(--text-secondary)] hover:bg-white/10 hover:text-blue-400"
              }`}
            >
              {confirmedPhoto ? <CheckCircle2 className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />

            {/* Text input */}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={confirmedPhoto ? "Answer the questions above…" : "Describe your problem…"}
              disabled={loading}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500/50 transition-colors disabled:opacity-50"
            />

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={loading || (!input.trim())}
              className="h-10 w-10 rounded-xl bg-blue-600 grid place-items-center text-white hover:bg-blue-500 transition-colors disabled:opacity-50 shadow-lg flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
