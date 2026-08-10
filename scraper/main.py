"""
internship-autopilot/scraper/main.py

Full pipeline:
  1. Scrape fresh internship listings (JobSpy)
  2. Score each listing against your skills (Gemini free API)
  3. Find hiring manager email (Apollo → Hunter fallback)
  4. Deduplicate against previously seen listings
  5. Save results to ../frontend/src/data/jobs.json
  6. Send Telegram summary
"""

import json
import os
import random
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

load_dotenv()

import requests

# pyrefly: ignore [missing-import]
import google.generativeai as genai

# ── Config ────────────────────────────────────────────────────────────────────
GEMINI_KEY = os.getenv("GEMINI_KEY")
if GEMINI_KEY is None:
    raise RuntimeError("GEMINI_KEY environment variable is missing")

APOLLO_KEY      = os.getenv("APOLLO_KEY", "")
HUNTER_KEY      = os.getenv("HUNTER_KEY", "")
TELEGRAM_TOKEN  = os.getenv("TELEGRAM_TOKEN", "")
TELEGRAM_CHAT   = os.getenv("TELEGRAM_CHAT_ID", "")

SCORE_THRESHOLD = 55           # Only keep jobs scoring ≥ this
MAX_JOBS        = 60           # Max scrape per run
JOBS_OUT        = Path(__file__).parent.parent / "frontend/src/data/jobs.json"
SEEN_OUT        = Path(__file__).parent / ".seen_ids.json"

MY_SKILLS = """
Languages: Python, JavaScript, TypeScript, Java, C
Frontend:  React.js, Zustand, Socket.io, Tailwind CSS
Backend:   Node.js, Express.js, FastAPI, REST APIs
Databases: MongoDB, PostgreSQL
DevOps:    Git, GitHub Actions, Docker, Vercel, Render
AI/ML:     Gemini API, Groq, OpenAI, OpenCV, CNN, NumPy
Projects:  Algorithmic trading engine (Python/FastAPI),
           Full-stack MERN trading platform (React/Node/MongoDB/Socket.io),
           City Lens AI pipeline (TypeScript/Gemini/Groq/Supabase),
           Drowsiness detection (OpenCV/dlib),
           Neural network from scratch (NumPy, 97.2% MNIST accuracy)
Education: B.Tech CSE, UEM Kolkata, CGPA 8.11, graduating 2026
"""

SEARCH_TERMS = [
    "software developer intern",
    "backend developer intern",
    "full stack developer intern",
    "React developer intern",
    "Python developer intern",
    "AI ML intern",
    "software engineer intern fresher",
]

# ── Step 1: Scrape ─────────────────────────────────────────────────────────
def scrape_jobs() -> list[dict[str, Any]]:
    """Use JobSpy to scrape multiple platforms simultaneously."""
    try:
        # pyrefly: ignore [missing-import]
        from jobspy import scrape_jobs as jobspy_scrape
    except ImportError:
        print("Installing python-jobspy...")
        raise RuntimeError("python-jobspy is not installed.\n"
        "Run:\n"
        "pip install python-jobspy")

    all_jobs: list[Any] = []
    for term in SEARCH_TERMS:
        try:
            df = jobspy_scrape(
                site_name=["linkedin", "indeed", "glassdoor"],
                search_term=term,
                location="India",
                results_wanted=20,
                hours_old=24,
                country_indeed="India",
            )
            if df is not None and not df.empty:
                all_jobs.append(df)
                print(f"  ✓ '{term}': {len(df)} results")
            time.sleep(random.uniform(2, 5))          # be polite
        except Exception as e:
            print(f"  ✗ '{term}': {e}")

    if not all_jobs:
        print("No jobs scraped — exiting.")
        return []

    import pandas as pd
    combined = pd.concat(all_jobs, ignore_index=True)

    # Fresher-friendly filter
    fresher_kw = ["fresher", "intern", "0-1", "0 - 1", "trainee", "graduate",
                  "entry level", "entry-level", "junior", "student"]
    mask = combined["description"].str.lower().str.contains(
        "|".join(fresher_kw), na=False
    )
    filtered = combined[mask].drop_duplicates(subset=["id"]).head(MAX_JOBS)
    print(f"\n→ {len(filtered)} fresher-relevant listings after filter")
    return list(filtered.to_dict("records"))

# ── Step 2: Score with Gemini ──────────────────────────────────────────────
def score_job(job: dict[str, Any], model: Any) -> dict[str, Any] | None:
    """Score 0-100 and extract key info from a job listing."""
    desc   = str(job.get("description", ""))[:800]
    title  = str(job.get("title", "Unknown Role"))
    company = str(job.get("company", "Unknown Company"))

    prompt = f"""
You are evaluating a job listing for a CS fresher.

CANDIDATE SKILLS:
{MY_SKILLS}

JOB:
Title: {title}
Company: {company}
Description: {desc}

Return ONLY valid JSON (no markdown, no explanation):
{{
  "score": <integer 0-100>,
  "role_family": "<one of: mern|swe|python|aiml|devops|other>",
  "reason": "<one sentence why this score>",
  "key_skills": ["skill1", "skill2", "skill3"],
  "estimated_stipend": "<e.g. ₹15,000-25,000/month or Unknown>"
}}
"""
    try:
        resp = model.generate_content(prompt)
        text = resp.text.strip().replace("```json", "").replace("```", "")
        parsed: dict[str, Any] = json.loads(text)
        parsed["title"]   = title
        parsed["company"] = company
        parsed["site"]    = str(job.get("site", ""))
        parsed["job_url"] = str(job.get("job_url", ""))
        parsed["description"] = desc
        parsed["date_posted"] = str(job.get("date_posted", ""))
        parsed["id"]      = str(job.get("id", f"{company}-{title}"))
        return parsed
    except Exception as e:
        print(f"    Score parse error for {title}: {e}")
        return None

# ── Step 3: Find email ─────────────────────────────────────────────────────
def find_email(company: str) -> str:
    """Try Apollo first, Hunter as fallback."""
    if APOLLO_KEY:
        try:
            url = "https://api.apollo.io/v1/people/search"
            payload = {
                "api_key": APOLLO_KEY,
                "q_organization_name": company,
                "q_titles": ["CTO", "Founder", "Engineering Manager",
                             "Head of Engineering", "Tech Lead"],
                "page": 1, "per_page": 1,
            }
            r = requests.post(url, json=payload, timeout=10)
            people = r.json().get("people", [])
            if people and people[0].get("email"):
                return str(people[0]["email"])
        except Exception as e:
            print(f"    Apollo error for {company}: {e}")

    if HUNTER_KEY:
        try:
            # Convert company name to likely domain
            slug = company.lower().replace(" ", "").replace(",", "").replace(".", "")
            r = requests.get(
                "https://api.hunter.io/v2/domain-search",
                params={"domain": f"{slug}.com", "api_key": HUNTER_KEY},
                timeout=10,
            )
            emails = r.json().get("data", {}).get("emails", [])
            if emails:
                return str(emails[0]["value"])
        except Exception as e:
            print(f"    Hunter error for {company}: {e}")

    return ""

# ── Step 4: Deduplication ──────────────────────────────────────────────────
def load_seen() -> set[str]:
    """Load previously seen job IDs from the seen file."""
    if SEEN_OUT.exists():
        return set(json.loads(SEEN_OUT.read_text()))
    return set()

def save_seen(seen: set[str]) -> None:
    """Save the updated set of seen job IDs."""
    SEEN_OUT.write_text(json.dumps(list(seen)))

# ── Step 5: Merge with existing jobs ──────────────────────────────────────
def load_existing_jobs() -> list[dict[str, Any]]:
    """Load existing parsed jobs from the frontend data store."""
    if JOBS_OUT.exists():
        try:
            return list(json.loads(JOBS_OUT.read_text()))
        except Exception:
            return []
    return []

# ── Step 6: Telegram alert ─────────────────────────────────────────────────
def send_telegram(message: str) -> None:
    """Send a summary message to Telegram, if configured."""
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT:
        return
    try:
        requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage",
            json={"chat_id": TELEGRAM_CHAT, "text": message, "parse_mode": "Markdown"},
            timeout=10,
        )
    except Exception as e:
        print(f"Telegram error: {e}")

# ── Main ───────────────────────────────────────────────────────────────────
def main() -> None:
    """Execute the full scraping, scoring, and saving pipeline."""
    print("=" * 55)
    print(f"  Internship Autopilot — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 55)

    # Init Gemini
    genai.configure(api_key=GEMINI_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")

    # Load seen IDs to deduplicate
    seen_ids: set[str] = load_seen()
    existing_jobs: list[dict[str, Any]] = load_existing_jobs()
    existing_ids: set[str] = {str(j["id"]) for j in existing_jobs if "id" in j}

    # Scrape
    print("\n[1/4] Scraping listings...")
    raw_jobs: list[dict[str, Any]] = scrape_jobs()

    # Filter unseen
    new_raw: list[dict[str, Any]] = [j for j in raw_jobs if str(j.get("id", "")) not in seen_ids]
    print(f"→ {len(new_raw)} new listings (not seen before)")

    # Score
    print("\n[2/4] Scoring with Gemini...")
    scored: list[dict[str, Any]] = []
    for i, job in enumerate(new_raw):
        print(f"  [{i+1}/{len(new_raw)}] {job.get('company','?')} — {job.get('title','?')}")
        result: dict[str, Any] | None = score_job(job, model)
        if result and result.get("score", 0) >= SCORE_THRESHOLD:
            scored.append(result)
            print(f"    → score {result['score']} ✓")
        else:
            print(f"    → score {result.get('score','?') if result else '?'} (skipped)")
        time.sleep(0.5)   # stay within free tier limits

    print(f"\n→ {len(scored)} listings above threshold ({SCORE_THRESHOLD})")

    # Find emails
    print("\n[3/4] Finding hiring manager emails...")
    for job in scored:
        email: str = find_email(str(job["company"]))
        job["contact_email"] = email
        job["email_status"]  = "found" if email else "not_found"
        job["scraped_at"]    = datetime.now(timezone.utc).isoformat()
        job["resume_generated"] = False
        job["applied"]          = False
        if email:
            print(f"  ✓ {job['company']}: {email}")
        time.sleep(0.3)

    # Merge and save
    print("\n[4/4] Saving results...")
    all_jobs: list[dict[str, Any]] = existing_jobs + [j for j in scored if j["id"] not in existing_ids]
    # Keep most recent 200 jobs max
    all_jobs = sorted(all_jobs, key=lambda x: int(x.get("score", 0)), reverse=True)[:200]

    JOBS_OUT.parent.mkdir(parents=True, exist_ok=True)
    JOBS_OUT.write_text(json.dumps(all_jobs, indent=2))
    print(f"  ✓ Saved {len(all_jobs)} total jobs to {JOBS_OUT}")

    # Update seen IDs
    new_seen: set[str] = seen_ids | {str(j.get("id", "")) for j in new_raw if j.get("id")}
    save_seen(new_seen)

    # Telegram summary
    if scored:
        top3: list[dict[str, Any]] = scored[:3]
        lines: list[str] = [f"🔍 *{len(scored)} new internships found today*\n"]
        for j in top3:
            email_tag = f"📧 {j['contact_email']}" if j["contact_email"] else "📧 No email found"
            lines.append(
                f"• *{j['company']}* — {j['title']}\n"
                f"  Score: {j['score']} | {str(j.get('role_family', '')).upper()}\n"
                f"  {email_tag}\n"
            )
        if len(scored) > 3:
            lines.append(f"_...and {len(scored)-3} more in your dashboard_")
        lines.append("\n👉 Open your Resume Tailor to generate tailored resumes")
        send_telegram("\n".join(lines))
    else:
        send_telegram("🔍 Internship Autopilot ran — no new high-score listings today.")

    print("\n✅ Done.")

if __name__ == "__main__":
    main()
