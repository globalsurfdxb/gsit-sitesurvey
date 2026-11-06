"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { IconPicker, TonePicker } from "@/components/ui/Pickers";
import { Sheet } from "@/components/ui/Sheet";
import { useUi } from "@/components/ui/UiProvider";
import { ApiError, api } from "@/lib/sync";
import type { DepartmentInfo } from "@/lib/types";

const FORM = "department-form";

function DeptForm({ existing, onDone }: { existing?: DepartmentInfo; onDone: () => void }) {
  const router = useRouter();
  const { reloadCatalog } = useApp();
  const { toast } = useUi();
  const [v, setV] = useState({
    name: existing?.name ?? "",
    code: existing?.code ?? "",
    description: existing?.description ?? "",
    tone: existing?.tone ?? "blue",
    iconName: existing?.iconName ?? "briefcase",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (existing) {
        await api(`/api/departments/${existing.id}`, { method: "PATCH", body: JSON.stringify({ name: v.name, description: v.description, tone: v.tone, iconName: v.iconName }) });
        await reloadCatalog();
        toast("Department updated", "success");
        onDone();
      } else {
        const { id } = await api<{ id: string }>("/api/departments", { method: "POST", body: JSON.stringify(v) });
        await reloadCatalog();
        toast(`${v.name} created`, "success");
        onDone();
        router.push(`/department?id=${id}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? String(err.body.issues ? (err.body.issues as string[])[0] : err.body.error) : "You need a connection to do this.");
      setBusy(false);
    }
  }

  return (
    <form id={FORM} onSubmit={submit} className="stack">
      <div className="grid2">
        <label className="field">
          <span className="field-label">Name <span className="req">*</span></span>
          <input className="input" required minLength={2} maxLength={60} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="e.g. Security" autoFocus />
        </label>
        <label className="field">
          <span className="field-label">Code <span className="req">*</span></span>
          <input className="input" required minLength={2} maxLength={12} pattern="[A-Za-z0-9\-]+" disabled={!!existing} value={v.code} onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })} placeholder="e.g. SEC" title="Letters, numbers and dashes. Can't be changed later." />
        </label>
      </div>
      <label className="field">
        <span className="field-label">Description</span>
        <input className="input" maxLength={300} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} placeholder="What this department surveys" />
      </label>
      <div className="field">
        <span className="field-label">Icon</span>
        <IconPicker value={v.iconName} onChange={(iconName) => setV({ ...v, iconName })} />
      </div>
      <div className="field">
        <span className="field-label">Colour</span>
        <TonePicker value={v.tone} onChange={(tone) => setV({ ...v, tone })} />
      </div>
      {error && <div className="error" role="alert">{error}</div>}
      <button type="submit" hidden disabled={busy} />
    </form>
  );
}

export function DepartmentSheet({ open, onClose, existing }: { open: boolean; onClose: () => void; existing?: DepartmentInfo }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={existing ? `Edit ${existing.name}` : "New department"}
      footer={
        <button className="btn primary block" type="submit" form={FORM}>
          {existing ? "Save changes" : "Create department"}
        </button>
      }
    >
      {open && <DeptForm existing={existing} onDone={onClose} />}
    </Sheet>
  );
}
