import { useState, useEffect } from "react";
import JobList from "./components/JobList";
import JobDetail from "./components/JobDetail";
import ResumeTailor from "./components/ResumeTailor";
import Header from "./components/Header";
import jobs_data from "./data/jobs.json";
import masterResume from "./data/master_resume.json";

export default function App() {
  const [view, setView]           = useState("jobs");      // jobs | detail | tailor
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobs, setJobs]           = useState([]);
  const [filter, setFilter]       = useState("all");       // all | mern | swe | python | aiml | devops
  const [statusFilter, setStatusFilter] = useState("all"); // all | new | applied
  const [sortBy, setSortBy]       = useState("score");     // score | date

  useEffect(() => {
    // Load jobs from the JSON file the scraper writes
    // In dev: data is static. In prod with GitHub Pages: refreshes daily via Actions.
    setJobs(jobs_data);
  }, []);

  const filteredJobs = jobs
    .filter(j => filter === "all" || j.role_family === filter)
    .filter(j => {
      if (statusFilter === "applied") return j.applied;
      if (statusFilter === "new")     return !j.applied;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "score") return (b.score || 0) - (a.score || 0);
      return new Date(b.scraped_at || 0) - new Date(a.scraped_at || 0);
    });

  function markApplied(jobId) {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, applied: true } : j));
  }

  function openDetail(job) {
    setSelectedJob(job);
    setView("detail");
  }

  function openTailor(job) {
    setSelectedJob(job);
    setView("tailor");
  }

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-[#e8e8e8] font-sans">
      <Header
        view={view}
        onBack={() => setView(view === "tailor" ? "detail" : "jobs")}
        totalJobs={jobs.length}
        newJobs={jobs.filter(j => !j.applied).length}
      />

      {view === "jobs" && (
        <JobList
          jobs={filteredJobs}
          allJobs={jobs}
          filter={filter}
          setFilter={setFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          onSelectJob={openDetail}
        />
      )}

      {view === "detail" && selectedJob && (
        <JobDetail
          job={selectedJob}
          masterResume={masterResume}
          onTailor={() => openTailor(selectedJob)}
          onMarkApplied={() => { markApplied(selectedJob.id); setView("jobs"); }}
          onBack={() => setView("jobs")}
        />
      )}

      {view === "tailor" && selectedJob && (
        <ResumeTailor
          job={selectedJob}
          masterResume={masterResume}
          onBack={() => setView("detail")}
          onMarkApplied={() => { markApplied(selectedJob.id); setView("jobs"); }}
        />
      )}
    </div>
  );
}
