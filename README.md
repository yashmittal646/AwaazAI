# 🇮🇳 AwaazAI — AI-Powered Civic Grievance Platform

> Built for the **Google Hackathon** | Bharat Civic Stack v2.4

AwaazAI empowers Indian citizens to file, track, and escalate civic grievances using AI — voice, image, and text — routed intelligently to the right government department.

---

## ✨ Features

- 🎤 **Voice Complaint Filing** — Speak in your language via Vapi AI
- 🤖 **Gemini AI Analysis** — Auto-categorizes, routes, and drafts formal letters
- 📸 **Image Recognition** — Upload a photo; AI detects the civic problem
- 🗺️ **City Heatmap** — Live map of complaint hotspots (Google Maps)
- 🏆 **Rewards System** — Earn XP, level up, unlock vouchers for filing complaints
- 📋 **Admin Dashboard** — Full grievance management with RLS-protected data
- 🌐 **Multi-language** — i18n support (Hindi, English, Kannada)
- 📱 **SMS Notifications** — Textbelt integration for complaint status updates

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | TanStack Start (React 19 + SSR) |
| Styling | TailwindCSS v4 |
| Database | Supabase (Postgres + Auth + RLS) |
| AI | Google Gemini 2.5 Flash |
| Voice | Vapi AI |
| Maps | Google Maps API |
| Deployment | Cloudflare Workers |

---

## 🚀 Local Development

```bash
# 1. Clone the repo
git clone https://github.com/yashmittal646/AwaazAI.git
cd AwaazAI

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Fill in your API keys in .env

# 4. Start dev server
npm run dev
# → http://localhost:8080
```

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `VITE_GEMINI_API_KEY` | Google AI Studio API key |
| `VITE_VAPI_PUBLIC_KEY` | Vapi public key |
| `VITE_VAPI_ASSISTANT_ID` | Vapi assistant ID |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API key |
| `VITE_ADMIN_PASSWORD` | Admin dashboard password |

---

## 🗺️ App Routes

| Route | Description |
|---|---|
| `/` | Dashboard — KPIs, charts, live feed |
| `/auth` | Login / Register |
| `/file-complaint` | AI-powered complaint filing |
| `/my-grievances` | Your complaint history |
| `/heatmap` | City complaint heatmap |
| `/rewards` | XP and reward catalogue |
| `/admin` | Admin dashboard |

---

## 🚢 Deployment

Deployed on **Cloudflare Workers** — auto-deploys via GitHub Actions on every push to `main`.

---

## 👨‍💻 Team

Built with ❤️ for Google Hackathon by Yash Mittal
