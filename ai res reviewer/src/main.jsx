import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ResumeReviewer from "../resume_reviewer_gemini.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ResumeReviewer />
  </StrictMode>
);
