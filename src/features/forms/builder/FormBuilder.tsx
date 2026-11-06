"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Icon } from "@/components/ui/Icon";
import { IconTile } from "@/components/ui/Pickers";
import { useUi } from "@/components/ui/UiProvider";
import { useCatalog } from "@/features/catalog/useCatalog";
import { BlockRenderer } from "@/features/editor/BlockRenderer";
import { groupBlocks } from "@/features/editor/groups";
import { canManageDepartment } from "@/lib/access";
import { findFormProblems } from "@/lib/form-schema";
import { ApiError, api } from "@/lib/sync";
import type { FormMeta, FormSchema, FormStatus } from "@/lib/types";
import { checkForm, fieldsOfType, moveItem, newSection, pruneMeta } from "./model";
import { SectionEditor } from "./SectionEditor";

interface Draft {
  name: string;
  description: string;
  status: FormStatus;
  schema: FormSchema;
}
interface State {
  id: string;
  version: number;
  dirty: boolean;
  draft: Draft;
}

const META_FIELDS: { key: keyof FormMeta; label: string; types: ("text" | "date")[]; hint: string }[] = [
  { key: "refKey", label: "Reference number", types: ["text"], hint: "First half of a survey’s title" },
  { key: "clientKey", label: "Client name", types: ["text"], hint: "Second half of the title" },
  { key: "siteKey", label: "Site or location", types: ["text"], hint: "Shown under the title" },
  { key: "dateKey", label: "Survey date", types: ["date"], hint: "Shown under the title" },
  { key: "engineerKey", label: "Surveyed by", types: ["text"], hint: "Filled with the engineer’s name" },
];

/** Customise a department's form: sections, fields, options and which fields name a survey. */
export function FormBuilder() {
  const id = useSearchParams().get("id") ?? undefined;
  const router = useRouter();
  const { user, online, reloadCatalog } = useApp();
  const { confirm, toast } = useUi();
  const catalog = useCatalog();
  const source = catalog.form(id);
  const dept = catalog.department(source?.departmentId);

  const [state, setState] = useState<State | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [previewSection, setPreviewSection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);

  // Start editing a copy of the cached form (the documented "adjust state while rendering" pattern).
  if (source && state?.id !== source.id) {
    setState({ id: source.id, version: source.version, dirty: false, draft: { name: source.name, description: source.description, status: source.status, schema: structuredClone(source.schema) } });
  }

  const dirty = !!state?.dirty;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (!user || !catalog.loaded || (source && !state)) return <div className="center muted">Loading form…</div>;
  if (!source || !state || !canManageDepartment(user, source.departmentId))
    return (
      <div className="center">
        <p>{source ? "You can’t edit this department’s forms." : "This form isn’t available."}</p>
        <Link href="/forms" className="btn primary">Back to forms</Link>
      </div>
    );

  const { draft } = state;
  const edit = (fn: (d: Draft) => void) =>
    setState((s) => {
      if (!s) return s;
      const d = structuredClone(s.draft);
      fn(d);
      return { ...s, dirty: true, draft: d };
    });

  const goBack = async () => {
    if (state.dirty && !(await confirm({ title: "Discard your changes?", message: "You have unsaved changes to this form.", confirmLabel: "Discard", danger: true }))) return;
    router.push("/forms");
  };

  async function save() {
    if (!state) return;
    const schema = pruneMeta(state.draft.schema);
    const issues = [...checkForm(schema), ...findFormProblems(schema)];
    setProblems(issues);
    if (issues.length) return toast(issues[0], "error");
    setSaving(true);
    try {
      const r = await api<{ version: number }>(`/api/forms/${state.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: state.draft.name, description: state.draft.description, status: state.draft.status, schema, baseVersion: state.version }),
      });
      await reloadCatalog();
      setState((s) => (s ? { ...s, version: r.version, dirty: false, draft: { ...s.draft, schema } } : s));
      toast("Form saved. Engineers get it on their next sync.", "success");
    } catch (e) {
      toast(e instanceof ApiError ? String((e.body.issues as string[] | undefined)?.[0] ?? e.body.error) : "Couldn’t save. Check your connection and try again.", "error");
    }
    setSaving(false);
  }

  const sections = draft.schema.sections;
  const setSection = (i: number, next: FormSchema["sections"][number]) => edit((d) => void (d.schema.sections[i] = next));
  const previewKey = previewSection && sections.some((s) => s.key === previewSection) ? previewSection : sections[0]?.key;
  const previewSec = sections.find((s) => s.key === previewKey);

  return (
    <div className="builder">
      <header className="wiz-head">
        <div className="wiz-top">
          <button className="icon-btn" onClick={goBack} aria-label="Back to forms"><Icon name="arrow-left" /></button>
          <div className="wiz-title">
            <strong>{draft.name || "Untitled form"}</strong>
            <span className="muted small ellipsis">{dept?.name} · v{state.version}{state.dirty ? " · unsaved changes" : ""}</span>
          </div>
          <button className={`btn ghost sm${preview ? " on" : ""}`} onClick={() => setPreview((p) => !p)} aria-pressed={preview} aria-label={preview ? "Back to editing" : "Preview the form"}>
            <Icon name="eye" size={16} /> <span className="btn-text">{preview ? "Edit" : "Preview"}</span>
          </button>
          <button className="btn primary sm" onClick={save} disabled={saving || !state.dirty || !online} title={online ? undefined : "Needs a connection"}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </header>

      <div className="wiz-body builder-body">
        {problems.length > 0 && (
          <div className="banner warn" role="alert">
            <Icon name="alert" size={20} />
            <div>
              <strong>Fix these before saving</strong>
              <ul className="problem-list">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          </div>
        )}

        {preview ? (
          <>
            <p className="muted small">This is how engineers will see the form. Nothing here is saved.</p>
            <nav className="steps" aria-label="Preview sections">
              {sections.map((s) => (
                <button key={s.key} className={`step-chip${s.key === previewKey ? " active" : ""}`} onClick={() => setPreviewSection(s.key)}>{s.short || s.title}</button>
              ))}
            </nav>
            {previewSec && (
              <fieldset className="plain-fieldset" disabled>
                <div className="section-intro">
                  <IconTile icon={previewSec.iconName} tone={previewSec.tone} large size={24} />
                  <div><h1>{previewSec.title}</h1><p className="muted small">{previewSec.subtitle}</p></div>
                </div>
                {groupBlocks(previewSec.blocks).map((g, gi) => (
                  <section className="group card" key={gi}>
                    {g.title && <h3 className="group-title">{g.title}</h3>}
                    {g.blocks.map((b, i) => (
                      <BlockRenderer key={"key" in b ? b.key : `b${gi}-${i}`} block={b} value={undefined} onChange={() => undefined} surveyId="preview" />
                    ))}
                  </section>
                ))}
                {previewSec.blocks.length === 0 && <p className="muted small">This section has no fields yet.</p>}
              </fieldset>
            )}
          </>
        ) : (
          <>
            <section className="card group">
              <h3 className="group-title">Form details</h3>
              <label className="field">
                <span className="field-label">Name</span>
                <input className="input" value={draft.name} onChange={(e) => edit((d) => void (d.name = e.target.value))} />
              </label>
              <label className="field">
                <span className="field-label">Description</span>
                <input className="input" value={draft.description} onChange={(e) => edit((d) => void (d.description = e.target.value))} placeholder="What engineers use this for" />
              </label>
              <label className="field">
                <span className="field-label">Status</span>
                <select className="input" value={draft.status} onChange={(e) => edit((d) => void (d.status = e.target.value as FormStatus))}>
                  <option value="active">Active — engineers can start new surveys</option>
                  <option value="archived">Archived — hidden, existing surveys keep working</option>
                </select>
              </label>
            </section>

            <section className="card group">
              <h3 className="group-title">Which fields name a survey?</h3>
              <p className="muted small">These feed the survey title in lists and the “New survey” sheet. All optional.</p>
              {META_FIELDS.map((m) => (
                <label className="field" key={m.key}>
                  <span className="field-label">{m.label} <span className="muted small">· {m.hint}</span></span>
                  <select className="input" value={draft.schema.meta[m.key] ?? ""} onChange={(e) => edit((d) => void (d.schema.meta = { ...d.schema.meta, [m.key]: e.target.value || undefined }))}>
                    <option value="">— none —</option>
                    {fieldsOfType(draft.schema, m.types).map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </select>
                </label>
              ))}
            </section>

            <h2 className="section-title">Sections</h2>
            <ul className="stack se-list">
              {sections.map((s, i) => (
                <SectionEditor
                  key={s.key}
                  section={s}
                  index={i}
                  count={sections.length}
                  open={open === s.key}
                  onToggle={() => setOpen(open === s.key ? null : s.key)}
                  onChange={(next) => setSection(i, next)}
                  onMove={(dir) => edit((d) => void (d.schema.sections = moveItem(d.schema.sections, i, i + dir)))}
                  onDelete={async () => {
                    const n = s.blocks.filter((b) => b.t !== "heading").length;
                    if (n === 0 || (await confirm({ title: `Delete “${s.title}”?`, message: `Its ${n} field${n === 1 ? "" : "s"} will be removed from the form. Answers already collected stay in saved surveys but are no longer shown.`, confirmLabel: "Delete section", danger: true }))) {
                      edit((d) => void (d.schema.sections = d.schema.sections.filter((x) => x.key !== s.key)));
                    }
                  }}
                />
              ))}
            </ul>
            <button
              className="btn secondary"
              onClick={() => {
                const sec = newSection(draft.schema);
                edit((d) => void d.schema.sections.push(sec));
                setOpen(sec.key);
              }}
            >
              <Icon name="plus" size={18} /> Add section
            </button>
          </>
        )}
      </div>
    </div>
  );
}
