/**
 * services/latex.js
 * Downloads the generated LaTeX as a .tex file.
 * User uploads to Overleaf (free) → downloads perfect PDF.
 * 
 * Why not compile in browser?
 * SwiftLaTeX/latex.js WASM bundles are 40-80MB and often
 * fail on complex documents. Overleaf is instant and free.
 */

export function downloadLatex(latexContent, roleFamily) {
  const filename = `resume_${roleFamily}_${Date.now()}.tex`;
  const blob = new Blob([latexContent], { type: "text/plain;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return filename;
}

export function openOverleaf(latexContent) {
  /**
   * Opens Overleaf's "new project from snippet" with your LaTeX pre-filled.
   * Overleaf supports a POST form with snip_uri but the simplest path is
   * just downloading the .tex and uploading — this opens Overleaf for you.
   */
  downloadLatex(latexContent, "resume");
  setTimeout(() => {
    window.open("https://www.overleaf.com/project/new/template", "_blank");
  }, 500);
}
