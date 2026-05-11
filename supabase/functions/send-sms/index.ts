// Supabase Edge Function — Twilio SMS proxy
// Deploy: npx supabase functions deploy send-sms --project-ref yohejlrvfpogyywxwfnd
// Secrets: npx supabase secrets set TWILIO_ACCOUNT_SID=xxx TWILIO_AUTH_TOKEN=xxx TWILIO_PHONE=+1xxx

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const { mobile, message } = await req.json();

    const SID   = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const FROM  = Deno.env.get("TWILIO_PHONE")!;          // e.g. +15005550006

    if (!SID || !TOKEN || !FROM) {
      return new Response(
        JSON.stringify({ success: false, error: "Twilio secrets not set in Supabase" }),
        { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    // Sanitise → +91XXXXXXXXXX
    const digits = String(mobile).replace(/\D/g, "").replace(/^91/, "");
    if (digits.length !== 10) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid number: ${mobile}` }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }
    const to = `+91${digits}`;

    const body = new URLSearchParams({ To: to, From: FROM, Body: message });
    const res  = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`,
      {
        method:  "POST",
        headers: {
          Authorization:  `Basic ${btoa(`${SID}:${TOKEN}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      },
    );

    const data = await res.json();
    if (res.ok) {
      console.log("SMS sent →", to, "SID:", data.sid);
      return new Response(
        JSON.stringify({ success: true, sid: data.sid }),
        { headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    console.error("Twilio error:", data.message);
    return new Response(
      JSON.stringify({ success: false, error: data.message ?? "Twilio error" }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
    );

  } catch (err: any) {
    console.error("Edge fn error:", err.message);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});
