import { Suspense } from "react";
import { Report } from "@/components/Report";

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="center muted">Loading…</div>}>
      <Report />
    </Suspense>
  );
}
