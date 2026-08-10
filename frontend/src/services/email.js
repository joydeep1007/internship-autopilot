/**
 * services/email.js
 * Generates a personalized cold email for a specific job listing.
 * Called from the job detail view after user clicks "Generate Email".
 */

export async function generateColdEmail(job, masterResume) {
  const response = await fetch("http://localhost:3001/api/draft-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      job,
      masterResume
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Backend API error");
  }

  const data = await response.json();
  return data.result.trim();
}

export function openGmail(to, subject, body) {
  const params = new URLSearchParams({
    to,
    su: subject,
    body,
  });
  window.open(`https://mail.google.com/mail/?view=cm&fs=1&${params.toString()}`, "_blank");
}
