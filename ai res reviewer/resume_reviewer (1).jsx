import { useState, useRef } from "react";

const C = {
  bg:       "#08090f",
  surface:  "#10121c",
  card:     "#14172a",
  border:   "#1e2240",
  accent:   "#4f6ef7",
  accent2:  "#7c3aed",
  good:     "#22c55e",
  warn:     "#f59e0b",
  bad:      "#ef4444",
  muted:    "#4b5280",
  text:     "#e2e6ff",
  sub:      "#7b82b0",
};

function scoreColor(s) {
  if (s >= 75) return C.good;
  if (s >= 50) return C.warn;
  return C.bad;
}

function ScoreRing({ score, size = 90 }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const col = scoreColor(score);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={8} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={8}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fill={col} fontSize={size * 0.22} fontWeight="800"
        style={{ transform: "rotate(90deg)", transformOrigin: "50% 50%", fontFamily: "monospace" }}>
        {score}
      </text>
    </svg>
  );
}

function Bar({ pct, color }) {
  return (
    <div style={{ background: C.border, borderRadius: 99, height: 6, flex: 1, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 1s ease" }} />
    </div>
  );
}

function Tag({ children, color }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
      background: color + "22", color, border: `1px solid ${color}44`, display: "inline-block" }}>
      {children}
    </span>
  );
}

export default function ResumeReviewer() {
  const [step, setStep]         = useState("upload");
  const [resumeText, setResumeText] = useState("");
  const [pdfBase64, setPdfBase64]   = useState(null);
  const [jdText, setJdText]     = useState("");
  const [fileName, setFileName] = useState("");
  const [results, setResults]   = useState(null);
  const [error, setError]       = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  async function handleFile(file) {
    if (!file) return;
    setFileName(file.name);
    setError("");
    setPdfBase64(null);
    setResumeText("");
    try {
      if (file.type === "application/pdf") {
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        setPdfBase64(btoa(binary));
      } else if (file.type === "text/plain") {
        const text = await file.text();
        setResumeText(text);
      } else {
        setError("Upload a PDF or plain-text (.txt) file.");
      }
    } catch {
      setError("Could not read file. Try pasting your resume text instead.");
    }
  }

  function onDrop(e) {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  const hasPdf = !!pdfBase64;
  const hasText = resumeText.trim().length > 0;

  async function analyse() {
    if (!hasPdf && !hasText) { setError("Add your resume first."); return; }
    setStep("reviewing"); setError("");

    const jdSection = jdText.trim()
      ? `\n\nJOB DESCRIPTION TO MATCH AGAINST:\n${jdText.trim()}`
      : "";

    const instruction = `You are an expert technical recruiter reviewing a candidate's resume for software engineering / web development internship roles.
${hasPdf ? "The resume is attached as a PDF document above." : `RESUME TEXT:\n${resumeText}`}${jdSection}

Analyse this resume and return ONLY valid JSON — no markdown, no explanation, no backticks — in exactly this shape:

{
  "overallScore": <0-100 integer>,
  "overallVerdict": "<one crisp sentence about the resume's current strength>",
  "jdMatchScore": <0-100 integer or null if no JD provided>,
  "sections": [
    {
      "name": "Summary",
      "score": <0-100>,
      "verdict": "<good|needs-work|missing>",
      "feedback": "<2-3 sentences of specific, actionable feedback>",
      "fixes": ["<fix 1>", "<fix 2>"]
    },
    { "name": "Education", "score": 0, "verdict": "good|needs-work|missing", "feedback": "...", "fixes": [] },
    { "name": "Skills", "score": 0, "verdict": "good|needs-work|missing", "feedback": "...", "fixes": [] },
    { "name": "Projects", "score": 0, "verdict": "good|needs-work|missing", "feedback": "...", "fixes": [] },
    { "name": "Experience", "score": 0, "verdict": "good|needs-work|missing", "feedback": "...", "fixes": [] },
    { "name": "Certifications", "score": 0, "verdict": "good|needs-work|missing", "feedback": "...", "fixes": [] }
  ],
  "missingKeywords": ["keyword1", "keyword2"],
  "topStrengths": ["strength1", "strength2", "strength3"],
  "quickWins": ["fix1", "fix2", "fix3"]
}

Be specific, honest, and direct. Score 0-100 where 70+ is good, 50-69 needs work, below 50 is weak.`;

    const userContent = hasPdf
      ? [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
          { type: "text", text: instruction }
        ]
      : instruction;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1500,
          messages: [{ role: "user", content: userContent }]
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const raw = data.content?.find(b => b.type === "text")?.text || "";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResults(parsed);
      setStep("results");
    } catch (err) {
      setError(`Analysis failed: ${err.message || "please try again."}`);
      setStep("upload");
    }
  }

  function reset() { setStep("upload"); setResults(null); setResumeText(""); setPdfBase64(null); setJdText(""); setFileName(""); setError(""); }

  if (step === "upload") return (
    <Page>
      <Header />
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 16px 60px" }}>

        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current.click()}
          style={{ border: `2px dashed ${dragging ? C.accent : C.border}`, borderRadius: 16,
            background: dragging ? C.accent + "0a" : C.card, padding: "40px 24px",
            textAlign: "center", cursor: "pointer", transition: "all 0.2s", marginBottom: 16 }}>
          <input ref={fileRef} type="file" accept=".pdf,.txt" style={{ display: "none" }}
            onChange={e => handleFile(e.target.files[0])} />
          <div style={{ fontSize: 36, marginBottom: 12 }}>{hasPdf ? "✅" : "📄"}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6 }}>
            {fileName || "Drop your resume here"}
          </div>
          <div style={{ fontSize: 13, color: C.sub }}>PDF or .txt · or click to browse</div>
          {hasPdf && <div style={{ marginTop: 8 }}><Tag color={C.good}>✓ PDF ready to analyse</Tag></div>}
        </div>

        <div style={{ marginBottom: 20 }}>
          <Label>Or paste resume text</Label>
          <Textarea value={resumeText} onChange={e => setResumeText(e.target.value)}
            placeholder="Paste your resume content here…" rows={6} />
        </div>

        <div style={{ marginBottom: 28 }}>
          <Label>Job Description <span style={{ color: C.muted, fontWeight: 400 }}>(paste to get JD match score)</span></Label>
          <Textarea value={jdText} onChange={e => setJdText(e.target.value)}
            placeholder="Paste the job description you're applying for…" rows={5} />
        </div>

        {error && <div style={{ color: C.bad, fontSize: 13, marginBottom: 16, padding: "10px 14px", background: C.bad + "15", borderRadius: 10 }}>{error}</div>}

        <button onClick={analyse}
          disabled={!hasPdf && !hasText}
          style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", cursor: (hasPdf || hasText) ? "pointer" : "not-allowed",
            background: (hasPdf || hasText) ? `linear-gradient(135deg, ${C.accent}, ${C.accent2})` : C.border,
            color: "#fff", fontSize: 16, fontWeight: 800, letterSpacing: "0.03em", transition: "opacity 0.2s" }}>
          Analyse Resume →
        </button>
      </div>
    </Page>
  );

  if (step === "reviewing") return (
    <Page>
      <Header />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 24 }}>
        <div style={{ position: "relative", width: 80, height: 80 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `4px solid ${C.border}` }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `4px solid ${C.accent}`,
            borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
        </div>
        <div style={{ color: C.text, fontSize: 18, fontWeight: 700 }}>Reviewing your resume…</div>
        <div style={{ color: C.sub, fontSize: 14 }}>Checking sections, keywords, and JD fit</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </Page>
  );

  const r = results;
  const verdictMap = { good: { color: C.good, label: "Good" }, "needs-work": { color: C.warn, label: "Needs Work" }, missing: { color: C.bad, label: "Missing" } };

  return (
    <Page>
      <Header />
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 16px 60px" }}>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "28px 28px 24px", marginBottom: 20,
          display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap" }}>
          <ScoreRing score={r.overallScore} size={100} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Overall Score</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text, lineHeight: 1.4, marginBottom: 12 }}>{r.overallVerdict}</div>
            {r.jdMatchScore !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, color: C.sub }}>JD Match</span>
                <Bar pct={r.jdMatchScore} color={scoreColor(r.jdMatchScore)} />
                <span style={{ fontSize: 13, fontWeight: 800, color: scoreColor(r.jdMatchScore), minWidth: 36 }}>{r.jdMatchScore}%</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <MiniCard title="✅ Top Strengths" items={r.topStrengths} color={C.good} />
          <MiniCard title="⚡ Quick Wins" items={r.quickWins} color={C.accent} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <SectionLabel>Section Breakdown</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {r.sections.filter(s => s.verdict !== "missing" || s.score > 0 || s.name !== "Experience").map((sec, i) => {
              const v = verdictMap[sec.verdict] || verdictMap["needs-work"];
              return (
                <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{sec.name}</span>
                        <Tag color={v.color}>{v.label}</Tag>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Bar pct={sec.score} color={scoreColor(sec.score)} />
                        <span style={{ fontSize: 13, fontWeight: 800, color: scoreColor(sec.score), minWidth: 32 }}>{sec.score}</span>
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: C.sub, margin: "0 0 10px", lineHeight: 1.6 }}>{sec.feedback}</p>
                  {sec.fixes?.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {sec.fixes.map((f, j) => (
                        <div key={j} style={{ fontSize: 12, color: C.text, background: C.accent + "12", borderLeft: `3px solid ${C.accent}`,
                          borderRadius: "0 8px 8px 0", padding: "6px 12px" }}>
                          → {f}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {r.missingKeywords?.length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px", marginBottom: 20 }}>
            <SectionLabel style={{ marginBottom: 12 }}>Missing Keywords</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {r.missingKeywords.map((kw, i) => <Tag key={i} color={C.warn}>{kw}</Tag>)}
            </div>
          </div>
        )}

        <button onClick={reset}
          style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: `1px solid ${C.border}`,
            background: "transparent", color: C.sub, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          ← Analyse another resume
        </button>
      </div>
    </Page>
  );
}

function Page({ children }) {
  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Inter', 'Segoe UI', sans-serif", color: C.text }}>
      {children}
    </div>
  );
}

function Header() {
  return (
    <div style={{ borderBottom: `1px solid ${C.border}`, padding: "20px 16px 16px", marginBottom: 28 }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: C.accent, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>
          AI-Powered
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, background: `linear-gradient(90deg, ${C.accent}, ${C.accent2})`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Resume Reviewer
        </div>
        <div style={{ fontSize: 13, color: C.sub, marginTop: 4 }}>Upload your resume · paste a JD · get instant feedback</div>
      </div>
    </div>
  );
}

function Label({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{children}</div>;
}

function SectionLabel({ children, style }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, ...style }}>{children}</div>;
}

function Textarea({ value, onChange, placeholder, rows }) {
  return (
    <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
      style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
        color: C.text, fontSize: 13, padding: "12px 14px", resize: "vertical", outline: "none",
        fontFamily: "inherit", boxSizing: "border-box", lineHeight: 1.6,
        "::placeholder": { color: C.muted } }} />
  );
}

function MiniCard({ title, items, color }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ fontSize: 13, fontWeight: 800, color, marginBottom: 12 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items?.map((item, i) => (
          <div key={i} style={{ fontSize: 12, color: C.sub, paddingLeft: 10, borderLeft: `2px solid ${color}44`, lineHeight: 1.5 }}>{item}</div>
        ))}
      </div>
    </div>
  );
}
