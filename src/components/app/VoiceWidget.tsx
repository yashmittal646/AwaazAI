import Vapi from "@vapi-ai/web";
import { Mic, MicOff, Loader2, PhoneOff, AlertCircle, Camera, X, Image } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";

/* ─── Types ─────────────────────────────────────────────── */
type CallState = "idle" | "connecting" | "active" | "ended" | "error";

interface TranscriptLine {
  role: "user" | "assistant";
  text: string;
  isFinal: boolean;
}

/* ─── Singleton Vapi instance ───────────────────────────── */
const PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY as string | undefined;
const ASSISTANT_ID = import.meta.env.VITE_VAPI_ASSISTANT_ID as string | undefined;

let vapiInstance: Vapi | null = null;
function getVapi(): Vapi | null {
  if (!PUBLIC_KEY || PUBLIC_KEY === "your_vapi_public_key_here") return null;
  if (!vapiInstance) vapiInstance = new Vapi(PUBLIC_KEY);
  return vapiInstance;
}

/* ─── Component ─────────────────────────────────────────── */
export function VoiceWidget({ 
  onTranscript, 
  onCallStart, 
  onCallEnd,
  onPhotoChange,
}: { 
  onTranscript: (t: string | ((prev: string) => string)) => void;
  onCallStart?: () => void;
  onCallEnd?: (fullTranscript: string) => void;
  onPhotoChange?: (photo: string | null) => void;
}) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [volume, setVolume] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [voicePhoto, setVoicePhoto] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const vapiRef = useRef<Vapi | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  /* ── Register Vapi event listeners once ─────────────────── */
  useEffect(() => {
    const vapi = getVapi();
    if (!vapi) return;
    vapiRef.current = vapi;

    const onCallStartInternal = () => {
      setCallState("active");
      setErrorMsg(null);
      onCallStart?.();
    };

    const onCallEndInternal = () => {
      setCallState("ended");
      setVolume(0);
      
      // Pass full transcript to parent on end
      const finalTranscript = lines.map((l) => `${l.role === "user" ? "User" : "Agent"}: ${l.text}`).join("\n");
      onCallEnd?.(finalTranscript);

      // Reset to idle after 3 s so user can start again
      setTimeout(() => {
        setCallState("idle");
        setLines([]);
      }, 3000);
    };

    const onError = (e: Error) => {
      console.error("[Vapi]", e);
      setErrorMsg(e?.message ?? "Voice call failed. Check your Vapi keys.");
      setCallState("error");
      setVolume(0);
    };

    const onVolumeLevel = (v: number) => setVolume(v);

    const onMessage = (msg: any) => {
      if (msg.type !== "transcript") return;

      const { role, transcript, transcriptType } = msg;
      const isFinal = transcriptType === "final";

      setLines((prev) => {
        // Replace the last partial line for the same role, or append
        const last = prev[prev.length - 1];
        if (last && last.role === role && !last.isFinal) {
          const updated = [...prev.slice(0, -1), { role, text: transcript, isFinal }];
          return updated;
        }
        return [...prev, { role, text: transcript, isFinal }];
      });

      // Bubble the user's final transcript up to the parent (feeds the textarea)
      if (role === "user" && isFinal) {
        onTranscript((prev) => {
          const trimmed = prev.trim();
          return trimmed ? trimmed + " " + transcript : transcript;
        });
      }
    };

    vapi.on("call-start", onCallStartInternal);
    vapi.on("call-end", onCallEndInternal);
    vapi.on("error", onError);
    vapi.on("volume-level", onVolumeLevel);
    vapi.on("message", onMessage);

    return () => {
      vapi.off("call-start", onCallStartInternal);
      vapi.off("call-end", onCallEndInternal);
      vapi.off("error", onError);
      vapi.off("volume-level", onVolumeLevel);
      vapi.off("message", onMessage);
    };
  }, [onTranscript, onCallStart, onCallEnd]);

  /* ── Auto-scroll transcript ──────────────────────────────── */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  /* ── Button action ───────────────────────────────────────── */
  const handleToggle = useCallback(async () => {
    const vapi = vapiRef.current ?? getVapi();

    // Keys missing
    if (!vapi) {
      setErrorMsg("Add VITE_VAPI_PUBLIC_KEY and VITE_VAPI_ASSISTANT_ID to your .env file.");
      setCallState("error");
      return;
    }

    if (!ASSISTANT_ID || ASSISTANT_ID === "your_vapi_assistant_id_here") {
      setErrorMsg("VITE_VAPI_ASSISTANT_ID is not set in your .env file.");
      setCallState("error");
      return;
    }

    if (callState === "active") {
      vapi.stop();
      return;
    }

    if (callState === "idle" || callState === "error" || callState === "ended") {
      setLines([]);
      setErrorMsg(null);
      setCallState("connecting");
      try {
        await vapi.start(ASSISTANT_ID);
      } catch (e: any) {
        setErrorMsg(e?.message ?? "Failed to start call.");
        setCallState("error");
      }
    }
  }, [callState]);

  /* ── Derived UI values ───────────────────────────────────── */
  const isRecording = callState === "active";
  const isConnecting = callState === "connecting";
  const isError = callState === "error";

  // Build waveform heights: when active, use real volume + static pattern
  const bars = Array.from({ length: 22 }, (_, i) => {
    const base = (Math.sin(i * 0.7) * 0.5 + 0.5); // static wave shape
    if (isRecording) return 12 + (base * 0.4 + volume * 0.6) * 68;
    if (isConnecting) return 12 + ((i % 4 === 0) ? 30 : 10);
    return 12;
  });

  const buttonLabel =
    isConnecting ? "Connecting…" :
    isRecording  ? "Listening… tap to end" :
    isError      ? "Tap to retry" :
    callState === "ended" ? "Call ended" :
    "Tap to speak in any language";

  const BorderColor = isRecording ? "var(--color-saffron)" : isError ? "#ef4444" : "transparent";
  const Shadow     = isRecording ? "var(--shadow-glow-saffron)" : isError ? "0 0 24px rgba(239,68,68,0.35)" : "var(--shadow-glow-blue)";

  /* ── Full transcript string for display ──────────────────── */
  const fullTranscript = lines.map((l) => `${l.role === "user" ? "You" : "AI"}: ${l.text}`).join("\n");

  return (
    <div className="flex flex-col items-center py-4">
      {/* ── Mic button ── */}
      <div className="relative">
        {isRecording && (
          <>
            <span className="sonar-ring" />
            <span className="sonar-ring" style={{ animationDelay: "0.4s" }} />
            <span className="sonar-ring" style={{ animationDelay: "0.8s" }} />
          </>
        )}

        <button
          id="vapi-voice-btn"
          onClick={handleToggle}
          disabled={isConnecting}
          aria-label={isRecording ? "End voice call" : "Start voice call"}
          className={`relative h-[180px] w-[180px] rounded-full grid place-items-center transition-all disabled:opacity-70 disabled:cursor-not-allowed ${!isRecording ? "pulse-soft" : ""}`}
          style={{
            background: "radial-gradient(circle at 30% 30%, #1a3470, #04091a)",
            border: `2px solid ${BorderColor}`,
            boxShadow: Shadow,
            backgroundClip: "padding-box",
          }}
        >
          {/* Conic gradient ring */}
          <div
            className="absolute -inset-[2px] rounded-full opacity-80 -z-10"
            style={{
              background: isError
                ? "conic-gradient(from 0deg, #7f1d1d, #ef4444, #f97316, #7f1d1d)"
                : "conic-gradient(from 0deg, #1a56c4, #3b7de8, #6fa3f7, #1a56c4)",
              animation: "rotate-gradient 4s linear infinite",
            }}
          />

          {/* Icon */}
          {isConnecting ? (
            <Loader2 className="h-10 w-10 text-white animate-spin" />
          ) : isRecording ? (
            <PhoneOff className="h-10 w-10 text-white" />
          ) : isError ? (
            <AlertCircle className="h-10 w-10 text-red-400" />
          ) : (
            <Mic className="h-10 w-10 text-white" />
          )}

          {/* Live recording dot */}
          {isRecording && (
            <span className="absolute top-3 right-3 h-3 w-3 rounded-full bg-red-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* ── Status label ── */}
      <div className="mt-5 text-sm text-[var(--text-secondary)]">{buttonLabel}</div>

      {/* ── Waveform visualiser ── */}
      <div className="mt-4 flex items-end gap-1 h-10">
        {bars.map((h, i) => (
          <span
            key={i}
            className="block w-1 rounded-full bg-[var(--color-blue-400)] transition-all"
            style={{
              height: `${h}%`,
              animation: isRecording ? `wave ${0.6 + (i % 5) * 0.1}s ease-in-out infinite` : undefined,
              animationDelay: `${i * 0.05}s`,
              opacity: isRecording || isConnecting ? 1 : 0.35,
            }}
          />
        ))}
      </div>

      {/* ── Error message ── */}
      {isError && errorMsg && (
        <div className="mt-4 max-w-sm glass px-4 py-3 text-xs text-red-400 text-center border border-red-500/30">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* ── Live transcript ── */}
      {lines.length > 0 && (
        <div
          ref={scrollRef}
          className="mt-5 w-full max-w-xl glass px-4 py-3 text-sm font-mono leading-relaxed max-h-40 overflow-y-auto space-y-1"
        >
          {lines.map((l, i) => (
            <div key={i} className={l.role === "user" ? "text-[var(--color-blue-300)]" : "text-emerald-400"}>
              <span className="text-[10px] uppercase tracking-widest opacity-60 mr-2">
                {l.role === "user" ? "You" : "AI"}
              </span>
              {l.text}
              {!l.isFinal && (
                <span className="inline-block ml-1 animate-pulse">▍</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Photo attach strip ── */}
      <div className="mt-4 w-full max-w-xs">
        {voicePhoto ? (
          <div className="relative rounded-xl overflow-hidden border border-blue-500/30">
            <img src={voicePhoto} alt="Attached complaint photo" className="w-full max-h-32 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-2 left-3 text-[11px] text-white font-medium flex items-center gap-1.5">
              <Image className="h-3 w-3 text-blue-300" /> Reference photo attached
            </div>
            <button
              onClick={() => { setVoicePhoto(null); onPhotoChange?.(null); }}
              className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/70 grid place-items-center hover:bg-red-500/80 transition-colors"
            >
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => photoInputRef.current?.click()}
            className="w-full h-10 rounded-xl glass border border-dashed border-white/20 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all flex items-center justify-center gap-2 text-[var(--text-secondary)] hover:text-blue-400 text-sm"
          >
            <Camera className="h-4 w-4" />
            Attach a photo of the problem
          </button>
        )}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = String(reader.result);
              setVoicePhoto(dataUrl);
              onPhotoChange?.(dataUrl);
            };
            reader.readAsDataURL(file);
            e.target.value = "";
          }}
        />
      </div>

      {/* ── "Powered by Vapi" badge ── */}
      <div className="mt-4 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${isRecording ? "bg-emerald-400 animate-pulse" : "bg-[var(--text-muted)]"}`} />
        Powered by Vapi · {isRecording ? "Live" : "Ready"}
      </div>
    </div>
  );
}
