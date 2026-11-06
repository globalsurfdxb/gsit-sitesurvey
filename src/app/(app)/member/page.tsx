import { Suspense } from "react";
import { MemberView } from "@/features/departments/MemberView";

export default function MemberPage() {
  return (
    <Suspense fallback={<div className="center muted">Loading…</div>}>
      <MemberView />
    </Suspense>
  );
}
