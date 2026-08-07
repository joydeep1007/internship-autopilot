/**
 * services/email.js
 * Generates a personalized cold email for a specific job listing.
 * Called from the job detail view after user clicks "Generate Email".
 */

export async function generateColdEmail(job, masterResume) {
  const topProject = masterResume.projects[0];
  const prompt = `
Write a cold internship outreach email. Under 120 words. No fluff. No "Dear Sir/Madam".

SENDER:
Name: ${masterResume.personal.name}
Best project: ${topProject.name} — github.com/joydeep1007 (live projects, real code)
Skills: React, Node.js, Python, FastAPI, Gemini API, MongoDB
Currently: B.Tech CSE final year, CGPA 8.11

TARGET:
Company: ${job.company}
Role: ${job.title}
Key skills they want: ${(job.key_skills || []).join(", ")}
${job.description ? `What they do (from JD): ${job.description.slice(0, 200)}` : ""}
${job.contact_email ? `Recipient email: ${job.contact_email}` : ""}

FORMAT — return ONLY this, no explanation:
Subject: [subject line]

[email body — 3-4 short paragraphs, ends with a direct question like "Would a 15-minute call work this week?"]

RULES:
- Reference ONE specific thing about their product or the role
- Mention the GitHub link naturally
- First name only (no "Dear Hiring Manager")
- Never say "I am writing to express my interest"
- The "trial project" close: if appropriate, offer to do a small task to show fit
`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  return data.content[0].text.trim();
}

export function openGmail(to, subject, body) {
  const params = new URLSearchParams({
    to,
    su: subject,
    body,
  });
  window.open(`https://mail.google.com/mail/?view=cm&fs=1&${params.toString()}`, "_blank");
}
