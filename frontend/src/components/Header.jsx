export default function Header({ view, onBack, totalJobs, newJobs }) {
  const showBack = view !== "jobs";

  return (
    <header className="border-b border-[#1e1e24] bg-[#0d0d0f] sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={onBack}
              className="text-[#666] hover:text-[#e8e8e8] text-sm mr-1 transition-colors"
            >
              ← Back
            </button>
          )}
          <span className="text-sm font-semibold tracking-tight text-[#e8e8e8]">
            Internship Autopilot
          </span>
          <span className="text-[10px] text-[#444] font-mono uppercase tracking-widest">
            {view === "jobs" ? "Dashboard" : view === "detail" ? "Job Detail" : "Resume Tailor"}
          </span>
        </div>

        {view === "jobs" && (
          <div className="flex items-center gap-3 text-xs text-[#555]">
            <span>{totalJobs} total</span>
            <span className="text-[#2563eb] font-medium">{newJobs} new</span>
          </div>
        )}
      </div>
    </header>
  );
}
