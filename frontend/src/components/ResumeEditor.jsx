import { useState, useEffect } from "react";

export default function ResumeEditor({ masterResume, onSaveSuccess }) {
  const [resume, setResume] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | success | error

  // Initialize editable state
  useEffect(() => {
    if (masterResume && !isDirty) {
      // Deep clone to avoid mutating original
      setResume(JSON.parse(JSON.stringify(masterResume)));
    }
  }, [masterResume]);

  if (!resume) return <div className="p-8 text-[#a0a0a0]">Loading editor...</div>;

  const handleChange = (path, value) => {
    setResume((prev) => {
      const next = { ...prev };
      let current = next;
      for (let i = 0; i < path.length - 1; i++) {
        current[path[i]] = Array.isArray(current[path[i]]) 
          ? [...current[path[i]]] 
          : { ...current[path[i]] };
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return next;
    });
    setIsDirty(true);
    setSaveState("idle");
  };

  const handleArrayAdd = (path, emptyItem) => {
    setResume((prev) => {
      const next = { ...prev };
      let current = next;
      for (let i = 0; i < path.length - 1; i++) {
        current[path[i]] = Array.isArray(current[path[i]]) 
          ? [...current[path[i]]] 
          : { ...current[path[i]] };
        current = current[path[i]];
      }
      const arr = [...(current[path[path.length - 1]] || [])];
      arr.push(emptyItem);
      current[path[path.length - 1]] = arr;
      return next;
    });
    setIsDirty(true);
    setSaveState("idle");
  };

  const handleArrayRemove = (path, index) => {
    setResume((prev) => {
      const next = { ...prev };
      let current = next;
      for (let i = 0; i < path.length - 1; i++) {
        current[path[i]] = Array.isArray(current[path[i]]) 
          ? [...current[path[i]]] 
          : { ...current[path[i]] };
        current = current[path[i]];
      }
      const arr = [...current[path[path.length - 1]]];
      arr.splice(index, 1);
      current[path[path.length - 1]] = arr;
      return next;
    });
    setIsDirty(true);
    setSaveState("idle");
  };

  const handleSave = async () => {
    if (!isDirty) return;
    setSaveState("saving");

    try {
      // Validate serialization
      const jsonStr = JSON.stringify(resume);
      
      const res = await fetch("http://localhost:3001/api/resume", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: jsonStr,
      });

      if (!res.ok) throw new Error("Failed to save to backend");
      
      setSaveState("success");
      setIsDirty(false);
      if (onSaveSuccess) onSaveSuccess(JSON.parse(jsonStr));
      
      setTimeout(() => setSaveState("idle"), 3000);
    } catch (err) {
      console.error(err);
      setSaveState("error");
    }
  };

  const handleReset = () => {
    if (!isDirty) return;
    if (confirm("Are you sure you want to discard unsaved changes?")) {
      setResume(JSON.parse(JSON.stringify(masterResume)));
      setIsDirty(false);
      setSaveState("idle");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 pb-24 text-sm">
      <div className="flex justify-between items-center mb-8 border-b border-[#2a2a32] pb-4 sticky top-14 bg-[#0d0d0f] z-30">
        <h1 className="text-2xl font-semibold text-[#e8e8e8]">Resume Editor</h1>
        
        <div className="flex items-center gap-4">
          {saveState === "success" && <span className="text-[#10b981]">✓ Saved successfully</span>}
          {saveState === "error" && <span className="text-[#ef4444]">✕ Failed to save</span>}
          {saveState === "idle" && isDirty && <span className="text-[#fbbf24]">Unsaved changes</span>}
          
          <button
            onClick={handleReset}
            disabled={!isDirty}
            className={`px-3 py-1.5 rounded text-[#a0a0a0] transition-colors ${!isDirty ? 'opacity-50 cursor-not-allowed' : 'hover:text-[#e8e8e8]'}`}
          >
            Reset
          </button>
          
          <button
            onClick={handleSave}
            disabled={!isDirty || saveState === "saving"}
            className={`px-4 py-1.5 rounded font-medium transition-colors ${!isDirty || saveState === "saving" ? 'bg-[#1e1e24] text-[#666] cursor-not-allowed' : 'bg-[#2563eb] text-[#fff] hover:bg-[#1d4ed8]'}`}
          >
            {saveState === "saving" ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="space-y-10">
        {/* Personal Info */}
        <section className="bg-[#1e1e24] p-5 rounded-lg border border-[#2a2a32]">
          <h2 className="text-lg font-medium text-[#e8e8e8] mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(resume.personal || {}).map(([key, value]) => (
              <div key={key}>
                <label className="block text-xs text-[#a0a0a0] mb-1 capitalize">{key}</label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleChange(['personal', key], e.target.value)}
                  className="w-full bg-[#0d0d0f] border border-[#2a2a32] rounded p-2 text-[#e8e8e8] focus:border-[#2563eb] focus:outline-none"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Summaries */}
        <section className="bg-[#1e1e24] p-5 rounded-lg border border-[#2a2a32]">
          <h2 className="text-lg font-medium text-[#e8e8e8] mb-4">Professional Summaries</h2>
          <div className="space-y-4">
            {Object.entries(resume.summaries || {}).map(([key, value]) => (
              <div key={key}>
                <label className="block text-xs text-[#a0a0a0] mb-1">Variant: <span className="text-[#e8e8e8] font-mono">{key}</span></label>
                <textarea
                  value={value}
                  onChange={(e) => handleChange(['summaries', key], e.target.value)}
                  className="w-full bg-[#0d0d0f] border border-[#2a2a32] rounded p-2 text-[#e8e8e8] focus:border-[#2563eb] focus:outline-none min-h-[80px]"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Skills */}
        <section className="bg-[#1e1e24] p-5 rounded-lg border border-[#2a2a32]">
          <h2 className="text-lg font-medium text-[#e8e8e8] mb-4">Skills</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(resume.skills || {}).map(([key, value]) => (
              <div key={key}>
                <label className="block text-xs text-[#a0a0a0] mb-1 capitalize">{key.replace('_', ' ')} (comma separated)</label>
                <input
                  type="text"
                  value={(value || []).join(', ')}
                  onChange={(e) => handleChange(['skills', key], e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  className="w-full bg-[#0d0d0f] border border-[#2a2a32] rounded p-2 text-[#e8e8e8] focus:border-[#2563eb] focus:outline-none"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Experience */}
        <section className="bg-[#1e1e24] p-5 rounded-lg border border-[#2a2a32]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-[#e8e8e8]">Experience</h2>
            <button onClick={() => handleArrayAdd(['experience'], { role: '', company: '', duration: '', location: '', bullets: [] })} className="text-xs px-2 py-1 bg-[#2563eb] text-white rounded hover:bg-[#1d4ed8]">+ Add</button>
          </div>
          
          <div className="space-y-6">
            {(resume.experience || []).map((exp, i) => (
              <div key={i} className="border border-[#2a2a32] p-4 rounded bg-[#141419] relative">
                <button onClick={() => handleArrayRemove(['experience'], i)} className="absolute top-4 right-4 text-xs text-[#ef4444] hover:text-[#b91c1c]">Remove</button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pr-16">
                  <div>
                    <label className="block text-xs text-[#a0a0a0] mb-1">Company</label>
                    <input type="text" value={exp.company || ''} onChange={(e) => handleChange(['experience', i, 'company'], e.target.value)} className="w-full bg-[#0d0d0f] border border-[#2a2a32] rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#a0a0a0] mb-1">Role</label>
                    <input type="text" value={exp.role || ''} onChange={(e) => handleChange(['experience', i, 'role'], e.target.value)} className="w-full bg-[#0d0d0f] border border-[#2a2a32] rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#a0a0a0] mb-1">Duration</label>
                    <input type="text" value={exp.duration || ''} onChange={(e) => handleChange(['experience', i, 'duration'], e.target.value)} className="w-full bg-[#0d0d0f] border border-[#2a2a32] rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#a0a0a0] mb-1">Location</label>
                    <input type="text" value={exp.location || ''} onChange={(e) => handleChange(['experience', i, 'location'], e.target.value)} className="w-full bg-[#0d0d0f] border border-[#2a2a32] rounded p-2" />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs text-[#a0a0a0]">Bullets</label>
                    <button onClick={() => handleArrayAdd(['experience', i, 'bullets'], '')} className="text-[10px] text-[#2563eb]">+ Add Bullet</button>
                  </div>
                  <div className="space-y-2">
                    {(exp.bullets || []).map((bullet, j) => (
                      <div key={j} className="flex gap-2">
                        <textarea value={bullet} onChange={(e) => handleChange(['experience', i, 'bullets', j], e.target.value)} className="flex-1 bg-[#0d0d0f] border border-[#2a2a32] rounded p-2 text-[#e8e8e8] min-h-[40px]" />
                        <button onClick={() => handleArrayRemove(['experience', i, 'bullets'], j)} className="text-[#666] hover:text-[#ef4444]">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Projects */}
        <section className="bg-[#1e1e24] p-5 rounded-lg border border-[#2a2a32]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-[#e8e8e8]">Projects</h2>
            <button onClick={() => handleArrayAdd(['projects'], { id: `proj_${Date.now()}`, name: '', tech: [], role_relevance: [], bullets: {} })} className="text-xs px-2 py-1 bg-[#2563eb] text-white rounded hover:bg-[#1d4ed8]">+ Add Project</button>
          </div>
          
          <div className="space-y-6">
            {(resume.projects || []).map((proj, i) => (
              <div key={i} className="border border-[#2a2a32] p-4 rounded bg-[#141419] relative">
                <button onClick={() => handleArrayRemove(['projects'], i)} className="absolute top-4 right-4 text-xs text-[#ef4444] hover:text-[#b91c1c]">Remove</button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pr-16">
                  <div>
                    <label className="block text-xs text-[#a0a0a0] mb-1">Name</label>
                    <input type="text" value={proj.name || ''} onChange={(e) => handleChange(['projects', i, 'name'], e.target.value)} className="w-full bg-[#0d0d0f] border border-[#2a2a32] rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#a0a0a0] mb-1">ID (Internal)</label>
                    <input type="text" value={proj.id || ''} onChange={(e) => handleChange(['projects', i, 'id'], e.target.value)} className="w-full bg-[#0d0d0f] border border-[#2a2a32] rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#a0a0a0] mb-1">GitHub Link</label>
                    <input type="text" value={proj.github || ''} onChange={(e) => handleChange(['projects', i, 'github'], e.target.value)} className="w-full bg-[#0d0d0f] border border-[#2a2a32] rounded p-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#a0a0a0] mb-1">Tech (comma separated)</label>
                    <input type="text" value={(proj.tech || []).join(', ')} onChange={(e) => handleChange(['projects', i, 'tech'], e.target.value.split(',').map(s => s.trim()).filter(Boolean))} className="w-full bg-[#0d0d0f] border border-[#2a2a32] rounded p-2" />
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-xs text-[#a0a0a0] mb-1">Role Relevance (comma separated)</label>
                  <input type="text" value={(proj.role_relevance || []).join(', ')} onChange={(e) => handleChange(['projects', i, 'role_relevance'], e.target.value.split(',').map(s => s.trim()).filter(Boolean))} className="w-full bg-[#0d0d0f] border border-[#2a2a32] rounded p-2" />
                </div>
                
                <div>
                  <h4 className="text-xs font-medium text-[#e8e8e8] mb-2 border-b border-[#2a2a32] pb-1">Role Variants (Bullets)</h4>
                  <div className="flex gap-2 mb-2">
                    <button onClick={() => {
                      const newVariant = prompt("Enter role variant name (e.g. swe):");
                      if (newVariant && (!proj.bullets || !proj.bullets[newVariant])) {
                         handleChange(['projects', i, 'bullets', newVariant], []);
                      }
                    }} className="text-[10px] bg-[#2a2a32] px-2 py-1 rounded text-[#e8e8e8]">+ Add Role Variant</button>
                  </div>
                  {Object.entries(proj.bullets || {}).map(([role, bullets]) => (
                    <div key={role} className="mt-4 p-3 border border-[#2a2a32] rounded bg-[#0d0d0f]">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-mono text-[#a0a0a0]">Role: <span className="text-[#e8e8e8]">{role}</span></span>
                        <div className="flex gap-2">
                          <button onClick={() => handleArrayAdd(['projects', i, 'bullets', role], '')} className="text-[10px] text-[#2563eb]">+ Add Bullet</button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {bullets.map((bullet, j) => (
                          <div key={j} className="flex gap-2">
                            <textarea value={bullet} onChange={(e) => handleChange(['projects', i, 'bullets', role, j], e.target.value)} className="flex-1 bg-[#141419] border border-[#2a2a32] rounded p-2 text-[#e8e8e8] min-h-[40px]" />
                            <button onClick={() => handleArrayRemove(['projects', i, 'bullets', role], j)} className="text-[#666] hover:text-[#ef4444]">✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Certifications */}
        <section className="bg-[#1e1e24] p-5 rounded-lg border border-[#2a2a32]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-[#e8e8e8]">Certifications</h2>
            <button onClick={() => handleArrayAdd(['certifications'], '')} className="text-xs px-2 py-1 bg-[#2563eb] text-white rounded hover:bg-[#1d4ed8]">+ Add</button>
          </div>
          
          <div className="space-y-2">
            {(resume.certifications || []).map((cert, i) => (
              <div key={i} className="flex gap-2">
                <input type="text" value={cert} onChange={(e) => handleChange(['certifications', i], e.target.value)} className="flex-1 bg-[#0d0d0f] border border-[#2a2a32] rounded p-2 text-[#e8e8e8]" />
                <button onClick={() => handleArrayRemove(['certifications'], i)} className="text-[#666] hover:text-[#ef4444]">✕</button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
