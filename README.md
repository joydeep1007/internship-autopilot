# Internship Autopilot

**Full automated pipeline:** scrape internship listings → score with AI → find hiring manager emails → generate tailored LaTeX resume → one-click cold email → open Gmail.

Runs every weekday at 7:30 AM IST via GitHub Actions. You wake up to a Telegram message with today's best listings. Click any listing → tailor your resume in 15 seconds → download .tex → compile on Overleaf → send.

---

## Architecture

```
GitHub Actions (7:30 AM IST, Mon–Fri)
        │
        ▼
  scraper/main.py
  ┌─────────────────────────────────────────┐
  │ 1. JobSpy → scrape LinkedIn + Indeed    │
  │ 2. Gemini Flash → score 0–100           │
  │ 3. Apollo + Hunter → find emails        │
  │ 4. Save to frontend/src/data/jobs.json  │
  │ 5. Commit + push back to repo           │
  │ 6. Telegram digest to your phone        │
  └─────────────────────────────────────────┘
        │
        ▼
  frontend/ (React, local or Vercel)
  ┌─────────────────────────────────────────┐
  │ Dashboard  → browse scored listings     │
  │ Job Detail → read JD + generate email   │
  │ Tailor     → Claude → LaTeX resume      │
  │ Download   → .tex → Overleaf → PDF      │
  └─────────────────────────────────────────┘
```

---

## Setup (one-time, ~30 minutes)

### 1. Fork and clone this repo

```bash
git clone https://github.com/YOUR_USERNAME/internship-autopilot
cd internship-autopilot
```

### 2. Get your free API keys

| Key | Where | Free tier |
|-----|-------|-----------|
| `GEMINI_KEY` | [aistudio.google.com](https://aistudio.google.com) → Get API Key | 1500 calls/day |
| `APOLLO_KEY` | [apollo.io](https://app.apollo.io) → Settings → API | Email credits included |
| `HUNTER_KEY` | [hunter.io](https://hunter.io) → Dashboard → API | 50 searches/month |
| `TELEGRAM_TOKEN` | Telegram → @BotFather → /newbot | Free |
| `TELEGRAM_CHAT_ID` | Telegram → @userinfobot → send /start | Free |
| `VITE_ANTHROPIC_KEY` | [console.anthropic.com](https://console.anthropic.com) | Pay-per-use (~$0.006/resume) |

### 3. Add GitHub Secrets

Go to your repo → **Settings → Secrets → Actions → New repository secret**

Add each of these:
- `GEMINI_KEY`
- `APOLLO_KEY`
- `HUNTER_KEY`
- `TELEGRAM_TOKEN`
- `TELEGRAM_CHAT_ID`

### 4. Set up the frontend

```bash
cd frontend
cp .env.example .env
# Edit .env and add your VITE_ANTHROPIC_KEY
npm install
npm run dev
# → http://localhost:5173
```

### 5. Trigger the first scrape manually

Go to GitHub → **Actions → Internship Autopilot — Daily Scraper → Run workflow**

After it completes (~3 minutes), refresh your local frontend. Jobs appear.

---

## Daily workflow

```
7:30 AM  → Telegram message arrives with today's top listings
           "🔍 8 new internships found today..."

Morning  → Open localhost:5173 (or your Vercel URL)
           Browse listings sorted by match score

Per job  → Click listing → read JD
           → "Generate Cold Email" → review → "Open Gmail"
           → "Tailor Resume" → download .tex → Overleaf → PDF
           → Send email with PDF attached
           → Click "Mark as Applied"

Repeat 10 listings per day = done in ~90 minutes.
```

---

## Cost breakdown

| Component | Cost |
|-----------|------|
| JobSpy scraping | ₹0 |
| Gemini scoring (1500/day free) | ₹0 |
| Apollo email finding | ₹0 |
| Hunter fallback (50/month) | ₹0 |
| Telegram alerts | ₹0 |
| GitHub Actions (uses ~100 min/month of 2000 free) | ₹0 |
| Claude API per resume (~$0.006) | ~₹0.50 |
| **Total per month** | **~₹10–50** |

Optional: add domain + Warmup Inbox for better email deliverability → ₹1250/month.

---

## Customizing for your profile

Edit `frontend/src/data/master_resume.json` — this is the single source of truth.

- Add new projects under `projects[]` with bullet variants per `role_family`
- Update `summaries{}` if your positioning changes  
- Add certs, update CGPA, etc.

The scraper's skill matching string is in `scraper/main.py` → `MY_SKILLS`.

---

## Deploying the frontend (optional, for portfolio)

```bash
cd frontend
npm run build
# Deploy dist/ to Vercel:
npx vercel --prod
```

**Security:** The `VITE_ANTHROPIC_KEY` will be visible in the browser bundle. For personal use this is acceptable (it's your key, your machine). For a public portfolio demo, add a thin backend:

```
React → your Node.js backend (free on Render) → Claude API
                              ↑ key lives here safely
```

---

## Project structure

```
internship-autopilot/
├── .github/
│   └── workflows/
│       └── scraper.yml          ← GitHub Actions cron job
├── scraper/
│   ├── main.py                  ← Full pipeline (scrape → score → email → notify)
│   ├── requirements.txt
│   └── .seen_ids.json           ← Auto-managed deduplication state
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── JobList.jsx      ← Dashboard with filters + score cards
│   │   │   ├── JobDetail.jsx    ← JD view + cold email generator
│   │   │   └── ResumeTailor.jsx ← LaTeX resume generation + download
│   │   ├── services/
│   │   │   ├── claude.js        ← Anthropic API (resume generation)
│   │   │   ├── email.js         ← Cold email generation + Gmail opener
│   │   │   └── latex.js         ← .tex download + Overleaf opener
│   │   ├── data/
│   │   │   ├── master_resume.json  ← YOUR resume data (edit this)
│   │   │   └── jobs.json           ← Auto-updated by scraper daily
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## This project on your CV

> **Internship Autopilot** | Python · React · Gemini API · Anthropic API · GitHub Actions
> *Built a full-stack job search automation pipeline: Python scraper (JobSpy) aggregates LinkedIn/Indeed daily, Gemini Flash scores 50+ listings against my skillset, Apollo finds hiring manager emails, and Claude generates tailored LaTeX resumes per JD. Scheduled on GitHub Actions with Telegram alerts. React dashboard for browsing, cold email generation, and one-click Overleaf export.*

That description hits: Python, APIs, automation, AI/LLM integration, CI/CD, React, system design — all in one project you actually built for yourself.
