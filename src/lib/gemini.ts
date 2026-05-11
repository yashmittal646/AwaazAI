/* ─── Gemini AI — Direct REST API (no SDK dependency issues) ──────────
   Bypasses @google/generative-ai SDK which has v1beta model name bugs.
   Calls https://generativelanguage.googleapis.com/v1beta/ directly.
   ─────────────────────────────────────────────────────────────────── */

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const BASE    = "https://generativelanguage.googleapis.com";

// Models confirmed available on this API key (from /v1beta/models listing)
const MODELS  = [
  "gemini-2.5-flash",       // newest, fast, free tier
  "gemini-2.0-flash-lite",  // lightweight fallback
  "gemini-flash-latest",    // alias fallback
];

export interface AnalysisResult {
  intent: {
    language: string;
    type: string;
    urgency: string;
    location: string;
    duration: string;
    impact: string;
  };
  routing: {
    department: string;
    officer: string;
    contact: string;
    email: string;
    sla: string;
  };
  drafts: {
    whatsapp: string;
    letter: string;
    email: string;
  };
  verification: {
    summary: string;
  };
}

/* ─── Low-level Gemini REST call ─────────────────────────────────── */
async function geminiRequest(model: string, body: object): Promise<any> {
  const url = `${BASE}/v1beta/models/${model}:generateContent?key=${API_KEY}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) return res.json();

    const errBody = await res.text();
    let errMsg = `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(errBody);
      errMsg = parsed?.error?.message ?? errMsg;
    } catch {}

    // 429 = rate limit — wait 3s and retry once
    if (res.status === 429 && attempt === 0) {
      console.warn(`[Gemini] ${model} rate-limited. Waiting 3s and retrying...`);
      await new Promise((r) => setTimeout(r, 3000));
      continue;
    }

    throw new Error(errMsg);
  }
  throw new Error("Request failed after retries");
}

/* ─── Chat with AI ──────────────────────────────────────────────── */
export async function chatWithAI(
  message: string,
  history: { role: "user" | "model"; parts: string }[]
) {
  if (!API_KEY || API_KEY.includes("YOUR_API_KEY")) {
    return "The Gemini API Key is missing. Please add a valid key to your .env file.";
  }

  const contents = [
    {
      role: "user",
      parts: [{ text: "You are AwaazAI, a professional Bangalore Caseworker. Your goal is to gather: 1. Problem Type, 2. Exact Landmark/Address (Always offer GPS sharing), 3. Duration, 4. Community Impact. Be conversational. Once ALL 4 are gathered, provide a technical summary and the token [READY_TO_FILE]." }],
    },
    {
      role: "model",
      parts: [{ text: "Understood. I will gather the required parameters professionally." }],
    },
    ...history.map((h) => ({
      role: h.role,
      parts: [{ text: h.parts }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  let lastErr = "";

  for (const model of MODELS) {
    try {
      const data = await geminiRequest(model, { contents });
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        console.log(`[Gemini Chat] ✅ ${model} responded`);
        return text;
      }
      throw new Error("Empty response");
    } catch (err: any) {
      console.warn(`[Gemini Chat] ${model} failed:`, err.message);
      lastErr = err.message;
      continue;
    }
  }

  console.error("[Gemini Chat] All models failed:", lastErr);
  return `I'm having trouble connecting. Error: ${lastErr}. Please check your API key.`;
}

/* ─── Full grievance analysis ────────────────────────────────────── */
export async function analyseGrievance(
  transcript: string,
  locationContext = "Bangalore"
): Promise<AnalysisResult> {
  const prompt = `
You are a Digital Government Case Officer.
Transcript: "${transcript}"
GPS Context: "${locationContext}"

TASK: Extract Problem, Location, Duration, and Impact. Synthesize into formal English.
OUTPUT: Valid JSON ONLY.
{
  "intent": { "language": "string", "type": "string", "urgency": "string", "location": "string", "duration": "string", "impact": "string" },
  "routing": { "department": "string", "officer": "string", "contact": "string", "email": "string", "sla": "string" },
  "drafts": { "whatsapp": "string", "letter": "string", "email": "string" },
  "verification": { "summary": "string" }
}`;

  for (const model of MODELS) {
    try {
      const data = await geminiRequest(model, {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");
      return JSON.parse(jsonMatch[0]);
    } catch (err: any) {
      console.warn(`[Gemini Analysis] ${model} failed:`, err.message);
      continue;
    }
  }

  console.error("[Gemini Analysis] All models failed — using fallback.");
  return {
    intent: { language: "English", type: "Civic Issue", urgency: "HIGH", location: locationContext, duration: "Active", impact: "Public Hardship" },
    routing: { department: "BBMP", officer: "Executive Engineer", contact: "1533", email: "commr@bbmp.gov.in", sla: "48 Hours" },
    drafts: {
      whatsapp: "Urgent issue reported.",
      letter: "To,\nThe Commissioner,\nBBMP.\n\nSubject: Formal Complaint.\n\nSir, I am reporting an issue. Please take action.",
      email: "Subject: Grievance Report",
    },
    verification: { summary: "Analysis used fail-safe mode." },
  };
}

/* ─── Image analysis ─────────────────────────────────────────────── */
export interface ImageAnalysisResult {
  isCivicProblem: boolean;
  message: string;
  detectedType?: string;
}

export async function analyseImageWithGemini(
  imageDataUrl: string
): Promise<ImageAnalysisResult> {
  if (!API_KEY || API_KEY.includes("YOUR_API_KEY")) {
    return { isCivicProblem: false, message: "Gemini API key is missing." };
  }

  const [meta, base64Data] = imageDataUrl.split(",");
  const mimeMatch = meta.match(/data:(.*);base64/);
  const mimeType = mimeMatch?.[1] ?? "image/jpeg";

  const systemPrompt = `You are AwaazAI, an Indian civic grievance assistant helping citizens report infrastructure problems to government bodies like BBMP, BWSSB, BESCOM, and municipal corporations.

The citizen has uploaded a photo. Your job:

STEP 1 — Is this a civic/infrastructure problem?
Civic problems include: broken/potholed roads, water leaks, sewage overflow, garbage dumps, broken streetlights, illegal construction, encroachment, crumbling buildings, flooded streets, potholes, exposed wires, damaged footpaths, drainage issues, open manholes, etc.

NOT civic: selfies, food, pets, nature scenery, people, shopping receipts, memes, screenshots of apps, animals, political content, or anything unrelated to public infrastructure.

STEP 2 — Respond in this EXACT JSON format:
{
  "isCivicProblem": true or false,
  "detectedType": "e.g. Road Pothole / Water Leak / etc." (only if true),
  "message": "Your message to the citizen"
}

If isCivicProblem is TRUE:
- Briefly acknowledge what you see in the image (1 sentence)
- Then ask 2-3 follow-up questions to complete the complaint:
  1. Exact location/landmark
  2. How long this has been an issue
  3. How many people/households are affected
- Keep the tone professional yet warm.

If isCivicProblem is FALSE:
- Politely explain that the image does not appear to show a civic infrastructure problem
- Ask them to upload a relevant photo or describe their issue in text instead

Output ONLY the JSON. No markdown. No extra text.`;

  for (const model of MODELS) {
    try {
      const data = await geminiRequest(model, {
        contents: [{
          role: "user",
          parts: [
            { text: systemPrompt },
            { inline_data: { mime_type: mimeType, data: base64Data } },
          ],
        }],
      });

      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const jsonStr = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      const parsed = JSON.parse(jsonStr);

      return {
        isCivicProblem: Boolean(parsed.isCivicProblem),
        message: String(parsed.message ?? ""),
        detectedType: parsed.detectedType ? String(parsed.detectedType) : undefined,
      };
    } catch (err: any) {
      console.warn(`[Gemini Vision] ${model} failed:`, err.message);
      continue;
    }
  }

  return {
    isCivicProblem: false,
    message: "I wasn't able to analyse the image right now. Please describe your complaint in text, or try uploading again.",
  };
}
