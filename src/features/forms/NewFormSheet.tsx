"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Sheet } from "@/components/ui/Sheet";
import { useUi } from "@/components/ui/UiProvider";
import { useCatalog } from "@/features/catalog/useCatalog";
import { canManageDepartment } from "@/lib/access";
import { ApiError, api } from "@/lib/sync";

const FORM = "new-form-form";

function NewForm({ departmentId, onDone }: { departmentId?: string; onDone: () => void }) {
  const router = useRouter();
  const { user, reloadCatalog } = useApp();
  const { toast } = useUi();
  const catalog = useCatalog();
  const managed = catalog.departments.filter((d) => user && canManageDepartment(user, d.id));
  const [dept, setDept] = useState(departmentId ?? managed[0]?.id ?? "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [copyFrom, setCopyFrom] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Forms that can be used as a starting point: any the person manages.
  const sources = catalog.forms.filter((f) => user && canManageDepartment(user, f.departmentId));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { id } = await api<{ id: string }>("/api/forms", { method: "POST", body: JSON.stringify({ departmentId: dept, name, description, copyFrom: copyFrom || undefined }) });
      await reloadCatalog();
      toast("Form created. Customise it below.", "success");
      onDone();
      router.push(`/form-builder?id=${id}`);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.body.issues ? (err.body.issues as string[])[0] : err.body.error) : "You need a connection to do this.");
      setBusy(false);
    }
  }

  return (
    <form id={FORM} onSubmit={submit} className="stack">
      {!departmentId && managed.length > 1 && (
        <label className="field">
          <span className="field-label">Department</span>
          <select className="input" value={dept} onChange={(e) => setDept(e.target.value)}>
            {managed.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
      )}
      <label className="field">
        <span className="field-label">Form name <span className="req">*</span></span>
        <input className="input" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AV Site Survey" autoFocus />
      </label>
      <label className="field">
        <span className="field-label">Description</span>
        <input className="input" maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What engineers use this for" />
      </label>
      <label className="field">
        <span className="field-label">Start from</span>
        <select className="input" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
          <option value="">Blank form (client, site and notes)</option>
          {sources.map((f) => (
            <option key={f.id} value={f.id}>
              Copy of “{f.name}” ({catalog.department(f.departmentId)?.code})
            </option>
          ))}
        </select>
      </label>
      {error && <div className="error" role="alert">{error}</div>}
      <button type="submit" hidden disabled={busy} />
    </form>
  );
}

export function NewFormSheet({ open, onClose, departmentId }: { open: boolean; onClose: () => void; departmentId?: string }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="New form"
      footer={
        <button className="btn primary block" type="submit" form={FORM}>
          Create and customise
        </button>
      }
    >
      {open && <NewForm departmentId={departmentId} onDone={onClose} />}
    </Sheet>
  );
}
