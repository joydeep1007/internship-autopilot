import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const resumePath = path.join(__dirname, '../frontend/src/data/master_resume.json');
const jobsPath = path.join(__dirname, '../frontend/src/data/jobs.json');

const app = express();
const port = 3001;

// Allow requests from the Vite frontend
app.use(cors({ origin: 'http://localhost:5173' }));

// Parse JSON bodies (increased limit for large resumes)
app.use(express.json({ limit: '10mb' }));

const groq = new Groq({
  apiKey: process.env.GROQ_KEY,
});

app.post('/api/tailor-resume', async (req, res) => {
  try {
    const { jobDescription, masterResume } = req.body;

    if (!jobDescription || !masterResume) {
      return res.status(400).json({ error: 'Missing jobDescription or masterResume' });
    }

    const prompt = `
You are an expert resume writer and LaTeX typesetter.

MASTER RESUME DATA (source of truth — never invent anything not in here):
${JSON.stringify(masterResume, null, 2)}

JOB DESCRIPTION:
${jobDescription}

Your task:
1. Identify the role family: mern | swe | python | aiml | devops | other
2. Extract the top 8 keywords/phrases from the JD (use their exact wording)
3. Select the 3-4 most relevant projects from the master resume for this role
4. For each project, pick the bullet variant that best matches the role family
5. Rewrite the summary to mirror this JD's exact language and requirements
6. Filter and reorder skills — most relevant to this JD come first
7. Rewrite experience bullets to echo the JD's vocabulary where true

CRITICAL LaTeX escaping rules — apply to ALL text you write:
- Escape: & → \\& | % → \\% | $ → \\$ | # → \\# | _ → \\_ | { } stay as is in commands
- URLs: use \\href{url}{display}
- Each project/experience bullet must use \\resumeItem{text}
- Never use bare " quotes — use '' and \`\` instead
- En-dash in dates: use -- (two hyphens)

Fill in this complete LaTeX template (replace every {{PLACEHOLDER}} including braces):

%%META: {"role_family":"ROLE_HERE","match_score":SCORE_HERE,"keywords":["kw1","kw2","kw3","kw4","kw5"]}
\\documentclass[letterpaper,10.5pt]{article}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}
\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-0.5in}
\\addtolength{\\textheight}{1.0in}
\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}
\\titleformat{\\section}{\\vspace{-4pt}\\scshape\\raggedright\\large}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]
\\newcommand{\\resumeItem}[1]{\\item\\small{{#1 \\vspace{-2pt}}}}
\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
  \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
    \\textbf{#1} & #2 \\\\
    \\textit{\\small#3} & \\textit{\\small #4} \\\\
  \\end{tabular*}\\vspace{-7pt}}
\\newcommand{\\resumeProjectHeading}[2]{
  \\item
  \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
    \\small#1 & #2 \\\\
  \\end{tabular*}\\vspace{-7pt}}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

\\begin{document}

%---------- HEADER ----------
\\begin{tabular*}{\\textwidth}{l@{\\extracolsep{\\fill}}r}
  \\textbf{\\Large {{NAME}}} & \\href{mailto:{{EMAIL}}}{{{EMAIL}}} \\\\
  \\href{https://{{GITHUB}}}{{{GITHUB}}} $|$ +91 9163805618 & Kolkata, India \\\\
\\end{tabular*}
\\vspace{-5pt}

%---------- SUMMARY ----------
\\section{Summary}
  \\small{{{SUMMARY}}}

%---------- SKILLS ----------
\\section{Technical Skills}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
      \\textbf{Languages: }{{{SKILLS_LANGUAGES}}} \\\\
      \\textbf{Frontend: }{{{SKILLS_FRONTEND}}} \\\\
      \\textbf{Backend: }{{{SKILLS_BACKEND}}} \\\\
      \\textbf{Databases: }{{{SKILLS_DATABASES}}} \\\\
      \\textbf{Tools \\& DevOps: }{{{SKILLS_DEVOPS}}} \\\\
      \\textbf{AI \\& ML: }{{{SKILLS_AIML}}}
    }}
 \\end{itemize}

%---------- EXPERIENCE ----------
\\section{Experience}
  \\resumeSubHeadingListStart
    {{EXPERIENCE_BLOCK}}
  \\resumeSubHeadingListEnd

%---------- PROJECTS ----------
\\section{Projects}
    \\resumeSubHeadingListStart
      {{PROJECTS_BLOCK}}
    \\resumeSubHeadingListEnd

%---------- EDUCATION ----------
\\section{Education}
  \\resumeSubHeadingListStart
    {{EDUCATION_BLOCK}}
  \\resumeSubHeadingListEnd

%---------- CERTIFICATIONS ----------
\\section{Certifications}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{{{CERTIFICATIONS_BLOCK}}}}
 \\end{itemize}

\\end{document}

Now fill every {{PLACEHOLDER}} with real content from the master resume, tailored to the JD.
For EXPERIENCE_BLOCK use \\resumeSubheading{Role}{Duration}{Company, Location}{}
followed by \\resumeItemListStart ... \\resumeItemListEnd.
For PROJECTS_BLOCK use \\resumeProjectHeading{\\textbf{Name} $|$ \\emph{\\small Tech}}{\\href{github_url}{GitHub}}
followed by \\resumeItemListStart ... \\resumeItemListEnd.
For EDUCATION_BLOCK use \\resumeSubheading{Institution}{Duration}{Degree $|$ CGPA: X.XX}{}.
For CERTIFICATIONS_BLOCK join certs with \\\\\\\\ between each.

Return ONLY the complete LaTeX document starting with %%META. No explanation. No markdown fences.
`;

    const message = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 4000,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    });

    res.json({ result: message.choices[0].message.content });
  } catch (error) {
    console.error('Error calling Groq API (tailor-resume):', error);
    const status = error?.status === 429 ? 429 : 500;
    const msg = error?.status === 429
      ? 'Groq rate limit hit — wait 60 seconds and try again (free tier limit)'
      : error.message || 'Internal Server Error';
    res.status(status).json({ error: msg });
  }
});

app.get('/api/resume', async (req, res) => {
  try {
    const data = await fs.readFile(resumePath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading resume:', error);
    res.status(500).json({ error: 'Failed to read resume' });
  }
});

app.put('/api/resume', async (req, res) => {
  try {
    const resumeData = req.body;
    if (typeof resumeData !== 'object' || !resumeData) {
       return res.status(400).json({ error: 'Invalid resume data format' });
    }
    
    // Save the resume
    await fs.writeFile(resumePath, JSON.stringify(resumeData, null, 2), 'utf8');
    res.json({ success: true, message: 'Resume saved successfully' });
  } catch (error) {
    console.error('Error writing resume:', error);
    res.status(500).json({ error: 'Failed to write resume schema' });
  }
});

app.delete('/api/jobs', async (req, res) => {
  try {
    await fs.writeFile(jobsPath, JSON.stringify([], null, 2), 'utf8');
    res.json({ success: true, message: 'All jobs cleared' });
  } catch (error) {
    console.error('Error clearing jobs:', error);
    res.status(500).json({ error: 'Failed to clear jobs' });
  }
});

app.delete('/api/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fs.readFile(jobsPath, 'utf8');
    const jobs = JSON.parse(data);
    const updatedJobs = jobs.filter(j => j.id !== id);
    await fs.writeFile(jobsPath, JSON.stringify(updatedJobs, null, 2), 'utf8');
    res.json({ success: true, message: 'Job cleared' });
  } catch (error) {
    console.error('Error clearing job:', error);
    res.status(500).json({ error: 'Failed to clear job' });
  }
});

app.post('/api/draft-email', async (req, res) => {
  try {
    const { job, masterResume } = req.body;

    if (!job || !masterResume) {
      return res.status(400).json({ error: 'Missing job or masterResume' });
    }

    const topProject = masterResume.projects[0];
    const prompt = `
Write a cold internship outreach email. Under 120 words. No fluff. No "Dear Sir/Madam".

SENDER:
Name: ${masterResume.personal.name}
Best project: ${topProject.name} — github.com/joydeep1007 (live projects, real code)
Skills: React, Node.js, Python, FastAPI, Gemini API, MongoDB
Currently: B.Tech CSE final year, CGPA 8.11

TARGET:
Company: ${job.company}
Role: ${job.title}
Key skills they want: ${(job.key_skills || []).join(", ")}
${job.description ? `What they do (from JD): ${job.description.slice(0, 200)}` : ""}
${job.contact_email ? `Recipient email: ${job.contact_email}` : ""}

FORMAT — return ONLY this, no explanation:
Subject: [subject line]

[email body — 3-4 short paragraphs, ends with a direct question like "Would a 15-minute call work this week?"]

RULES:
- Reference ONE specific thing about their product or the role
- Mention the GitHub link naturally
- First name only (no "Dear Hiring Manager")
- Never say "I am writing to express my interest"
- The "trial project" close: if appropriate, offer to do a small task to show fit
`;

    const message = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 500,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    });

    res.json({ result: message.choices[0].message.content });
  } catch (error) {
    console.error('Error calling Groq API (draft-email):', error);
    const status = error?.status === 429 ? 429 : 500;
    const msg = error?.status === 429
      ? 'Groq rate limit hit — wait 60 seconds and try again (free tier limit)'
      : error.message || 'Internal Server Error';
    res.status(status).json({ error: msg });
  }
});

app.listen(port, () => {
  console.log(`Backend proxy listening on port ${port}`);
});
