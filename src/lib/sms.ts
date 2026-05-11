/* ─── SMS helper using Textbelt ───────────────────────────────────────
   Textbelt: https://textbelt.com
   - FREE tier: 1 SMS/day, key = "textbelt" (no signup needed)
   - Paid:  $3 for 100 SMS  → get key at https://textbelt.com
   
   Set in .env:
     VITE_TEXTBELT_KEY=textbelt          ← free (1/day, no signup)
     VITE_TEXTBELT_KEY=your_paid_key    ← paid ($3 for 100 SMS)
   
   Supports CORS → works directly from browser, no backend needed.
   ─────────────────────────────────────────────────────────────────── */

const TEXTBELT_KEY = (import.meta.env.VITE_TEXTBELT_KEY as string | undefined) ?? "textbelt";

export interface SmsResult { success: boolean; error?: string; }

/**
 * Sends an SMS using Textbelt's REST API (CORS-friendly).
 */
export async function sendSms(mobile: string, message: string): Promise<SmsResult> {
  // Sanitise → +91XXXXXXXXXX
  const digits = mobile.replace(/\D/g, "").replace(/^91/, "");
  if (digits.length !== 10) {
    console.warn("[SMS] ❌ Invalid mobile:", mobile);
    return { success: false, error: `Invalid number: ${mobile}` };
  }
  const phone = `+91${digits}`;

  console.log("[SMS] 📤 Textbelt → sending to", phone, "| key:", TEXTBELT_KEY.slice(0, 8) + (TEXTBELT_KEY.length > 8 ? "..." : ""));

  try {
    const body = new URLSearchParams({ phone, message, key: TEXTBELT_KEY });

    const res  = await fetch("https://textbelt.com/text", {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    body.toString(),
    });

    const data = await res.json();
    console.log("[SMS] Textbelt response:", data);

    if (data.success) {
      console.log("[SMS] ✅ Sent! Quota remaining:", data.quotaRemaining);
      return { success: true };
    }

    // Quota exhausted (free 1/day used up)
    if (data.error?.includes("quota") || data.quotaRemaining === 0) {
      return { success: false, error: "Daily free SMS limit reached (1/day). Get a paid key at textbelt.com — $3 for 100 SMS." };
    }

    return { success: false, error: data.error ?? "Unknown Textbelt error" };

  } catch (err: any) {
    console.error("[SMS] ❌ Fetch error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sends the standard complaint-registration confirmation SMS.
 */
export async function sendComplaintRegisteredSms(
  mobile: string | undefined | null,
  refCode: string,
): Promise<SmsResult> {
  if (!mobile) {
    console.warn("[SMS] No mobile in user profile — skipping.");
    return { success: false, error: "No mobile number" };
  }

  const message =
    `Awaaz AI: Your complaint is successfully registered! ` +
    `Reference ID: ${refCode}. Track status & earn XP on your dashboard.`;

  return sendSms(mobile, message);
}
