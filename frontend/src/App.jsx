import { useState, useEffect } from "react";
import JobList from "./components/JobList";
import JobDetail from "./components/JobDetail";
import ResumeTailor from "./components/ResumeTailor";
import Header from "./components/Header";
import ResumeEditor from "./components/ResumeEditor";
import jobs_data from "./data/jobs.json";

export default function App() {
  const [view, setView]           = useState("jobs");      // jobs | detail | tailor | resume
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobs, setJobs]           = useState([]);
  const [masterResume, setMasterResume] = useState(null);
  const [filter, setFilter]       = useState("all");       // all | mern | swe | python | aiml | devops
  const [statusFilter, setStatusFilter] = useState("all"); // all | new | applied
  const [sortBy, setSortBy]       = useState("score");     // score | date

  useEffect(() => {
    // Load jobs from the JSON file the scraper writes
    // In dev: data is static. In prod with GitHub Pages: refreshes daily via Actions.
    setJobs(jobs_data);
    
    // Fetch latest master resume from API
    fetch("http://localhost:3001/api/resume")
      .then(res => res.json())
      .then(data => setMasterResume(data))
      .catch(err => console.error("Failed to fetch resume:", err));
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

  function clearAllJobs() {
    if (!window.confirm("Are you sure you want to clear all jobs?")) return;
    fetch("http://localhost:3001/api/jobs", { method: "DELETE" })
      .then(() => setJobs([]))
      .catch(err => console.error("Failed to clear jobs:", err));
  }

  function clearJob(jobId) {
    fetch(`http://localhost:3001/api/jobs/${jobId}`, { method: "DELETE" })
      .then(() => setJobs(prev => prev.filter(j => j.id !== jobId)))
      .catch(err => console.error("Failed to clear job:", err));
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
        onOpenResumeEditor={() => setView("resume")}
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
          onClearAll={clearAllJobs}
          onClearJob={clearJob}
        />
      )}

      {view === "detail" && selectedJob && masterResume && (
        <JobDetail
          job={selectedJob}
          masterResume={masterResume}
          onTailor={() => openTailor(selectedJob)}
          onMarkApplied={() => { markApplied(selectedJob.id); setView("jobs"); }}
          onBack={() => setView("jobs")}
        />
      )}

      {view === "tailor" && selectedJob && masterResume && (
        <ResumeTailor
          job={selectedJob}
          masterResume={masterResume}
          onBack={() => setView("detail")}
          onMarkApplied={() => { markApplied(selectedJob.id); setView("jobs"); }}
        />
      )}

      {view === "resume" && (
        <ResumeEditor
          masterResume={masterResume}
          onSaveSuccess={(newResume) => setMasterResume(newResume)}
        />
      )}
    </div>
  );
}
