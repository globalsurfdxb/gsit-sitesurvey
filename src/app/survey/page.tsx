import { Suspense } from "react";
import { SurveyEditor } from "@/components/survey/SurveyEditor";

// The survey id travels in ?id=, not the path, so this one static page serves every survey
// and the offline cache can reuse it for surveys that were created while offline.
export default function SurveyPage() {
  return (
    <Suspense fallback={<div className="center muted">Loading…</div>}>
      <SurveyEditor />
    </Suspense>
  );
}
