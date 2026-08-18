const ROLE_COLORS = {
  mern:   { bg: "#0f2d1a", text: "#4ade80", label: "MERN" },
  swe:    { bg: "#0f1e36", text: "#60a5fa", label: "SWE"  },
  python: { bg: "#1e1409", text: "#fbbf24", label: "Python" },
  aiml:   { bg: "#1a0f2e", text: "#a78bfa", label: "AI/ML" },
  devops: { bg: "#1a1009", text: "#fb923c", label: "DevOps" },
  other:  { bg: "#1a1a1a", text: "#9ca3af", label: "Other" },
};

const FILTERS = ["all", "mern", "swe", "python", "aiml", "devops"];

function ScoreRing({ score }) {
  const color = score >= 80 ? "#4ade80" : score >= 60 ? "#fbbf24" : "#f87171";
  return (
    <div className="flex flex-col items-center">
      <span className="text-lg font-bold" style={{ color }}>{score}</span>
      <span className="text-[10px] text-[#444]">match</span>
    </div>
  );
}

function JobCard({ job, onClick, onClear }) {
  const rf = ROLE_COLORS[job.role_family] || ROLE_COLORS.other;
  return (
    <div className="relative group/card">
      <button
        onClick={onClick}
        className="w-full text-left bg-[#111115] border border-[#1e1e24] rounded-xl p-4
                   hover:border-[#2d2d38] hover:bg-[#141418] transition-all group"
      >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="text-[11px] px-2 py-0.5 rounded font-medium"
              style={{ background: rf.bg, color: rf.text }}
            >
              {rf.label}
            </span>
            {job.applied && (
              <span className="text-[11px] px-2 py-0.5 rounded bg-[#1a1a2e] text-[#6366f1]">
                Applied ✓
              </span>
            )}
            {job.contact_email && (
              <span className="text-[11px] text-[#2ea043]">📧 Email found</span>
            )}
          </div>

          <h3 className="text-sm font-semibold text-[#e8e8e8] truncate group-hover:text-white">
            {job.title}
          </h3>
          <p className="text-sm text-[#666] mt-0.5">{job.company}</p>

          {job.key_skills?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {job.key_skills.slice(0, 4).map(s => (
                <span key={s} className="text-[11px] bg-[#1a1a1a] text-[#888] px-1.5 py-0.5 rounded">
                  {s}
                </span>
              ))}
            </div>
          )}

          {job.estimated_stipend && job.estimated_stipend !== "Unknown" && (
            <p className="text-[11px] text-[#4ade80] mt-2">{job.estimated_stipend}</p>
          )}
        </div>

        <div className="flex-shrink-0">
          <ScoreRing score={job.score || 0} />
        </div>
      </div>

      {job.reason && (
        <p className="text-[11px] text-[#555] mt-2 line-clamp-1">{job.reason}</p>
      )}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onClear(); }}
        className="absolute top-2 right-2 text-[#444] hover:text-[#f87171] p-1 rounded opacity-0 group-hover/card:opacity-100 transition-opacity"
        title="Clear Job"
      >
        ✕
      </button>
    </div>
  );
}

export default function JobList({
  jobs, allJobs, filter, setFilter,
  statusFilter, setStatusFilter,
  sortBy, setSortBy, onSelectJob, onClearAll, onClearJob
}) {
  const countByRole = (role) =>
    role === "all" ? allJobs.length : allJobs.filter(j => j.role_family === role).length;

  // Stats
  const emailFound = allJobs.filter(j => j.contact_email).length;
  const applied    = allJobs.filter(j => j.applied).length;
  const avgScore   = allJobs.length
    ? Math.round(allJobs.reduce((s, j) => s + (j.score || 0), 0) / allJobs.length)
    : 0;

  return (
    <div className="max-w-6xl mx-auto px-5 py-6">

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Listings",   value: allJobs.length },
          { label: "Emails Found",     value: emailFound },
          { label: "Applied",          value: applied },
          { label: "Avg Match Score",  value: avgScore },
        ].map(stat => (
          <div key={stat.label} className="bg-[#111115] border border-[#1e1e24] rounded-xl p-3">
            <div className="text-xl font-bold text-[#e8e8e8]">{stat.value}</div>
            <div className="text-[11px] text-[#555] mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex gap-1 bg-[#111115] border border-[#1e1e24] rounded-lg p-1">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded transition-colors font-medium ${
                filter === f
                  ? "bg-[#1e1e24] text-white"
                  : "text-[#555] hover:text-[#888]"
              }`}
            >
              {f === "all" ? `All (${countByRole("all")})` : `${f.toUpperCase()} (${countByRole(f)})`}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-[#111115] border border-[#1e1e24] rounded-lg p-1 ml-auto">
          {[["all","All"],["new","New"],["applied","Applied"]].map(([v,l]) => (
            <button
              key={v}
              onClick={() => setStatusFilter(v)}
              className={`text-xs px-3 py-1.5 rounded transition-colors ${
                statusFilter === v ? "bg-[#1e1e24] text-white" : "text-[#555] hover:text-[#888]"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="text-xs bg-[#111115] border border-[#1e1e24] rounded-lg px-3 py-2
                     text-[#888] focus:outline-none"
        >
          <option value="score">Sort: Score</option>
          <option value="date">Sort: Date</option>
        </select>

        <button
          onClick={onClearAll}
          className="text-xs px-3 py-2 rounded bg-[#1e1e24] text-[#f87171] hover:bg-[#2d2d38] transition-colors font-medium border border-[#1e1e24]"
        >
          Clear All
        </button>
      </div>

      {/* Job grid */}
      {jobs.length === 0 ? (
        <div className="text-center py-20 text-[#444]">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm">No listings yet — the scraper runs every weekday morning.</p>
          <p className="text-xs text-[#333] mt-1">
            Trigger it manually from GitHub Actions → Run workflow
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {jobs.map(job => (
            <JobCard key={job.id} job={job} onClick={() => onSelectJob(job)} onClear={() => onClearJob(job.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
