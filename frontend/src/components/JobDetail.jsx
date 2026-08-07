import { useState } from "react";
import { generateColdEmail, openGmail } from "../services/email";

const ROLE_COLORS = {
  mern:   { text: "#4ade80" }, swe: { text: "#60a5fa" },
  python: { text: "#fbbf24" }, aiml: { text: "#a78bfa" },
  devops: { text: "#fb923c" }, other: { text: "#9ca3af" },
};

export default function JobDetail({ job, masterResume, onTailor, onMarkApplied, onBack }) {
  const [emailState, setEmailState] = useState("idle"); // idle | loading | done
  const [emailContent, setEmailContent] = useState("");
  const [copied, setCopied] = useState(false);

  const rfColor = (ROLE_COLORS[job.role_family] || ROLE_COLORS.other).text;
  const scoreColor = job.score >= 80 ? "#4ade80" : job.score >= 60 ? "#fbbf24" : "#f87171";

  async function handleGenerateEmail() {
    setEmailState("loading");
    try {
      const email = await generateColdEmail(job, masterResume);
      setEmailContent(email);
      setEmailState("done");
    } catch (e) {
      console.error(e);
      setEmailState("idle");
    }
  }

  function parseEmail(raw) {
    const subjectMatch = raw.match(/^Subject: (.+)$/m);
    const subject = subjectMatch ? subjectMatch[1] : "";
    const body    = raw.replace(/^Subject: .+\n?\n?/m, "").trim();
    return { subject, body };
  }

  function copyEmail() {
    navigator.clipboard.writeText(emailContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleOpenGmail() {
    const { subject, body } = parseEmail(emailContent);
    openGmail(job.contact_email || "", subject, body);
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left column — job info */}
        <div className="lg:col-span-2 space-y-4">

          {/* Title card */}
          <div className="bg-[#111115] border border-[#1e1e24] rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-medium" style={{ color: rfColor }}>
                  {job.role_family?.toUpperCase()}
                </span>
                <h1 className="text-xl font-bold text-white mt-1">{job.title}</h1>
                <p className="text-[#888] mt-0.5">{job.company}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-3xl font-bold" style={{ color: scoreColor }}>
                  {job.score}
                </div>
                <div className="text-[11px] text-[#444]">match score</div>
              </div>
            </div>

            {job.estimated_stipend && job.estimated_stipend !== "Unknown" && (
              <p className="text-sm text-[#4ade80] mt-3">💰 {job.estimated_stipend}</p>
            )}

            {job.reason && (
              <p className="text-sm text-[#666] mt-2 italic">{job.reason}</p>
            )}

            <div className="flex gap-2 flex-wrap mt-3">
              {job.key_skills?.map(s => (
                <span key={s} className="text-xs bg-[#1a1a24] text-[#888] px-2 py-1 rounded">
                  {s}
                </span>
              ))}
            </div>

            {job.job_url && (
              <a
                href={job.job_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-xs text-[#60a5fa] hover:underline"
              >
                View original listing →
              </a>
            )}
          </div>

          {/* JD text */}
          <div className="bg-[#111115] border border-[#1e1e24] rounded-xl p-5">
            <h2 className="text-xs font-semibold text-[#444] uppercase tracking-wider mb-3">
              Job Description
            </h2>
            <p className="text-sm text-[#bbb] leading-relaxed whitespace-pre-wrap">
              {job.description || "No description available."}
            </p>
          </div>
        </div>

        {/* Right column — actions */}
        <div className="space-y-4">

          {/* Primary actions */}
          <div className="bg-[#111115] border border-[#1e1e24] rounded-xl p-4 space-y-3">
            <h2 className="text-xs font-semibold text-[#444] uppercase tracking-wider">
              Actions
            </h2>

            <button
              onClick={onTailor}
              className="w-full py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] rounded-lg
                         text-sm font-semibold transition-colors"
            >
              ✨ Tailor Resume for This Role
            </button>

            <button
              onClick={emailState === "idle" ? handleGenerateEmail : undefined}
              disabled={emailState === "loading"}
              className="w-full py-2.5 border border-[#2d2d38] hover:border-[#444]
                         rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {emailState === "loading"
                ? "Writing email..."
                : emailState === "done"
                ? "↻ Regenerate Email"
                : "✉ Generate Cold Email"}
            </button>

            {!job.applied && (
              <button
                onClick={onMarkApplied}
                className="w-full py-2.5 border border-[#2d2d38] hover:border-[#4ade80]
                           hover:text-[#4ade80] rounded-lg text-sm transition-colors text-[#666]"
              >
                ✓ Mark as Applied
              </button>
            )}
          </div>

          {/* Contact */}
          <div className="bg-[#111115] border border-[#1e1e24] rounded-xl p-4">
            <h2 className="text-xs font-semibold text-[#444] uppercase tracking-wider mb-2">
              Contact
            </h2>
            {job.contact_email ? (
              <div>
                <p className="text-xs text-[#4ade80] font-mono break-all">
                  {job.contact_email}
                </p>
                <p className="text-[11px] text-[#444] mt-1">
                  Found via Apollo/Hunter
                </p>
              </div>
            ) : (
              <p className="text-xs text-[#555]">No email found — search LinkedIn manually</p>
            )}

            {job.site && (
              <p className="text-[11px] text-[#444] mt-2">Source: {job.site}</p>
            )}
          </div>

          {/* Generated email */}
          {emailState === "done" && emailContent && (
            <div className="bg-[#111115] border border-[#2d4a1a] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold text-[#4ade80] uppercase tracking-wider">
                  Generated Email
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={copyEmail}
                    className="text-xs text-[#666] hover:text-white transition-colors"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  {job.contact_email && (
                    <button
                      onClick={handleOpenGmail}
                      className="text-xs text-[#60a5fa] hover:underline"
                    >
                      Open Gmail →
                    </button>
                  )}
                </div>
              </div>
              <textarea
                className="w-full h-56 bg-[#0d0d0f] border border-[#1e1e24] rounded-lg
                           p-3 text-xs text-[#ccc] resize-none focus:outline-none
                           focus:border-[#2d2d38] font-mono leading-relaxed"
                value={emailContent}
                onChange={e => setEmailContent(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
