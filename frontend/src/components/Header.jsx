export default function Header({ view, onBack, totalJobs, newJobs, onOpenResumeEditor }) {
  const showBack = view !== "jobs";

  return (
    <header className="bg-[#09090b]/70 backdrop-blur-md border-b border-white/5 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={onBack}
              className="text-[#888] hover:text-white text-sm mr-1 transition-colors"
            >
              ← Back
            </button>
          )}
          <span className="text-sm font-semibold tracking-tight text-white drop-shadow-sm">
            Internship Autopilot
          </span>
          <span className="text-[10px] text-[#666] font-mono uppercase tracking-widest">
            {view === "jobs" ? "Dashboard" : view === "detail" ? "Job Detail" : view === "resume" ? "Resume Editor" : "Resume Tailor"}
          </span>
        </div>

        {view === "jobs" && (
          <div className="flex items-center gap-4">
            <button
              onClick={onOpenResumeEditor}
              className="text-xs px-3 py-1.5 rounded-md bg-white/5 text-[#a0a0a0] hover:text-white hover:bg-white/10 hover:border-white/20 transition-all hover:scale-105 active:scale-95 font-medium border border-white/10 shadow-sm"
            >
              Resume Editor
            </button>
            <div className="flex items-center gap-3 text-xs text-[#555]">
              <span>{totalJobs} total</span>
              <span className="text-[#2563eb] font-medium">{newJobs} new</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
