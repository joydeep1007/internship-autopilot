import { useState, useEffect } from "react";
import { generateLatexResume } from "../services/claude";
import { downloadLatex, openOverleaf } from "../services/latex";

const LOADING_MSGS = [
  "Analyzing job description...",
  "Selecting your best matching projects...",
  "Rewriting bullets to mirror JD language...",
  "Typing your LaTeX resume...",
  "Finishing up...",
];

export default function ResumeTailor({ job, masterResume, onBack, onMarkApplied }) {
  const [state, setState] = useState("generate"); // generate | loading | done | error
  const [result, setResult] = useState(null);
  const [error, setError]   = useState("");
  const [loadMsg, setLoadMsg] = useState(LOADING_MSGS[0]);
  const [msgIdx, setMsgIdx]   = useState(0);
  const [copied, setCopied]   = useState(false);

  // Cycle loading messages
  useEffect(() => {
    if (state !== "loading") return;
    const t = setInterval(() => {
      setMsgIdx(i => {
        const next = Math.min(i + 1, LOADING_MSGS.length - 1);
        setLoadMsg(LOADING_MSGS[next]);
        return next;
      });
    }, 2500);
    return () => clearInterval(t);
  }, [state]);

  async function handleGenerate() {
    setState("loading");
    setMsgIdx(0);
    setLoadMsg(LOADING_MSGS[0]);
    try {
      const res = await generateLatexResume(job.description, masterResume);
      setResult(res);
      setState("done");
    } catch (e) {
      setError(e.message || "Unknown error");
      setState("error");
    }
  }

  function handleCopyLatex() {
    navigator.clipboard.writeText(result.latex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const scoreColor = result?.meta?.match_score >= 80 ? "#4ade80"
    : result?.meta?.match_score >= 60 ? "#fbbf24" : "#f87171";

  // ── Generate screen ──────────────────────────────────────────────────────
  if (state === "generate") {
    return (
      <div className="max-w-2xl mx-auto px-5 py-16 text-center">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 glass-panel rounded-full px-4 py-1.5 text-xs text-[#ccc] mb-4 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
            {job.company} — {job.title}
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Tailor Resume</h1>
          <p className="text-[#666] text-sm">
            Groq will analyze this JD, pick your best matching projects,
            rewrite bullets to mirror the JD's language, and generate a
            LaTeX resume ready for Overleaf.
          </p>
        </div>

        {/* What will happen */}
        <div className="glass-panel rounded-xl p-6 mb-6 text-left">
          <h2 className="text-xs font-bold text-[#666] uppercase tracking-wider mb-4">
            What gets tailored
          </h2>
          {[
            ["Summary", "Rewritten to match this JD's exact language"],
            ["Projects", `${Math.min(4, masterResume.projects.length)} best-fit projects selected`],
            ["Bullets", "Each bullet rewritten to mirror JD keywords"],
            ["Skills", "Reordered — most relevant to this role first"],
            ["Output", "Complete .tex file, compile instantly in Overleaf"],
          ].map(([key, val]) => (
            <div key={key} className="flex justify-between py-2 border-b border-white/10 last:border-0">
              <span className="text-sm font-medium text-[#bbb]">{key}</span>
              <span className="text-sm text-[#666]">{val}</span>
            </div>
          ))}
        </div>

        <div className="text-xs text-[#444] mb-4">
          Cost: ~$0.006 per generation (half a cent)
        </div>

        <button
          onClick={handleGenerate}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl
                     font-semibold text-sm transition-all hover:shadow-[0_0_15px_rgba(79,70,229,0.4)] active:scale-95"
        >
          Generate Tailored LaTeX Resume →
        </button>
      </div>
    );
  }

  // ── Loading screen ───────────────────────────────────────────────────────
  if (state === "loading") {
    return (
      <div className="max-w-xl mx-auto px-5 py-24 text-center">
        <div className="mb-8">
          <div className="w-10 h-10 border-2 border-[#2563eb] border-t-transparent
                          rounded-full animate-spin mx-auto mb-6" />
          <p className="text-sm text-[#888] animate-pulse">{loadMsg}</p>
        </div>
        <div className="space-y-2">
          {LOADING_MSGS.map((msg, i) => (
            <div
              key={msg}
              className={`text-xs transition-colors ${
                i < msgIdx ? "text-[#4ade80]" : i === msgIdx ? "text-[#888]" : "text-[#2a2a2a]"
              }`}
            >
              {i < msgIdx ? "✓" : i === msgIdx ? "→" : "○"} {msg}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error screen ─────────────────────────────────────────────────────────
  if (state === "error") {
    return (
      <div className="max-w-xl mx-auto px-5 py-16 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-lg font-semibold text-white mb-2">Generation Failed</h2>
        <p className="text-sm text-[#888] mb-2">{error}</p>
        <p className="text-xs text-[#555] mb-6">
          Check that GROQ_KEY is set in your .env file.
        </p>
        <button
          onClick={() => setState("generate")}
          className="px-5 py-2 border border-[#2d2d38] rounded-lg text-sm hover:border-[#444]"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ── Done screen ──────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-52px)]">

      {/* Left: editable LaTeX source */}
      <div className="flex-1 flex flex-col border-r border-[#1e1e24] min-w-0">
        <div className="flex items-center justify-between px-4 py-3
                        border-b border-white/5 bg-[#09090b]/70 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#555]">resume.tex</span>
            <span
              className="text-[10px] px-2 py-0.5 rounded font-medium bg-[#0f1e36]"
              style={{ color: "#60a5fa" }}
            >
              {result.meta.role_family?.toUpperCase()}
            </span>
            <span className="text-xs font-bold" style={{ color: scoreColor }}>
              {result.meta.match_score}% match
            </span>
          </div>
          <button
            onClick={handleCopyLatex}
            className="text-xs text-[#555] hover:text-[#888] transition-colors"
          >
            {copied ? "✓ Copied" : "Copy all"}
          </button>
        </div>

        <textarea
          className="flex-1 bg-transparent p-4 text-xs font-mono text-[#7ec8a0]
                     resize-none focus:outline-none leading-relaxed selection:bg-[#7ec8a0]/30"
          value={result.latex}
          onChange={e => setResult({ ...result, latex: e.target.value })}
          spellCheck={false}
        />
      </div>

      {/* Right: actions + metadata */}
      <div className="w-72 flex-shrink-0 flex flex-col bg-white/[0.02] border-l border-white/5 backdrop-blur-md overflow-y-auto">

        {/* Download actions */}
        <div className="p-4 border-b border-white/5">
          <p className="text-[10px] text-[#444] uppercase tracking-wider font-semibold mb-3">
            Download
          </p>

          <button
            onClick={() => downloadLatex(result.latex, result.meta.role_family)}
            className="w-full py-2.5 border border-white/10 hover:border-[#4ade80]/50 hover:bg-[#4ade80]/10
                       hover:text-[#4ade80] rounded-lg text-xs mb-3 transition-all active:scale-95 text-[#888]"
          >
            ↓ Download .tex file
          </button>

          <button
            onClick={() => openOverleaf(result.latex)}
            className="w-full py-2.5 bg-green-700 hover:bg-green-600 rounded-lg
                       text-xs font-semibold transition-all hover:shadow-[0_0_10px_rgba(21,128,61,0.5)] active:scale-95 text-white"
          >
            Open in Overleaf → PDF
          </button>

          <p className="text-[10px] text-[#333] mt-2 text-center">
            Overleaf: Upload .tex → Download PDF (free, 30 sec)
          </p>
        </div>

        {/* Keywords matched */}
        {result.meta.keywords?.length > 0 && (
          <div className="p-4 border-b border-white/5">
            <p className="text-[10px] text-[#444] uppercase tracking-wider font-semibold mb-2">
              JD Keywords Matched
            </p>
            <div className="flex flex-wrap gap-1.5">
              {result.meta.keywords.map(kw => (
                <span
                  key={kw}
                  className="text-[11px] bg-[#0f2d1a] text-[#4ade80] px-2 py-0.5 rounded"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Overleaf guide */}
        <div className="p-4 border-b border-white/5">
          <p className="text-[10px] text-[#444] uppercase tracking-wider font-semibold mb-2">
            Overleaf Steps (30 sec)
          </p>
          {[
            "Click 'Download .tex file'",
            "Go to overleaf.com → New Project",
            "Upload the .tex file",
            "Click Recompile → perfect PDF",
            "Download PDF → send to company",
          ].map((step, i) => (
            <div key={i} className="flex gap-2 text-[11px] text-[#555] mb-1.5">
              <span className="text-[#2563eb] flex-shrink-0">{i + 1}.</span>
              <span>{step}</span>
            </div>
          ))}
        </div>

        {/* Regenerate + Apply */}
        <div className="p-4 space-y-3">
          <button
            onClick={() => setState("generate")}
            className="w-full py-2.5 border border-white/10 hover:border-white/20 hover:bg-white/5
                       rounded-lg text-xs text-[#888] transition-all active:scale-95"
          >
            ↻ Regenerate
          </button>
          <button
            onClick={onMarkApplied}
            className="w-full py-2.5 border border-white/10 hover:border-[#4ade80]/50 hover:bg-[#4ade80]/10
                       hover:text-[#4ade80] rounded-lg text-xs text-[#555] transition-all active:scale-95"
          >
            ✓ Mark as Applied
          </button>
        </div>
      </div>
    </div>
  );
}
