import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

const app = express();
const port = 3001;

// Allow requests from the Vite frontend
app.use(cors({ origin: 'http://localhost:5173' }));

// Parse JSON bodies (increased limit for large resumes)
app.use(express.json({ limit: '10mb' }));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_KEY,
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

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    res.json({ result: message.content[0].text });
  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Backend proxy listening on port ${port}`);
});
