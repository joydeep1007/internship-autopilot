/**
 * services/claude.js
 * Calls the backend proxy to generate a fully tailored LaTeX resume.
 */

export async function generateLatexResume(jd, masterResume) {
  const response = await fetch("http://localhost:3001/api/tailor-resume", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jobDescription: jd,
      masterResume: masterResume
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Backend API error");
  }

  const data = await response.json();
  const raw  = data.result.trim();

  // Parse %%META line
  const lines     = raw.split("\n");
  const metaLine  = lines[0];
  const latexBody = lines.slice(1).join("\n").trim();

  const metaMatch = metaLine.match(/%%META: (.+)/);
  const meta = metaMatch ? JSON.parse(metaMatch[1]) : {
    role_family: "other", match_score: 0, keywords: [],
  };

  return { latex: latexBody, meta };
}
