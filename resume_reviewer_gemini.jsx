import { useState, useRef } from "react";
import { GoogleGenAI } from "@google/genai";

// Configure REACT_APP_GEMINI_API_KEY in the environment before running the app.
const ai = new GoogleGenAI({ apiKey: process.env.REACT_APP_GEMINI_API_KEY });

const C = {
  bg:       "#f4f0e8",
  surface:  "#fffdf9",
  card:     "#fffcf7",
  border:   "#d9d1c5",
  accent:   "#295847",
  accent2:  "#b95d47",
  good:     "#36785d",
  warn:     "#b7791f",
  bad:      "#b5483b",
  muted:    "#80786e",
  text:     "#25231f",
  sub:      "#5f5a52",
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
    <span style={{ fontSize: 11, fontWeight: 800, padding: "4px 9px", borderRadius: 6,
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
${hasPdf ? "The resume is attached as a PDF document." : `RESUME TEXT:\n${resumeText}`}${jdSection}

Analyse this resume. Be specific, honest, and direct. Score 0-100 where 70+ is good, 50-69 needs work, below 50 is weak.`;

    const contents = [];
    if (hasPdf) {
      contents.push({
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64
        }
      });
    }
    contents.push(instruction);

    try {
      // Use the native SDK implementation to handle Structured Outputs safely
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              overallScore: { type: "INTEGER" },
              overallVerdict: { type: "STRING" },
              jdMatchScore: { type: "INTEGER", nullable: true },
              sections: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING" },
                    score: { type: "INTEGER" },
                    verdict: { type: "STRING", enum: ["good", "needs-work", "missing"] },
                    feedback: { type: "STRING" },
                    fixes: { type: "ARRAY", items: { type: "STRING" } }
                  },
                  required: ["name", "score", "verdict", "feedback", "fixes"]
                }
              },
              missingKeywords: { type: "ARRAY", items: { type: "STRING" } },
              topStrengths: { type: "ARRAY", items: { type: "STRING" } },
              quickWins: { type: "ARRAY", items: { type: "STRING" } }
            },
            required: [
              "overallScore", 
              "overallVerdict", 
              "jdMatchScore", 
              "sections", 
              "missingKeywords", 
              "topStrengths", 
              "quickWins"
            ]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Gemini returned an empty response.");
      const parsed = JSON.parse(text);
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
      <Header/>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 16px 60px" }}>
        <div style={{ maxWidth: 540, margin: "0 auto 28px" }}>
          <div style={{ color: C.accent2, fontSize: 12, fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 10 }}>A practical second opinion</div>
          <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "clamp(32px, 6vw, 48px)", letterSpacing: "-0.045em", lineHeight: 1.02, margin: "0 0 12px", color: C.text }}>Make your next application stronger.</h1>
          <p style={{ fontSize: 15, lineHeight: 1.65, color: C.sub, margin: 0 }}>Share a resume and get a clear, useful review—what is working, what is missing, and what to fix first.</p>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current.click()}
          className="upload-zone"
          style={{ border: `1.5px dashed ${dragging ? C.accent : C.border}`, borderRadius: 18,
            background: dragging ? C.accent + "0a" : C.card, padding: "38px 24px 32px",
            textAlign: "center", cursor: "pointer", transition: "all 0.2s", marginBottom: 16,
            boxShadow: dragging ? `0 16px 35px ${C.accent}18` : "0 2px 0 rgba(37,35,31,.03)" }}>
          <input ref={fileRef} type="file" accept=".pdf,.txt" style={{ display: "none" }}
            onChange={e => handleFile(e.target.files[0])} />
          <div style={{ width: 48, height: 54, margin: "0 auto 14px", borderRadius: "6px 16px 6px 6px", border: `1px solid ${C.accent}55`, background: C.accent + "10", color: C.accent, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 900, letterSpacing: "0.06em" }}>{hasPdf ? "PDF" : "CV"}</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 7 }}>
            {fileName || "Drop your resume here"}
          </div>
          <div style={{ fontSize: 13, color: C.sub }}>PDF or .txt · or choose a file</div>
          {hasPdf && <div style={{ marginTop: 8 }}><Tag color={C.good}>PDF ready to analyse</Tag></div>}
        </div>

        <div style={{ marginBottom: 20 }}>
          <Label>Or paste resume text</Label>
          <Textarea value={resumeText} onChange={e => setResumeText(e.target.value)}
            placeholder="Paste your resume content here..." rows={6} />
        </div>

        <div style={{ marginBottom: 28 }}>
          <Label>Job Description <span style={{ color: C.muted, fontWeight: 400 }}>(paste to get JD match score)</span></Label>
          <Textarea value={jdText} onChange={e => setJdText(e.target.value)}
            placeholder="Paste the job description you're applying for..." rows={5} />
        </div>

        {error && <div style={{ color: C.bad, fontSize: 13, marginBottom: 16, padding: "10px 14px", background: C.bad + "15", borderRadius: 10 }}>{error}</div>}

        <button className="primary-button" onClick={analyse}
          disabled={!hasPdf && !hasText}
          style={{ width: "100%", padding: "15px 0", borderRadius: 10, border: "none", cursor: (hasPdf || hasText) ? "pointer" : "not-allowed",
            background: (hasPdf || hasText) ? C.accent : C.border,
            color: "#fff", fontSize: 15, fontWeight: 800, letterSpacing: "0.01em", transition: "all 0.2s" }}>
          Analyse Resume →
        </button>
      </div>
    </Page>
  );

  if (step === "reviewing") return (
    <Page>
      <Header/>
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
      <Header/>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 16px 60px" }}>

        <div className="result-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "28px 28px 24px", marginBottom: 20,
          display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap" }}>
          <ScoreRing score={r.overallScore} size={100}/>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Overall Score</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text, lineHeight: 1.4, marginBottom: 12 }}>{r.overallVerdict}</div>
            {r.jdMatchScore !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, color: C.sub }}>JD Match</span>
                <Bar color={scoreColor(r.jdMatchScore)} pct={r.jdMatchScore}/>
                <span style={{ fontSize: 13, fontWeight: 800, color: scoreColor(r.jdMatchScore), minWidth: 36 }}>{r.jdMatchScore}%</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <MiniCard color={C.good} items={r.topStrengths} title="Top Strengths"/>
          <MiniCard color={C.accent} items={r.quickWins} title="Quick Wins"/>
        </div>

        <div style={{ marginBottom: 20 }}>
          <SectionLabel>Section Breakdown</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {r.sections.filter(s => s.verdict !== "missing" || s.score > 0 || s.name !== "Experience").map((sec, i) => {
              const v = verdictMap[sec.verdict] || verdictMap["needs-work"];
              return (
                <div className="result-card" key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{sec.name}</span>
                        <Tag color={v.color}>{v.label}</Tag>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Bar color={scoreColor(sec.score)} pct={sec.score}/>
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
              {r.missingKeywords.map((kw, i) => <Tag color={C.warn} key={i}>{kw}</Tag>)}
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
    <div style={{ background: `radial-gradient(circle at 90% 0%, #e5ecdc 0, transparent 31%), ${C.bg}`, minHeight: "100vh", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", color: C.text }}>
      <style>{`
        * { box-sizing: border-box; }
        .upload-zone:hover { border-color: ${C.accent} !important; transform: translateY(-2px); box-shadow: 0 14px 30px rgba(37,35,31,.08) !important; }
        .primary-button:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 10px 20px ${C.accent}42; }
        .result-card { transition: transform .18s ease, box-shadow .18s ease; }
        .result-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(37,35,31,.07); }
        textarea:focus { border-color: ${C.accent} !important; box-shadow: 0 0 0 3px ${C.accent}18; }
      `}</style>
      {children}
    </div>
  );
}

function Header() {
  return (
    <div style={{ borderBottom: `1px solid ${C.border}`, padding: "18px 16px", marginBottom: 42, background: C.surface + "cc", backdropFilter: "blur(10px)" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: C.accent2, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
          Your application companion
        </div>
        <div style={{ fontSize: 28, fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700, letterSpacing: "-0.04em", color: C.text }}>
          Resume notes
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
    <div className="result-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ fontSize: 13, fontWeight: 800, color, marginBottom: 12 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items?.map((item, i) => (
          <div key={i} style={{ fontSize: 12, color: C.sub, paddingLeft: 10, borderLeft: `2px solid ${color}44`, lineHeight: 1.5 }}>{item}</div>
        ))}
      </div>
    </div>
  );
}
