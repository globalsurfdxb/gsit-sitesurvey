import { Suspense } from "react";
import { Report } from "@/features/report/Report";

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="center muted">Loading…</div>}>
      <Report />
    </Suspense>
  );
}
