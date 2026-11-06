import { Suspense } from "react";
import { FormBuilder } from "@/features/forms/builder/FormBuilder";

export default function FormBuilderPage() {
  return (
    <Suspense fallback={<div className="center muted">Loading…</div>}>
      <FormBuilder />
    </Suspense>
  );
}
