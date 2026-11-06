import { Suspense } from "react";
import { DepartmentView } from "@/features/departments/DepartmentView";

// The department id travels in ?id= so one cached static page serves every department (works offline).
export default function DepartmentPage() {
  return (
    <Suspense fallback={<div className="center muted">Loading…</div>}>
      <DepartmentView />
    </Suspense>
  );
}
