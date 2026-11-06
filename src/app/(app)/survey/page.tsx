import { Suspense } from "react";
import { SurveyWizard } from "@/features/editor/SurveyWizard";

// The survey id travels in ?id=, not the path, so this one static page serves every survey
// and the offline cache can reuse it for surveys that were created while offline.
export default function SurveyPage() {
  return (
    <Suspense fallback={<div className="center muted">Loading…</div>}>
      <SurveyWizard />
    </Suspense>
  );
}
